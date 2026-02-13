import { IntegratedWorkspace } from "@/components/IntegratedWorkspace";
import { DashboardNav } from "@orquesta/ui";

export default function DashboardPage() {
  return (
    <main className="orq-page">
      <DashboardNav />

      <div className="orq-container">
        <header className="mb-8 space-y-4 md:mb-10">
          <span className="orq-kicker">Orquesta Fintech OS</span>
          <h1 className="orq-title">
            One Premium Workspace for
            <span className="mt-2 block bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-400 bg-clip-text font-serif italic text-transparent">
              Platform, Seller, and Checkout
            </span>
          </h1>
          <p className="orq-subtitle">
            Commerce-grade orchestration for Panama payments with a single command center. Switch between operations,
            seller intelligence, and buyer checkout without context loss.
          </p>
        </header>

        <IntegratedWorkspace />
      </div>
    </main>
  );
}
