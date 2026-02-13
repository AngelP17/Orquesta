export type Currency = 'PAB' | 'USD';
export type RiskTier = 'GREEN' | 'YELLOW' | 'RED' | 'BLACK';
export type PaymentIntentStatus =
  | 'requires_payment_method'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'canceled';

export interface Project {
  id: string;
  name: string;
  environment: 'test' | 'live';
  apiKeyHash: string;
  createdAt: Date;
}

export interface Seller {
  id: string;
  projectId: string;
  name: string;
  email: string;
  ruc: string;
  riskTier: RiskTier;
  preferredCurrency: Currency;
  createdAt: Date;
}

export interface Account {
  id: string;
  projectId: string;
  sellerId: string | null;
  code: string;
  name: string;
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  currency: Currency;
}

export interface PaymentIntent {
  id: string;
  projectId: string;
  sellerId: string;
  amountCents: bigint;
  currency: Currency;
  status: PaymentIntentStatus;
  provider: 'yappy';
  externalId: string | null;
  idempotencyKey: string;
  metadata: Record<string, string>;
  createdAt: Date;
}

export interface FeeObligation {
  id: string;
  projectId: string;
  sellerId: string;
  paymentIntentId: string | null;
  amountCents: bigint;
  itbmsCents: bigint;
  currency: Currency;
  status: 'pending' | 'swept' | 'waived';
  idempotencyKey: string;
  createdAt: Date;
  sweptAt: Date | null;
}

export interface Payout {
  id: string;
  projectId: string;
  sellerId: string;
  amountCents: bigint;
  currency: Currency;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  externalId: string | null;
  idempotencyKey: string;
  createdAt: Date;
}

export interface LedgerEntry {
  id: string;
  projectId: string;
  sellerId: string | null;
  accountId: string;
  entryType: 'debit' | 'credit';
  amountCents: bigint;
  currency: Currency;
  contraEntryId?: string;
  paymentIntentId?: string;
  payoutId?: string;
  itbmsCents?: bigint;
  metadata?: Record<string, string>;
  idempotencyKey: string;
  createdAt: Date;
}

export interface CreateProjectInput {
  name: string;
  environment: 'test' | 'live';
  apiKeyHash: string;
}

export interface CreateSellerInput {
  projectId: string;
  name: string;
  email: string;
  ruc: string;
  riskTier?: RiskTier;
  preferredCurrency?: Currency;
}

export interface CreatePaymentIntentInput {
  projectId: string;
  sellerId: string;
  amountCents: bigint;
  currency: Currency;
  idempotencyKey: string;
  metadata?: Record<string, string>;
}

export interface CreateFeeObligationInput {
  projectId: string;
  sellerId: string;
  paymentIntentId?: string;
  amountCents: bigint;
  itbmsCents: bigint;
  currency: Currency;
  idempotencyKey: string;
}

export interface CreatePayoutInput {
  projectId: string;
  sellerId: string;
  amountCents: bigint;
  currency: Currency;
  idempotencyKey: string;
}

export interface PaginatedResult<T> {
  data: T[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface Storage {
  createProject(input: CreateProjectInput): Promise<Project>;
  listProjects(limit: number, cursor?: string): Promise<PaginatedResult<Project>>;
  getProjectById(id: string): Promise<Project | null>;
  findProjectByApiKeyHash(apiKeyHash: string): Promise<Project | null>;

  createSeller(input: CreateSellerInput): Promise<Seller>;
  getSellerById(id: string): Promise<Seller | null>;
  listSellers(projectId: string, limit: number, cursor?: string): Promise<PaginatedResult<Seller>>;
  updateSellerRiskTier(id: string, riskTier: RiskTier): Promise<Seller | null>;

  createAccount(input: Omit<Account, 'id'>): Promise<Account>;
  getAccountByCode(projectId: string, code: string, currency: Currency): Promise<Account | null>;

  createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntent>;
  getPaymentIntentById(id: string): Promise<PaymentIntent | null>;
  getPaymentIntentByIdempotencyKey(projectId: string, idempotencyKey: string): Promise<PaymentIntent | null>;
  listPaymentIntents(projectId: string, limit: number, cursor?: string): Promise<PaginatedResult<PaymentIntent>>;
  updatePaymentIntentStatus(id: string, status: PaymentIntentStatus, externalId?: string): Promise<PaymentIntent | null>;

  createFeeObligation(input: CreateFeeObligationInput): Promise<FeeObligation>;
  listPendingFeeObligations(projectId: string, sellerId?: string): Promise<FeeObligation[]>;
  markFeeObligationSwept(id: string): Promise<void>;

  createPayout(input: CreatePayoutInput): Promise<Payout>;
  updatePayoutStatus(id: string, status: Payout['status'], externalId?: string): Promise<Payout | null>;

  appendLedgerEntries(entries: Omit<LedgerEntry, 'id' | 'createdAt'>[]): Promise<LedgerEntry[]>;
  getSellerBalance(projectId: string, sellerId: string, currency: Currency): Promise<bigint>;

  withTransaction<T>(fn: (tx: Storage) => Promise<T>): Promise<T>;
}
