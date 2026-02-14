"use client";

import { PiChartLineUp, PiCurrencyDollarSimple, PiUsersThree, PiWallet } from "react-icons/pi";

interface StatsCardProps {
  title: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  icon: "money" | "users" | "chart" | "wallet";
}

const icons = {
  money: PiCurrencyDollarSimple,
  users: PiUsersThree,
  chart: PiChartLineUp,
  wallet: PiWallet,
};

const changeStyles: Record<StatsCardProps["changeType"], string> = {
  positive: "orq-badge-success",
  negative: "orq-badge-danger",
  neutral: "orq-badge-info",
};

const changeSymbols: Record<StatsCardProps["changeType"], string> = {
  positive: "↑",
  negative: "↓",
  neutral: "•",
};

export function StatsCard({ title, value, change, changeType, icon }: StatsCardProps) {
  const Icon = icons[icon];

  return (
    <div className="orq-card orq-glow animate-fade-up">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
        </div>
        <div className="rounded-xl border border-border bg-primary/10 p-3">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <span className={changeStyles[changeType]}>
          {changeSymbols[changeType]} <span className="ml-1">{change}</span>
        </span>
        <span className="text-xs text-muted-foreground">vs last month</span>
      </div>
    </div>
  );
}
