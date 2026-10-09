import React from "react";
import { cn } from "@/lib/utils";

export interface HorizontalProgressBarProps {
  label: string;
  percentage: number;
  statusBadge?: string;
  badgeClass?: string;
  barColor?: string;
  barGradient?: string;
  index?: number;
  className?: string;
}

export function HorizontalProgressBar({
  label,
  percentage,
  statusBadge,
  badgeClass,
  barColor,
  barGradient,
  index,
  className,
}: HorizontalProgressBarProps) {
  // Default gradient based on percentage thresholds if not explicitly provided
  const defaultGradient =
    barGradient ||
    (percentage >= 80
      ? "from-emerald-500 to-teal-500"
      : percentage >= 60
      ? "from-blue-600 to-indigo-600"
      : percentage >= 40
      ? "from-amber-400 to-amber-500"
      : "from-rose-500 to-orange-500");

  return (
    <div className={cn("group space-y-1.5", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-[var(--text-main)] truncate pr-2 group-hover:text-blue-600 transition-colors">
          {typeof index === "number" && (
            <span className="font-mono text-slate-400 mr-1.5 text-[11px]">{index}.</span>
          )}
          {label}
        </span>
        <div className="flex items-center gap-2.5 shrink-0">
          {statusBadge && (
            <span
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-md font-semibold border",
                badgeClass || "bg-slate-100 text-slate-700 border-slate-200"
              )}
            >
              {statusBadge}
            </span>
          )}
          <span className="font-mono font-bold text-[var(--text-main)] w-9 text-right text-xs">
            {percentage}%
          </span>
        </div>
      </div>

      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 shadow-2xs">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            !barColor && `bg-gradient-to-r ${defaultGradient}`
          )}
          style={{
            width: `${Math.min(100, Math.max(0, percentage))}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
    </div>
  );
}
