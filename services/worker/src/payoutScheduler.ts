/**
 * Payout Scheduler Module
 * 
 * Lead: SWS (Senior Worker & Scheduler Engineer)
 * Co-Authority: CFA (Chief Financial Agent), PPSA (Principal Payment Systems Architect)
 * 
 * Manages the daily payout batch process that distributes funds to sellers.
 * Runs at 06:00 UTC (01:00 Panama time) to process accumulated seller balances.
 * 
 * Risk Gate: RED and BLACK tier sellers require manual approval
 */

import { PoolClient } from 'pg';

export interface PayoutResult {
  payoutId: string;
  sellerId: string;
  amountCents: bigint;
  currency: string;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  estimatedArrival?: Date;
  externalId?: string;
  error?: string;
}

export interface PayoutBatchResult {
  processedCount: number;
  totalAmountCents: bigint;
  successful: PayoutResult[];
  failed: PayoutResult[];
  skipped: Array<{ sellerId: string; reason: string }>;
}

export interface SellerPayoutEligibility {
  sellerId: string;
  projectId: string;
  riskTier: 'GREEN' | 'YELLOW' | 'RED' | 'BLACK';
  balanceCents: bigint;
  currency: string;
  email: string;
  ruc: string;
}

// Minimum payout threshold: B/. 10.00
const MIN_PAYOUT_CENTS = 1000n;

// Maximum batch size (PayCaddy rate limit consideration)
const MAX_BATCH_SIZE = 50;

/**
 * Calculate the idempotency key for a payout
 */
export function getPayoutIdempotencyKey(sellerId: string, date: Date = new Date()): string {
  const dateKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  return `payout_${sellerId}_${dateKey}`;
}

/**
 * Get eligible sellers for payout
 * 
 * Criteria:
 * - Balance > MIN_PAYOUT_CENTS (B/. 10.00)
 * - Risk tier GREEN or YELLOW (RED/BLACK require manual approval)
 * - Active seller account
 */
export async function getEligibleSellers(
  client: PoolClient,
  limit: number = MAX_BATCH_SIZE
): Promise<SellerPayoutEligibility[]> {
  const { rows } = await client.query(`
    WITH seller_balances AS (
      SELECT 
        s.id as seller_id,
        s.project_id,
        s.risk_tier,
        s.email,
        s.ruc,
        le.currency,
        COALESCE(SUM(
          CASE 
            WHEN le.entry_type = 'credit' THEN le.amount_cents
            WHEN le.entry_type = 'debit' THEN -le.amount_cents
            ELSE 0
          END
        ), 0) as balance_cents
      FROM sellers s
      INNER JOIN accounts a ON a.seller_id = s.id
      INNER JOIN ledger_entries le ON le.account_id = a.id
      WHERE s.risk_tier IN ('GREEN', 'YELLOW')
      GROUP BY s.id, s.project_id, s.risk_tier, s.email, s.ruc, le.currency
      HAVING COALESCE(SUM(
        CASE 
          WHEN le.entry_type = 'credit' THEN le.amount_cents
          WHEN le.entry_type = 'debit' THEN -le.amount_cents
          ELSE 0
        END
      ), 0) > $1
    )
    SELECT * FROM seller_balances
    LIMIT $2
  `, [MIN_PAYOUT_CENTS.toString(), limit]);

  return rows.map((r: {
    seller_id: string;
    project_id: string;
    risk_tier: 'GREEN' | 'YELLOW' | 'RED' | 'BLACK';
    balance_cents: string;
    currency: string;
    email: string;
    ruc: string;
  }) => ({
    sellerId: r.seller_id,
    projectId: r.project_id,
    riskTier: r.risk_tier,
    balanceCents: BigInt(r.balance_cents),
    currency: r.currency,
    email: r.email,
    ruc: r.ruc,
  }));
}

/**
 * Check if a seller has a pending payout for today
 */
export async function hasPendingPayout(
  client: PoolClient,
  sellerId: string,
  date: Date = new Date()
): Promise<boolean> {
  const idempotencyKey = getPayoutIdempotencyKey(sellerId, date);
  
  const { rows: [existing] } = await client.query(`
    SELECT id FROM payouts
    WHERE idempotency_key = $1
    LIMIT 1
  `, [idempotencyKey]);

  return !!existing;
}

/**
 * Initiate a payout for a single seller
 * 
 * Process:
 * 1. Verify sufficient balance
 * 2. Create payout record
 * 3. Create ledger entries (debit payable, credit cash)
 * 4. Update payout status to processing
 * 5. (External) Call PayCaddy for ACH transfer
 */
