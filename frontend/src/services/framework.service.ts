import { apiClient } from "./apiClient";
import { AssessmentFramework } from "@/types/framework.types";

export const frameworkService = {
  getFrameworks: () =>
    apiClient.get<AssessmentFramework[]>("/admin/frameworks"),

  getActiveFramework: () =>
    apiClient.get<AssessmentFramework>("/frameworks/active"),

  createFrameworkDraft: (payload: { name: string; version: string; pillars?: any[] }) =>
    apiClient.post<AssessmentFramework>("/admin/frameworks", payload),

  publishFramework: (id: string) =>
    apiClient.put(`/admin/frameworks/${id}/publish`),
};
