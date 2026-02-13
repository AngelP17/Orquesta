export type RiskTier = 'GREEN' | 'YELLOW' | 'RED' | 'BLACK';

export interface SellerRow {
  id: string;
  legalName: string;
  ruc: string;
  riskTier: RiskTier;
  balancePabCents: bigint;
  monthlyVolumePabCents: bigint;
}

export interface PaymentRow {
  id: string;
  sellerId: string;
  amountCents: bigint;
  currency: 'PAB' | 'USD';
  status: 'processing' | 'succeeded' | 'failed';
  createdAt: string;
}

export interface PayoutRow {
  id: string;
  sellerId: string;
  amountCents: bigint;
  currency: 'PAB' | 'USD';
  status: 'processing' | 'paid' | 'failed';
  createdAt: string;
}

export const formatMoney = (cents: bigint, currency: 'PAB' | 'USD'): string => {
  const abs = cents < 0n ? -cents : cents;
  const whole = abs / 100n;
  const fractional = (abs % 100n).toString().padStart(2, '0');
  const symbol = currency === 'PAB' ? 'B/.' : 'US$';
  const sign = cents < 0n ? '-' : '';
  return `${sign}${symbol} ${whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fractional}`;
};

export const sellers: SellerRow[] = [
  { id: 's_001', legalName: 'Mercado Colina', ruc: '1558897712', riskTier: 'GREEN', balancePabCents: 2245600n, monthlyVolumePabCents: 12500800n },
  { id: 's_002', legalName: 'Panama Gadgets', ruc: '1558897713', riskTier: 'YELLOW', balancePabCents: 845300n, monthlyVolumePabCents: 6912500n },
  { id: 's_003', legalName: 'Tienda Faro', ruc: '1558897714', riskTier: 'RED', balancePabCents: 112000n, monthlyVolumePabCents: 4031800n },
  { id: 's_004', legalName: 'Sabores Istmo', ruc: '1558897715', riskTier: 'GREEN', balancePabCents: 550000n, monthlyVolumePabCents: 5129000n }
];

export const gmvTrend = [
  { month: 'Sep', gmvCents: 91230000n, feesCents: 2645670n },
  { month: 'Oct', gmvCents: 100450000n, feesCents: 2913050n },
  { month: 'Nov', gmvCents: 111890000n, feesCents: 3244810n },
  { month: 'Dec', gmvCents: 119230000n, feesCents: 3457670n },
  { month: 'Jan', gmvCents: 127500000n, feesCents: 3697500n },
  { month: 'Feb', gmvCents: 132780000n, feesCents: 3850620n }
];

export const payments: PaymentRow[] = [
  { id: 'pi_1001', sellerId: 's_001', amountCents: 142500n, currency: 'PAB', status: 'succeeded', createdAt: '2026-02-13T14:40:00Z' },
  { id: 'pi_1002', sellerId: 's_002', amountCents: 330000n, currency: 'PAB', status: 'processing', createdAt: '2026-02-13T14:35:00Z' },
  { id: 'pi_1003', sellerId: 's_003', amountCents: 87500n, currency: 'PAB', status: 'failed', createdAt: '2026-02-13T13:50:00Z' },
  { id: 'pi_1004', sellerId: 's_004', amountCents: 197000n, currency: 'USD', status: 'succeeded', createdAt: '2026-02-13T13:12:00Z' }
];

export const payouts: PayoutRow[] = [
  { id: 'po_9001', sellerId: 's_001', amountCents: 1200000n, currency: 'PAB', status: 'paid', createdAt: '2026-02-13T06:00:00Z' },
  { id: 'po_9002', sellerId: 's_002', amountCents: 500000n, currency: 'PAB', status: 'processing', createdAt: '2026-02-13T06:04:00Z' },
  { id: 'po_9003', sellerId: 's_004', amountCents: 278000n, currency: 'USD', status: 'failed', createdAt: '2026-02-13T06:06:00Z' }
];
