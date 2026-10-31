import { apiClient } from "./apiClient";
import {
  AuditorDashboardSummary,
  AuditorAssessmentsItem,
  AuditorOrganizationItem,
  AdminDashboardSummary,
  AdminAssessmentItem,
} from "@/types/dashboard.types";

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
};
