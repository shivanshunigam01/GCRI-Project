"use client";

import React from "react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

export type StatCardTheme =
  | "blue"
  | "sky"
  | "emerald"
  | "rose"
  | "purple"
  | "teal"
  | "amber"
  | "slate";

export interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: string;
  trendType?: "up" | "down" | "neutral" | "warning";
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  theme?: StatCardTheme;
  delay?: number;
  prefix?: string;
  suffix?: string;
  animate?: boolean;
  className?: string;
  onClick?: () => void;
}

const THEME_STYLES: Record<
  StatCardTheme,
  {
    iconBg: string;
    iconText: string;
    borderHover: string;
    ring: string;
    topSheen: string;
    trendDefault: string;
  }
> = {
  blue: {
    iconBg: "bg-blue-100",
    iconText: "text-blue-600",
    borderHover: "hover:border-blue-300/80",
    ring: "group-hover:ring-blue-100/80",
    topSheen: "via-blue-500/70",
    trendDefault: "text-blue-600",
  },
  sky: {
    iconBg: "bg-sky-100",
    iconText: "text-sky-600",
    borderHover: "hover:border-sky-300/80",
    ring: "group-hover:ring-sky-100/80",
    topSheen: "via-sky-500/70",
    trendDefault: "text-sky-600",
  },
  emerald: {
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-600",
    borderHover: "hover:border-emerald-300/80",
    ring: "group-hover:ring-emerald-100/80",
    topSheen: "via-emerald-500/70",
    trendDefault: "text-emerald-600",
  },
  rose: {
    iconBg: "bg-rose-100",
    iconText: "text-rose-600",
    borderHover: "hover:border-rose-300/80",
    ring: "group-hover:ring-rose-100/80",
    topSheen: "via-rose-500/70",
    trendDefault: "text-rose-600",
  },
  purple: {
    iconBg: "bg-purple-100",
    iconText: "text-purple-600",
    borderHover: "hover:border-purple-300/80",
    ring: "group-hover:ring-purple-100/80",
    topSheen: "via-purple-500/70",
    trendDefault: "text-purple-600",
  },
  teal: {
    iconBg: "bg-teal-100",
    iconText: "text-teal-700",
    borderHover: "hover:border-teal-300/80",
    ring: "group-hover:ring-teal-100/80",
    topSheen: "via-teal-500/70",
    trendDefault: "text-teal-600",
  },
  amber: {
    iconBg: "bg-amber-100",
    iconText: "text-amber-700",
    borderHover: "hover:border-amber-300/80",
    ring: "group-hover:ring-amber-100/80",
    topSheen: "via-amber-500/70",
    trendDefault: "text-amber-600",
  },
  slate: {
    iconBg: "bg-slate-100",
    iconText: "text-slate-600",
    borderHover: "hover:border-slate-300",
    ring: "group-hover:ring-slate-100",
    topSheen: "via-slate-400/60",
    trendDefault: "text-slate-600",
  },
};

export function StatCard({
  label,
  value,
  subtext,
  trend,
  trendType,
  icon: Icon,
  theme = "blue",
  delay = 0,
  prefix = "",
  suffix = "",
  animate = true,
  className = "",
  onClick,
}: StatCardProps) {
  const styles = THEME_STYLES[theme] || THEME_STYLES.blue;

  // Trend color mapping
  const trendColor =
    trendType === "up"
      ? "text-emerald-600"
      : trendType === "down"
      ? "text-rose-600"
      : trendType === "warning"
      ? "text-amber-600"
      : styles.trendDefault;

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_12px_24px_-6px_rgba(15,23,42,0.08),0_4px_8px_-2px_rgba(15,23,42,0.03)] ${
        styles.borderHover
      } ${onClick ? "cursor-pointer" : "cursor-default"} select-none ${className}`}
    >
      {/* Ambient Top Glow Sheen */}
      <div
        className={`absolute top-0 inset-x-0 h-0.75 bg-gradient-to-r from-transparent ${styles.topSheen} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
      />

      <div className="flex items-center gap-3.5">
        {/* Icon with refined hover micro-interaction */}
        {Icon && (
          <div
            className={`h-12 w-12 rounded-2xl ${styles.iconBg} ${styles.iconText} flex items-center justify-center shrink-0 shadow-2xs transition-all duration-300 ease-out group-hover:scale-105 group-hover:ring-4 ${styles.ring}`}
          >
            <Icon className="h-6 w-6 shrink-0 transition-transform duration-300 ease-out" strokeWidth={1.85} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          {/* Animated Value */}
          <div className="text-2xl font-extrabold text-slate-900 leading-tight tracking-tight group-hover:text-slate-950 transition-colors">
            {animate ? (
              <AnimatedNumber
                value={value}
                delay={delay}
                duration={1000}
                prefix={prefix}
                suffix={suffix}
              />
            ) : (
              <span>
                {prefix}
                {value}
                {suffix}
              </span>
            )}
          </div>

          {/* Label */}
          <div className="text-xs font-medium text-slate-500 truncate mt-0.5 group-hover:text-slate-600 transition-colors">
            {label}
          </div>

          {/* Trend or Subtext */}
          {(trend || subtext) && (
            <div
              className={`text-[11px] font-semibold flex items-center gap-1 mt-0.5 transition-colors ${trendColor}`}
            >
              <span>{trend || subtext}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StatCard;
