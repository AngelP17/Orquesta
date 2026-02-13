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
    label: "Command",
    hint: "Operations, risk, treasury signal",
    icon: <BsShieldCheck className="h-4 w-4" />,
  },
  {
    id: "seller",
    label: "Merchant",
    hint: "Performance, liquidity, payout trust",
    icon: <BsShopWindow className="h-4 w-4" />,
  },
  {
    id: "checkout",
    label: "Checkout Lab",
    hint: "Intent controls, QR simulation, conversion",
    icon: <BsQrCodeScan className="h-4 w-4" />,
  },
];

const storyByView: Record<
  WorkspaceView,
  { headline: string; context: string; conflict: string; resolution: string; cta: string }
> = {
  platform: {
    headline: "GMV is expanding, but risk concentration is tightening.",
    context: "Platform volume is climbing across all corridors and fee capture remains healthy.",
    conflict: "High-value transactions are clustering into fewer sellers, increasing risk-weighted exposure.",
    resolution: "Rebalance monitoring thresholds and pre-stage manual review for elevated cohorts.",
    cta: "Open risk queue and approve today's escalation set.",
  },
  seller: {
    headline: "Top merchants are liquid, but payout confidence is uneven.",
    context: "Core sellers remain active with stable payout cadence and verified KYC posture.",
    conflict: "Lower-tier merchants show rising payout anxiety when settlement status is delayed.",
    resolution: "Increase payout transparency with proactive status messaging and cut support lag.",
    cta: "Trigger payout communication sync for at-risk merchants.",
  },
  checkout: {
    headline: "Checkout conversion is strong, but intent drop-offs still leak revenue.",
    context: "Most payment intents reach processing in expected time windows across channels.",
    conflict: "A small delay around confirmation events causes measurable abandonment on mobile.",
    resolution: "Prioritize faster confirmation state updates and fallback path messaging.",
    cta: "Run mobile confirmation drill and compare conversion impact.",
  },
};

