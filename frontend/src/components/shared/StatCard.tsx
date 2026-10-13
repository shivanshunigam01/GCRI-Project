import React from "react";

export interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: string;
}

export function StatCard({ label, value, subtext }: StatCardProps) {
  return (
    <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-2">{value}</p>
      {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
    </div>
  );
}
