"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ListPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  from: number;
  to: number;
  onPrevious: () => void;
  onNext: () => void;
  disabled?: boolean;
  itemLabel?: string;
  className?: string;
  /** Hide when there is nothing to paginate (0 items). Still shows for 1 page. */
  hideWhenEmpty?: boolean;
}

export function ListPagination({
  page,
  totalPages,
  total,
  from,
  to,
  onPrevious,
  onNext,
  disabled = false,
  itemLabel = "items",
  className,
  hideWhenEmpty = true,
}: ListPaginationProps) {
  if (hideWhenEmpty && total === 0) return null;

  return (
    <div
      className={cn(
        "py-2.5 px-3.5 bg-slate-50/70 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-600 dark:text-slate-300",
        className
      )}
    >
      <div>
        Showing{" "}
        <span className="font-semibold text-slate-900 dark:text-white">{from}</span> to{" "}
        <span className="font-semibold text-slate-900 dark:text-white">{to}</span> of{" "}
        <span className="font-semibold text-slate-900 dark:text-white">{total}</span> {itemLabel}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onPrevious}
          disabled={disabled || page <= 1}
          className="inline-flex items-center gap-1 px-2.5 py-1 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition font-medium text-xs text-slate-700 dark:text-slate-100"
        >
          <ChevronLeft className="h-3 w-3" />
          Previous
        </button>

        <span className="px-2 font-semibold text-slate-700 dark:text-slate-200 text-xs">
          Page {page} of {Math.max(1, totalPages)}
        </span>

        <button
          type="button"
          onClick={onNext}
          disabled={disabled || page >= totalPages}
          className="inline-flex items-center gap-1 px-2.5 py-1 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition font-medium text-xs text-slate-700 dark:text-slate-100"
        >
          Next
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
