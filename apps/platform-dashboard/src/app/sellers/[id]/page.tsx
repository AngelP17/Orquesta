import { notFound } from "next/navigation";
import { formatMoney, payouts, sellers } from "@/lib/mockData";
import { DashboardNav } from "@orquesta/ui";

const riskBadge = {
  GREEN: "orq-badge-success",
  YELLOW: "orq-badge-warning",
  RED: "orq-badge-alert",
  BLACK: "orq-badge-danger",
};

export default function SellerDetailsPage({ params }: { params: { id: string } }) {
  const seller = sellers.find((item) => item.id === params.id);
  if (!seller) return notFound();

  const sellerPayouts = payouts.filter((item) => item.sellerId === seller.id);

  return (
    <main className="orq-page">
      <DashboardNav />
      <section className="orq-container max-w-5xl">
        <header className="orq-surface orq-glow mb-6">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Seller Profile</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-100">{seller.legalName}</h1>
          <p className="mt-1 text-sm text-slate-400">RUC {seller.ruc}</p>
          <div className="mt-3">
            <span className={riskBadge[seller.riskTier]}>{seller.riskTier}</span>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <Metric label="Current Balance" value={formatMoney(seller.balancePabCents, "PAB")} />
          <Metric label="Monthly Volume" value={formatMoney(seller.monthlyVolumePabCents, "PAB")} />
          <Metric label="Risk Tier" value={seller.riskTier} />
          <Metric label="Seller ID" value={seller.id} />
        </div>

        <div className="orq-surface orq-glow mt-6">
          <h2 className="text-lg font-semibold text-slate-100">Recent Payouts</h2>
          <ul className="mt-4 space-y-3">
            {sellerPayouts.map((payout) => (
              <li key={payout.id} className="orq-card flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-slate-100">{payout.id}</p>
                  <p className="text-slate-400">{new Date(payout.createdAt).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-100">{formatMoney(payout.amountCents, payout.currency)}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{payout.status}</p>
                </div>
              </li>
            ))}
            {sellerPayouts.length === 0 ? <li className="text-sm text-slate-400">No payouts yet.</li> : null}
          </ul>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="orq-card orq-glow">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-100">{value}</p>
    </div>
  );
}
