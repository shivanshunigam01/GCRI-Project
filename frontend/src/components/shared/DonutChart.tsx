"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export interface DonutChartProps {
  segments: DonutSegment[];
  centerLabel?: string;
  centerValue?: string | number;
  centerSubtext?: string;
  size?: number;
  strokeWidth?: number;
  showLegend?: boolean;
  className?: string;
}

export function DonutChart({
  segments,
  centerLabel,
  centerValue,
  centerSubtext,
  size = 160,
  strokeWidth = 14,
  showLegend = true,
  className,
}: DonutChartProps) {
  const total = segments.reduce((acc, curr) => acc + curr.value, 0);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className={cn("flex flex-col sm:flex-row items-center justify-center gap-6", className)}>
      {/* SVG Ring */}
      <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90 drop-shadow-xs"
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />

          {/* Animated Segment Arcs */}
          {total > 0 &&
            segments.map((seg, idx) => {
              const percent = seg.value / total;
              const strokeDasharray = `${circumference * percent} ${circumference * (1 - percent)}`;
              const strokeDashoffset = -circumference * accumulatedPercent;
              accumulatedPercent += percent;

              return (
                <circle
                  key={idx}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              );
            })}
        </svg>

        {/* Center Readout */}
        {(centerValue || centerLabel) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
            {centerValue && (
              <span className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] tracking-tight font-sans">
                {centerValue}
              </span>
            )}
            {centerLabel && (
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-0.5">
                {centerLabel}
              </span>
            )}
            {centerSubtext && (
              <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                {centerSubtext}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="space-y-2 text-xs flex-1 max-w-[200px]">
          {segments.map((seg, idx) => {
            const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
            return (
              <div key={idx} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="text-[var(--text-muted)] truncate">{seg.label}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 font-mono">
                  <span className="font-bold text-[var(--text-main)]">{seg.value}</span>
                  <span className="text-slate-400 text-[10px]">({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
