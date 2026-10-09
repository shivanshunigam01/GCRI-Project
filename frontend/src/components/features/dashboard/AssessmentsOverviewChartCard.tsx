"use client";

import React, { useState } from "react";
import { BarChart, BarDataPoint, BarCategory } from "@/components/shared/BarChart";

const DEFAULT_MONTHLY_DATA: BarDataPoint[] = [
  { label: "Apr", values: { completed: 2, inProgress: 2, notStarted: 0 } },
  { label: "May", values: { completed: 0, inProgress: 4, notStarted: 0 } },
  { label: "Jun", values: { completed: 2, inProgress: 2, notStarted: 0 } },
  { label: "Jul", values: { completed: 1, inProgress: 3, notStarted: 0 } },
  { label: "Aug", values: { completed: 2, inProgress: 4, notStarted: 0 } },
  { label: "Sep", values: { completed: 4, inProgress: 3, notStarted: 0 } },
];

const CATEGORIES: BarCategory[] = [
  { key: "completed", label: "Completed", color: "#10b981" },
  { key: "inProgress", label: "In Progress", color: "#2563eb" },
  { key: "notStarted", label: "Not Started", color: "#cbd5e1" },
];

export function AssessmentsOverviewChartCard() {
  const [timeframe, setTimeframe] = useState("6m");

  return (
    <div className="bg-white border border-[var(--border-subtle)] rounded-2xl p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <h3 className="text-sm font-bold text-[var(--text-main)] tracking-tight">
          Assessments Overview
        </h3>
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

      {/* Bar Chart */}
      <div className="pt-2">
        <BarChart
          data={DEFAULT_MONTHLY_DATA}
          categories={CATEGORIES}
          height={150}
          showLegend={true}
        />
      </div>
    </div>
  );
}
