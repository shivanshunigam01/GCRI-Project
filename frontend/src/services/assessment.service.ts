import { apiClient } from "./apiClient";
import {
  AssessmentSession,
  AssessmentType,
  CreateAssessmentPayload,
  SaveAnswerItemInput,
  AssessmentSummaryResponse,
  AssessmentPillarsResponse,
  AssessmentRecommendationsResponse,
  AssessmentProgressResponse,
  AssessmentFindingsResponse,
} from "@/types/assessment.types";

export const assessmentService = {
  createAssessment: (payload: CreateAssessmentPayload) =>
    apiClient.post<AssessmentSession>("/assessments", payload),

  getAssessments: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    assessmentType?: AssessmentType;
    companyId?: string;
  }) =>
    apiClient.get<AssessmentSession[]>("/assessments", { params }),

  getCompanyAssessments: (companyId: string) =>
    apiClient.get<AssessmentSession[]>(`/assessments/company/${companyId}`),

  getAssessmentById: (id: string) =>
    apiClient.get<{ session: AssessmentSession; framework?: any }>(`/assessments/${id}`),

  saveAnswers: (id: string, answers: SaveAnswerItemInput[]) =>
    apiClient.put<{ message: string; savedCount: number; totalAnswered: number }>(
      `/assessments/${id}/answers`,
      { answers }
    ),

  getProgress: (id: string) =>
    apiClient.get<AssessmentProgressResponse>(`/assessments/${id}/progress`),

  getGaps: (id: string) =>
    apiClient.get<any[]>(`/assessments/${id}/gaps`),

  submitAssessment: (id: string) =>
    apiClient.post<{ message: string; session: AssessmentSession; scoreSnapshot: any }>(
      `/assessments/${id}/submit`
    ),

  getPresignedUrl: (
    id: string,
    payload: { questionId: string; fileName: string; contentType: string }
  ) =>
    apiClient.post<{ presignedUrl: string; key: string }>(
      `/assessments/${id}/evidence/presigned-url`,
      payload
    ),

  uploadEvidence: (id: string, questionId: string, file: File) => {
    const formData = new FormData();
    formData.append("questionId", questionId);
    formData.append("file", file);
    return apiClient.post<{ message: string; url: string; key: string }>(
      `/assessments/${id}/evidence/upload`,
      formData
    );
  },

  getFindings: (id: string) =>
    apiClient.get<AssessmentFindingsResponse>(`/assessments/${id}/findings`),

  getRecommendations: (id: string) =>
    apiClient.get<AssessmentRecommendationsResponse>(`/assessments/${id}/recommendations`),

  getSummary: (id: string) =>
    apiClient.get<AssessmentSummaryResponse>(`/assessments/${id}/summary`),

  getPillars: (id: string) =>
    apiClient.get<AssessmentPillarsResponse>(`/assessments/${id}/pillars`),

  generateReport: (id: string) =>
    apiClient.post<{ message: string; reportUrl: string; fileName: string }>(
      `/assessments/${id}/report`
    ),

  sendReminder: (id: string) =>
    apiClient.post<{ message: string }>(`/assessments/${id}/remind`),

  sendCompletion: (id: string) =>
    apiClient.post<{ message: string }>(`/assessments/${id}/notifications/completion`),

  getReportDownloadUrl: (id: string) =>
    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1"}/assessments/${id}/report`,

  getExportDownloadUrl: (id: string) =>
    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1"}/assessments/${id}/export`,
};
