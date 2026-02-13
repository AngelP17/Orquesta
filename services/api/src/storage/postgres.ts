import { randomUUID } from 'node:crypto';
import { Pool, PoolClient } from 'pg';
import type {
  Account,
  CreateFeeObligationInput,
  CreatePaymentIntentInput,
  CreatePayoutInput,
  CreateProjectInput,
  CreateSellerInput,
  Currency,
  FeeObligation,
  LedgerEntry,
  PaginatedResult,
  PaymentIntent,
  PaymentIntentStatus,
  Payout,
  Project,
  RiskTier,
  Seller,
  Storage
} from './types';

const parseBigInt = (value: unknown): bigint => BigInt(value as string);

const mapProject = (row: any): Project => ({
  id: row.id,
  name: row.name,
  environment: row.environment,
  apiKeyHash: row.api_key_hash,
  createdAt: row.created_at
});

const mapSeller = (row: any): Seller => ({
  id: row.id,
  projectId: row.project_id,
  name: row.name,
  email: row.email,
  ruc: row.ruc,
  riskTier: row.risk_tier,
  preferredCurrency: row.preferred_currency,
  createdAt: row.created_at
});

const mapAccount = (row: any): Account => ({
  id: row.id,
  projectId: row.project_id,
  sellerId: row.seller_id,
  code: row.code,
  name: row.name,
  accountType: row.account_type,
  currency: row.currency
});

const mapPaymentIntent = (row: any): PaymentIntent => ({
  id: row.id,
  projectId: row.project_id,
  sellerId: row.seller_id,
  amountCents: parseBigInt(row.amount_cents),
  currency: row.currency,
  status: row.status,
  provider: row.provider,
  externalId: row.external_id,
  idempotencyKey: row.idempotency_key,
  metadata: row.metadata ?? {},
  createdAt: row.created_at
});

const mapFeeObligation = (row: any): FeeObligation => ({
  id: row.id,
  projectId: row.project_id,
  sellerId: row.seller_id,
  paymentIntentId: row.payment_intent_id,
  amountCents: parseBigInt(row.amount_cents),
  itbmsCents: parseBigInt(row.itbms_cents),
  currency: row.currency,
  status: row.status,
  idempotencyKey: row.idempotency_key,
  createdAt: row.created_at,
  sweptAt: row.swept_at
});

const mapPayout = (row: any): Payout => ({
  id: row.id,
  projectId: row.project_id,
  sellerId: row.seller_id,
  amountCents: parseBigInt(row.amount_cents),
  currency: row.currency,
  status: row.status,
  externalId: row.external_id,
  idempotencyKey: row.idempotency_key,
  createdAt: row.created_at
});

const mapLedgerEntry = (row: any): LedgerEntry => ({
  id: row.id,
  projectId: row.project_id,
  sellerId: row.seller_id,
  accountId: row.account_id,
  entryType: row.entry_type,
  amountCents: parseBigInt(row.amount_cents),
  currency: row.currency,
  contraEntryId: row.contra_entry_id,
  paymentIntentId: row.payment_intent_id,
  payoutId: row.payout_id,
  itbmsCents: parseBigInt(row.itbms_cents),
  metadata: row.metadata ?? {},
  idempotencyKey: row.idempotency_key,
  createdAt: row.created_at
});

class PostgresStorage implements Storage {
  constructor(private readonly queryable: Pool | PoolClient, private readonly pool?: Pool) {}

