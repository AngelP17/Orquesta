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
              <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.45} />
              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" stroke="rgba(148, 163, 184, 0.18)" />
          <XAxis dataKey="month" tick={{ fill: '#8aa3c7', fontSize: 12 }} axisLine={{ stroke: 'rgba(148,163,184,0.3)' }} />
          <YAxis
            tickFormatter={(value) => `${Math.round(value / 1000000)}M`}
            tick={{ fill: '#8aa3c7', fontSize: 12 }}
            axisLine={{ stroke: 'rgba(148,163,184,0.3)' }}
          />
          <Tooltip
            formatter={(value: number, name: string) => [toMoney(value), name === 'gmv' ? 'GMV' : 'Fees']}
            labelStyle={{ color: '#e2e8f0' }}
            contentStyle={{
              borderRadius: 12,
              borderColor: 'rgba(34,211,238,0.35)',
              background: 'rgba(2, 6, 23, 0.92)',
              color: '#cbd5e1'
            }}
          />
          <Area type="monotone" dataKey="gmv" stroke="#22d3ee" strokeWidth={2.4} fillOpacity={1} fill="url(#gmvFillDark)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
