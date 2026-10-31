import React from "react";

export interface HorizontalProgressBarProps {
  label?: string;
  percentage: number;
  subtext?: string;
}

export function HorizontalProgressBar({
  label,
  percentage,
  subtext,
}: HorizontalProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percentage));

  return (
    <div className="w-full space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        {label && <span className="font-medium text-slate-700">{label}</span>}
        <span className="font-semibold text-slate-900">{clamped}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {subtext && <p className="text-xs text-slate-400">{subtext}</p>}
    </div>
  );
}
