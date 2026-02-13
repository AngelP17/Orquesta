"use client";

import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/DataTable';
import { LocaleToggle } from '@/components/LocaleToggle';
import { PortalNav } from '@/components/PortalNav';
import { useLocale } from '@/components/LocaleProvider';
import { formatCurrency, messages } from '@/lib/i18n';
import { transactions } from '@/lib/mockData';

interface TransactionRow {
  id: string;
  amountCents: bigint;
  currency: 'PAB' | 'USD';
  status: string;
  createdAt: string;
}

export default function TransactionsPage() {
  const { locale } = useLocale();
  const t = messages[locale];

  const columns: Array<ColumnDef<TransactionRow>> = [
    { header: 'ID', accessorKey: 'id' },
    { header: locale === 'es' ? 'Monto' : 'Amount', accessorKey: 'amountCents', cell: ({ row }) => formatCurrency(row.original.amountCents, row.original.currency, locale) },
    { header: locale === 'es' ? 'Estado' : 'Status', accessorKey: 'status' },
    { header: locale === 'es' ? 'Fecha' : 'Created', accessorKey: 'createdAt', cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(locale === 'es' ? 'es-PA' : 'en-US') }
  ];

  return (
    <main className="min-h-screen bg-gray-50">
      <PortalNav />
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">{t.transactions}</h1>
          <LocaleToggle />
        </div>
        <DataTable columns={columns} data={transactions} />
      </section>
    </main>
  );
}
