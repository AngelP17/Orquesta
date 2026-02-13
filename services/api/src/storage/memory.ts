import { randomUUID } from 'node:crypto';
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

const paginate = <T extends { id: string }>(items: T[], limit: number, cursor?: string): PaginatedResult<T> => {
  const sorted = [...items].sort((a, b) => (a.id > b.id ? 1 : -1));
  const start = cursor ? sorted.findIndex((item) => item.id === cursor) + 1 : 0;
  const normalizedLimit = Math.min(Math.max(limit, 1), 100);
  const slice = sorted.slice(start, start + normalizedLimit + 1);
  const data = slice.slice(0, normalizedLimit);
  const hasMore = slice.length > normalizedLimit;
  return {
    data,
    hasMore,
    nextCursor: hasMore ? data[data.length - 1]?.id ?? null : null
  };
};

export class MemoryStorage implements Storage {
  private projects = new Map<string, Project>();
  private sellers = new Map<string, Seller>();
  private accounts = new Map<string, Account>();
  private paymentIntents = new Map<string, PaymentIntent>();
  private feeObligations = new Map<string, FeeObligation>();
  private payouts = new Map<string, Payout>();
  private ledgerEntries = new Map<string, LedgerEntry>();

  async createProject(input: CreateProjectInput): Promise<Project> {
    const project: Project = {
      id: randomUUID(),
      name: input.name,
      environment: input.environment,
      apiKeyHash: input.apiKeyHash,
      createdAt: new Date()
    };
    this.projects.set(project.id, project);
    return project;
  }

  async listProjects(limit: number, cursor?: string): Promise<PaginatedResult<Project>> {
    return paginate([...this.projects.values()], limit, cursor);
  }

  async getProjectById(id: string): Promise<Project | null> {
    return this.projects.get(id) ?? null;
  }

  async findProjectByApiKeyHash(apiKeyHash: string): Promise<Project | null> {
    const found = [...this.projects.values()].find((project) => project.apiKeyHash === apiKeyHash);
    return found ?? null;
  }

  async createSeller(input: CreateSellerInput): Promise<Seller> {
    const seller: Seller = {
      id: randomUUID(),
      projectId: input.projectId,
      name: input.name,
      email: input.email,
      ruc: input.ruc,
      riskTier: input.riskTier ?? 'GREEN',
      preferredCurrency: input.preferredCurrency ?? 'PAB',
      createdAt: new Date()
    };
    this.sellers.set(seller.id, seller);
    return seller;
  }

  async getSellerById(id: string): Promise<Seller | null> {
    return this.sellers.get(id) ?? null;
  }

  async listSellers(projectId: string, limit: number, cursor?: string): Promise<PaginatedResult<Seller>> {
    const sellers = [...this.sellers.values()].filter((seller) => seller.projectId === projectId);
    return paginate(sellers, limit, cursor);
  }

  async updateSellerRiskTier(id: string, riskTier: RiskTier): Promise<Seller | null> {
    const seller = this.sellers.get(id);
    if (!seller) return null;
    const next = { ...seller, riskTier };
    this.sellers.set(id, next);
    return next;
  }

  async createAccount(input: Omit<Account, 'id'>): Promise<Account> {
    const account: Account = { id: randomUUID(), ...input };
    this.accounts.set(account.id, account);
    return account;
  }

  async getAccountByCode(projectId: string, code: string, currency: Currency): Promise<Account | null> {
    const found = [...this.accounts.values()].find(
      (account) => account.projectId === projectId && account.code === code && account.currency === currency
    );
    return found ?? null;
  }

  async createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntent> {
    const paymentIntent: PaymentIntent = {
      id: randomUUID(),
      projectId: input.projectId,
      sellerId: input.sellerId,
      amountCents: input.amountCents,
      currency: input.currency,
      status: 'processing',
      provider: 'yappy',
      externalId: null,
      idempotencyKey: input.idempotencyKey,
      metadata: input.metadata ?? {},
      createdAt: new Date()
    };
    this.paymentIntents.set(paymentIntent.id, paymentIntent);
    return paymentIntent;
  }

