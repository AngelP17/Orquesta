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
  return (
    <main className="orq-page">
      <DashboardNav />
      <section className="orq-container">
        <h1 className="text-2xl font-semibold text-slate-100">Payments</h1>
        <p className="mb-6 text-sm text-slate-400">Payment intent lifecycle and execution status.</p>
        <DataTable columns={columns} data={payments} caption="Payments" emptyMessage="No payments recorded." />
      </section>
    </main>
  );
}