export function IntegratedWorkspace() {
  const [activeView, setActiveView] = useState<WorkspaceView>("platform");

  return (
    <section className="space-y-6">
      <div className="orq-surface orq-glow">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="orq-section-title">Execution Modules</h2>
            <p className="mt-1 text-sm text-stone-600">
              One working surface with shared context across operators, sellers, and checkout flows.
            </p>
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
                      ? "border-[#2a160f]/85 bg-[#2a160f] text-[#fff7ea] shadow-[0_10px_24px_rgba(45,22,12,0.24)]"
                      : "border-[#7f240e]/18 bg-white/62 text-stone-800 hover:border-[#7f240e]/35 hover:bg-white/82"
                  }`}
                >
                  <span className="mb-1 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                    {view.icon}
                    {view.label}
                  </span>
                  <p className={`text-xs ${active ? "text-[#f0d5c3]" : "text-stone-600"}`}>{view.hint}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <StoryPanel story={storyByView[activeView]} />

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
          <h3 className="mb-4 text-lg font-semibold text-stone-950">GMV Velocity</h3>
          <GMVChart />
        </div>
        <div className="orq-surface orq-glow">
          <h3 className="mb-4 text-lg font-semibold text-stone-950">Risk Snapshot</h3>
          <ul className="space-y-3 text-sm text-stone-700">
            {[
              { tier: "GREEN", value: "85%", bar: "bg-emerald-600" },
              { tier: "YELLOW", value: "10%", bar: "bg-amber-500" },
              { tier: "RED", value: "4%", bar: "bg-orange-600" },
              { tier: "BLACK", value: "1%", bar: "bg-stone-900" },
            ].map((item) => (
              <li key={item.tier} className="orq-card">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-semibold">{item.tier}</span>
                  <span>{item.value}</span>
                </div>
                <div className="h-1.5 rounded-full bg-stone-200">
                  <div className={`${item.bar} h-1.5 rounded-full`} style={{ width: item.value }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <OperationalTimeline />

      <div className="orq-surface orq-glow p-0">
        <div className="border-b border-[#7f240e]/16 px-6 py-4">
          <h3 className="text-lg font-semibold text-stone-950">Live Activity Feed</h3>
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
        <h3 className="text-lg font-semibold text-stone-950">Seller Portal Mirror</h3>
        <p className="mt-1 text-sm text-stone-600">{primarySeller.legalName} · RUC {primarySeller.ruc}</p>

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
        <h3 className="text-lg font-semibold text-stone-950">Merchant Health</h3>
        <ul className="mt-4 space-y-3 text-sm text-stone-700">
          <li className="orq-card flex justify-between"><span>Payout eligibility</span><span className="font-semibold text-emerald-700">Eligible</span></li>
          <li className="orq-card flex justify-between"><span>KYC status</span><span className="font-semibold text-emerald-700">Verified</span></li>
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
        <h3 className="text-lg font-semibold text-stone-950">Checkout Control</h3>
        <p className="mt-1 text-sm text-stone-600">Run full payment scenarios directly from this command surface.</p>

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
        <h3 className="text-lg font-semibold text-stone-950">Checkout Preview</h3>
        <div className="mt-5 rounded-2xl border border-[#7f240e]/26 bg-white/84 p-5 shadow-xl">
          <div className="rounded-xl bg-gradient-to-r from-[#2a160f] via-[#7f240e] to-[#bf6232] p-4 text-[#fff7ea]">
            <p className="text-sm font-medium">Complete your payment</p>
            <p className="text-2xl font-semibold">B/. 142.50</p>
          </div>
          <div className="mt-4 flex items-center justify-center">
            <div className="grid h-40 w-40 place-items-center rounded-xl border border-[#7f240e]/24 bg-[#fff6ea] text-center text-xs text-stone-500">
              QR Preview
              <span className="mt-1 block font-mono text-[10px] text-stone-600">yappy://pay/pi_demo_20260213_001</span>
            </div>
          </div>
          <p className="mt-4 text-center text-sm text-stone-600">Status: processing · Expires in 4:31</p>
        </div>
      </div>
    </div>
  );
}

function StoryPanel({
  story,
}: {
  story: { headline: string; context: string; conflict: string; resolution: string; cta: string };
}) {
  return (
    <div className="orq-surface orq-glow">
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="orq-card lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Narrative Signal</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">{story.headline}</h3>
          <p className="mt-3 text-sm text-stone-700">{story.context}</p>
        </div>
        <div className="orq-card">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Conflict</p>
          <p className="mt-2 text-sm text-stone-800">{story.conflict}</p>
        </div>
        <div className="orq-card">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Resolution</p>
          <p className="mt-2 text-sm text-stone-800">{story.resolution}</p>
          <button className="orq-btn-primary mt-4 w-full" type="button">
            {story.cta}
          </button>
        </div>
      </div>
    </div>
  );
}

function OperationalTimeline() {
  const steps = [
    { label: "Intent created", latency: "00:00:12", state: "healthy" },
    { label: "Risk score computed", latency: "00:00:08", state: "healthy" },
    { label: "Ledger posted", latency: "00:00:04", state: "healthy" },
    { label: "Payout queue updated", latency: "00:00:19", state: "watch" },
  ] as const;

  return (
    <div className="orq-surface orq-glow">
      <h3 className="text-lg font-semibold text-stone-950">Operational Timeline</h3>
      <p className="mt-1 text-sm text-stone-600">Latest settlement cycle from intent to payout readiness.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        {steps.map((step, index) => (
          <div
            key={step.label}
            className="orq-card"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <p className="text-xs uppercase tracking-wide text-stone-500">{step.label}</p>
            <p className="mt-2 text-lg font-semibold text-stone-950">{step.latency}</p>
            <span className={step.state === "healthy" ? "orq-badge-success mt-2" : "orq-badge-warning mt-2"}>
              {step.state}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="orq-card">
      <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold text-stone-950 ${mono ? "font-mono text-sm" : ""}`}>{value}</p>
    </div>
  );
}

function Panel({ title, items }: { title: string; items: Array<{ id: string; value: string }> }) {
  return (
    <div className="orq-card">
      <h4 className="mb-3 text-sm font-semibold text-stone-950">{title}</h4>
      <ul className="space-y-3 text-sm">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between">
            <span className="text-stone-600">{item.id}</span>
            <span className="font-semibold text-stone-950">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
