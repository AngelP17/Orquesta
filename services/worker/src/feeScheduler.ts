/**
 * Fee Scheduler Module
 * 
 * Lead: SWS (Senior Worker & Scheduler Engineer)
 * Co-Authority: CFA (Chief Financial Agent)
 * 
 * Manages the automated fee sweep process that runs hourly.
 * Fee sweeps transfer accrued platform fees from seller payables
 * to platform revenue accounts.
 */

import { PoolClient } from 'pg';

export interface FeeSweepResult {
  sellerId: string;
  sweptCount: number;
  totalCents: bigint;
  totalItbmsCents: bigint;
  currency: string;
  timestamp: Date;
}

export interface FeeSweepBatchResult {
  processedSellers: number;
  totalSweptCents: bigint;
  results: FeeSweepResult[];
  errors: Array<{ sellerId: string; error: string }>;
}

/**
 * Calculate the idempotency key for a fee sweep job
 * Ensures exactly-once execution per seller per hour
 */
export function getFeeSweepIdempotencyKey(sellerId: string, date: Date = new Date()): string {
  const hourKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}_${String(date.getUTCHours()).padStart(2, '0')}`;
  return `fee_sweep_${sellerId}_${hourKey}`;
}

/**
 * Sweep fees for a single seller
 * 
 * @param client - Database transaction client
 * @param sellerId - Seller UUID
 * @param projectId - Project UUID
 * @returns FeeSweepResult with details of the sweep
 */
export async function sweepSellerFees(
  client: PoolClient,
  sellerId: string,
  projectId: string
): Promise<FeeSweepResult | null> {
  // Lock pending obligations for this seller
  const { rows: obligations } = await client.query(`
    SELECT id, amount_cents, itbms_cents, currency
    FROM fee_obligations
    WHERE seller_id = $1 AND status = 'pending'
    FOR UPDATE SKIP LOCKED
  `, [sellerId]);

  if (obligations.length === 0) {
    return null;
  }

  const totalCents = obligations.reduce((sum, o) => sum + BigInt(o.amount_cents), BigInt(0));
  const totalItbms = obligations.reduce((sum, o) => sum + BigInt(o.itbms_cents), BigInt(0));
  const currency = obligations[0].currency;

  // Get required accounts
  const { rows: [platformAccount] } = await client.query(`
    SELECT id FROM accounts
    WHERE project_id = $1 AND code = 'PLATFORM_FEE_REVENUE' AND currency = $2
    LIMIT 1
  `, [projectId, currency]);

  const { rows: [payableAccount] } = await client.query(`
    SELECT id FROM accounts
    WHERE seller_id = $1 AND code = 'MERCHANT_PAYABLE' AND currency = $2
    LIMIT 1
  `, [sellerId, currency]);

  if (!platformAccount || !payableAccount) {
    throw new Error(`Required accounts not found for seller ${sellerId}`);
  }

  const idempotencyKey = getFeeSweepIdempotencyKey(sellerId);

  // Create double-entry ledger records
  // Entry 1: Debit merchant payable (reduce liability to seller)
  const { rows: [debitEntry] } = await client.query(`
    INSERT INTO ledger_entries (
      project_id, seller_id, account_id, entry_type, amount_cents, currency,
      itbms_cents, idempotency_key, metadata
    ) VALUES ($1, $2, $3, 'debit', $4, $5, $6, $7, $8)
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id
  `, [
    projectId, sellerId, payableAccount.id,
    totalCents.toString(), currency, totalItbms.toString(),
    `fee_sweep_debit_${idempotencyKey}`,
    JSON.stringify({ 
      fee_sweep: true, 
      obligation_count: obligations.length,
      obligation_ids: obligations.map((o: { id: string }) => o.id)
    })
  ]);

  if (!debitEntry) {
    // Already swept this hour
    return null;
  }

  // Entry 2: Credit platform fee revenue (recognize revenue)
  await client.query(`
    INSERT INTO ledger_entries (
      project_id, seller_id, account_id, entry_type, amount_cents, currency,
      contra_entry_id, itbms_cents, idempotency_key, metadata
    ) VALUES ($1, $2, $3, 'credit', $4, $5, $6, $7, $8, $9)
  `, [
    projectId, sellerId, platformAccount.id,
    totalCents.toString(), currency, debitEntry.id, totalItbms.toString(),
    `fee_sweep_credit_${idempotencyKey}`,
    JSON.stringify({ 
      fee_sweep: true, 
      obligation_count: obligations.length,
      obligation_ids: obligations.map((o: { id: string }) => o.id)
    })
  ]);

  // Mark obligations as swept
  const obligationIds = obligations.map((o: { id: string }) => o.id);
  await client.query(`
    UPDATE fee_obligations
    SET status = 'swept', swept_at = NOW()
    WHERE id = ANY($1)
  `, [obligationIds]);

  return {
    sellerId,
    sweptCount: obligations.length,
    totalCents,
    totalItbmsCents: totalItbms,
    currency,
    timestamp: new Date(),
  };
}

/**
 * Batch fee sweep for multiple sellers
 * 
 * @param client - Database transaction client
 * @param batchSize - Maximum number of sellers to process (default: 100)
 * @returns FeeSweepBatchResult with summary of all sweeps
 */
export async function batchFeeSweep(
  client: PoolClient,
  batchSize: number = 100
): Promise<FeeSweepBatchResult> {
  const results: FeeSweepResult[] = [];
  const errors: Array<{ sellerId: string; error: string }> = [];
  
  // Get sellers with pending obligations
  const { rows: sellers } = await client.query(`
    SELECT DISTINCT s.id, s.project_id
    FROM sellers s
    INNER JOIN fee_obligations fo ON fo.seller_id = s.id
    WHERE fo.status = 'pending'
    LIMIT $1
  `, [batchSize]);

  for (const seller of sellers) {
    try {
      const result = await sweepSellerFees(client, seller.id, seller.project_id);
      if (result) {
        results.push(result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push({ sellerId: seller.id, error: errorMessage });
    }
  }

  const totalSweptCents = results.reduce((sum, r) => sum + r.totalCents, BigInt(0));

  return {
    processedSellers: sellers.length,
    totalSweptCents,
    results,
    errors,
  };
}

/**
 * Get pending fee obligations summary for a seller
 */
export async function getPendingFeeSummary(
  client: PoolClient,
  sellerId: string
): Promise<{
  count: number;
  totalCents: bigint;
  totalItbmsCents: bigint;
  currency: string | null;
} | null> {
  const { rows: [summary] } = await client.query(`
    SELECT 
      COUNT(*) as count,
      COALESCE(SUM(amount_cents), 0) as total_cents,
      COALESCE(SUM(itbms_cents), 0) as total_itbms_cents,
      MAX(currency) as currency
    FROM fee_obligations
    WHERE seller_id = $1 AND status = 'pending'
  `, [sellerId]);

  if (!summary || summary.count === '0') {
    return null;
  }

  return {
    count: parseInt(summary.count),
    totalCents: BigInt(summary.total_cents),
    totalItbmsCents: BigInt(summary.total_itbms_cents),
    currency: summary.currency,
  };
}
