import type { PaymentIntent, Storage } from '../storage/types';
import { recordTransaction } from './ledger';

export const itbmsFromFee = (feeCents: bigint): bigint => (feeCents * 7n) / 100n;

const ensureAccount = async (
  storage: Storage,
  projectId: string,
  code: string,
  name: string,
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense',
  currency: PaymentIntent['currency']
) => {
  const existing = await storage.getAccountByCode(projectId, code, currency);
  if (existing) return existing;
  return storage.createAccount({
    projectId,
    sellerId: null,
    code,
    name,
    accountType,
    currency
  });
};

export interface PostPaymentConfirmedInput {
  paymentIntent: PaymentIntent;
  platformFeeCents: bigint;
  idempotencyKey: string;
}

export const postPaymentConfirmed = async (
  storage: Storage,
  input: PostPaymentConfirmedInput
): Promise<void> => {
  const { paymentIntent, platformFeeCents, idempotencyKey } = input;

  if (paymentIntent.status === 'succeeded') {
    return;
  }

  const itbmsCents = itbmsFromFee(platformFeeCents);
  const merchantNetCents = paymentIntent.amountCents - platformFeeCents - itbmsCents;

  if (merchantNetCents <= 0n) {
    throw new Error('Payment net to seller must be positive after fees and ITBMS.');
  }

  const receivable = await ensureAccount(
    storage,
    paymentIntent.projectId,
    '1200',
    'Merchant Receivables',
    'asset',
    paymentIntent.currency
  );
  const merchantPayable = await ensureAccount(
    storage,
    paymentIntent.projectId,
    '2100',
    'Merchant Payables',
    'liability',
    paymentIntent.currency
  );
  const platformFees = await ensureAccount(
    storage,
    paymentIntent.projectId,
    '4100',
    'Platform Fees',
    'revenue',
    paymentIntent.currency
  );
  const itbmsPayable = await ensureAccount(
    storage,
    paymentIntent.projectId,
    '2200',
    'ITBMS Payable',
    'liability',
    paymentIntent.currency
  );

  await storage.withTransaction(async (tx) => {
    await recordTransaction(tx, {
      projectId: paymentIntent.projectId,
      idempotencyKey,
      lines: [
        {
          accountId: receivable.id,
          entryType: 'debit',
          amountCents: paymentIntent.amountCents,
          currency: paymentIntent.currency,
          sellerId: paymentIntent.sellerId,
          paymentIntentId: paymentIntent.id,
          metadata: { source: 'payment_confirmation' }
        },
        {
          accountId: merchantPayable.id,
          entryType: 'credit',
          amountCents: merchantNetCents,
          currency: paymentIntent.currency,
          sellerId: paymentIntent.sellerId,
          paymentIntentId: paymentIntent.id,
          metadata: { source: 'payment_confirmation' }
        },
        {
          accountId: platformFees.id,
          entryType: 'credit',
          amountCents: platformFeeCents,
          currency: paymentIntent.currency,
          sellerId: paymentIntent.sellerId,
          paymentIntentId: paymentIntent.id,
          metadata: { source: 'platform_fee' }
        },
        {
          accountId: itbmsPayable.id,
          entryType: 'credit',
          amountCents: itbmsCents,
          currency: paymentIntent.currency,
          sellerId: paymentIntent.sellerId,
          paymentIntentId: paymentIntent.id,
          itbmsCents,
          metadata: { source: 'itbms' }
        }
      ]
    });

    await tx.createFeeObligation({
      projectId: paymentIntent.projectId,
      sellerId: paymentIntent.sellerId,
      paymentIntentId: paymentIntent.id,
      amountCents: platformFeeCents,
      itbmsCents,
      currency: paymentIntent.currency,
      idempotencyKey
    });

    await tx.updatePaymentIntentStatus(paymentIntent.id, 'succeeded');
  });
};
