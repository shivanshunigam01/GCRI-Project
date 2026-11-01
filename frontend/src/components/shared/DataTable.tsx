import React from "react";
import { DataTableSkeleton } from "@/components/shared/PageSkeletons";

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyMessage = "No records found.",
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="w-full py-12 text-center text-sm text-slate-400">
        Loading data...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full py-12 text-center text-sm text-slate-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className="px-4 py-3">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((row, rowIdx) => (
            <tr key={rowIdx} className="hover:bg-slate-50/80 transition">
              {columns.map((col, colIdx) => (
                <td key={colIdx} className="px-4 py-3 text-slate-700">
                  {col.cell ? col.cell(row) : col.accessorKey ? String(row[col.accessorKey] ?? "") : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
