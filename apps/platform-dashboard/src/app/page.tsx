import { IntegratedWorkspace } from "@/components/IntegratedWorkspace";
import { DashboardNav } from "@orquesta/ui";

const serviceChain = [
  {
    id: "Service 1",
    title: "Yappy Intent Orchestrator",
    detail: "Normalize payment intents, score risk, and seal correlation metadata before settlement.",
  },
  {
    id: "Service 2",
    title: "Ledger Integrity Engine",
    detail: "Book double-entry movements with deterministic replay and immutable lineage.",
  },
  {
    id: "Service 3",
    title: "Payout + ITBMS Executor",
    detail: "Run batched payouts and monthly tax posture with audit-ready traceability.",
  },
] as const;

const liveStats = [
  { label: "Events Processed", value: "24,783", note: "Payment and payout events" },
  { label: "Ledger Entries", value: "8,259", note: "Double-entry rows posted" },
  { label: "Deterministic Rate", value: "100%", note: "Replay-safe operations" },
  { label: "Verification Latency", value: "<50ms", note: "Trace and proof checks" },
] as const;

const principles = [
  {
    id: "01",
    title: "Determinism",
    body: "Same input, same accounting result. Every critical workflow can be replayed with confidence.",
  },
  {
    id: "02",
    title: "Immutability",
    body: "Ledger events are append-only. Any tampering attempt breaks integrity validation immediately.",
  },
  {
    id: "03",
    title: "Transparency",
    body: "No hidden state transitions. Every fee, payout, and tax movement includes contextual evidence.",
  },
  {
    id: "04",
    title: "Verifiability",
    body: "Risk decisions, balances, and obligations are provable through linked events and idempotent keys.",
  },
  {
    id: "05",
    title: "Efficiency",
    body: "Batch operations and event-driven updates keep high throughput without compromising correctness.",
  },
  {
    id: "06",
    title: "Provenance",
    body: "Trace every report back to source intents, ledger entries, provider callbacks, and operator actions.",
  },
] as const;

const useCases = [
  {
    title: "Platform Operations",
    body: "Run live payment supervision, risk gating, and treasury posture from one command surface.",
    metric: "99.95% continuity",
  },
  {
    title: "Merchant Intelligence",
    body: "Give sellers real-time balance, payout, and risk context with fewer support escalations.",
    metric: "2h SLA visibility",
  },
  {
    title: "Compliance and Tax",
    body: "Generate ITBMS-ready monthly evidence packets with deterministic lineage and retention controls.",
    metric: "7-year audit trail",
  },
] as const;

const pipeline = [
  { step: "Step 01", title: "Ingest", detail: "Capture intents, webhooks, and seller actions as schema-bound events." },
  { step: "Step 02", title: "Normalize", detail: "Validate, deduplicate, and enrich with correlation and risk attributes." },
  { step: "Step 03", title: "Prove", detail: "Link booking outcomes to immutable ledger entries and verification checks." },
  { step: "Step 04", title: "Execute", detail: "Settle payouts, sweep fees, and produce ITBMS filing evidence." },
] as const;

const consoleLines = [
  "> Yappy webhook received: pi_1004",
  "> Signature verification: PASSED",
  "> Risk score computed: GREEN (0.19)",
  "> Ledger transaction posted: tx_20260213_442",
  "> Fee obligation accrued: fs_2003",
  "> ITBMS projection updated: period 2026-02",
] as const;

