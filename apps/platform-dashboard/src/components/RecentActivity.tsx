const activities = [
  { id: 1, type: "payment", description: "Payment received from Seller #123", amount: "B/. 1,234.00", time: "2 min ago", status: "success" },
  { id: 2, type: "payout", description: "Payout processed to Seller #456", amount: "B/. 5,678.00", time: "15 min ago", status: "success" },
  { id: 3, type: "fee", description: "Fee sweep completed", amount: "B/. 234.56", time: "1 hour ago", status: "success" },
  { id: 4, type: "risk", description: "Seller #789 risk tier changed to RED", amount: "-", time: "2 hours ago", status: "warning" },
  { id: 5, type: "payment", description: "Payment failed for Seller #321", amount: "B/. 999.00", time: "3 hours ago", status: "error" },
];

export function RecentActivity() {
  return (
    <div className="divide-y divide-[#7f240e]/14">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex flex-col gap-3 px-6 py-4 transition hover:bg-[#b7855f]/10 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <ActivityIcon type={activity.type} status={activity.status} />
            <div>
              <p className="text-sm font-medium text-stone-900">{activity.description}</p>
              <p className="text-xs text-stone-500">{activity.time}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-stone-900">{activity.amount}</p>
            <StatusBadge status={activity.status} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityIcon({ type, status }: { type: string; status: string }) {
  const styles = {
    success: "orq-badge-success",
    warning: "orq-badge-warning",
    error: "orq-badge-danger",
  };

  return (
    <div className={`grid h-10 w-10 place-items-center rounded-full text-sm font-semibold ${styles[status as keyof typeof styles]}`}>
      {type === "payment" && "$"}
      {type === "payout" && "↗"}
      {type === "fee" && "%"}
      {type === "risk" && "!"}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    success: "orq-badge-success",
    warning: "orq-badge-warning",
    error: "orq-badge-danger",
  };

  return <span className={styles[status as keyof typeof styles]}>{status}</span>;
}
