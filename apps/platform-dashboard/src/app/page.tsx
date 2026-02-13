import { DashboardNav } from "@orquesta/ui";

export default function Home() {
  return (
    <main className="min-h-screen">
      <DashboardNav />
      <div className="p-8">
        <h1 className="text-3xl font-serif">Platform Dashboard</h1>
      </div>
    </main>
  );
}
