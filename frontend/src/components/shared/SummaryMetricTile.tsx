"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type SummaryMetricTone = "cyan" | "emerald" | "teal" | "blue" | "amber" | "rose" | "slate";

const TONE: Record<
  SummaryMetricTone,
  { border: string; iconBg: string; iconText: string; ring: string; sheen: string; sub: string }
> = {
  cyan: {
    border: "hover:border-cyan-300/80",
    iconBg: "bg-cyan-50 border-cyan-100",
    iconText: "text-cyan-700",
    ring: "group-hover:ring-cyan-100/70",
    sheen: "via-cyan-500/70",
    sub: "text-teal-600",
  },
  emerald: {
    border: "hover:border-emerald-300/80",
    iconBg: "bg-emerald-50 border-emerald-100",
    iconText: "text-emerald-600",
    ring: "group-hover:ring-emerald-100/70",
    sheen: "via-emerald-500/70",
    sub: "text-emerald-600",
  },
  teal: {
    border: "hover:border-teal-300/80",
    iconBg: "bg-teal-50 border-teal-100",
    iconText: "text-teal-700",
    ring: "group-hover:ring-teal-100/70",
    sheen: "via-teal-500/70",
    sub: "text-teal-600",
  },
  blue: {
    border: "hover:border-blue-300/80",
    iconBg: "bg-blue-50 border-blue-100",
    iconText: "text-blue-700",
    ring: "group-hover:ring-blue-100/70",
    sheen: "via-blue-500/70",
    sub: "text-blue-600",
  },
  amber: {
    border: "hover:border-amber-300/80",
    iconBg: "bg-amber-50 border-amber-100",
    iconText: "text-amber-700",
    ring: "group-hover:ring-amber-100/70",
    sheen: "via-amber-500/70",
    sub: "text-amber-600",
  },
  rose: {
    border: "hover:border-rose-300/80",
    iconBg: "bg-rose-50 border-rose-100",
    iconText: "text-rose-700",
    ring: "group-hover:ring-rose-100/70",
    sheen: "via-rose-500/70",
    sub: "text-rose-600",
  },
  slate: {
    border: "hover:border-slate-300/80",
    iconBg: "bg-slate-100 border-slate-200",
    iconText: "text-slate-600",
    ring: "group-hover:ring-slate-100/70",
    sheen: "via-slate-400/70",
    sub: "text-slate-500",
  },
};

export type SummaryMetricTileProps = {
  value: React.ReactNode;
  label: string;
  subtext?: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tone?: SummaryMetricTone;
  onClick?: () => void;
  className?: string;
};

/** Clickable summary count tile used across modules. */
export function SummaryMetricTile({
  value,
  label,
  subtext,
  icon: Icon,
  tone = "cyan",
  onClick,
  className,
}: SummaryMetricTileProps) {
  const styles = TONE[tone];
  const Comp = onClick ? "button" : "div";

  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs transition-all duration-300 ease-out flex items-center gap-3 text-left w-full",
        onClick &&
          "cursor-pointer hover:-translate-y-1 hover:shadow-[0_12px_24px_-6px_rgba(15,23,42,0.08),0_4px_8px_-2px_rgba(15,23,42,0.03)]",
        styles.border,
        className
      )}
    >
      <div
        className={`absolute top-0 inset-x-0 h-0.75 bg-gradient-to-r from-transparent ${styles.sheen} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
      />
      <div
        className={cn(
          "h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 border shadow-2xs transition-all duration-300 ease-out group-hover:scale-105 group-hover:ring-4",
          styles.iconBg,
          styles.iconText,
          styles.ring
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={1.85} />
      </div>
      <div className="min-w-0">
        <div className="text-xl font-extrabold text-slate-900 leading-tight tracking-tight group-hover:text-slate-950 transition-colors">
          {value}
        </div>
        <div className="text-[11px] font-medium text-slate-500 truncate mt-0.5 group-hover:text-slate-600 transition-colors">
          {label}
        </div>
        {subtext && (
          <div className={cn("text-[10px] font-semibold mt-0.5", styles.sub)}>{subtext}</div>
        )}
      </div>
    </Comp>
  );
}
