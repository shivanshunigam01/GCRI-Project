import React from "react";
import { DonutChart } from "@/components/shared/DonutChart";

export interface AssessmentTypesDonutCardProps {
  total?: number;
  fullCount?: number;
  lightCount?: number;
}

export function AssessmentTypesDonutCard({
  total = 12,
  fullCount = 7,
  lightCount = 5,
}: AssessmentTypesDonutCardProps) {
  const segments = [
    { label: "Full Assessment", value: fullCount, color: "#1e3a8a" },
    { label: "Light Assessment", value: lightCount, color: "#38bdf8" },
  ];

  return (
    <div className="bg-white border border-[var(--border-subtle)] rounded-2xl p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] flex flex-col justify-between">
      {/* Header */}
      <div className="pb-3 border-b border-slate-100">
        <h3 className="text-sm font-bold text-[var(--text-main)] tracking-tight">
          Assessment Types
        </h3>
      </div>

      {/* Donut Chart */}
      <div className="py-3 flex justify-center">
        <DonutChart
          segments={segments}
          centerValue={total}
          centerLabel="Total Assessments"
          size={150}
          strokeWidth={14}
          showLegend={true}
        />
      </div>
    </div>
  );
}
