"use client";

import React, { useState, useEffect } from "react";
import { Search, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface FilterDropdownOption {
  label: string;
  value: string;
}

export interface FilterDropdown {
  id: string;
  label: string;
  options: FilterDropdownOption[];
  value: string;
  onChange: (value: string) => void;
}

export interface FilterBarProps {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters?: FilterDropdown[];
  onReset?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function FilterBar({
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  filters = [],
  onReset,
  className,
  children,
}: FilterBarProps) {
  const [localSearch, setLocalSearch] = useState(searchValue);

  // Sync internal state when external searchValue changes
  useEffect(() => {
    setLocalSearch(searchValue);
  }, [searchValue]);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchValue) {
        onSearchChange(localSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, onSearchChange, searchValue]);

  const hasActiveFilters =
    localSearch.trim() !== "" ||
    filters.some((f) => f.value && f.value !== "all" && f.value !== "");

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white border border-[var(--border-subtle)] rounded-2xl shadow-[0_1px_3px_0_rgba(0,0,0,0.02)]",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 flex-wrap">
        {/* Search Input */}
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-[var(--border-subtle)] bg-slate-50/50 hover:bg-white text-xs sm:text-sm text-[var(--text-main)] placeholder:text-slate-400 outline-none focus:border-[var(--accent)] focus:bg-white focus:ring-1 focus:ring-[var(--accent)] transition-all"
          />
        </div>

        {/* Dynamic Filter Dropdowns */}
        {filters.map((filter) => (
          <div key={filter.id} className="relative min-w-[140px]">
            <select
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              className="w-full px-3 py-2 pr-8 rounded-xl border border-[var(--border-subtle)] bg-white text-xs font-medium text-[var(--text-main)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all cursor-pointer appearance-none shadow-2xs"
            >
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              ▼
            </div>
          </div>
        ))}

        {children}
      </div>

      {/* Reset Action Button */}
      {onReset && hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setLocalSearch("");
            onReset();
          }}
          className="gap-1.5 text-xs h-9 px-3 self-end sm:self-auto text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </Button>
      )}
    </div>
  );
}
