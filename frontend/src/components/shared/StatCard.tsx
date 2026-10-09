import React from "react";
import { LucideIcon, ArrowUpRight, ArrowDownRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatCardDelta {
  text: string;
  type?: "positive" | "negative" | "warning" | "neutral";
}

export interface StatCardProps {
  title: string;
  value: string | number;
  delta?: StatCardDelta;
  icon: LucideIcon;
  colorScheme?: "blue" | "cyan" | "emerald" | "amber" | "rose" | "purple" | "slate";
  subtext?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  delta,
  icon: Icon,
  colorScheme = "blue",
  subtext,
  className,
}: StatCardProps) {
  const schemeStyles = {
    blue: {
      iconBg: "bg-blue-50 text-blue-600",
      hoverIconBg: "group-hover:bg-blue-600 group-hover:text-white",
    },
    cyan: {
      iconBg: "bg-cyan-50 text-cyan-600",
      hoverIconBg: "group-hover:bg-cyan-600 group-hover:text-white",
    },
    emerald: {
      iconBg: "bg-emerald-50 text-emerald-600",
      hoverIconBg: "group-hover:bg-emerald-600 group-hover:text-white",
    },
    amber: {
      iconBg: "bg-amber-50 text-amber-600",
      hoverIconBg: "group-hover:bg-amber-600 group-hover:text-white",
    },
    rose: {
      iconBg: "bg-rose-50 text-rose-600",
      hoverIconBg: "group-hover:bg-rose-600 group-hover:text-white",
    },
    purple: {
      iconBg: "bg-purple-50 text-purple-600",
      hoverIconBg: "group-hover:bg-purple-600 group-hover:text-white",
    },
    slate: {
      iconBg: "bg-slate-100 text-slate-700",
      hoverIconBg: "group-hover:bg-slate-900 group-hover:text-white",
    },
  };

  const deltaStyles = {
    positive: "text-emerald-700 bg-emerald-50 border-emerald-200/80",
    negative: "text-rose-700 bg-rose-50 border-rose-200/80",
    warning: "text-amber-800 bg-amber-50 border-amber-200/80",
    neutral: "text-slate-600 bg-slate-100 border-slate-200/80",
  };

  const scheme = schemeStyles[colorScheme];

  return (
    <div
      className={cn(
        "group bg-white p-5 rounded-2xl border border-[var(--border-subtle)] shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] hover:border-slate-300 transition-all duration-200 flex flex-col justify-between",
        className
      )}
    >
      <div className="flex items-center justify-between text-slate-500 mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] truncate pr-2">
          {title}
        </span>
        <div
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-200 shrink-0",
            scheme.iconBg,
            scheme.hoverIconBg
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-1">
        <div className="text-3xl font-extrabold text-[var(--text-main)] tracking-tight font-sans">
          {value}
        </div>

        {(delta || subtext) && (
          <div className="flex items-center gap-2 mt-2">
            {delta && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border font-mono",
                  deltaStyles[delta.type || "neutral"]
                )}
              >
                {delta.type === "positive" && <ArrowUpRight className="w-3 h-3" />}
                {delta.type === "negative" && <ArrowDownRight className="w-3 h-3" />}
                {delta.type === "warning" && <AlertCircle className="w-3 h-3" />}
                <span>{delta.text}</span>
              </span>
            )}
            {subtext && (
              <span className="text-[11px] text-[var(--text-muted)] truncate">
                {subtext}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
