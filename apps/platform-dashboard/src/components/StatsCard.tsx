"use client";

import { BsCurrencyDollar, BsGraphUp, BsPeople, BsWallet } from "react-icons/bs";

interface StatsCardProps {
  title: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  icon: "money" | "users" | "chart" | "wallet";
}

const icons = {
  money: BsCurrencyDollar,
  users: BsPeople,
  chart: BsGraphUp,
  wallet: BsWallet,
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
          <p className="text-xs uppercase tracking-wide text-stone-500">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-stone-950">{value}</p>
        </div>
        <div className="rounded-xl border border-[#7f240e]/28 bg-[#7f240e]/8 p-3">
          <Icon className="h-6 w-6 text-[#7f240e]" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <span className={changeStyles[changeType]}>
          {changeSymbols[changeType]} <span className="ml-1">{change}</span>
        </span>
        <span className="text-xs text-stone-500">vs last month</span>
      </div>
    </div>
  );
}
