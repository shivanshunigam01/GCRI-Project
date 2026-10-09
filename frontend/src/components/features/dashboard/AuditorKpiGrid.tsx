import React from "react";
import { FileText, Clock, CheckCircle2, AlertTriangle, Building2 } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";

export interface AuditorKpiGridProps {
  totalAssessments?: number;
  inProgress?: number;
  completed?: number;
  findings?: number;
  organizations?: number;
}

export function AuditorKpiGrid({
  totalAssessments = 12,
  inProgress = 5,
  completed = 6,
  findings = 3,
  organizations = 8,
}: AuditorKpiGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Total Assessments */}
      <StatCard
        title="Total Assessments"
        value={totalAssessments}
        delta={{ text: "+2 this month", type: "positive" }}
        icon={FileText}
        colorScheme="blue"
      />

      {/* 2. In Progress */}
      <StatCard
        title="In Progress"
        value={inProgress}
        delta={{ text: "+1 this week", type: "positive" }}
        icon={Clock}
        colorScheme="cyan"
      />

      {/* 3. Completed */}
      <StatCard
        title="Completed"
        value={completed}
        delta={{ text: "+3 this month", type: "positive" }}
        icon={CheckCircle2}
        colorScheme="emerald"
      />

      {/* 4. Findings */}
      <StatCard
        title="Findings"
        value={findings}
        delta={{ text: "Needs Attention", type: "warning" }}
        icon={AlertTriangle}
        colorScheme="rose"
      />

      {/* 5. Organizations */}
      <StatCard
        title="Organizations"
        value={organizations}
        subtext="Active Clients"
        icon={Building2}
        colorScheme="purple"
      />
    </div>
  );
}
