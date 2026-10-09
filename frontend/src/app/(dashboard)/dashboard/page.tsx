"use client";

import React, { useState, useEffect } from "react";
import { dashboardService, AuditorDashboardSummary } from "@/services/dashboard.service";
import { AuditorGreetingHero } from "@/components/features/dashboard/AuditorGreetingHero";
import { AuditorKpiGrid } from "@/components/features/dashboard/AuditorKpiGrid";
import { AssessmentProgressDonutCard } from "@/components/features/dashboard/AssessmentProgressDonutCard";
import { PillarPerformanceWidget } from "@/components/features/dashboard/PillarPerformanceWidget";
import { RecentActivityTimeline } from "@/components/features/dashboard/RecentActivityTimeline";
import { AssessmentsOverviewChartCard } from "@/components/features/dashboard/AssessmentsOverviewChartCard";
import { AssessmentTypesDonutCard } from "@/components/features/dashboard/AssessmentTypesDonutCard";
import { UpcomingTasksWidget } from "@/components/features/dashboard/UpcomingTasksWidget";
import { MyOrganizationsMiniTable } from "@/components/features/dashboard/MyOrganizationsMiniTable";
import { LatestFindingsMiniTable } from "@/components/features/dashboard/LatestFindingsMiniTable";
import { ContinueAssessmentHeroCard } from "@/components/features/dashboard/ContinueAssessmentHeroCard";

export default function DashboardPage() {
  const [summaryData, setSummaryData] = useState<AuditorDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchDashboard() {
      try {
        const res = await dashboardService.getAuditorSummary();
        if (isMounted && res.success && res.data) {
          setSummaryData(res.data);
        }
      } catch {
        // Fallback gracefully to default visual baseline matching Screen 1 mockup
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-8">
      {/* 1. Header Greeting & Quote */}
      <AuditorGreetingHero />

      {/* 2. Top 5 KPI StatCards Row */}
      <AuditorKpiGrid
        totalAssessments={summaryData?.stats?.totalAssessments ?? 12}
        inProgress={summaryData?.stats?.inProgressAssessments ?? 5}
        completed={summaryData?.stats?.completedAssessments ?? 6}
        findings={summaryData?.stats?.totalFindings ?? 3}
        organizations={summaryData?.stats?.assignedOrganizations ?? 8}
      />

      {/* 3. Middle Row 1: Assessment Progress | Pillar Performance | Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-4 flex flex-col">
          <AssessmentProgressDonutCard
            completed={summaryData?.stats?.completedAssessments ?? 6}
            inProgress={summaryData?.stats?.inProgressAssessments ?? 5}
            notStarted={1}
            overallPercentage={summaryData?.overallCompletionPercentage ?? 64}
          />
        </div>

        <div className="lg:col-span-5 flex flex-col">
          <PillarPerformanceWidget
            pillars={summaryData?.pillarPerformance}
          />
        </div>

        <div className="lg:col-span-3 flex flex-col">
          <RecentActivityTimeline />
        </div>
      </div>

      {/* 4. Middle Row 2: Assessments Overview | Assessment Types | Upcoming Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-5 flex flex-col">
          <AssessmentsOverviewChartCard />
        </div>

        <div className="lg:col-span-3 flex flex-col">
          <AssessmentTypesDonutCard
            total={summaryData?.assessmentTypes?.total ?? 12}
            fullCount={summaryData?.assessmentTypes?.fullCount ?? 7}
            lightCount={summaryData?.assessmentTypes?.lightCount ?? 5}
          />
        </div>

        <div className="lg:col-span-4 flex flex-col">
          <UpcomingTasksWidget />
        </div>
      </div>

      {/* 5. Bottom Row 3: My Organizations | Latest Findings | Continue Assessment Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-4 flex flex-col">
          <MyOrganizationsMiniTable
            organizations={
              summaryData?.myOrganizations?.map((o) => ({
                _id: o._id,
                name: o.name,
                industry: o.industry,
                assessments: o.assessmentCount ?? 1,
                status: o.status,
              }))
            }
          />
        </div>

        <div className="lg:col-span-4 flex flex-col">
          <LatestFindingsMiniTable
            findings={
              summaryData?.latestFindings?.map((f) => ({
                id: f.controlId || f.findingId,
                org: f.organizationName,
                severity: f.severity,
                status: f.status,
              }))
            }
          />
        </div>

        <div className="lg:col-span-4 flex flex-col">
          <ContinueAssessmentHeroCard
            pendingCount={summaryData?.activeAssessments?.length ?? 3}
          />
        </div>
      </div>
    </div>
  );
}
