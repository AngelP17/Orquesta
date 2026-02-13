"use client";

import { LocaleToggle } from '@/components/LocaleToggle';
import { PortalNav } from '@/components/PortalNav';
import { useLocale } from '@/components/LocaleProvider';
import { formatCurrency, messages } from '@/lib/i18n';
import { sellerSnapshot, transactions } from '@/lib/mockData';

export default function SellerHomePage() {
  const { locale } = useLocale();
  const t = messages[locale];

  return (
    <main className="min-h-screen">
      <PortalNav />
      <section className="portal-container">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">{t.overview}</h1>
          <LocaleToggle />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card label={t.availableBalance} value={formatCurrency(sellerSnapshot.balanceCents, 'PAB', locale)} />
          <Card label={t.pendingPayout} value={formatCurrency(sellerSnapshot.pendingPayoutCents, 'PAB', locale)} />
          <Card label={t.monthlyVolume} value={formatCurrency(sellerSnapshot.monthlyVolumeCents, 'PAB', locale)} />
        </div>

        <div className="portal-card mt-6">
          <h2 className="text-lg font-semibold text-gray-900">{t.recentTransactions}</h2>
          <ul className="mt-3 space-y-3">
            {transactions.map((tx) => (
              <li key={tx.id} className="flex flex-col gap-2 rounded-lg bg-slate-50 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-gray-800">{tx.id}</p>
                  <p className="portal-muted">{new Date(tx.createdAt).toLocaleString(locale === 'es' ? 'es-PA' : 'en-US')}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatCurrency(tx.amountCents, tx.currency, locale)}</p>
                  <p className="text-xs uppercase text-gray-500">{tx.status}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="portal-card">
      <p className="portal-muted text-xs uppercase">{label}</p>
      <p className="mt-2 text-xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
