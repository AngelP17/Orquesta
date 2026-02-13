export type Locale = 'es' | 'en';

export const messages = {
  es: {
    appTitle: 'Portal de Vendedores',
    overview: 'Resumen',
    transactions: 'Transacciones',
    payouts: 'Pagos',
    settings: 'Configuracion',
    availableBalance: 'Balance disponible',
    pendingPayout: 'Pago pendiente',
    monthlyVolume: 'Volumen mensual',
    recentTransactions: 'Transacciones recientes'
  },
  en: {
    appTitle: 'Seller Portal',
    overview: 'Overview',
    transactions: 'Transactions',
    payouts: 'Payouts',
    settings: 'Settings',
    availableBalance: 'Available balance',
    pendingPayout: 'Pending payout',
    monthlyVolume: 'Monthly volume',
    recentTransactions: 'Recent transactions'
  }
} as const;

export const formatCurrency = (cents: bigint, currency: 'PAB' | 'USD', locale: Locale): string => {
  const abs = cents < 0n ? -cents : cents;
  const whole = abs / 100n;
  const fractional = (abs % 100n).toString().padStart(2, '0');
  const symbol = currency === 'PAB' ? 'B/.' : 'US$';
  const sign = cents < 0n ? '-' : '';
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, locale === 'es' ? '.' : ',');
  const decimalSeparator = locale === 'es' ? ',' : '.';
  return `${sign}${symbol} ${grouped}${decimalSeparator}${fractional}`;
};
