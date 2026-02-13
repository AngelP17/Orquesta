"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/DataTable";
import { formatMoney, payouts, type PayoutRow } from "@/lib/mockData";
import { DashboardNav } from "@orquesta/ui";

const statusClass: Record<PayoutRow["status"], string> = {
  processing: "orq-badge-info",
  paid: "orq-badge-success",
  failed: "orq-badge-danger",
};

const columns: Array<ColumnDef<PayoutRow>> = [
  { header: "Payout ID", accessorKey: "id" },
  { header: "Seller", accessorKey: "sellerId" },
  {
    header: "Amount",
    accessorKey: "amountCents",
    cell: ({ row }) => formatMoney(row.original.amountCents, row.original.currency),
  },
  {
    header: "Status",
    accessorKey: "status",
    cell: ({ row }) => <span className={statusClass[row.original.status]}>{row.original.status}</span>,
  },
  {
    header: "Created",
    accessorKey: "createdAt",
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
  },
];

export default function PayoutsPage() {
  return (
    <main className="orq-page">
      <DashboardNav />
      <section className="orq-container">
        <h1 className="text-2xl font-semibold text-slate-100">Payouts</h1>
        <p className="mb-6 text-sm text-slate-400">Daily payout batches and settlement outcomes.</p>
        <DataTable columns={columns} data={payouts} caption="Payouts" emptyMessage="No payouts found." />
      </section>
    </main>
  );
}
