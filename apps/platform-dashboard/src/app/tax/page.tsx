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
        <h1 className="text-2xl font-semibold text-slate-100">ITBMS Reports</h1>
        <p className="mb-6 text-sm text-slate-400">Monthly 7% tax summaries for DGI filing.</p>

        <div className="orq-surface orq-glow">
          <ul className="space-y-4">
            {months.map((row) => (
              <li key={row.period} className="orq-card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-100">{row.period}</p>
                  <p className="text-sm text-slate-400">Gross fees {row.grossFees}</p>
                </div>
                <div className="text-sm text-slate-300">ITBMS {row.itbms}</div>
                <div className={row.status === "Filed" ? "orq-badge-success" : "orq-badge-info"}>{row.status}</div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
