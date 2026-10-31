import { apiClient } from "./apiClient";
import {
  AssessmentFramework,
  FrameworkPillar,
  FrameworkQuestion,
  MaturityThresholds,
  CreateFrameworkDraftPayload,
} from "@/types/framework.types";

export interface AdminFrameworkListItem {
  _id: string;
  version: string;
  assessmentType: "Light" | "Full";
  status: "Draft" | "Published" | "Archived";
  title?: string;
  description?: string;
  totalQuestions: number;
  pillarsCount: number;
  inUseSessionCount: number;
  isImmutable?: boolean;
  createdAt: string;
  updatedAt: string;
}

export const adminFrameworkService = {
  createFrameworkVersion: (payload: CreateFrameworkDraftPayload & { cloneFromVersion?: string }) =>
    apiClient.post<AssessmentFramework>("/admin/frameworks", payload),

  createDraft: (payload: CreateFrameworkDraftPayload & { cloneFromVersion?: string }) =>
    apiClient.post<AssessmentFramework>("/admin/frameworks", payload),

  listAllFrameworks: () =>
    apiClient.get<AdminFrameworkListItem[]>("/admin/frameworks"),

  listFrameworks: () =>
    apiClient.get<AdminFrameworkListItem[]>("/admin/frameworks"),

  getFrameworkById: (id: string) =>
    apiClient.get<AssessmentFramework>(`/admin/frameworks/${id}`),

  publishFramework: (id: string) =>
    apiClient.put<{ message: string; framework: AssessmentFramework }>(
      `/admin/frameworks/${id}/publish`
    ),

  rollbackFramework: (id: string, targetVersion?: string) =>
    apiClient.put<{ message: string; framework: AssessmentFramework }>(
      `/admin/frameworks/${id}/rollback`,
      targetVersion ? { targetVersion } : {}
    ),

  deleteDraftFramework: (id: string) =>
    apiClient.delete<{ message: string }>(`/admin/frameworks/${id}`),

  deleteDraft: (id: string) =>
    apiClient.delete<{ message: string }>(`/admin/frameworks/${id}`),

  addQuestion: (id: string, question: FrameworkQuestion) =>
    apiClient.post<{ message: string; question: FrameworkQuestion }>(
      `/admin/frameworks/${id}/questions`,
      question
    ),

  updateQuestion: (id: string, questionId: string, question: Partial<FrameworkQuestion>) =>
    apiClient.put<{ message: string; question: FrameworkQuestion }>(
      `/admin/frameworks/${id}/questions/${questionId}`,
      question
    ),

  toggleQuestionStatus: (id: string, questionId: string, isActive: boolean) =>
    apiClient.patch<{ message: string; questionId: string; isActive: boolean }>(
      `/admin/frameworks/${id}/questions/${questionId}/status`,
      { isActive }
    ),

  deleteQuestion: (id: string, questionId: string) =>
    apiClient.delete<{ message: string }>(`/admin/frameworks/${id}/questions/${questionId}`),

  reorderQuestions: (id: string, questionIds: string[]) =>
    apiClient.put<{ message: string; count: number }>(
      `/admin/frameworks/${id}/questions/reorder`,
      { questionIds }
    ),

  updatePillars: (id: string, pillars: FrameworkPillar[]) =>
    apiClient.put<{ message: string; pillars: FrameworkPillar[] }>(
      `/admin/frameworks/${id}/pillars`,
      { pillars }
    ),

  updateMaturityThresholds: (id: string, thresholds: MaturityThresholds) =>
    apiClient.put<{ message: string; maturityThresholds: MaturityThresholds }>(
      `/admin/frameworks/${id}/thresholds`,
      { maturityThresholds: thresholds }
    ),
};
