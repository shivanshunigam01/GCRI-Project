import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { UpcomingTask } from "@/types/dashboard.types";

const DEFAULT_TASKS: UpcomingTask[] = [
  {
    id: "task-1",
    dateMonth: "OCT",
    dateDay: "04",
    title: "Complete evidence review",
    subtitle: "TechNova Solutions - Control GCRAI-023",
    priority: "High",
  },
  {
    id: "task-2",
    dateMonth: "OCT",
    dateDay: "06",
    title: "Client meeting",
    subtitle: "Global Retail Ltd - Assessment Review",
    priority: "Medium",
  },
  {
    id: "task-3",
    dateMonth: "OCT",
    dateDay: "08",
    title: "Upload pending evidence",
    subtitle: "ABC Corporation - 5 controls",
    priority: "Medium",
  },
  {
    id: "task-4",
    dateMonth: "OCT",
    dateDay: "10",
    title: "Prepare draft report",
    subtitle: "HealthAI Systems - Full Assessment",
    priority: "Low",
  },
];

export function UpcomingTasksWidget({ tasks }: { tasks?: UpcomingTask[] }) {
  const displayTasks = tasks && tasks.length > 0 ? tasks : DEFAULT_TASKS;

  const priorityStyles = {
    High: "bg-rose-50 text-rose-700 border-rose-200",
    Medium: "bg-amber-50 text-amber-700 border-amber-200",
    Low: "bg-blue-50 text-blue-700 border-blue-200",
  };

  return (
    <div className="bg-white border border-[var(--border-subtle)] rounded-2xl p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <h3 className="text-sm font-bold text-[var(--text-main)] tracking-tight">
          Upcoming Tasks
        </h3>
        <Link
          href="/assessments"
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 transition-colors"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Task List */}
      <div className="space-y-3 pt-3">
        {displayTasks.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Date Box */}
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center shrink-0">
                <span className="text-[9px] font-bold text-slate-500 font-mono tracking-wider leading-none">
                  {t.dateMonth}
                </span>
                <span className="text-sm font-extrabold text-slate-900 font-mono leading-none mt-0.5">
                  {t.dateDay}
                </span>
              </div>

              {/* Title & Subtitle */}
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                  {t.title}
                </p>
                <p className="text-[11px] text-slate-500 truncate mt-0.5 font-mono">
                  {t.subtitle}
                </p>
              </div>
            </div>

            {/* Priority Badge */}
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${priorityStyles[t.priority]}`}
            >
              {t.priority}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
