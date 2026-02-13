import { getFeeSweepIdempotencyKey } from '../../services/worker/src/feeScheduler';
import { getPayoutIdempotencyKey } from '../../services/worker/src/payoutScheduler';

describe('idempotency keys', () => {
  const fixedDate = new Date('2026-02-13T06:00:00.000Z');

  it('produces deterministic fee sweep key per seller/hour', () => {
    const first = getFeeSweepIdempotencyKey('seller_1', fixedDate);
    const second = getFeeSweepIdempotencyKey('seller_1', fixedDate);
    expect(first).toBe(second);
    expect(first).toContain('fee_sweep_seller_1_2026-02-13_06');
  });

  it('produces deterministic payout key per seller/day', () => {
    const first = getPayoutIdempotencyKey('seller_2', fixedDate);
    const second = getPayoutIdempotencyKey('seller_2', fixedDate);
    expect(first).toBe(second);
    expect(first).toContain('payout_seller_2_2026-02-13');
  });
});