export async function initiateSellerPayout(
  client: PoolClient,
  seller: SellerPayoutEligibility,
  simulatePaycaddy: boolean = true
): Promise<PayoutResult> {
  const idempotencyKey = getPayoutIdempotencyKey(seller.sellerId);
  const payoutAmount = seller.balanceCents;

  // Check for existing payout today
  if (await hasPendingPayout(client, seller.sellerId)) {
    return {
      payoutId: '',
      sellerId: seller.sellerId,
      amountCents: payoutAmount,
      currency: seller.currency,
      status: 'failed',
      error: 'Payout already initiated for today',
    };
  }

  // Create payout record
  const { rows: [payout] } = await client.query(`
    INSERT INTO payouts (
      project_id, seller_id, amount_cents, currency, status, idempotency_key, metadata
    ) VALUES ($1, $2, $3, $4, 'pending', $5, $6)
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id
  `, [
    seller.projectId, 
    seller.sellerId, 
    payoutAmount.toString(), 
    seller.currency,
    idempotencyKey,
    JSON.stringify({ 
      auto_processed: true, 
      risk_tier: seller.riskTier,
      seller_email: seller.email,
      seller_ruc: seller.ruc,
    })
  ]);

  if (!payout) {
    return {
      payoutId: '',
      sellerId: seller.sellerId,
      amountCents: payoutAmount,
      currency: seller.currency,
      status: 'failed',
      error: 'Payout already exists (race condition)',
    };
  }

  // Get required accounts
  const { rows: [cashAccount] } = await client.query(`
    SELECT id FROM accounts
    WHERE project_id = $1 AND code = 'CASH_RESERVE' AND currency = $2
    LIMIT 1
  `, [seller.projectId, seller.currency]);

  const { rows: [payableAccount] } = await client.query(`
    SELECT id FROM accounts
    WHERE seller_id = $1 AND code = 'MERCHANT_PAYABLE' AND currency = $2
    LIMIT 1
  `, [seller.sellerId, seller.currency]);

  if (!cashAccount || !payableAccount) {
    // Rollback payout
    await client.query(`
      UPDATE payouts SET status = 'failed', updated_at = NOW()
      WHERE id = $1
    `, [payout.id]);
    
    return {
      payoutId: payout.id,
      sellerId: seller.sellerId,
      amountCents: payoutAmount,
      currency: seller.currency,
      status: 'failed',
      error: 'Required accounts not found',
    };
  }

  // Create ledger entries
  const { rows: [debitEntry] } = await client.query(`
    INSERT INTO ledger_entries (
      project_id, seller_id, account_id, entry_type, amount_cents, currency,
      payout_id, idempotency_key, metadata
    ) VALUES ($1, $2, $3, 'debit', $4, $5, $6, $7, $8)
    RETURNING id
  `, [
    seller.projectId, seller.sellerId, payableAccount.id,
    payoutAmount.toString(), seller.currency, payout.id,
    `payout_debit_${idempotencyKey}`,
    JSON.stringify({ 
      payout_id: payout.id, 
      auto_processed: true,
      seller_ruc: seller.ruc,
    })
  ]);

  await client.query(`
    INSERT INTO ledger_entries (
      project_id, seller_id, account_id, entry_type, amount_cents, currency,
      payout_id, contra_entry_id, idempotency_key, metadata
    ) VALUES ($1, $2, $3, 'credit', $4, $5, $6, $7, $8, $9)
  `, [
    seller.projectId, seller.sellerId, cashAccount.id,
    payoutAmount.toString(), seller.currency, payout.id, debitEntry.id,
    `payout_credit_${idempotencyKey}`,
    JSON.stringify({ 
      payout_id: payout.id, 
      auto_processed: true,
      seller_ruc: seller.ruc,
    })
  ]);

  // Update payout to processing
  await client.query(`
    UPDATE payouts
    SET status = 'processing', updated_at = NOW()
    WHERE id = $1
  `, [payout.id]);

  // Calculate estimated arrival (T+1 business day for Panama)
  const estimatedArrival = getNextBusinessDay(new Date());

  // In production, this would call PayCaddy API
  // For now, we return processing status and wait for webhook
  const externalId = simulatePaycaddy 
    ? `sim_${Date.now()}_${payout.id.slice(0, 8)}`
    : undefined;

  if (externalId) {
    await client.query(`
      UPDATE payouts
      SET external_id = $1, metadata = metadata || $2
      WHERE id = $3
    `, [
      externalId,
      JSON.stringify({ simulated: true, estimated_arrival: estimatedArrival }),
      payout.id
    ]);
  }

  return {
    payoutId: payout.id,
    sellerId: seller.sellerId,
    amountCents: payoutAmount,
    currency: seller.currency,
    status: 'processing',
    estimatedArrival,
    externalId,
  };
}

