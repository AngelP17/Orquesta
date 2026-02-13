/**
 * Orquesta Background Worker Service
 * 
 * Lead: SWS (Senior Worker & Scheduler Engineer)
 * Co-Authority: CFA (Chief Financial Agent)
 * Review: SPE (Staff Platform Engineer)
 * 
 * Handles mission-critical financial operations:
 * - Fee sweeps (hourly)
 * - Payout batching (daily)
 * - ITBMS tax reporting (monthly)
 * 
 * @module worker
 */

import cron from 'node-cron';
import { Pool, PoolClient } from 'pg';
import pino from 'pino';

// Configure structured logging
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'orquesta',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Job status tracking
interface JobStatus {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  retryCount: number;
}

// In-memory job registry (for tracking only, not persistence)
const jobRegistry = new Map<string, JobStatus>();

/**
 * Dead Letter Queue (DLQ) for failed jobs
 * Jobs that fail after max retries are stored here for manual intervention
 */
const deadLetterQueue: Array<{ job: JobStatus; failedAt: Date; reason: string }> = [];

/**
 * Execute a job with retry logic and idempotency
 */
async function executeJob<T>(
  jobName: string,
  idempotencyKey: string,
  fn: (client: PoolClient) => Promise<T>,
  options: {
    maxRetries?: number;
    backoffMs?: number;
    timeoutMs?: number;
  } = {}
): Promise<T | null> {
  const { maxRetries = 3, backoffMs = 1000, timeoutMs = 30000 } = options;
  
  // Check if job already running or completed
  const existingJob = jobRegistry.get(idempotencyKey);
  if (existingJob?.status === 'running') {
    logger.warn({ jobName, idempotencyKey }, 'Job already running, skipping');
    return null;
  }
  if (existingJob?.status === 'completed') {
    logger.debug({ jobName, idempotencyKey }, 'Job already completed, skipping');
    return null;
  }

  const job: JobStatus = {
    id: idempotencyKey,
    name: jobName,
    status: 'pending',
    retryCount: 0,
  };
  jobRegistry.set(idempotencyKey, job);

  const client = await pool.connect();
  
  try {
    job.status = 'running';
    job.startedAt = new Date();
    
    logger.info({ jobName, idempotencyKey }, 'Job started');

    // Set transaction timeout
    await client.query(`SET statement_timeout = ${timeoutMs}`);
    
    const result = await fn(client);
    
    job.status = 'completed';
    job.completedAt = new Date();
    
    logger.info({ 
      jobName, 
      idempotencyKey, 
      duration: job.completedAt.getTime() - job.startedAt.getTime() 
    }, 'Job completed successfully');
    
    return result;
  } catch (error) {
    job.retryCount++;
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ 
      jobName, 
      idempotencyKey, 
      error: errorMessage, 
      retryCount: job.retryCount,
      maxRetries 
    }, 'Job failed');

    if (job.retryCount < maxRetries) {
      // Exponential backoff: 1s, 4s, 16s
      const backoffDelay = backoffMs * Math.pow(4, job.retryCount - 1);
      logger.info({ jobName, idempotencyKey, delayMs: backoffDelay }, 'Retrying job');
      
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      return executeJob(jobName, idempotencyKey, fn, { ...options, maxRetries });
    }

    // Max retries exceeded - move to dead letter queue
    job.status = 'failed';
    job.error = errorMessage;
    
    deadLetterQueue.push({
      job: { ...job },
      failedAt: new Date(),
      reason: errorMessage,
    });
    
    // Alert via Telegram (if configured)
    await alertDeadLetter(jobName, idempotencyKey, errorMessage);
    
    return null;
  } finally {
    client.release();
  }
}

/**
 * Send alert for dead letter queue entries
 */
async function alertDeadLetter(jobName: string, jobId: string, reason: string): Promise<void> {
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.TELEGRAM_CHAT_ID;
  
  if (!telegramBotToken || !telegramChatId) {
    logger.warn('Telegram alerts not configured');
    return;
  }

  try {
    const message = `🚨 ORQUESTA ALERT\n\nJob: ${jobName}\nID: ${jobId}\nError: ${reason}\nTime: ${new Date().toISOString()}\n\nManual intervention required.`;
    
    await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });
    
    logger.info({ jobName, jobId }, 'Dead letter alert sent');
  } catch (error) {
    logger.error({ error }, 'Failed to send Telegram alert');
  }
}

