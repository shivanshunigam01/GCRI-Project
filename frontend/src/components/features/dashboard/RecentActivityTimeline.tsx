import React from "react";
import Link from "next/link";
import { ArrowRight, FileCheck, FileText, AlertTriangle, FileBarChart, CheckCircle2 } from "lucide-react";
import { ActivityEvent } from "@/types/dashboard.types";
import { cn } from "@/lib/utils";

export interface RecentActivityTimelineProps {
  events?: ActivityEvent[];
}

const DEFAULT_EVENTS: ActivityEvent[] = [
  {
    id: "act-1",
    type: "evidence",
    title: "Evidence uploaded",
    description: "ABC Corporation - Control GCRAI-001",
    timestamp: "2 hours ago",
  },
  {
    id: "act-2",
    type: "assessment",
    title: "Assessment updated",
    description: "TechNova Solutions - Pillar 3",
    timestamp: "4 hours ago",
  },
  {
    id: "act-3",
    type: "finding",
    title: "Finding created",
    description: "Global Retail Ltd - Data Governance",
    timestamp: "1 day ago",
  },
  {
    id: "act-4",
    type: "report",
    title: "Report generated",
    description: "GreenTech Industries - Full Assessment",
    timestamp: "1 day ago",
  },
  {
    id: "act-5",
    type: "registration",
    title: "New assessment created",
    description: "HealthAI Systems - Light Assessment",
    timestamp: "2 days ago",
  },
];

export function RecentActivityTimeline({ events }: RecentActivityTimelineProps) {
  const displayEvents = events && events.length > 0 ? events : DEFAULT_EVENTS;

  const getEventIcon = (type: ActivityEvent["type"]) => {
    switch (type) {
      case "evidence":
        return { icon: FileCheck, color: "bg-blue-50 text-blue-600 border-blue-200" };
      case "assessment":
        return { icon: FileText, color: "bg-amber-50 text-amber-600 border-amber-200" };
      case "finding":
        return { icon: AlertTriangle, color: "bg-rose-50 text-rose-600 border-rose-200" };
      case "report":
        return { icon: FileBarChart, color: "bg-indigo-50 text-indigo-600 border-indigo-200" };
      case "registration":
        return { icon: CheckCircle2, color: "bg-emerald-50 text-emerald-600 border-emerald-200" };
    }
  };

  return (
    <div className="bg-white border border-[var(--border-subtle)] rounded-2xl p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <h3 className="text-sm font-bold text-[var(--text-main)] tracking-tight">
          Recent Activity
        </h3>
        <Link
          href="/admin/audit-logs"
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 transition-colors"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Activity Items */}
      <div className="space-y-3.5 pt-3">
        {displayEvents.map((evt) => {
          const { icon: Icon, color } = getEventIcon(evt.type);

          return (
            <div key={evt.id} className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <div
                  className={cn(
                    "w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 shadow-2xs",
                    color
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 leading-tight">
                    {evt.title}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {evt.description}
                  </p>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap shrink-0 mt-0.5">
                {evt.timestamp}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
