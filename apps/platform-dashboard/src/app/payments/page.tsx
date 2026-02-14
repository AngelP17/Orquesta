"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/DataTable";
import { formatMoney, payments, type PaymentRow } from "@/lib/mockData";
import { DashboardNav } from "@orquesta/ui";

const statusClass: Record<PaymentRow["status"], string> = {
  processing: "orq-badge-info",
  succeeded: "orq-badge-success",
  failed: "orq-badge-danger",
};

const columns: Array<ColumnDef<PaymentRow>> = [
  { header: "Payment Intent", accessorKey: "id" },
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

export default function PaymentsPage() {
  const pabVolume = payments.filter((row) => row.currency === "PAB").reduce((sum, row) => sum + row.amountCents, 0n);
  const succeeded = payments.filter((row) => row.status === "succeeded").length;
  const failed = payments.filter((row) => row.status === "failed").length;

  return (
    <main className="orq-page">
      <DashboardNav />
      <section className="orq-container">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Payments</h1>
        <p className="mb-6 text-sm text-muted-foreground">Intent lifecycle, conversion health, and execution status.</p>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="orq-card">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">PAB intent volume</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{formatMoney(pabVolume, "PAB")}</p>
          </div>
          <div className="orq-card">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Succeeded</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{succeeded}</p>
          </div>
          <div className="orq-card">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Failed</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{failed}</p>
          </div>
        </div>

        <DataTable columns={columns} data={payments} caption="Payments" emptyMessage="No payments recorded." />
      </section>
    </main>
  );
}
