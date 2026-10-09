"use client";

import React from "react";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface ColumnDef<T> {
  id?: string;
  header: React.ReactNode;
  accessorKey?: keyof T;
  render?: (item: T, index: number) => React.ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
}

export interface DataTablePagination {
  page: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyAction?: React.ReactNode;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectRow?: (id: string) => void;
  onSelectAll?: (selectAll: boolean) => void;
  pagination?: DataTablePagination;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  isLoading = false,
  emptyTitle = "No records found",
  emptySubtitle = "There is no data to display right now.",
  emptyAction,
  selectable = false,
  selectedIds = [],
  onSelectRow,
  onSelectAll,
  pagination,
  className,
}: DataTableProps<T>) {
  const allSelected = data.length > 0 && data.every((item) => selectedIds.includes(keyExtractor(item)));
  const isIndeterminate = data.some((item) => selectedIds.includes(keyExtractor(item))) && !allSelected;

  return (
    <div
      className={cn(
        "bg-white border border-[var(--border-subtle)] rounded-2xl shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] overflow-hidden flex flex-col",
        className
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[var(--border-divider)] bg-slate-50/70 text-[var(--text-muted)] uppercase tracking-wider text-[10px] font-semibold select-none">
              {selectable && (
                <th className="py-3 px-4 w-10">
                  <Checkbox
                    checked={allSelected || isIndeterminate}
                    onChange={(checked) => onSelectAll && onSelectAll(checked)}
                  />
                </th>
              )}
              {columns.map((col, idx) => (
                <th
                  key={col.id || idx}
                  className={cn(
                    "py-3 px-4 font-semibold text-[10px] text-slate-500",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--border-divider)]">
            {isLoading ? (
              // Shimmer Loading Skeleton Rows
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {selectable && (
                    <td className="py-3.5 px-4">
                      <div className="w-4 h-4 bg-slate-200 rounded" />
                    </td>
                  )}
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className="py-3.5 px-4">
                      <div className="h-4 bg-slate-200/80 rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              // Empty State
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="py-16 text-center text-slate-500"
                >
                  <div className="max-w-xs mx-auto flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                      <Inbox className="w-6 h-6 stroke-[1.5]" />
                    </div>
                    <p className="text-sm font-semibold text-[var(--text-main)] mb-1">
                      {emptyTitle}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mb-4">
                      {emptySubtitle}
                    </p>
                    {emptyAction}
                  </div>
                </td>
              </tr>
            ) : (
              // Data Rows
              data.map((item, rowIdx) => {
                const id = keyExtractor(item);
                const isSelected = selectedIds.includes(id);

                return (
                  <tr
                    key={id}
                    onClick={() => onRowClick && onRowClick(item)}
                    className={cn(
                      "transition-colors duration-150",
                      onRowClick ? "cursor-pointer hover:bg-slate-50/70" : "hover:bg-slate-50/40",
                      isSelected && "bg-blue-50/40"
                    )}
                  >
                    {selectable && (
                      <td
                        className="py-3.5 px-4 w-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={isSelected}
                          onChange={() => onSelectRow && onSelectRow(id)}
                        />
                      </td>
                    )}
                    {columns.map((col, cIdx) => (
                      <td
                        key={col.id || cIdx}
                        className={cn(
                          "py-3.5 px-4 text-xs text-[var(--text-main)]",
                          col.align === "right" && "text-right",
                          col.align === "center" && "text-center",
                          col.className
                        )}
                      >
                        {col.render
                          ? col.render(item, rowIdx)
                          : col.accessorKey
                          ? String(item[col.accessorKey] ?? "")
                          : null}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination && (
        <div className="p-4 border-t border-[var(--border-divider)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-muted)] bg-slate-50/50">
          <div className="font-medium">
            Showing <span className="font-semibold text-[var(--text-main)]">{Math.min(pagination.totalItems, (pagination.page - 1) * pagination.itemsPerPage + 1)}</span> to{" "}
            <span className="font-semibold text-[var(--text-main)]">
              {Math.min(pagination.totalItems, pagination.page * pagination.itemsPerPage)}
            </span>{" "}
            of <span className="font-semibold text-[var(--text-main)]">{pagination.totalItems}</span> results
          </div>

          <div className="flex items-center gap-2">
            {pagination.onLimitChange && (
              <select
                value={pagination.itemsPerPage}
                onChange={(e) => pagination.onLimitChange!(Number(e.target.value))}
                className="px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] bg-white text-xs text-[var(--text-main)] outline-none cursor-pointer"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
              </select>
            )}

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => pagination.onPageChange(pagination.page - 1)}
                className="h-8 w-8 p-0"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <span className="px-2.5 py-1 text-xs font-semibold text-[var(--text-main)] bg-white border border-[var(--border-subtle)] rounded-lg">
                {pagination.page}
              </span>

              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => pagination.onPageChange(pagination.page + 1)}
                className="h-8 w-8 p-0"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
