import { apiClient } from "@/services/apiClient";
import { Company } from "@/types/company.types";
import { ApiResponse } from "@/types/api.types";

export interface AuditorDashboardSummary {
  stats: {
    totalAssessments: number;
    inProgressAssessments: number;
    completedAssessments: number;
    totalFindings: number;
    assignedOrganizations: number;
  };
  overallCompletionPercentage: number;
  pillarPerformance: {
    pillarId: string;
    pillarNumber: number;
    name: string;
    completionPercentage: number;
  }[];
  assessmentTypes: {
    total: number;
    fullCount: number;
    fullPercentage: number;
    lightCount: number;
    lightPercentage: number;
  };
  myOrganizations: {
    _id: string;
    name: string;
    industry: string;
    status: string;
    assessmentCount: number;
  }[];
  latestFindings: {
    findingId: string;
    controlId: string;
    title: string;
    organizationName: string;
    severity: string;
    status: string;
  }[];
  activeAssessments: {
    _id: string;
    organizationName: string;
    assessmentType: string;
    completionPercentage: number;
    resumptionAid: {
      currentPillarId: string;
      currentPillarName: string;
      currentQuestionIndex: number;
    };
  }[];
}

export const dashboardService = {
  getAuditorOrganizations: async (): Promise<ApiResponse<{ organizations: Company[] }>> => {
    return apiClient<{ organizations: Company[] }>("/dashboard/auditor/organizations");
  },

  getAuditorSummary: async (): Promise<ApiResponse<AuditorDashboardSummary>> => {
    return apiClient<AuditorDashboardSummary>("/dashboard/auditor/summary");
  },

  getAuditorAssessments: async (params?: {
    status?: string;
    organizationId?: string;
    assessmentType?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ assessments: any[] }>> => {
    const query = new URLSearchParams();
    if (params?.status) query.append("status", params.status);
    if (params?.organizationId) query.append("organizationId", params.organizationId);
    if (params?.assessmentType) query.append("assessmentType", params.assessmentType);
    if (params?.page) query.append("page", params.page.toString());
    if (params?.limit) query.append("limit", params.limit.toString());

    const queryString = query.toString() ? `?${query.toString()}` : "";
    return apiClient<{ assessments: any[] }>(`/dashboard/auditor/assessments${queryString}`);
  },
};
