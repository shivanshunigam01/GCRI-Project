import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HorizontalProgressBar } from "@/components/shared/HorizontalProgressBar";
import { PillarScoreData } from "@/types/dashboard.types";

export interface PillarPerformanceWidgetProps {
  pillars?: PillarScoreData[];
}

export function PillarPerformanceWidget({ pillars }: PillarPerformanceWidgetProps) {
  // Default values matching Screen 1 exactly if not passed
  const displayPillars = pillars && pillars.length > 0 ? pillars : [
    { pillarId: "P1", pillarNumber: 1, name: "Ethical Leadership", completionPercentage: 78 },
    { pillarId: "P2", pillarNumber: 2, name: "Data Governance & Integrity", completionPercentage: 62 },
    { pillarId: "P3", pillarNumber: 3, name: "Purpose-Driven Innovation", completionPercentage: 54 },
    { pillarId: "P4", pillarNumber: 4, name: "Human-Centric Use", completionPercentage: 48 },
    { pillarId: "P5", pillarNumber: 5, name: "Responsible Implementation", completionPercentage: 71 },
    { pillarId: "P6", pillarNumber: 6, name: "AI Literacy & Workforce Readiness", completionPercentage: 40 },
    { pillarId: "P7", pillarNumber: 7, name: "Transparency & Auditability", completionPercentage: 66 },
  ];

  return (
    <div className="bg-white border border-[var(--border-subtle)] rounded-2xl p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <h3 className="text-sm font-bold text-[var(--text-main)] tracking-tight">
          Pillar Performance
        </h3>
        <Link
          href="/framework"
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 transition-colors"
        >
          <span>View Details</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 7 Pillar Progress Bars */}
      <div className="space-y-3 pt-3">
        {displayPillars.map((p) => (
          <HorizontalProgressBar
            key={p.pillarId}
            label={p.name}
            percentage={p.completionPercentage}
            barColor="#2563eb"
          />
        ))}
      </div>
    </div>
  );
}