  async createProject(input: CreateProjectInput): Promise<Project> {
    const { rows } = await this.queryable.query(
      `INSERT INTO projects (name, environment, api_key_hash)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [input.name, input.environment, input.apiKeyHash]
    );

    return mapProject(rows[0]);
  }

  async listProjects(limit: number, cursor?: string): Promise<PaginatedResult<Project>> {
    const normalizedLimit = Math.min(Math.max(limit, 1), 100);
    const params: unknown[] = [normalizedLimit + 1];
    const cursorFilter = cursor ? 'WHERE id > $2' : '';
    if (cursor) params.push(cursor);

    const { rows } = await this.queryable.query(
      `SELECT id, name, environment, api_key_hash, created_at
       FROM projects
       ${cursorFilter}
       ORDER BY id ASC
       LIMIT $1`,
      params
    );

    const hasMore = rows.length > normalizedLimit;
    const data = rows.slice(0, normalizedLimit).map(mapProject);
    return {
      data,
      hasMore,
      nextCursor: hasMore ? data[data.length - 1]?.id ?? null : null
    };
  }

  async getProjectById(id: string): Promise<Project | null> {
    const { rows } = await this.queryable.query(
      'SELECT id, name, environment, api_key_hash, created_at FROM projects WHERE id = $1',
      [id]
    );
    return rows[0] ? mapProject(rows[0]) : null;
  }

  async findProjectByApiKeyHash(apiKeyHash: string): Promise<Project | null> {
    const { rows } = await this.queryable.query(
      'SELECT id, name, environment, api_key_hash, created_at FROM projects WHERE api_key_hash = $1',
      [apiKeyHash]
    );
    return rows[0] ? mapProject(rows[0]) : null;
  }

  async createSeller(input: CreateSellerInput): Promise<Seller> {
    const { rows } = await this.queryable.query(
      `INSERT INTO sellers (project_id, name, email, ruc, risk_tier, preferred_currency)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        input.projectId,
        input.name,
        input.email,
        input.ruc,
        input.riskTier ?? 'GREEN',
        input.preferredCurrency ?? 'PAB'
      ]
    );
    return mapSeller(rows[0]);
  }

  async getSellerById(id: string): Promise<Seller | null> {
    const { rows } = await this.queryable.query('SELECT * FROM sellers WHERE id = $1', [id]);
    return rows[0] ? mapSeller(rows[0]) : null;
  }

  async listSellers(projectId: string, limit: number, cursor?: string): Promise<PaginatedResult<Seller>> {
    const normalizedLimit = Math.min(Math.max(limit, 1), 100);
    const params: unknown[] = [projectId, normalizedLimit + 1];
    const cursorFilter = cursor ? 'AND id > $3' : '';
    if (cursor) params.push(cursor);

    const { rows } = await this.queryable.query(
      `SELECT *
       FROM sellers
       WHERE project_id = $1
       ${cursorFilter}
       ORDER BY id ASC
       LIMIT $2`,
      params
    );

    const hasMore = rows.length > normalizedLimit;
    const data = rows.slice(0, normalizedLimit).map(mapSeller);
    return {
      data,
      hasMore,
      nextCursor: hasMore ? data[data.length - 1]?.id ?? null : null
    };
  }

  async updateSellerRiskTier(id: string, riskTier: RiskTier): Promise<Seller | null> {
    const { rows } = await this.queryable.query(
      `UPDATE sellers
       SET risk_tier = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, riskTier]
    );
    return rows[0] ? mapSeller(rows[0]) : null;
  }

  async createAccount(input: Omit<Account, 'id'>): Promise<Account> {
    const { rows } = await this.queryable.query(
      `INSERT INTO accounts (project_id, seller_id, code, name, account_type, currency)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [input.projectId, input.sellerId, input.code, input.name, input.accountType, input.currency]
    );
    return mapAccount(rows[0]);
  }

  async getAccountByCode(projectId: string, code: string, currency: Currency): Promise<Account | null> {
    const { rows } = await this.queryable.query(
      'SELECT * FROM accounts WHERE project_id = $1 AND code = $2 AND currency = $3',
      [projectId, code, currency]
    );
    return rows[0] ? mapAccount(rows[0]) : null;
  }

  async createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntent> {
    const { rows } = await this.queryable.query(
      `INSERT INTO payment_intents (
          project_id, seller_id, amount_cents, currency, status, provider, idempotency_key, metadata
       ) VALUES ($1, $2, $3, $4, 'processing', 'yappy', $5, $6)
       RETURNING *`,
      [
        input.projectId,
        input.sellerId,
        input.amountCents.toString(),
        input.currency,
        input.idempotencyKey,
        input.metadata ?? {}
      ]
    );
    return mapPaymentIntent(rows[0]);
  }

  async getPaymentIntentById(id: string): Promise<PaymentIntent | null> {
    const { rows } = await this.queryable.query('SELECT * FROM payment_intents WHERE id = $1', [id]);
    return rows[0] ? mapPaymentIntent(rows[0]) : null;
  }

  async getPaymentIntentByIdempotencyKey(projectId: string, idempotencyKey: string): Promise<PaymentIntent | null> {
    const { rows } = await this.queryable.query(
      'SELECT * FROM payment_intents WHERE project_id = $1 AND idempotency_key = $2',
      [projectId, idempotencyKey]
    );
    return rows[0] ? mapPaymentIntent(rows[0]) : null;
  }

  async listPaymentIntents(projectId: string, limit: number, cursor?: string): Promise<PaginatedResult<PaymentIntent>> {
    const normalizedLimit = Math.min(Math.max(limit, 1), 100);
    const params: unknown[] = [projectId, normalizedLimit + 1];
    const cursorFilter = cursor ? 'AND id > $3' : '';
    if (cursor) params.push(cursor);

    const { rows } = await this.queryable.query(
      `SELECT *
       FROM payment_intents
       WHERE project_id = $1
       ${cursorFilter}
       ORDER BY id ASC
       LIMIT $2`,
      params
    );

    const hasMore = rows.length > normalizedLimit;
    const data = rows.slice(0, normalizedLimit).map(mapPaymentIntent);
    return {
      data,
      hasMore,
      nextCursor: hasMore ? data[data.length - 1]?.id ?? null : null
    };
  }

  async updatePaymentIntentStatus(id: string, status: PaymentIntentStatus, externalId?: string): Promise<PaymentIntent | null> {
    const { rows } = await this.queryable.query(
      `UPDATE payment_intents
       SET status = $2, external_id = COALESCE($3, external_id), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, status, externalId ?? null]
    );
    return rows[0] ? mapPaymentIntent(rows[0]) : null;
  }

  async createFeeObligation(input: CreateFeeObligationInput): Promise<FeeObligation> {
    const { rows } = await this.queryable.query(
      `INSERT INTO fee_obligations (
         project_id, seller_id, payment_intent_id, amount_cents, itbms_cents, currency, idempotency_key
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        input.projectId,
        input.sellerId,
        input.paymentIntentId ?? null,
        input.amountCents.toString(),
        input.itbmsCents.toString(),
        input.currency,
        input.idempotencyKey
      ]
    );
    return mapFeeObligation(rows[0]);
  }

  async listPendingFeeObligations(projectId: string, sellerId?: string): Promise<FeeObligation[]> {
    const params: unknown[] = [projectId];
    let sellerFilter = '';
    if (sellerId) {
      params.push(sellerId);
      sellerFilter = 'AND seller_id = $2';
    }

    const { rows } = await this.queryable.query(
      `SELECT *
       FROM fee_obligations
       WHERE project_id = $1 AND status = 'pending'
       ${sellerFilter}
       ORDER BY created_at ASC`,
      params
    );

    return rows.map(mapFeeObligation);
  }

  async markFeeObligationSwept(id: string): Promise<void> {
    await this.queryable.query(
      `UPDATE fee_obligations
       SET status = 'swept', swept_at = NOW()
       WHERE id = $1`,
      [id]
    );
  }

  async createPayout(input: CreatePayoutInput): Promise<Payout> {
    const { rows } = await this.queryable.query(
      `INSERT INTO payouts (project_id, seller_id, amount_cents, currency, status, idempotency_key)
       VALUES ($1, $2, $3, $4, 'pending', $5)
       RETURNING *`,
      [input.projectId, input.sellerId, input.amountCents.toString(), input.currency, input.idempotencyKey]
    );
    return mapPayout(rows[0]);
  }

  async updatePayoutStatus(id: string, status: Payout['status'], externalId?: string): Promise<Payout | null> {
    const { rows } = await this.queryable.query(
      `UPDATE payouts
       SET status = $2, external_id = COALESCE($3, external_id), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, status, externalId ?? null]
    );
    return rows[0] ? mapPayout(rows[0]) : null;
  }

  async appendLedgerEntries(entries: Omit<LedgerEntry, 'id' | 'createdAt'>[]): Promise<LedgerEntry[]> {
    const inserted: LedgerEntry[] = [];
    for (const entry of entries) {
      const { rows } = await this.queryable.query(
        `INSERT INTO ledger_entries (
          id, project_id, seller_id, account_id, entry_type, amount_cents, currency,
          contra_entry_id, payment_intent_id, payout_id, itbms_cents, metadata, idempotency_key
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13
        ) RETURNING *`,
        [
          randomUUID(),
          entry.projectId,
          entry.sellerId,
          entry.accountId,
          entry.entryType,
          entry.amountCents.toString(),
          entry.currency,
          entry.contraEntryId ?? null,
          entry.paymentIntentId ?? null,
          entry.payoutId ?? null,
          (entry.itbmsCents ?? 0n).toString(),
          entry.metadata ?? {},
          entry.idempotencyKey
        ]
      );
      inserted.push(mapLedgerEntry(rows[0]));
    }
    return inserted;
  }

  async getSellerBalance(projectId: string, sellerId: string, currency: Currency): Promise<bigint> {
    const { rows } = await this.queryable.query(
      `SELECT
         COALESCE(SUM(CASE WHEN entry_type = 'credit' THEN amount_cents ELSE 0 END), 0)
         - COALESCE(SUM(CASE WHEN entry_type = 'debit' THEN amount_cents ELSE 0 END), 0) AS balance_cents
       FROM ledger_entries
       WHERE project_id = $1
         AND seller_id = $2
         AND currency = $3`,
      [projectId, sellerId, currency]
    );

    return parseBigInt(rows[0]?.balance_cents ?? '0');
  }

  async withTransaction<T>(fn: (tx: Storage) => Promise<T>): Promise<T> {
    if (!this.pool) {
      return fn(this);
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const txStorage = new PostgresStorage(client);
      const result = await fn(txStorage);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export interface PostgresStorageOptions {
  connectionString: string;
  maxConnections?: number;
}

export const createPostgresStorage = (options: PostgresStorageOptions): Storage => {
  const pool = new Pool({ connectionString: options.connectionString, max: options.maxConnections ?? 10 });
  return new PostgresStorage(pool, pool);
};