export default function DashboardPage() {
  return (
    <main className="orq-page">
      <DashboardNav />

      <div className="orq-container space-y-10">
        <section className="orq-surface orq-glow overflow-hidden">
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="orq-kicker">Orquesta Payments OS</span>
                <a className="rounded-full border border-[#7f240e]/25 bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#6c3d2b]" href="#what-is">
                  What is it
                </a>
                <a className="rounded-full border border-[#7f240e]/25 bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#6c3d2b]" href="#use-cases">
                  Use Cases
                </a>
                <a className="rounded-full border border-[#7f240e]/25 bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#6c3d2b]" href="#principles">
                  Principles
                </a>
                <a className="rounded-full border border-[#7f240e]/25 bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#6c3d2b]" href="#console">
                  Console
                </a>
              </div>

              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">Platform Overview</h2>
              <h1 className="orq-title">
                Signal-grade Panama payment intelligence.
                <span className="mt-2 block bg-gradient-to-r from-[#7f240e] via-[#b74d26] to-[#cd7a41] bg-clip-text font-[family-name:var(--font-instrument-serif)] text-transparent">
                  Ledger truth, risk posture, and payout execution in one command system.
                </span>
              </h1>
              <p className="orq-subtitle">
                A single platform service chain: intent orchestration, deterministic booking, and tax-aware payout
                execution with audit-grade lineage.
              </p>

              <div className="flex flex-wrap gap-2">
                <button className="orq-btn-primary" type="button">Start Interactive Demo</button>
                <button className="orq-btn-secondary" type="button">Launch Console</button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {serviceChain.map((service) => (
                  <article key={service.title} className="orq-card">
                    <p className="text-xs uppercase tracking-wide text-stone-500">{service.id}</p>
                    <h3 className="mt-2 text-base font-semibold text-stone-950">{service.title}</h3>
                    <p className="mt-2 text-sm text-stone-700">{service.detail}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="orq-card flex h-full flex-col gap-4 bg-[#2a160f] text-[#fff4e9]">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#f3cfb9]">orquesta-console — zsh</p>
                <span className="rounded-full bg-[#b74d26]/35 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#ffd8c2]">
                  Live
                </span>
              </div>
              <div className="rounded-xl border border-[#f0d2be]/20 bg-[#1f100a] p-4 font-mono text-xs leading-relaxed text-[#f5d9c7]">
                {consoleLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[#f0d2be]/20 bg-[#1f100a] p-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[#d7a787]">Ledger Root</p>
                  <p className="mt-1 font-mono text-[11px] text-[#ffe6d6]">0x7d2a8f...9e4b1c</p>
                  <p className="mt-1 text-[11px] text-emerald-300">VALID</p>
                </div>
                <div className="rounded-xl border border-[#f0d2be]/20 bg-[#1f100a] p-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[#d7a787]">State Chain</p>
                  <p className="mt-1 text-[11px] text-[#ffe6d6]">EVENT → SCORE → BOOK → SEAL</p>
                  <p className="mt-1 text-[11px] text-emerald-300">IMMUTABLE</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {liveStats.map((stat) => (
              <article key={stat.label} className="orq-card">
                <p className="text-xs uppercase tracking-wide text-stone-500">{stat.label}</p>
                <p className="mt-1 text-2xl font-semibold text-stone-950">{stat.value}</p>
                <p className="text-xs text-stone-600">{stat.note}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="what-is" className="grid gap-6 lg:grid-cols-2">
          <article className="orq-surface orq-glow">
            <h2 className="text-xl font-semibold tracking-tight text-stone-950">What is Orquesta?</h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-700">
              Orquesta is an operations-grade platform for Panama payment orchestration. It transforms intents, risk
              decisions, ledger posting, payout execution, and ITBMS reporting into one cryptographically traceable
              service chain.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-stone-700">
              Instead of fragmented dashboards and trust-based reconciliation, every critical movement is linked to
              deterministic events that can be replayed and audited on demand.
            </p>
          </article>
          <article className="orq-surface orq-glow">
            <h2 className="text-xl font-semibold tracking-tight text-stone-950">Core Pipeline</h2>
            <div className="mt-4 space-y-3">
              {pipeline.map((item) => (
                <div key={item.step} className="orq-card">
                  <p className="text-xs uppercase tracking-[0.16em] text-stone-500">{item.step}</p>
                  <h3 className="mt-1 text-base font-semibold text-stone-950">{item.title}</h3>
                  <p className="mt-1 text-sm text-stone-700">{item.detail}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section id="use-cases" className="orq-surface orq-glow">
          <h2 className="text-2xl font-semibold tracking-tight text-stone-950">Use Cases</h2>
          <p className="mt-2 text-sm text-stone-600">
            Orquesta supports platform operators, merchant teams, and compliance stakeholders through one operational narrative.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {useCases.map((item) => (
              <article key={item.title} className="orq-card">
                <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Platform Service</p>
                <h3 className="mt-2 text-lg font-semibold text-stone-950">{item.title}</h3>
                <p className="mt-2 text-sm text-stone-700">{item.body}</p>
                <p className="mt-4 text-sm font-semibold text-[#7f240e]">{item.metric}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="console" className="orq-surface orq-glow">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-tight text-stone-950">Live Demo Console</h2>
            <p className="mt-2 text-sm text-stone-600">
              Walk through command, merchant, and checkout workflows with synchronized state and narrative guidance.
            </p>
          </div>
          <IntegratedWorkspace />
        </section>

        <section id="principles" className="orq-surface orq-glow">
          <h2 className="text-2xl font-semibold tracking-tight text-stone-950">Design Principles</h2>
          <p className="mt-2 text-sm text-stone-600">
            Built for deterministic operations, audit resilience, and confidence at execution time.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {principles.map((item) => (
              <article key={item.id} className="orq-card">
                <p className="text-sm font-semibold text-[#7f240e]">{item.id}</p>
                <h3 className="mt-2 text-lg font-semibold text-stone-950">{item.title}</h3>
                <p className="mt-2 text-sm text-stone-700">{item.body}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
