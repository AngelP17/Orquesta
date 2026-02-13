"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { DataTable } from "@/components/DataTable";
import { formatMoney, sellers, type SellerRow } from "@/lib/mockData";
import { DashboardNav } from "@orquesta/ui";

const riskClass: Record<SellerRow["riskTier"], string> = {
  GREEN: "orq-badge-success",
  YELLOW: "orq-badge-warning",
  RED: "orq-badge-alert",
  BLACK: "orq-badge-danger",
};

const columns: Array<ColumnDef<SellerRow>> = [
  {
    header: "Seller",
    accessorKey: "legalName",
    cell: ({ row }) => (
      <Link className="font-medium text-cyan-200 transition hover:text-cyan-100 hover:underline" href={`/sellers/${row.original.id}`}>
        {row.original.legalName}
      </Link>
    ),
  },
  { header: "RUC", accessorKey: "ruc" },
  {
    header: "Risk Tier",
    accessorKey: "riskTier",
    cell: ({ row }) => <span className={riskClass[row.original.riskTier]}>{row.original.riskTier}</span>,
  },
  {
    header: "Balance",
    accessorKey: "balancePabCents",
    cell: ({ row }) => formatMoney(row.original.balancePabCents, "PAB"),
  },
  {
    header: "Monthly Volume",
    accessorKey: "monthlyVolumePabCents",
    cell: ({ row }) => formatMoney(row.original.monthlyVolumePabCents, "PAB"),
  },
];

export default function SellersPage() {
  return (
    <main className="orq-page">
      <DashboardNav />
      <section className="orq-container">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-100">Sellers</h1>
          <p className="text-sm text-slate-400">Risk tiers, balances, and monthly activity.</p>
        </div>
        <DataTable columns={columns} data={sellers} caption="Sellers" emptyMessage="No sellers found." />
      </section>
    </main>
  );
}
