import React from "react";
import { Search } from "lucide-react";

export interface FilterBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  placeholder?: string;
  children?: React.ReactNode;
}

export function FilterBar({
  search,
  onSearchChange,
  placeholder = "Search...",
  children,
}: FilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
      <div className="relative flex-1 w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {children && <div className="flex items-center gap-2 w-full sm:w-auto">{children}</div>}
    </div>
  );
}
