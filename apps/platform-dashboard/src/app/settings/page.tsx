import { DashboardNav } from "@orquesta/ui";

const keys = [
  { label: "Sandbox key", prefix: "sk_test_39xa...kLp9", rotatedAt: "2026-02-11" },
  { label: "Live key", prefix: "sk_live_27fd...Qa20", rotatedAt: "2026-01-20" },
];

export default function SettingsPage() {
  return (
    <main className="orq-page">
      <DashboardNav />
      <section className="orq-container max-w-4xl">
        <h1 className="text-2xl font-semibold text-stone-950">Settings</h1>
        <p className="mb-6 text-sm text-stone-600">API credentials and payout configuration.</p>

        <div className="space-y-5">
          <div className="orq-surface orq-glow">
            <h2 className="text-lg font-semibold text-stone-950">API Keys</h2>
            <ul className="mt-4 space-y-3">
              {keys.map((key) => (
                <li key={key.label} className="orq-card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-stone-950">{key.label}</p>
                    <p className="font-mono text-xs text-stone-600">{key.prefix}</p>
                    <p className="mt-1 text-xs text-stone-500">Rotated {key.rotatedAt}</p>
                  </div>
                  <button className="orq-btn-primary" type="button">Rotate</button>
                </li>
              ))}
            </ul>
          </div>

          <div className="orq-surface orq-glow">
            <h2 className="text-lg font-semibold text-stone-950">Payout Window</h2>
            <p className="mt-2 text-sm text-stone-600">
              Current schedule: 06:00 UTC daily, batch size 50, risk gate enabled (RED/BLACK blocked).
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
