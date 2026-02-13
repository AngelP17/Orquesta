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
      <Link className="font-medium text-[#7f240e] transition hover:text-[#5f1d0d] hover:underline" href={`/sellers/${row.original.id}`}>
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
  const totalBalance = sellers.reduce((sum, row) => sum + row.balancePabCents, 0n);
  const highRisk = sellers.filter((row) => row.riskTier === "RED" || row.riskTier === "BLACK").length;

  return (
    <main className="orq-page">
      <DashboardNav />
      <section className="orq-container">
        <div className="mb-6 space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-stone-950">Sellers</h1>
          <p className="text-sm text-stone-600">Risk tiers, exposure, and liquidity posture across your merchant base.</p>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="orq-card">
            <p className="text-xs uppercase tracking-wide text-stone-500">Active sellers</p>
            <p className="mt-1 text-lg font-semibold text-stone-950">{sellers.length}</p>
          </div>
          <div className="orq-card">
            <p className="text-xs uppercase tracking-wide text-stone-500">Combined balance</p>
            <p className="mt-1 text-lg font-semibold text-stone-950">{formatMoney(totalBalance, "PAB")}</p>
          </div>
          <div className="orq-card">
            <p className="text-xs uppercase tracking-wide text-stone-500">Manual review</p>
            <p className="mt-1 text-lg font-semibold text-stone-950">{highRisk} sellers</p>
          </div>
        </div>

        <DataTable columns={columns} data={sellers} caption="Sellers" emptyMessage="No sellers found." />
      </section>
    </main>
  );
}
