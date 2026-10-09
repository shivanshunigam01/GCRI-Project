import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";

const DEFAULT_ORGS = [
  { _id: "1", name: "ABC Corporation", industry: "Technology", assessments: 2, status: "In Progress" },
  { _id: "2", name: "TechNova Solutions", industry: "IT Services", assessments: 1, status: "In Progress" },
  { _id: "3", name: "Global Retail Ltd", industry: "Retail", assessments: 2, status: "Completed" },
  { _id: "4", name: "HealthAI Systems", industry: "Healthcare", assessments: 1, status: "Not Started" },
  { _id: "5", name: "GreenTech Industries", industry: "Manufacturing", assessments: 1, status: "In Progress" },
];

export interface MyOrganizationsMiniTableProps {
  organizations?: {
    _id: string;
    name: string;
    industry: string;
    assessments: number;
    status: string;
  }[];
}

export function MyOrganizationsMiniTable({ organizations }: MyOrganizationsMiniTableProps) {
  const displayOrgs = organizations && organizations.length > 0 ? organizations : DEFAULT_ORGS;

  return (
    <div className="bg-white border border-[var(--border-subtle)] rounded-2xl p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <h3 className="text-sm font-bold text-[var(--text-main)] tracking-tight">
          My Organizations
        </h3>
        <Link
          href="/companies"
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
              <th className="pb-2">Organization</th>
              <th className="pb-2">Industry</th>
              <th className="pb-2 text-center">Assessments</th>
              <th className="pb-2 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayOrgs.map((org) => (
              <tr key={org._id} className="hover:bg-slate-50/60 transition-colors">
                <td className="py-2.5 pr-2">
                  <div className="flex items-center gap-2">
                    <Avatar name={org.name} size="xs" />
                    <span className="font-semibold text-slate-900 truncate max-w-[120px]">
                      {org.name}
                    </span>
                  </div>
                </td>
                <td className="py-2.5 text-slate-500 text-[11px] truncate">
                  {org.industry}
                </td>
                <td className="py-2.5 text-center font-mono font-bold text-slate-800">
                  {org.assessments}
                </td>
                <td className="py-2.5 text-right">
                  <Badge
                    variant={
                      org.status === "Completed"
                        ? "verified"
                        : org.status === "In Progress"
                        ? "info"
                        : "neutral"
                    }
                  >
                    {org.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
