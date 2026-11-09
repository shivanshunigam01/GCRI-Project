export type AnalyticsRange = "30d" | "90d" | "6m" | "1y";

export interface AnalyticsKpi {
  value: number;
  deltaPct: number;
  hint?: string;
  suffix?: string;
  outlier?: boolean;
}

export interface DashboardAnalytics {
  range: AnalyticsRange;
  periodDays: number;
  periodStart: string;
  generatedAt: string;
  kpis: {
    totalUsers: AnalyticsKpi;
    totalAuditors: AnalyticsKpi;
    totalOrganizations: AnalyticsKpi;
    totalAssessments: AnalyticsKpi;
    complianceScore: AnalyticsKpi;
    openRisks: AnalyticsKpi;
  };
  assessmentsByStatus: {
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
  };
  riskSeverity: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  complianceTrend: Array<{ date: string; value: number }>;
  securityEventsTrend: Array<{ date: string; count: number }>;
  organizationGrowth: Array<{ month: string; count: number }>;
  subscriptionDistribution: {
    total: number;
    bronze: number;
    silver: number;
    gold: number;
  };
  complianceByPillar: Array<{ key: string; name: string; percentage: number }>;
  topOrganizations: Array<{
    _id: string;
    name: string;
    assessmentCount: number;
    complianceScore: number;
    activePlan: string;
    status: string;
  }>;
  auditorPerformance: Array<{
    name: string;
    email: string;
    assigned: number;
    completed: number;
    completionRate: number;
  }>;
  assessmentPipeline: {
    completed: number;
    inProgress: number;
    notStarted: number;
    completedPct: number;
    inProgressPct: number;
    notStartedPct: number;
  };
  recentOrganizations: Array<{
    _id: string;
    name: string;
    activePlan: string;
    assessmentCount: number;
    status: string;
  }>;
  recentActivity: Array<{
    id: string;
    title: string;
    description: string;
    type: string;
    actorEmail?: string;
    timestamp: string;
  }>;
  assessmentTypeMix: {
    light: number;
    full: number;
    total: number;
  };
  outliers: Array<{
    type: "organization" | "auditor" | "risk" | "compliance";
    label: string;
    detail: string;
    severity: "critical" | "high" | "medium";
    value?: number;
  }>;
}
