"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PiQrCode, PiShieldCheck, PiStorefront } from "react-icons/pi";
import { GMVChart } from "@/components/GMVChart";
import { RecentActivity } from "@/components/RecentActivity";
import { StatsCard } from "@/components/StatsCard";
import { formatMoney, payments, payouts, sellers } from "@/lib/mockData";

type WorkspaceView = "platform" | "seller" | "checkout";
type CheckoutPhase =
  | "idle"
  | "intent_created"
  | "qr_presented"
  | "customer_scanned"
  | "provider_authorized"
  | "ledger_booked"
  | "payout_queued"
  | "completed";
type SimulationStep = { id: string; label: string; detail: string; operator: string };

const checkoutFlow: Array<{ phase: CheckoutPhase; label: string; detail: string }> = [
  { phase: "intent_created", label: "Intent Created", detail: "Payment intent issued and idempotency sealed." },
  { phase: "qr_presented", label: "QR Presented", detail: "Checkout artifact exposed to the buyer channel." },
  { phase: "customer_scanned", label: "Customer Scanned", detail: "Device scan validated and callback captured." },
  { phase: "provider_authorized", label: "Provider Authorized", detail: "Yappy auth accepted with signature verification." },
  { phase: "ledger_booked", label: "Ledger Booked", detail: "Double-entry posting and fee accrual completed." },
  { phase: "payout_queued", label: "Payout Queued", detail: "Settlement and merchant payable moved into payout queue." },
  { phase: "completed", label: "Completed", detail: "Flow finalized with tax evidence and audit lineage." },
];

const commandSimulation: SimulationStep[] = [
  {
    id: "ingest",
    label: "Ingest Event",
    detail: "Webhook and checkout payload are normalized into a signed event envelope.",
    operator: "Input adapter validates schema + nonce.",
  },
  {
    id: "risk",
    label: "Risk Decision",
    detail: "Rules and model blend score transaction risk and merchant concentration exposure.",
    operator: "Risk engine tags intent GREEN/YELLOW/RED.",
  },
  {
    id: "ledger",
    label: "Ledger Booking",
    detail: "Debit/credit rows are posted with idempotency and contra entry links.",
    operator: "Ledger engine writes immutable transaction trail.",
  },
  {
    id: "treasury",
    label: "Treasury Sweep",
    detail: "Fee accrual and reserve updates move into treasury control accounts.",
    operator: "Treasury daemon updates reserve posture.",
  },
  {
    id: "ops",
    label: "Operator Alert",
    detail: "Execution summary published to command queue with required interventions.",
    operator: "Ops console receives actionable alert package.",
  },
];

const merchantSimulation: SimulationStep[] = [
  {
    id: "balance_sync",
    label: "Balance Sync",
    detail: "Seller dashboard balance refreshes from ledger snapshot and pending intent deltas.",
    operator: "Portal sync worker writes latest available and pending funds.",
  },
  {
    id: "payout_request",
    label: "Payout Request",
    detail: "Merchant requests payout with destination account, amount, and urgency profile.",
    operator: "Payout request queued with signed merchant context.",
  },
  {
    id: "compliance_check",
    label: "Compliance Check",
    detail: "KYC/AML posture and reserve requirements evaluated before release.",
    operator: "Compliance guardrail returns approve/review block.",
  },
  {
    id: "release",
    label: "Release to Rail",
    detail: "Approved payout is transmitted to provider batch with reconciliation IDs.",
    operator: "PayCaddy dispatcher receives settlement batch line.",
  },
  {
    id: "merchant_notify",
    label: "Merchant Notified",
    detail: "Seller receives payout status + expected settlement timestamp.",
    operator: "Portal and webhook channels confirm payout progression.",
  },
];

