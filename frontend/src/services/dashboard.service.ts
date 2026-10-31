import { apiClient } from "./apiClient";
import { AuditorDashboardSummary, AdminDashboardSummary } from "@/types/dashboard.types";

export const dashboardService = {
  getAuditorSummary: () =>
    apiClient.get<AuditorDashboardSummary>("/dashboard/auditor/summary"),

  getAdminSummary: () =>
    apiClient.get<AdminDashboardSummary>("/dashboard/admin/summary"),

  getAdminAssessments: () =>
    apiClient.get<any[]>("/dashboard/admin/assessments"),
};
