import { randomUUID } from 'node:crypto';
import type { Storage } from '../storage/types';
import { recordTransaction } from './ledger';

const ensureAccount = async (
  storage: Storage,
  projectId: string,
  code: string,
  name: string,
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense',
  currency: 'PAB' | 'USD'
) => {
  const existing = await storage.getAccountByCode(projectId, code, currency);
  if (existing) return existing;
  return storage.createAccount({ projectId, sellerId: null, code, name, accountType, currency });
};

export interface SweepResult {
  sweptCount: number;
  sweptAmountCents: bigint;
}

export const sweepPendingFees = async (storage: Storage, projectId: string, sellerId?: string): Promise<SweepResult> => {
  const obligations = await storage.listPendingFeeObligations(projectId, sellerId);
  let sweptAmountCents = 0n;

  for (const obligation of obligations) {
    await storage.withTransaction(async (tx) => {
      const payable = await ensureAccount(tx, projectId, '2100', 'Merchant Payables', 'liability', obligation.currency);
      const fees = await ensureAccount(tx, projectId, '4100', 'Platform Fees', 'revenue', obligation.currency);
      const itbms = await ensureAccount(tx, projectId, '2200', 'ITBMS Payable', 'liability', obligation.currency);

      await recordTransaction(tx, {
        projectId,
        idempotencyKey: randomUUID(),
        lines: [
          {
            accountId: payable.id,
            entryType: 'debit',
            amountCents: obligation.amountCents + obligation.itbmsCents,
            currency: obligation.currency,
            sellerId: obligation.sellerId,
            paymentIntentId: obligation.paymentIntentId ?? undefined,
            metadata: { source: 'fee_sweep' }
          },
          {
            accountId: fees.id,
            entryType: 'credit',
            amountCents: obligation.amountCents,
            currency: obligation.currency,
            sellerId: obligation.sellerId,
            paymentIntentId: obligation.paymentIntentId ?? undefined,
            metadata: { source: 'fee_sweep' }
          },
          {
            accountId: itbms.id,
            entryType: 'credit',
            amountCents: obligation.itbmsCents,
            currency: obligation.currency,
            sellerId: obligation.sellerId,
            paymentIntentId: obligation.paymentIntentId ?? undefined,
            itbmsCents: obligation.itbmsCents,
            metadata: { source: 'fee_sweep' }
          }
        ]
      });

      await tx.markFeeObligationSwept(obligation.id);
      sweptAmountCents += obligation.amountCents + obligation.itbmsCents;
    });
  }

  return { sweptCount: obligations.length, sweptAmountCents };
};
