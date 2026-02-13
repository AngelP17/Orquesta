import { randomUUID } from 'node:crypto';
import type { Currency, Storage } from '../storage/types';

export interface LedgerPostingLine {
  accountId: string;
  entryType: 'debit' | 'credit';
  amountCents: bigint;
  currency: Currency;
  sellerId?: string;
  paymentIntentId?: string;
  payoutId?: string;
  itbmsCents?: bigint;
  metadata?: Record<string, string>;
}

export interface LedgerTransactionInput {
  projectId: string;
  idempotencyKey: string;
  lines: [LedgerPostingLine, LedgerPostingLine, ...LedgerPostingLine[]];
}

export const validateZeroSum = (lines: LedgerPostingLine[]): void => {
  let debits = 0n;
  let credits = 0n;

  for (const line of lines) {
    if (line.amountCents <= 0n) {
      throw new Error('Ledger line amount must be > 0 cents.');
    }
    if (line.entryType === 'debit') debits += line.amountCents;
    if (line.entryType === 'credit') credits += line.amountCents;
  }

  if (debits !== credits) {
    throw new Error(`Ledger transaction is unbalanced (debits=${debits} credits=${credits}).`);
  }
};

export const recordTransaction = async (storage: Storage, input: LedgerTransactionInput) => {
  validateZeroSum(input.lines);

  const baseKey = input.idempotencyKey;
  return storage.withTransaction(async (tx) => {
    const entries = input.lines.map((line, index) => ({
      projectId: input.projectId,
      sellerId: line.sellerId ?? null,
      accountId: line.accountId,
      entryType: line.entryType,
      amountCents: line.amountCents,
      currency: line.currency,
      paymentIntentId: line.paymentIntentId,
      payoutId: line.payoutId,
      itbmsCents: line.itbmsCents ?? 0n,
      metadata: line.metadata,
      idempotencyKey: randomUUID({ disableEntropyCache: true })
    }));

    // Deterministic derivation from request idempotency key + position.
    entries.forEach((entry, index) => {
      entry.idempotencyKey = cryptoDeterministicKey(baseKey, index);
    });

    return tx.appendLedgerEntries(entries);
  });
};

const cryptoDeterministicKey = (seed: string, index: number): string => {
  const padded = index.toString().padStart(12, '0');
  const compact = `${seed.replace(/-/g, '').slice(0, 20)}${padded}`.slice(0, 32);
  return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20).padEnd(12, '0')}`;
};
