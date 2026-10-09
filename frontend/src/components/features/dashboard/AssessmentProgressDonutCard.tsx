"use client";

import React, { useState } from "react";
import { DonutChart } from "@/components/shared/DonutChart";

export interface AssessmentProgressDonutCardProps {
  completed?: number;
  inProgress?: number;
  notStarted?: number;
  overallPercentage?: number;
}

export function AssessmentProgressDonutCard({
  completed = 6,
  inProgress = 5,
  notStarted = 1,
  overallPercentage = 64,
}: AssessmentProgressDonutCardProps) {
  const [timeframe, setTimeframe] = useState("6m");

  const segments = [
    { label: "Completed", value: completed, color: "#10b981" },
    { label: "In Progress", value: inProgress, color: "#2563eb" },
    { label: "Not Started", value: notStarted, color: "#cbd5e1" },
  ];

  return (
    <div className="bg-white border border-[var(--border-subtle)] rounded-2xl p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-main)] tracking-tight">
            Assessment Progress
          </h3>
        </div>
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          className="text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
        >
          <option value="6m">Last 6 Months</option>
          <option value="3m">Last 3 Months</option>
          <option value="1y">Last Year</option>
        </select>
      </div>

      {/* Donut Chart with Readout */}
      <div className="py-4 flex justify-center">
        <DonutChart
          segments={segments}
          centerValue={`${overallPercentage}%`}
          centerLabel="Overall Completion"
          size={160}
          strokeWidth={14}
          showLegend={true}
        />
      </div>
    </div>
  );
}
