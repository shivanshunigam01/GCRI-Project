import { apiClient } from "./apiClient";
import {
  AuditorDashboardSummary,
  AuditorAssessmentsItem,
  AuditorOrganizationItem,
  AdminDashboardSummary,
  AdminAssessmentItem,
} from "@/types/dashboard.types";
import { AnalyticsRange, DashboardAnalytics } from "@/types/analytics.types";

export type AuditorPipelineFilter = "All" | "InProgress" | "Submitted" | "Light" | "Full";

export function buildAuditorAssessmentsQuery(
  pipelineFilter: AuditorPipelineFilter,
  organizationScope: string
): {
  limit: number;
  status?: string;
  assessmentType?: string;
  organizationId?: string;
} {
  const params: {
    limit: number;
    status?: string;
    assessmentType?: string;
    organizationId?: string;
  } = { limit: 100 };

  if (organizationScope !== "all") {
    params.organizationId = organizationScope;
  }
  if (pipelineFilter === "InProgress") params.status = "InProgress";
  if (pipelineFilter === "Submitted") params.status = "Submitted";
  if (pipelineFilter === "Light") params.assessmentType = "Light";
  if (pipelineFilter === "Full") params.assessmentType = "Full";

  return params;
}

export const dashboardService = {
  // Auditor Dashboard Routes
  getAuditorSummary: () =>
    apiClient.get<AuditorDashboardSummary>("/dashboard/auditor/summary"),

  getAuditorAssessments: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    organizationId?: string;
    assessmentType?: string;
  }) =>
    apiClient.get<{ assessments: AuditorAssessmentsItem[] }>("/dashboard/auditor/assessments", {
      params,
    }),

  getAuditorOrganizations: () =>
    apiClient.get<{ organizations: AuditorOrganizationItem[] }>(
      "/dashboard/auditor/organizations"
    ),

  // Admin Dashboard Routes
  getAdminSummary: () =>
    apiClient.get<AdminDashboardSummary>("/dashboard/admin/summary"),

  getAdminAssessments: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    assessmentType?: string;
  }) =>
    apiClient.get<{ assessments: AdminAssessmentItem[] }>("/dashboard/admin/assessments", {
      params,
    }),

  getAdminAnalytics: (params?: { range?: AnalyticsRange; companyId?: string }) =>
    apiClient.get<DashboardAnalytics>("/dashboard/admin/analytics", { params }),

  getAuditorAnalytics: (params?: { range?: AnalyticsRange }) =>
    apiClient.get<DashboardAnalytics>("/dashboard/auditor/analytics", { params }),

  getAdminAnalyticsExportUrl: (params: {
    format: "pdf" | "xlsx";
    range: AnalyticsRange;
    companyId?: string;
  }) => {
    const q = new URLSearchParams({ format: params.format, range: params.range });
    if (params.companyId) q.set("companyId", params.companyId);
    return `/dashboard/admin/analytics/export?${q.toString()}`;
  },

  getAuditorAnalyticsExportUrl: (params: { format: "pdf" | "xlsx"; range: AnalyticsRange }) => {
    const q = new URLSearchParams({ format: params.format, range: params.range });
    return `/dashboard/auditor/analytics/export?${q.toString()}`;
  },
};