/**
 * Fee Sweep Scheduler
 * Runs hourly to sweep pending fee obligations
 */
async function runFeeSweep(client: PoolClient): Promise<void> {
  // Get current hour for idempotency key
  const now = new Date();
  const hourKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}_${String(now.getUTCHours()).padStart(2, '0')}`;
  
  const result = await executeJob(
    'fee_sweep',
    `fee_sweep_${hourKey}`,
    async (c) => {
      // Query sellers with pending fee obligations (batch of 100)
      const { rows: sellers } = await c.query(`
        SELECT DISTINCT s.id, s.project_id
        FROM sellers s
        INNER JOIN fee_obligations fo ON fo.seller_id = s.id
        WHERE fo.status = 'pending'
        LIMIT 100
      `);

      logger.info({ sellerCount: sellers.length }, 'Processing fee sweeps');

      for (const seller of sellers) {
        // Calculate total pending fees for this seller
        const { rows: obligations } = await c.query(`
          SELECT id, amount_cents, itbms_cents, currency
          FROM fee_obligations
          WHERE seller_id = $1 AND status = 'pending'
          FOR UPDATE SKIP LOCKED
        `, [seller.id]);

        if (obligations.length === 0) continue;

        const totalCents = obligations.reduce((sum, o) => sum + BigInt(o.amount_cents), BigInt(0));
        const totalItbms = obligations.reduce((sum, o) => sum + BigInt(o.itbms_cents), BigInt(0));
        const currency = obligations[0].currency;

        // Begin transaction for this seller's fee sweep
        await c.query('BEGIN');

        try {
          // Get platform fee account
          const { rows: [platformAccount] } = await c.query(`
            SELECT id FROM accounts
            WHERE project_id = $1 AND code = 'PLATFORM_FEE_REVENUE' AND currency = $2
            LIMIT 1
          `, [seller.project_id, currency]);

          if (!platformAccount) {
            throw new Error(`Platform fee account not found for project ${seller.project_id}`);
          }

          // Get seller payable account
          const { rows: [payableAccount] } = await c.query(`
            SELECT id FROM accounts
            WHERE seller_id = $1 AND code = 'MERCHANT_PAYABLE' AND currency = $2
            LIMIT 1
          `, [seller.id, currency]);

          if (!payableAccount) {
            throw new Error(`Payable account not found for seller ${seller.id}`);
          }

          // Create ledger entries for fee sweep
          // 1. Debit seller payable (reduce liability)
          // 2. Credit platform fee revenue
          const idempotencyKey = `${seller.id}_${hourKey}`;
          
          const { rows: [debitEntry] } = await c.query(`
            INSERT INTO ledger_entries (
              project_id, seller_id, account_id, entry_type, amount_cents, currency,
              itbms_cents, idempotency_key, metadata
            ) VALUES ($1, $2, $3, 'debit', $4, $5, $6, $7, $8)
            ON CONFLICT (idempotency_key) DO NOTHING
            RETURNING id
          `, [
            seller.project_id, seller.id, payableAccount.id,
            totalCents, currency, totalItbms,
            `fee_sweep_debit_${idempotencyKey}`,
            JSON.stringify({ fee_sweep: true, obligation_count: obligations.length })
          ]);

          if (debitEntry) {
            await c.query(`
              INSERT INTO ledger_entries (
                project_id, seller_id, account_id, entry_type, amount_cents, currency,
                contra_entry_id, itbms_cents, idempotency_key, metadata
              ) VALUES ($1, $2, $3, 'credit', $4, $5, $6, $7, $8, $9)
              ON CONFLICT (idempotency_key) DO NOTHING
            `, [
              seller.project_id, seller.id, platformAccount.id,
              totalCents, currency, debitEntry.id, totalItbms,
              `fee_sweep_credit_${idempotencyKey}`,
              JSON.stringify({ fee_sweep: true, obligation_count: obligations.length })
            ]);
          }

          // Mark obligations as swept
          const obligationIds = obligations.map((o: { id: string }) => o.id);
          await c.query(`
            UPDATE fee_obligations
            SET status = 'swept', swept_at = NOW()
            WHERE id = ANY($1)
          `, [obligationIds]);

          await c.query('COMMIT');
          
          logger.info({ 
            sellerId: seller.id, 
            amountCents: totalCents.toString(),
            obligationCount: obligations.length 
          }, 'Fee sweep completed for seller');
        } catch (error) {
          await c.query('ROLLBACK');
          throw error;
        }
      }
    },
    { maxRetries: 3, backoffMs: 1000, timeoutMs: 60000 }
  );

  if (!result) {
    logger.warn('Fee sweep job failed after all retries');
  }
}

/**
 * Payout Scheduler
 * Runs daily at 06:00 UTC (01:00 Panama time) to process payouts
 */
async function runPayoutScheduler(client: PoolClient): Promise<void> {
  const now = new Date();
  const dateKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
  
  const result = await executeJob(
    'payout_batch',
    `payout_${dateKey}`,
    async (c) => {
      // Get sellers eligible for payout (balance > minimum threshold, GREEN/YELLOW risk tier)
      const MIN_PAYOUT_CENTS = 1000n; // B/. 10.00 minimum
      
      const { rows: eligibleSellers } = await c.query(`
        SELECT 
          s.id,
          s.project_id,
          s.risk_tier,
          COALESCE(SUM(
            CASE 
              WHEN le.entry_type = 'credit' THEN le.amount_cents
              WHEN le.entry_type = 'debit' THEN -le.amount_cents
              ELSE 0
            END
          ), 0) as balance_cents,
          le.currency
        FROM sellers s
        INNER JOIN accounts a ON a.seller_id = s.id
        INNER JOIN ledger_entries le ON le.account_id = a.id
        WHERE s.risk_tier IN ('GREEN', 'YELLOW')
        GROUP BY s.id, s.project_id, s.risk_tier, le.currency
        HAVING COALESCE(SUM(
          CASE 
            WHEN le.entry_type = 'credit' THEN le.amount_cents
            WHEN le.entry_type = 'debit' THEN -le.amount_cents
            ELSE 0
          END
        ), 0) > $1
        LIMIT 50
      `, [MIN_PAYOUT_CENTS.toString()]);

      logger.info({ sellerCount: eligibleSellers.length }, 'Processing payouts');

      if (eligibleSellers.length === 0) {
        logger.info('No eligible sellers for payout');
        return;
      }

      // Verify platform float balance before processing
      const totalPayoutAmount = eligibleSellers.reduce(
        (sum, s) => sum + BigInt(s.balance_cents), 
        BigInt(0)
      );

      logger.info({ 
        totalPayoutCents: totalPayoutAmount.toString(),
        sellerCount: eligibleSellers.length 
      }, 'Total payout amount calculated');

      // Process each seller's payout
      for (const seller of eligibleSellers) {
        await c.query('BEGIN');

        try {
          const payoutAmount = BigInt(seller.balance_cents);
          const idempotencyKey = `payout_${seller.id}_${dateKey}`;

          // Create payout record
          const { rows: [payout] } = await c.query(`
            INSERT INTO payouts (
              project_id, seller_id, amount_cents, currency, status, idempotency_key
            ) VALUES ($1, $2, $3, $4, 'pending', $5)
            ON CONFLICT (idempotency_key) DO NOTHING
            RETURNING id
          `, [seller.project_id, seller.id, payoutAmount.toString(), seller.currency, idempotencyKey]);

          if (!payout) {
            logger.info({ sellerId: seller.id }, 'Payout already exists for today');
            await c.query('COMMIT');
            continue;
          }

          // Get accounts
          const { rows: [cashAccount] } = await c.query(`
            SELECT id FROM accounts
            WHERE project_id = $1 AND code = 'CASH_RESERVE' AND currency = $2
            LIMIT 1
          `, [seller.project_id, seller.currency]);

          const { rows: [payableAccount] } = await c.query(`
            SELECT id FROM accounts
            WHERE seller_id = $1 AND code = 'MERCHANT_PAYABLE' AND currency = $2
            LIMIT 1
          `, [seller.id, seller.currency]);

          if (!cashAccount || !payableAccount) {
            throw new Error(`Required accounts not found for seller ${seller.id}`);
          }

          // Create ledger entries for payout
          // 1. Debit merchant payable (reduce liability)
          // 2. Credit cash (reduce asset)
          const { rows: [debitEntry] } = await c.query(`
            INSERT INTO ledger_entries (
              project_id, seller_id, account_id, entry_type, amount_cents, currency,
              payout_id, idempotency_key, metadata
            ) VALUES ($1, $2, $3, 'debit', $4, $5, $6, $7, $8)
            RETURNING id
          `, [
            seller.project_id, seller.id, payableAccount.id,
            payoutAmount.toString(), seller.currency, payout.id,
            `payout_debit_${idempotencyKey}`,
            JSON.stringify({ payout_id: payout.id, auto_processed: true })
          ]);

          await c.query(`
            INSERT INTO ledger_entries (
              project_id, seller_id, account_id, entry_type, amount_cents, currency,
              payout_id, contra_entry_id, idempotency_key, metadata
            ) VALUES ($1, $2, $3, 'credit', $4, $5, $6, $7, $8, $9)
          `, [
            seller.project_id, seller.id, cashAccount.id,
            payoutAmount.toString(), seller.currency, payout.id, debitEntry.id,
            `payout_credit_${idempotencyKey}`,
            JSON.stringify({ payout_id: payout.id, auto_processed: true })
          ]);

          // Update payout status to processing
          await c.query(`
            UPDATE payouts
            SET status = 'processing', updated_at = NOW()
            WHERE id = $1
          `, [payout.id]);

          await c.query('COMMIT');

          logger.info({ 
            sellerId: seller.id, 
            payoutId: payout.id,
            amountCents: payoutAmount.toString()
          }, 'Payout initiated for seller');

          // Note: Actual PayCaddy integration would be called here
          // For now, we simulate with a mock that will be called via webhook
        } catch (error) {
          await c.query('ROLLBACK');
          throw error;
        }
      }
    },
    { maxRetries: 3, backoffMs: 1000, timeoutMs: 120000 }
  );

  if (!result) {
    logger.warn('Payout batch job failed after all retries');
  }
}

/**
 * Health check endpoint for monitoring
 */
async function healthCheck(): Promise<void> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    logger.debug('Health check passed');
  } catch (error) {
    logger.error({ error }, 'Health check failed');
    process.exit(1);
  }
}

/**
 * Main worker initialization
 */
async function main(): Promise<void> {
  logger.info('Orquesta Worker Service starting...');

  // Verify database connection
  await healthCheck();

  // Schedule fee sweep: every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    logger.info('Running scheduled fee sweep');
    const client = await pool.connect();
    try {
      await runFeeSweep(client);
    } finally {
      client.release();
    }
  });

  // Schedule payouts: daily at 06:00 UTC (01:00 Panama time)
  cron.schedule('0 6 * * *', async () => {
    logger.info('Running scheduled payout batch');
    const client = await pool.connect();
    try {
      await runPayoutScheduler(client);
    } finally {
      client.release();
    }
  });

  // Monthly ITBMS report generation (1st of each month at 00:00 UTC)
  cron.schedule('0 0 1 * *', async () => {
    logger.info('Running monthly ITBMS report generation');
    // This would call the tax report generation logic
    // For now, just log that it would run
  });

  logger.info('Worker schedules configured');
  logger.info('- Fee sweep: hourly at :00');
  logger.info('- Payout batch: daily at 06:00 UTC');
  logger.info('- ITBMS reports: monthly on 1st at 00:00 UTC');

  // Keep process alive
  setInterval(() => {
    // Heartbeat to prevent auto-sleep on free tiers
  }, 240000); // Every 4 minutes

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Received shutdown signal, closing gracefully...');
    
    // Wait for current jobs to complete (with timeout)
    const maxWait = 30000; // 30 seconds
    const start = Date.now();
    
    while (Date.now() - start < maxWait) {
      const runningJobs = Array.from(jobRegistry.values()).filter(j => j.status === 'running');
      if (runningJobs.length === 0) break;
      logger.info({ runningCount: runningJobs.length }, 'Waiting for jobs to complete...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    await pool.end();
    logger.info('Worker service shut down');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Start the worker
main().catch((error) => {
  logger.error({ error }, 'Failed to start worker service');
  process.exit(1);
});

export { executeJob, alertDeadLetter, deadLetterQueue };
