import { DashboardNav } from "@orquesta/ui";

const sweeps = [
  { id: "fs_2001", seller: "s_001", fees: "B/. 3,625.22", itbms: "B/. 253.76", status: "swept" },
  { id: "fs_2002", seller: "s_002", fees: "B/. 1,995.10", itbms: "B/. 139.65", status: "pending" },
  { id: "fs_2003", seller: "s_004", fees: "US$ 822.44", itbms: "US$ 57.57", status: "swept" },
];

export default function FeesPage() {
  const sweptCount = sweeps.filter((sweep) => sweep.status === "swept").length;

  return (
    <main className="orq-page">
      <DashboardNav />
      <section className="orq-container max-w-5xl">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-950">Fee Sweeps</h1>
        <p className="mb-6 text-sm text-stone-600">Hourly obligation settlement and ITBMS accrual integrity.</p>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="orq-card">
            <p className="text-xs uppercase tracking-wide text-stone-500">Cycles today</p>
            <p className="mt-1 text-lg font-semibold text-stone-950">{sweeps.length}</p>
          </div>
          <div className="orq-card">
            <p className="text-xs uppercase tracking-wide text-stone-500">Completed sweeps</p>
            <p className="mt-1 text-lg font-semibold text-stone-950">{sweptCount}</p>
          </div>
          <div className="orq-card">
            <p className="text-xs uppercase tracking-wide text-stone-500">Pending attention</p>
            <p className="mt-1 text-lg font-semibold text-stone-950">{sweeps.length - sweptCount}</p>
          </div>
        </div>

        <div className="orq-surface orq-glow">
          <ul className="space-y-3">
            {sweeps.map((sweep) => (
              <li key={sweep.id} className="orq-card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-stone-950">{sweep.id}</p>
                  <p className="text-sm text-stone-600">Seller {sweep.seller}</p>
                </div>
                <p className="text-sm text-stone-700">Fees {sweep.fees} | ITBMS {sweep.itbms}</p>
                <span className={sweep.status === "swept" ? "orq-badge-success" : "orq-badge-warning"}>{sweep.status}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