  async getPaymentIntentById(id: string): Promise<PaymentIntent | null> {
    return this.paymentIntents.get(id) ?? null;
  }

  async getPaymentIntentByIdempotencyKey(projectId: string, idempotencyKey: string): Promise<PaymentIntent | null> {
    const found = [...this.paymentIntents.values()].find(
      (intent) => intent.projectId === projectId && intent.idempotencyKey === idempotencyKey
    );
    return found ?? null;
  }

  async listPaymentIntents(projectId: string, limit: number, cursor?: string): Promise<PaginatedResult<PaymentIntent>> {
    const intents = [...this.paymentIntents.values()].filter((intent) => intent.projectId === projectId);
    return paginate(intents, limit, cursor);
  }

  async updatePaymentIntentStatus(id: string, status: PaymentIntentStatus, externalId?: string): Promise<PaymentIntent | null> {
    const paymentIntent = this.paymentIntents.get(id);
    if (!paymentIntent) return null;
    const next = { ...paymentIntent, status, externalId: externalId ?? paymentIntent.externalId };
    this.paymentIntents.set(id, next);
    return next;
  }

  async createFeeObligation(input: CreateFeeObligationInput): Promise<FeeObligation> {
    const fee: FeeObligation = {
      id: randomUUID(),
      projectId: input.projectId,
      sellerId: input.sellerId,
      paymentIntentId: input.paymentIntentId ?? null,
      amountCents: input.amountCents,
      itbmsCents: input.itbmsCents,
      currency: input.currency,
      status: 'pending',
      idempotencyKey: input.idempotencyKey,
      createdAt: new Date(),
      sweptAt: null
    };
    this.feeObligations.set(fee.id, fee);
    return fee;
  }

  async listPendingFeeObligations(projectId: string, sellerId?: string): Promise<FeeObligation[]> {
    return [...this.feeObligations.values()].filter(
      (obligation) =>
        obligation.projectId === projectId &&
        obligation.status === 'pending' &&
        (sellerId ? obligation.sellerId === sellerId : true)
    );
  }

  async markFeeObligationSwept(id: string): Promise<void> {
    const fee = this.feeObligations.get(id);
    if (!fee) return;
    this.feeObligations.set(id, { ...fee, status: 'swept', sweptAt: new Date() });
  }

  async createPayout(input: CreatePayoutInput): Promise<Payout> {
    const payout: Payout = {
      id: randomUUID(),
      projectId: input.projectId,
      sellerId: input.sellerId,
      amountCents: input.amountCents,
      currency: input.currency,
      status: 'pending',
      externalId: null,
      idempotencyKey: input.idempotencyKey,
      createdAt: new Date()
    };
    this.payouts.set(payout.id, payout);
    return payout;
  }

  async updatePayoutStatus(id: string, status: Payout['status'], externalId?: string): Promise<Payout | null> {
    const payout = this.payouts.get(id);
    if (!payout) return null;
    const next = { ...payout, status, externalId: externalId ?? payout.externalId };
    this.payouts.set(id, next);
    return next;
  }

  async appendLedgerEntries(entries: Omit<LedgerEntry, 'id' | 'createdAt'>[]): Promise<LedgerEntry[]> {
    const created = entries.map((entry) => ({ id: randomUUID(), createdAt: new Date(), ...entry }));
    for (const entry of created) {
      this.ledgerEntries.set(entry.id, entry);
    }
    return created;
  }

  async getSellerBalance(projectId: string, sellerId: string, currency: Currency): Promise<bigint> {
    const rows = [...this.ledgerEntries.values()].filter(
      (entry) => entry.projectId === projectId && entry.sellerId === sellerId && entry.currency === currency
    );

    const credits = rows.filter((entry) => entry.entryType === 'credit').reduce((sum, entry) => sum + entry.amountCents, 0n);
    const debits = rows.filter((entry) => entry.entryType === 'debit').reduce((sum, entry) => sum + entry.amountCents, 0n);
    return credits - debits;
  }

  async withTransaction<T>(fn: (tx: Storage) => Promise<T>): Promise<T> {
    return fn(this);
  }
}

export const createMemoryStorage = (): Storage => new MemoryStorage();
