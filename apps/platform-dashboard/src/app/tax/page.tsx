import { DashboardNav } from "@orquesta/ui";

const months = [
  { period: "2026-02", grossFees: "B/. 38,506.20", itbms: "B/. 2,695.43", status: "Draft" },
  { period: "2026-01", grossFees: "B/. 36,975.00", itbms: "B/. 2,588.25", status: "Filed" },
  { period: "2025-12", grossFees: "B/. 34,576.70", itbms: "B/. 2,420.36", status: "Filed" },
];

export default function TaxPage() {
  return (
    <main className="orq-page">
      <DashboardNav />
      <section className="orq-container max-w-5xl">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-950">ITBMS Reports</h1>
        <p className="mb-6 text-sm text-stone-600">Monthly tax posture for DGI filing and audit readiness.</p>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="orq-card">
            <p className="text-xs uppercase tracking-wide text-stone-500">Periods tracked</p>
            <p className="mt-1 text-lg font-semibold text-stone-950">{months.length}</p>
          </div>
          <div className="orq-card">
            <p className="text-xs uppercase tracking-wide text-stone-500">Filed periods</p>
            <p className="mt-1 text-lg font-semibold text-stone-950">{months.filter((row) => row.status === "Filed").length}</p>
          </div>
          <div className="orq-card">
            <p className="text-xs uppercase tracking-wide text-stone-500">Draft periods</p>
            <p className="mt-1 text-lg font-semibold text-stone-950">{months.filter((row) => row.status === "Draft").length}</p>
          </div>
        </div>

        <div className="orq-surface orq-glow">
          <ul className="space-y-4">
            {months.map((row) => (
              <li key={row.period} className="orq-card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-stone-950">{row.period}</p>
                  <p className="text-sm text-stone-600">Gross fees {row.grossFees}</p>
                </div>
                <div className="text-sm text-stone-700">ITBMS {row.itbms}</div>
                <div className={row.status === "Filed" ? "orq-badge-success" : "orq-badge-info"}>{row.status}</div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