const views: Array<{ id: WorkspaceView; label: string; hint: string; icon: React.ReactNode }> = [
  {
    id: "platform",
    label: "Command",
    hint: "Operations, risk, treasury signal",
    icon: <PiShieldCheck className="h-4 w-4" />,
  },
  {
    id: "seller",
    label: "Merchant",
    hint: "Performance, liquidity, payout trust",
    icon: <PiStorefront className="h-4 w-4" />,
  },
  {
    id: "checkout",
    label: "Checkout Lab",
    hint: "Intent controls, QR simulation, conversion",
    icon: <PiQrCode className="h-4 w-4" />,
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
  const [actionFeedback, setActionFeedback] = useState("Interactive controls are ready.");

  const handleStoryAction = () => {
    if (activeView === "platform") {
      setActionFeedback("Risk queue opened. 6 escalations are now staged for review.");
      return;
    }
    if (activeView === "seller") {
      setActionFeedback("Merchant communication sync triggered for 14 at-risk sellers.");
      return;
    }
    setActionFeedback("Mobile confirmation drill running. Conversion baseline vs optimized path is now comparing.");
  };

  return (
    <section className="space-y-6">
      <div className="orq-surface orq-glow">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="orq-section-title">Execution Modules</h2>
            <p className="mt-1 text-sm text-muted-foreground">
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
                  className={`rounded-xl border px-4 py-3 text-left transition-all duration-200 ${
                    active
                      ? "border-[#2a160f]/85 bg-[#2a160f] text-[#fff7ea] shadow-[0_10px_24px_rgba(45,22,12,0.24)]"
                      : "border-[#7f240e]/18 bg-white/62 text-foreground hover:border-[#7f240e]/35 hover:bg-white/82"
                  }`}
                >
                  <span className="mb-1 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                    {view.icon}
                    {view.label}
                  </span>
                  <p className={`text-xs ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{view.hint}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <StoryPanel story={storyByView[activeView]} onAction={handleStoryAction} />

      <div className="orq-card border-[#7f240e]/25 bg-[#fff9f2]">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7f240e]">Action Feed</p>
        <p className="mt-2 text-sm text-stone-700">{actionFeedback}</p>
      </div>

      <div key={activeView} className="animate-fade-up">
        {activeView === "platform" ? <PlatformView onSignal={setActionFeedback} /> : null}
        {activeView === "seller" ? <SellerView onSignal={setActionFeedback} /> : null}
        {activeView === "checkout" ? <CheckoutView onSignal={setActionFeedback} /> : null}
      </div>
    </section>
  );
}

function PlatformView({ onSignal }: { onSignal: (message: string) => void }) {
  return (
    <div className="space-y-6">
      <DemoScenarioPanel
        title="Command Simulation"
        subtitle="Demonstrates how operations, risk, and treasury coordinate in one deterministic run."
        runLabel="Run Command Scenario"
        steps={commandSimulation}
        onSignal={onSignal}
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="Total GMV" value="B/. 1,234,567.89" change="+12.5%" changeType="positive" icon="money" />
        <StatsCard title="Active Sellers" value="156" change="+8" changeType="positive" icon="users" />
        <StatsCard title="Fee Revenue" value="B/. 45,678.90" change="+15.3%" changeType="positive" icon="chart" />
        <StatsCard title="Pending Payouts" value="B/. 89,234.56" change="23" changeType="neutral" icon="wallet" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="orq-surface orq-glow lg:col-span-2">
          <h3 className="mb-4 text-lg font-semibold text-foreground">GMV Velocity</h3>
          <GMVChart />
        </div>
        <div className="orq-surface orq-glow">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Risk Snapshot</h3>
          <ul className="space-y-3 text-sm text-muted-foreground">
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
          <h3 className="text-lg font-semibold text-foreground">Live Activity Feed</h3>
        </div>
        <RecentActivity />
      </div>
    </div>
  );
}

function SellerView({ onSignal }: { onSignal: (message: string) => void }) {
  const primarySeller = sellers[0];
  const sellerPayments = useMemo(() => payments.filter((p) => p.sellerId === primarySeller.id).slice(0, 3), [primarySeller.id]);
  const sellerPayouts = useMemo(() => payouts.filter((p) => p.sellerId === primarySeller.id).slice(0, 2), [primarySeller.id]);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        <DemoScenarioPanel
          title="Merchant Simulation"
          subtitle="Shows the full seller experience from liquidity visibility to payout release confirmation."
          runLabel="Run Merchant Scenario"
          steps={merchantSimulation}
          onSignal={onSignal}
        />

        <div className="orq-surface orq-glow">
          <h3 className="text-lg font-semibold text-foreground">Seller Portal Mirror</h3>
          <p className="mt-1 text-sm text-muted-foreground">{primarySeller.legalName} · RUC {primarySeller.ruc}</p>

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
      </div>

      <div className="orq-surface orq-glow">
        <h3 className="text-lg font-semibold text-foreground">Merchant Health</h3>
        <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
          <li className="orq-card flex justify-between"><span>Payout eligibility</span><span className="font-semibold text-emerald-700">Eligible</span></li>
          <li className="orq-card flex justify-between"><span>KYC status</span><span className="font-semibold text-emerald-700">Verified</span></li>
          <li className="orq-card flex justify-between"><span>Chargeback ratio</span><span className="font-semibold">0.22%</span></li>
          <li className="orq-card flex justify-between"><span>Support SLA</span><span className="font-semibold">2h</span></li>
        </ul>
      </div>
    </div>
  );
}

function CheckoutView({ onSignal }: { onSignal: (message: string) => void }) {
  const [intentId, setIntentId] = useState("pi_demo_20260213_001");
  const [phase, setPhase] = useState<CheckoutPhase>("idle");
  const [events, setEvents] = useState<string[]>(["System ready. Start simulation or run manual controls."]);
  const [isRunning, setIsRunning] = useState(false);
  const simulationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const createIntent = () => {
    const nextIntentId = `pi_demo_${Date.now()}`;
    setIntentId(nextIntentId);
    setPhase("intent_created");
    setEvents((current) => [
      `Intent created: ${nextIntentId}`,
      "Idempotency key persisted for 24h deduplication window.",
      ...current,
    ]);
    onSignal(`Intent created: ${nextIntentId}. Awaiting confirmation callback.`);
  };

  const markSucceeded = () => {
    setPhase("completed");
    setEvents((current) => ["Provider confirmed capture. Flow marked completed.", ...current]);
    onSignal(`Intent ${intentId} marked succeeded. Ledger and payout chain updated.`);
  };

  const resetFlow = () => {
    if (simulationTimerRef.current) {
      clearTimeout(simulationTimerRef.current);
      simulationTimerRef.current = null;
    }
    setIsRunning(false);
    setIntentId("pi_demo_20260213_001");
    setPhase("idle");
    setEvents(["System reset. Flow returned to baseline state."]);
    onSignal("Checkout scenario reset to baseline.");
  };

  const runSimulation = () => {
    if (isRunning) return;
    const nextIntentId = `pi_demo_${Date.now()}`;
    setIntentId(nextIntentId);
    setIsRunning(true);
    setPhase("intent_created");
    setEvents([`Simulation started for ${nextIntentId}`]);
  };

  useEffect(() => {
    if (!isRunning) return;

    const currentStepIndex = checkoutFlow.findIndex((step) => step.phase === phase);
    if (currentStepIndex === -1) return;

    if (phase === "completed") {
      setIsRunning(false);
      onSignal(`Simulation complete for ${intentId}. End-to-end flow succeeded with deterministic trace.`);
      return;
    }

    const next = checkoutFlow[currentStepIndex + 1];
    if (!next) {
      setIsRunning(false);
      return;
    }

    simulationTimerRef.current = setTimeout(() => {
      setPhase(next.phase);
      setEvents((current) => [`${next.label}: ${next.detail}`, ...current].slice(0, 8));
      onSignal(`${next.label} completed for ${intentId}.`);
    }, 850);

    return () => {
      if (simulationTimerRef.current) clearTimeout(simulationTimerRef.current);
    };
  }, [isRunning, phase, intentId, onSignal]);

  const phaseIndex = checkoutFlow.findIndex((item) => item.phase === phase);
  const statusLabel = phase === "idle" ? "not-started" : phase.replaceAll("_", " ");
  const qrMatrix = useMemo(() => buildMockQrMatrix(intentId), [intentId]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="orq-surface orq-glow">
        <h3 className="text-lg font-semibold text-foreground">Checkout Control</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Live client-grade walkthrough from intent creation to booking and payout queue.
        </p>

        <div className="mt-5 space-y-4">
          <Metric label="Amount" value="B/. 142.50" />
          <Metric label="Payment Intent" value={intentId} mono />
          <div className="orq-card border-[#7f240e]/25 bg-[#fff9f1]">
            <p className="text-xs uppercase tracking-[0.14em] text-[#7f240e]">State Machine</p>
            <p className="mt-1 text-sm font-semibold capitalize text-stone-900">{statusLabel}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="orq-btn-primary" type="button" onClick={runSimulation}>
              Run Live Simulation
            </button>
            <button className="orq-btn-primary" type="button" onClick={createIntent}>Create Intent</button>
            <button className="orq-btn-primary" type="button" onClick={markSucceeded}>Mark Succeeded</button>
            <button className="orq-btn-secondary" type="button" onClick={resetFlow}>Reset</button>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {checkoutFlow.map((step, index) => {
            const done = phaseIndex >= index;
            const active = step.phase === phase;
            return (
              <div
                key={step.phase}
                className={`rounded-xl border px-3 py-2 transition ${
                  done ? "border-[#7f240e]/35 bg-[#fff8ef]" : "border-[#7f240e]/15 bg-white/70"
                } ${active ? "shadow-[0_10px_20px_rgba(127,36,14,0.14)]" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-700">{step.label}</p>
                  <span className={`text-[10px] uppercase tracking-wide ${done ? "text-emerald-700" : "text-stone-500"}`}>
                    {done ? "done" : "waiting"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-stone-600">{step.detail}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="orq-surface orq-glow">
        <h3 className="text-lg font-semibold text-foreground">Checkout + Processing Preview</h3>
        <div className="mt-5 rounded-2xl border border-[#7f240e]/26 bg-white/84 p-5 shadow-xl">
          <div className="rounded-xl bg-gradient-to-r from-[#2a160f] via-[#7f240e] to-[#bf6232] p-4 text-[#fff7ea]">
            <p className="text-sm font-medium">Complete your payment</p>
            <p className="text-2xl font-semibold">B/. 142.50</p>
          </div>
          <div className="mt-4 flex items-center justify-center">
            <div className="relative rounded-xl border border-[#7f240e]/24 bg-[#fff6ea] p-3 text-center text-xs text-stone-500">
              {phase === "qr_presented" || phase === "customer_scanned" ? (
                <span className="pointer-events-none absolute inset-x-2 top-5 h-1 rounded-full bg-[#7f240e]/55 animate-pulse" />
              ) : null}
              <div className="mx-auto grid w-[132px] grid-cols-[repeat(21,minmax(0,1fr))] gap-[1px] rounded-md bg-[#f3e8d8] p-1">
                {qrMatrix.map((cell, index) => (
                  <span
                    key={`${intentId}-qr-${index}`}
                    className={`block h-[5px] w-[5px] rounded-[1px] ${cell ? "bg-[#2a160f]" : "bg-[#f8f0e5]"}`}
                  />
                ))}
              </div>
              <p className="mt-2">QR Runtime</p>
              <span className="mt-1 block font-mono text-[10px] text-muted-foreground">yappy://pay/{intentId}</span>
            </div>
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Status: {statusLabel} · Expires in 4:31
          </p>

          <div className="mt-4 rounded-xl border border-[#7f240e]/18 bg-[#fff9f2] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7f240e]">Runtime Events</p>
            <ul className="mt-2 space-y-1 text-xs text-stone-700">
              {events.slice(0, 5).map((event, index) => (
                <li key={`${event}-${index}`} className="rounded-lg border border-[#7f240e]/12 bg-white/80 px-2 py-1">
                  {event}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildMockQrMatrix(seed: string): boolean[] {
  const size = 21;
  const matrix = new Array(size * size).fill(false);
  const chars = seed.split("").map((char) => char.charCodeAt(0));

  const setFinder = (startX: number, startY: number) => {
    for (let y = 0; y < 7; y += 1) {
      for (let x = 0; x < 7; x += 1) {
        const isBorder = x === 0 || x === 6 || y === 0 || y === 6;
        const isCore = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        matrix[(startY + y) * size + (startX + x)] = isBorder || isCore;
      }
    }
  };

  setFinder(0, 0);
  setFinder(size - 7, 0);
  setFinder(0, size - 7);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const idx = y * size + x;
      if (matrix[idx]) continue;
      const code = chars[(x + y) % chars.length] ?? 0;
      matrix[idx] = ((code + x * 17 + y * 31) % 5) <= 1;
    }
  }

  return matrix;
}

function StoryPanel({
  story,
  onAction,
}: {
  story: { headline: string; context: string; conflict: string; resolution: string; cta: string };
  onAction: () => void;
}) {
  return (
    <div className="orq-surface orq-glow">
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="orq-card lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Narrative Signal</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{story.headline}</h3>
          <p className="mt-3 text-sm text-muted-foreground">{story.context}</p>
        </div>
        <div className="orq-card">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Conflict</p>
          <p className="mt-2 text-sm text-foreground">{story.conflict}</p>
        </div>
        <div className="orq-card">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Resolution</p>
          <p className="mt-2 text-sm text-foreground">{story.resolution}</p>
          <button className="orq-btn-primary mt-4 w-full" type="button" onClick={onAction}>
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
      <h3 className="text-lg font-semibold text-foreground">Operational Timeline</h3>
      <p className="mt-1 text-sm text-muted-foreground">Latest settlement cycle from intent to payout readiness.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        {steps.map((step, index) => (
          <div
            key={step.label}
            className="orq-card"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <p className="text-xs uppercase tracking-wide text-stone-500">{step.label}</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{step.latency}</p>
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
      <p className={`mt-1 text-lg font-semibold text-foreground ${mono ? "font-mono text-sm" : ""}`}>{value}</p>
    </div>
  );
}

function Panel({ title, items }: { title: string; items: Array<{ id: string; value: string }> }) {
  return (
    <div className="orq-card">
      <h4 className="mb-3 text-sm font-semibold text-foreground">{title}</h4>
      <ul className="space-y-3 text-sm">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between">
            <span className="text-muted-foreground">{item.id}</span>
            <span className="font-semibold text-foreground">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DemoScenarioPanel({
  title,
  subtitle,
  runLabel,
  steps,
  onSignal,
}: {
  title: string;
  subtitle: string;
  runLabel: string;
  steps: SimulationStep[];
  onSignal: (message: string) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [events, setEvents] = useState<string[]>(["Scenario ready. Click run to start live walkthrough."]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = () => {
    if (isRunning) return;
    setEvents([`${title} started.`]);
    setActiveIndex(0);
    setIsRunning(true);
  };

  const advance = () => {
    setActiveIndex((current) => {
      const next = Math.min(current + 1, steps.length - 1);
      return next;
    });
  };

  const reset = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setIsRunning(false);
    setActiveIndex(-1);
    setEvents(["Scenario reset to baseline."]);
    onSignal(`${title} reset.`);
  };

  useEffect(() => {
    if (activeIndex < 0) return;

    const step = steps[activeIndex];
    setEvents((current) => [`${step.label}: ${step.detail}`, ...current].slice(0, 7));
    onSignal(`${title}: ${step.label} completed.`);

    if (!isRunning) return;
    if (activeIndex >= steps.length - 1) {
      setIsRunning(false);
      onSignal(`${title} completed. Full flow validated.`);
      return;
    }

    timerRef.current = setTimeout(() => {
      setActiveIndex((current) => Math.min(current + 1, steps.length - 1));
    }, 900);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeIndex, isRunning, onSignal, steps, title]);

  return (
    <div className="orq-surface orq-glow">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="orq-btn-primary" onClick={run}>
          {runLabel}
        </button>
        <button type="button" className="orq-btn-secondary" onClick={advance}>
          Advance One Step
        </button>
        <button type="button" className="orq-btn-secondary" onClick={reset}>
          Reset
        </button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          {steps.map((step, index) => {
            const done = activeIndex >= index;
            const active = activeIndex === index;
            return (
              <article
                key={step.id}
                className={`rounded-xl border px-3 py-2 transition ${
                  done ? "border-[#7f240e]/35 bg-[#fff8ef]" : "border-[#7f240e]/14 bg-white/80"
                } ${active ? "shadow-[0_10px_22px_rgba(127,36,14,0.14)]" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-800">{step.label}</p>
                  <span className={`text-[10px] uppercase tracking-wide ${done ? "text-emerald-700" : "text-stone-500"}`}>
                    {done ? "done" : "pending"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-stone-600">{step.detail}</p>
                <p className="mt-1 text-[11px] text-[#7f240e]">{step.operator}</p>
              </article>
            );
          })}
        </div>
        <div className="rounded-xl border border-[#7f240e]/16 bg-[#fff9f2] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7f240e]">Live Event Stream</p>
          <ul className="mt-2 space-y-1 text-xs text-stone-700">
            {events.map((event, index) => (
              <li key={`${event}-${index}`} className="rounded-lg border border-[#7f240e]/12 bg-white/85 px-2 py-1">
                {event}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
