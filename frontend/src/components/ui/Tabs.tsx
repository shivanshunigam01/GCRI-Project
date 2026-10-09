"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: "underline" | "pills";
  className?: string;
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = "underline",
  className,
}: TabsProps) {
  if (variant === "pills") {
    return (
      <div className={cn("flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl", className)}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer select-none",
                isActive
                  ? "bg-white text-[var(--text-main)] shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/50"
              )}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              <span>{tab.label}</span>
              {typeof tab.count === "number" && (
                <span
                  className={cn(
                    "text-[10px] font-mono px-1.5 py-0.2 rounded-full",
                    isActive ? "bg-slate-100 text-slate-700" : "bg-slate-200/60 text-slate-500"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-6 border-b border-[var(--border-divider)] overflow-x-auto", className)}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative flex items-center gap-2 pb-3 pt-1 text-xs font-semibold transition-colors duration-150 cursor-pointer select-none whitespace-nowrap",
              isActive
                ? "text-[var(--text-main)] font-bold"
                : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
            )}
          >
            {Icon && <Icon className={cn("w-3.5 h-3.5", isActive ? "text-[var(--accent)]" : "text-slate-400")} />}
            <span>{tab.label}</span>
            {typeof tab.count === "number" && (
              <span
                className={cn(
                  "text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold",
                  isActive
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "bg-slate-100 text-slate-500"
                )}
              >
                {tab.count}
              </span>
            )}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)] rounded-t-full shadow-[0_0_8px_rgba(37,99,235,0.4)]" />
            )}
          </button>
        );
      })}
    </div>
  );
}
