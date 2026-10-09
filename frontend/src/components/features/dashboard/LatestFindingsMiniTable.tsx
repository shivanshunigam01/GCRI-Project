import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

const DEFAULT_FINDINGS = [
  { id: "FND-2026-001", org: "Global Retail Ltd", severity: "High", status: "Open" },
  { id: "FND-2026-002", org: "TechNova Solutions", severity: "Medium", status: "In Review" },
  { id: "FND-2026-003", org: "ABC Corporation", severity: "Medium", status: "Open" },
  { id: "FND-2026-004", org: "GreenTech Industries", severity: "Low", status: "Resolved" },
];

export interface LatestFindingsMiniTableProps {
  findings?: {
    id: string;
    org: string;
    severity: string;
    status: string;
  }[];
}

export function LatestFindingsMiniTable({ findings }: LatestFindingsMiniTableProps) {
  const displayFindings = findings && findings.length > 0 ? findings : DEFAULT_FINDINGS;

  const severityStyles: Record<string, string> = {
    High: "bg-rose-50 text-rose-700 border-rose-200",
    Medium: "bg-amber-50 text-amber-700 border-amber-200",
    Low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  const statusStyles: Record<string, string> = {
    Open: "bg-rose-50 text-rose-700 border-rose-200",
    "In Review": "bg-blue-50 text-blue-700 border-blue-200",
    Resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  return (
    <div className="bg-white border border-[var(--border-subtle)] rounded-2xl p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <h3 className="text-sm font-bold text-[var(--text-main)] tracking-tight">
          Latest Findings
        </h3>
        <Link
          href="/findings"
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 transition-colors"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Mini Table */}
      <div className="overflow-x-auto pt-2">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-100">
              <th className="pb-2">Finding</th>
              <th className="pb-2">Organization</th>
              <th className="pb-2">Severity</th>
              <th className="pb-2 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayFindings.map((f) => (
              <tr key={f.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="py-2.5 font-mono text-[11px] font-bold text-slate-900 pr-2">
                  {f.id}
                </td>
                <td className="py-2.5 text-slate-600 text-[11px] truncate max-w-[110px]">
                  {f.org}
                </td>
                <td className="py-2.5">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${severityStyles[f.severity]}`}
                  >
                    {f.severity}
                  </span>
                </td>
                <td className="py-2.5 text-right">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${statusStyles[f.status]}`}
                  >
                    {f.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
