import { apiClient } from "./apiClient";
import {
  AssessmentFramework,
  AssessmentType,
  CreateFrameworkDraftPayload,
} from "@/types/framework.types";

export const frameworkService = {
  // Public/All Authenticated
  listFrameworks: () =>
    apiClient.get<AssessmentFramework[]>("/frameworks"),

  getActiveFramework: (params?: { type?: AssessmentType; version?: string }) =>
    apiClient.get<AssessmentFramework>("/frameworks/active", { params }),

  // Admin Framework Operations
  getAdminFrameworks: () =>
    apiClient.get<AssessmentFramework[]>("/admin/frameworks"),

  getFrameworkById: (id: string) =>
    apiClient.get<AssessmentFramework>(`/admin/frameworks/${id}`),

  createFrameworkDraft: (payload: CreateFrameworkDraftPayload) =>
    apiClient.post<AssessmentFramework>("/admin/frameworks", payload),

  publishFramework: (id: string) =>
    apiClient.put<{ message: string; framework: AssessmentFramework }>(
      `/admin/frameworks/${id}/publish`
    ),

  rollbackFramework: (id: string, targetVersion: string) =>
    apiClient.post<{ message: string; framework: AssessmentFramework }>(
      `/admin/frameworks/${id}/rollback`,
      { targetVersion }
    ),

  deleteDraftFramework: (id: string) =>
    apiClient.delete<{ message: string }>(`/admin/frameworks/${id}`),
};
