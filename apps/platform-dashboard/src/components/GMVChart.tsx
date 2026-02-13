"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { gmvTrend } from '@/lib/mockData';

const toMoney = (valueCents: number): string => `B/. ${(valueCents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export function GMVChart() {
  const data = gmvTrend.map((row) => ({
    month: row.month,
    gmv: Number(row.gmvCents),
    fees: Number(row.feesCents)
  }));

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="gmvFillDark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#b74d26" stopOpacity={0.42} />
              <stop offset="95%" stopColor="#d2865d" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" stroke="rgba(107, 75, 60, 0.18)" />
          <XAxis dataKey="month" tick={{ fill: "#715d50", fontSize: 12 }} axisLine={{ stroke: "rgba(107,75,60,0.25)" }} />
          <YAxis
            tickFormatter={(value) => `${Math.round(value / 1000000)}M`}
            tick={{ fill: "#715d50", fontSize: 12 }}
            axisLine={{ stroke: "rgba(107,75,60,0.25)" }}
          />
          <Tooltip
            formatter={(value: number, name: string) => [toMoney(value), name === "gmv" ? "GMV" : "Fees"]}
            labelStyle={{ color: "#2f2118" }}
            contentStyle={{
              borderRadius: 12,
              borderColor: "rgba(127,36,14,0.35)",
              background: "rgba(255, 248, 238, 0.96)",
              color: "#4c3428",
            }}
          />
          <Area type="monotone" dataKey="gmv" stroke="#9f3c19" strokeWidth={2.4} fillOpacity={1} fill="url(#gmvFillDark)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
