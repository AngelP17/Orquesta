import { randomUUID } from 'node:crypto';
import type { Storage } from '../storage/types';
import { recordTransaction } from './ledger';

export interface PaycaddyGateway {
  createPayout(input: {
    sellerId: string;
    amountCents: bigint;
    currency: 'PAB' | 'USD';
    idempotencyKey: string;
  }): Promise<{ externalId: string; status: 'processing' | 'paid' }>;
}

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

export interface InitiatePayoutInput {
  projectId: string;
  sellerId: string;
  amountCents: bigint;
  currency: 'PAB' | 'USD';
  idempotencyKey?: string;
}

export const initiatePayout = async (
  storage: Storage,
  paycaddy: PaycaddyGateway,
  input: InitiatePayoutInput
) => {
  const idempotencyKey = input.idempotencyKey ?? randomUUID();

  const seller = await storage.getSellerById(input.sellerId);
  if (!seller || seller.projectId !== input.projectId) {
    throw new Error('Seller not found for project.');
  }

  if (seller.riskTier === 'RED' || seller.riskTier === 'BLACK') {
    throw new Error('Seller is not eligible for payouts due to risk tier.');
  }

  const availableBalance = await storage.getSellerBalance(input.projectId, input.sellerId, input.currency);
  if (availableBalance < input.amountCents) {
    throw new Error('Insufficient seller balance for payout.');
  }

  return storage.withTransaction(async (tx) => {
    const payout = await tx.createPayout({
      projectId: input.projectId,
      sellerId: input.sellerId,
      amountCents: input.amountCents,
      currency: input.currency,
      idempotencyKey
    });

    const payoutResult = await paycaddy.createPayout({
      sellerId: input.sellerId,
      amountCents: input.amountCents,
      currency: input.currency,
      idempotencyKey
    });

    const payable = await ensureAccount(tx, input.projectId, '2100', 'Merchant Payables', 'liability', input.currency);
    const cashReserve = await ensureAccount(tx, input.projectId, '1100', 'Cash Reserve', 'asset', input.currency);

    await recordTransaction(tx, {
      projectId: input.projectId,
      idempotencyKey,
      lines: [
        {
          accountId: payable.id,
          entryType: 'debit',
          amountCents: input.amountCents,
          currency: input.currency,
          sellerId: input.sellerId,
          payoutId: payout.id,
          metadata: { source: 'payout' }
        },
        {
          accountId: cashReserve.id,
          entryType: 'credit',
          amountCents: input.amountCents,
          currency: input.currency,
          sellerId: input.sellerId,
          payoutId: payout.id,
          metadata: { source: 'payout' }
        }
      ]
    });

    return tx.updatePayoutStatus(
      payout.id,
      payoutResult.status === 'paid' ? 'paid' : 'processing',
      payoutResult.externalId
    );
  });
};