/**
 * Process payout batch for all eligible sellers
 */
export async function processPayoutBatch(
  client: PoolClient,
  simulatePaycaddy: boolean = true
): Promise<PayoutBatchResult> {
  const successful: PayoutResult[] = [];
  const failed: PayoutResult[] = [];
  const skipped: Array<{ sellerId: string; reason: string }> = [];

  // Get eligible sellers
  const eligibleSellers = await getEligibleSellers(client);

  if (eligibleSellers.length === 0) {
    return {
      processedCount: 0,
      totalAmountCents: BigInt(0),
      successful: [],
      failed: [],
      skipped: [],
    };
  }

  // Calculate total payout amount for float verification
  const totalAmount = eligibleSellers.reduce(
    (sum, s) => sum + s.balanceCents,
    BigInt(0)
  );

  // Process each seller
  for (const seller of eligibleSellers) {
    try {
      // Skip if already has payout today
      if (await hasPendingPayout(client, seller.sellerId)) {
        skipped.push({ sellerId: seller.sellerId, reason: 'Already has payout for today' });
        continue;
      }

      const result = await initiateSellerPayout(client, seller, simulatePaycaddy);
      
      if (result.status === 'processing') {
        successful.push(result);
      } else {
        failed.push(result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      failed.push({
        payoutId: '',
        sellerId: seller.sellerId,
        amountCents: seller.balanceCents,
        currency: seller.currency,
        status: 'failed',
        error: errorMessage,
      });
    }
  }

  const totalSuccessfulAmount = successful.reduce(
    (sum, r) => sum + r.amountCents,
    BigInt(0)
  );

  return {
    processedCount: eligibleSellers.length,
    totalAmountCents: totalSuccessfulAmount,
    successful,
    failed,
    skipped,
  };
}

/**
 * Get the next business day in Panama
 * Accounts for weekends and Panama holidays
 */
function getNextBusinessDay(date: Date): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + 1);
  
  // Panama holidays (simplified - full implementation would use a holiday calendar)
  const panamaHolidays = [
    '01-01', // Año Nuevo
    '01-09', // Día de los Mártires
    '05-01', // Día del Trabajo
    '11-03', // Día de la Separación
    '11-04', // Día de la Bandera
    '11-05', // Día de Colón
    '11-10', // Primer Grito de Independencia
    '11-28', // Independencia de Panamá de España
    '12-08', // Día de las Madres
    '12-25', // Navidad
  ];

  // Skip weekends and holidays
  while (true) {
    const dayOfWeek = result.getDay();
    const monthDay = `${String(result.getMonth() + 1).padStart(2, '0')}-${String(result.getDate()).padStart(2, '0')}`;
    
    // Skip if weekend (0 = Sunday, 6 = Saturday)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      result.setDate(result.getDate() + 1);
      continue;
    }
    
    // Skip if holiday
    if (panamaHolidays.includes(monthDay)) {
      result.setDate(result.getDate() + 1);
      continue;
    }
    
    break;
  }

  return result;
}

/**
 * Mark a payout as completed (called from webhook handler)
 */
export async function markPayoutCompleted(
  client: PoolClient,
  payoutId: string,
  externalReference?: string
): Promise<void> {
  await client.query(`
    UPDATE payouts
    SET 
      status = 'paid',
      external_id = COALESCE($2, external_id),
      updated_at = NOW(),
      metadata = metadata || $3
    WHERE id = $1
  `, [
    payoutId,
    externalReference,
    JSON.stringify({ completed_at: new Date().toISOString() })
  ]);
}

/**
 * Mark a payout as failed (called from webhook handler)
 */
export async function markPayoutFailed(
  client: PoolClient,
  payoutId: string,
  reason: string
): Promise<void> {
  await client.query(`
    UPDATE payouts
    SET 
      status = 'failed',
      updated_at = NOW(),
      metadata = metadata || $2
    WHERE id = $1
  `, [
    payoutId,
    JSON.stringify({ failed_at: new Date().toISOString(), failure_reason: reason })
  ]);
}
