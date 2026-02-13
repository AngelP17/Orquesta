import { DashboardNav } from "@orquesta/ui";

const sweeps = [
  { id: "fs_2001", seller: "s_001", fees: "B/. 3,625.22", itbms: "B/. 253.76", status: "swept" },
  { id: "fs_2002", seller: "s_002", fees: "B/. 1,995.10", itbms: "B/. 139.65", status: "pending" },
  { id: "fs_2003", seller: "s_004", fees: "US$ 822.44", itbms: "US$ 57.57", status: "swept" },
];

export default function FeesPage() {
  return (
    <main className="orq-page">
      <DashboardNav />
      <section className="orq-container max-w-5xl">
        <h1 className="text-2xl font-semibold text-slate-100">Fee Sweeps</h1>
        <p className="mb-6 text-sm text-slate-400">Hourly fee obligation settlement and ITBMS accrual.</p>

        <div className="orq-surface orq-glow">
          <ul className="space-y-3">
            {sweeps.map((sweep) => (
              <li key={sweep.id} className="orq-card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-100">{sweep.id}</p>
                  <p className="text-sm text-slate-400">Seller {sweep.seller}</p>
                </div>
                <p className="text-sm text-slate-300">Fees {sweep.fees} | ITBMS {sweep.itbms}</p>
                <span className={sweep.status === "swept" ? "orq-badge-success" : "orq-badge-warning"}>{sweep.status}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
