export const sellerSnapshot = {
  balanceCents: 2245600n,
  pendingPayoutCents: 500000n,
  monthlyVolumeCents: 12500800n
};

export const transactions = [
  { id: 'pi_1001', amountCents: 142500n, currency: 'PAB' as const, status: 'succeeded', createdAt: '2026-02-13T14:40:00Z' },
  { id: 'pi_1005', amountCents: 90800n, currency: 'PAB' as const, status: 'succeeded', createdAt: '2026-02-12T19:12:00Z' },
  { id: 'pi_1007', amountCents: 50000n, currency: 'PAB' as const, status: 'failed', createdAt: '2026-02-12T16:00:00Z' }
];

export const payouts = [
  { id: 'po_9001', amountCents: 1200000n, currency: 'PAB' as const, status: 'paid', createdAt: '2026-02-13T06:00:00Z' },
  { id: 'po_9008', amountCents: 500000n, currency: 'PAB' as const, status: 'processing', createdAt: '2026-02-14T06:00:00Z' }
];
