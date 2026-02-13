"use client";

import { useMemo, useState } from "react";
import { BsQrCodeScan, BsShieldCheck, BsShopWindow } from "react-icons/bs";
import { GMVChart } from "@/components/GMVChart";
import { RecentActivity } from "@/components/RecentActivity";
import { StatsCard } from "@/components/StatsCard";
import { formatMoney, payments, payouts, sellers } from "@/lib/mockData";

type WorkspaceView = "platform" | "seller" | "checkout";

const views: Array<{ id: WorkspaceView; label: string; hint: string; icon: React.ReactNode }> = [
  {
    id: "platform",
    label: "Platform Control",
    hint: "Operations, risk and treasury intelligence",
    icon: <BsShieldCheck className="h-4 w-4" />,
  },
  {
    id: "seller",
    label: "Seller Experience",
    hint: "Merchant performance and payout transparency",
    icon: <BsShopWindow className="h-4 w-4" />,
  },
  {
    id: "checkout",
    label: "Checkout Experience",
    hint: "Intent creation, QR flow and payment conversion",
    icon: <BsQrCodeScan className="h-4 w-4" />,
  },
];

export function IntegratedWorkspace() {
  const [activeView, setActiveView] = useState<WorkspaceView>("platform");

  return (
    <section className="space-y-6">
      <div className="orq-surface orq-glow">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="orq-section-title">Integrated Commerce Workspace</h2>
            <p className="mt-1 text-sm text-slate-400">Single interface, synchronized context, zero tab fatigue.</p>
          </div>
          <div className="grid w-full gap-2 sm:grid-cols-3 lg:w-auto">
            {views.map((view) => {
              const active = view.id === activeView;
              return (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => setActiveView(view.id)}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    active
                      ? "border-cyan-300/40 bg-gradient-to-r from-cyan-500/20 to-sky-500/20 text-white"
                      : "border-slate-700/80 bg-slate-900/45 text-slate-300 hover:border-slate-500 hover:bg-slate-800/70"
                  }`}
                >
                  <span className="mb-1 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                    {view.icon}
                    {view.label}
                  </span>
                  <p className="text-xs text-slate-400">{view.hint}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {activeView === "platform" ? <div className="animate-fade-up"><PlatformView /></div> : null}
      {activeView === "seller" ? <div className="animate-fade-up"><SellerView /></div> : null}
      {activeView === "checkout" ? <div className="animate-fade-up"><CheckoutView /></div> : null}
    </section>
  );
}

function PlatformView() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="Total GMV" value="B/. 1,234,567.89" change="+12.5%" changeType="positive" icon="money" />
        <StatsCard title="Active Sellers" value="156" change="+8" changeType="positive" icon="users" />
        <StatsCard title="Fee Revenue" value="B/. 45,678.90" change="+15.3%" changeType="positive" icon="chart" />
        <StatsCard title="Pending Payouts" value="B/. 89,234.56" change="23" changeType="neutral" icon="wallet" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="orq-surface orq-glow lg:col-span-2">
          <h3 className="mb-4 text-lg font-semibold text-slate-100">GMV Velocity</h3>
          <GMVChart />
        </div>
        <div className="orq-surface orq-glow">
          <h3 className="mb-4 text-lg font-semibold text-slate-100">Risk Snapshot</h3>
          <ul className="space-y-3 text-sm text-slate-300">
            {[
              { tier: "GREEN", value: "85%", bar: "bg-emerald-400" },
              { tier: "YELLOW", value: "10%", bar: "bg-yellow-400" },
              { tier: "RED", value: "4%", bar: "bg-orange-400" },
              { tier: "BLACK", value: "1%", bar: "bg-rose-400" },
            ].map((item) => (
              <li key={item.tier} className="orq-card">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-semibold">{item.tier}</span>
                  <span>{item.value}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800">
                  <div className={`${item.bar} h-1.5 rounded-full`} style={{ width: item.value }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="orq-surface orq-glow p-0">
        <div className="border-b border-slate-700/80 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-100">Live Activity Feed</h3>
        </div>
        <RecentActivity />
      </div>
    </div>
  );
}

function SellerView() {
  const primarySeller = sellers[0];
  const sellerPayments = useMemo(() => payments.filter((p) => p.sellerId === primarySeller.id).slice(0, 3), [primarySeller.id]);
  const sellerPayouts = useMemo(() => payouts.filter((p) => p.sellerId === primarySeller.id).slice(0, 2), [primarySeller.id]);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="orq-surface orq-glow xl:col-span-2">
        <h3 className="text-lg font-semibold text-slate-100">Seller Portal Mirror</h3>
        <p className="mt-1 text-sm text-slate-400">{primarySeller.legalName} · RUC {primarySeller.ruc}</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Metric label="Available" value={formatMoney(primarySeller.balancePabCents, "PAB")} />
          <Metric label="Monthly Volume" value={formatMoney(primarySeller.monthlyVolumePabCents, "PAB")} />
          <Metric label="Risk Tier" value={primarySeller.riskTier} />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Panel title="Recent Transactions" items={sellerPayments.map((tx) => ({ id: tx.id, value: formatMoney(tx.amountCents, tx.currency) }))} />
          <Panel title="Payout History" items={sellerPayouts.map((tx) => ({ id: tx.id, value: formatMoney(tx.amountCents, tx.currency) }))} />
        </div>
      </div>

      <div className="orq-surface orq-glow">
        <h3 className="text-lg font-semibold text-slate-100">Merchant Health</h3>
        <ul className="mt-4 space-y-3 text-sm text-slate-300">
          <li className="orq-card flex justify-between"><span>Payout eligibility</span><span className="font-semibold text-emerald-300">Eligible</span></li>
          <li className="orq-card flex justify-between"><span>KYC status</span><span className="font-semibold text-emerald-300">Verified</span></li>
          <li className="orq-card flex justify-between"><span>Chargeback ratio</span><span className="font-semibold">0.22%</span></li>
          <li className="orq-card flex justify-between"><span>Support SLA</span><span className="font-semibold">2h</span></li>
        </ul>
      </div>
    </div>
  );
}

function CheckoutView() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="orq-surface orq-glow">
        <h3 className="text-lg font-semibold text-slate-100">Checkout Control</h3>
        <p className="mt-1 text-sm text-slate-400">Run full payment scenarios directly from this command surface.</p>

        <div className="mt-5 space-y-4">
          <Metric label="Amount" value="B/. 142.50" />
          <Metric label="Payment Intent" value="pi_demo_20260213_001" mono />
          <div className="flex flex-wrap gap-2">
            <button className="orq-btn-primary" type="button">Create Intent</button>
            <button className="orq-btn-primary" type="button">Mark Succeeded</button>
            <button className="orq-btn-secondary" type="button">Reset</button>
          </div>
        </div>
      </div>

      <div className="orq-surface orq-glow">
        <h3 className="text-lg font-semibold text-slate-100">Checkout Preview</h3>
        <div className="mt-5 rounded-2xl border border-cyan-400/30 bg-slate-950 p-5 shadow-xl">
          <div className="rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 p-4 text-slate-950">
            <p className="text-sm font-medium">Complete your payment</p>
            <p className="text-2xl font-semibold">B/. 142.50</p>
          </div>
          <div className="mt-4 flex items-center justify-center">
            <div className="grid h-40 w-40 place-items-center rounded-xl border border-slate-700 bg-slate-900 text-center text-xs text-slate-500">
              QR Preview
              <span className="mt-1 block font-mono text-[10px] text-slate-400">yappy://pay/pi_demo_20260213_001</span>
            </div>
          </div>
          <p className="mt-4 text-center text-sm text-slate-400">Status: processing · Expires in 4:31</p>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="orq-card">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold text-slate-100 ${mono ? "font-mono text-sm" : ""}`}>{value}</p>
    </div>
  );
}

function Panel({ title, items }: { title: string; items: Array<{ id: string; value: string }> }) {
  return (
    <div className="orq-card">
      <h4 className="mb-3 text-sm font-semibold text-slate-100">{title}</h4>
      <ul className="space-y-3 text-sm">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between">
            <span className="text-slate-400">{item.id}</span>
            <span className="font-semibold text-slate-100">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
