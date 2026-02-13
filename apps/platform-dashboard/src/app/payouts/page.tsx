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
  const pabPayouts = payouts.filter((row) => row.currency === "PAB");
  const payoutVolume = pabPayouts.reduce((sum, row) => sum + row.amountCents, 0n);
  const paidCount = payouts.filter((row) => row.status === "paid").length;
  const processingCount = payouts.filter((row) => row.status === "processing").length;

  return (
    <main className="orq-page">
      <DashboardNav />
      <section className="orq-container">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-950">Payouts</h1>
        <p className="mb-6 text-sm text-stone-600">Batch execution, settlement confidence, and payout completion flow.</p>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="orq-card">
            <p className="text-xs uppercase tracking-wide text-stone-500">PAB batch volume</p>
            <p className="mt-1 text-lg font-semibold text-stone-950">{formatMoney(payoutVolume, "PAB")}</p>
          </div>
          <div className="orq-card">
            <p className="text-xs uppercase tracking-wide text-stone-500">Paid batches</p>
            <p className="mt-1 text-lg font-semibold text-stone-950">{paidCount}</p>
          </div>
          <div className="orq-card">
            <p className="text-xs uppercase tracking-wide text-stone-500">In progress</p>
            <p className="mt-1 text-lg font-semibold text-stone-950">{processingCount}</p>
          </div>
        </div>

        <DataTable columns={columns} data={payouts} caption="Payouts" emptyMessage="No payouts found." />
      </section>
    </main>
  );
}
