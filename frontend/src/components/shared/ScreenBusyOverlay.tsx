"use client";

import React from "react";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";

/**
 * Semi-transparent overlay for a panel/section while an async action runs (e.g. drawer refetch).
 */
export function ScreenBusyOverlay({
  show,
  label = "Loading…",
  className,
}: {
  show: boolean;
  label?: string;
  className?: string;
}) {
  if (!show) return null;

  return (
    <div
      className={cn(
        "absolute inset-0 z-10 flex items-center justify-center rounded-inherit bg-white/55 backdrop-blur-[1px]",
        className
      )}
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 shadow-sm">
        <Spinner />
        {label}
      </div>
    </div>
  );
}
