import fc from 'fast-check';
import { postPaymentConfirmed, itbmsFromFee } from '../../services/api/src/domain/postPaymentConfirmed';
import { validateZeroSum } from '../../services/api/src/domain/ledger';
import { createMemoryStorage } from '../../services/api/src/storage/memory';

describe('domain/ledger invariants', () => {
  it('accepts balanced transactions', () => {
    expect(() =>
      validateZeroSum([
        { accountId: 'a1', entryType: 'debit', amountCents: 100n, currency: 'PAB' },
        { accountId: 'a2', entryType: 'credit', amountCents: 100n, currency: 'PAB' }
      ])
    ).not.toThrow();
  });

  it('rejects unbalanced transactions', () => {
    expect(() =>
      validateZeroSum([
        { accountId: 'a1', entryType: 'debit', amountCents: 100n, currency: 'PAB' },
        { accountId: 'a2', entryType: 'credit', amountCents: 99n, currency: 'PAB' }
      ])
    ).toThrow('Ledger transaction is unbalanced');
  });

  it('itbms helper rounds down using integer arithmetic', () => {
    fc.assert(
      fc.property(fc.nat(5_000_000), (fee: number) => {
        const feeCents = BigInt(fee);
        const expected = (feeCents * 7n) / 100n;
        expect(itbmsFromFee(feeCents)).toBe(expected);
      })
    );
  });

  it('creates ITBMS fee obligation with floor rounding when payment is confirmed', async () => {
    const storage = createMemoryStorage();
    const project = await storage.createProject({
      name: 'Test project',
      environment: 'test',
      apiKeyHash: 'hash'
    });
    const seller = await storage.createSeller({
      projectId: project.id,
      name: 'Seller',
      email: 'seller@example.com',
      ruc: '1558897712'
    });
    const paymentIntent = await storage.createPaymentIntent({
      projectId: project.id,
      sellerId: seller.id,
      amountCents: 10_000n,
      currency: 'PAB',
      idempotencyKey: '8f4c9157-dcc9-412e-9d90-0686ed65491d'
    });

    await postPaymentConfirmed(storage, {
      paymentIntent,
      platformFeeCents: 101n,
      idempotencyKey: 'c2fd8b2c-b141-4c15-9028-6670d95ab9d1'
    });

    const obligations = await storage.listPendingFeeObligations(project.id, seller.id);
    expect(obligations).toHaveLength(1);
    expect(obligations[0]?.itbmsCents).toBe(7n);
  });
});
