"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface BarCategory {
  key: string;
  label: string;
  color: string;
}

export interface BarDataPoint {
  label: string; // e.g. 'Apr', 'May'
  values: Record<string, number>;
}

export interface BarChartProps {
  data: BarDataPoint[];
  categories: BarCategory[];
  height?: number;
  showLegend?: boolean;
  className?: string;
}

export function BarChart({
  data,
  categories,
  height = 160,
  showLegend = true,
  className,
}: BarChartProps) {
  // Compute max stacked sum
  const maxVal = Math.max(
    1,
    ...data.map((dp) =>
      categories.reduce((sum, cat) => sum + (dp.values[cat.key] || 0), 0)
    )
  );

  return (
    <div className={cn("space-y-3", className)}>
      {showLegend && (
        <div className="flex items-center gap-4 text-xs justify-end flex-wrap">
          {categories.map((cat) => (
            <div key={cat.key} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: cat.color }} />
              <span className="text-[var(--text-muted)] text-[11px] font-medium">{cat.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Bars Container */}
      <div className="flex items-end justify-between gap-2 pt-4 px-2" style={{ height }}>
        {data.map((dp, idx) => {
          const totalStack = categories.reduce(
            (sum, cat) => sum + (dp.values[cat.key] || 0),
            0
          );
          const barHeightPercent = Math.max(8, (totalStack / maxVal) * 100);

          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
              <div
                className="w-full max-w-[28px] rounded-t-lg overflow-hidden flex flex-col-reverse transition-all duration-300 group-hover:brightness-105 shadow-2xs"
                style={{ height: `${barHeightPercent}%` }}
              >
                {categories.map((cat) => {
                  const val = dp.values[cat.key] || 0;
                  const catPercent = totalStack > 0 ? (val / totalStack) * 100 : 0;
                  if (val === 0) return null;

                  return (
                    <div
                      key={cat.key}
                      style={{
                        height: `${catPercent}%`,
                        backgroundColor: cat.color,
                      }}
                      title={`${cat.label}: ${val}`}
                      className="w-full transition-all duration-300"
                    />
                  );
                })}
              </div>
              <span className="text-[10px] font-mono text-slate-400 group-hover:text-slate-800 transition-colors">
                {dp.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
