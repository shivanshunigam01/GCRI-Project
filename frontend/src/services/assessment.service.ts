import { apiClient } from "./apiClient";
import { AssessmentSession, AnswerItem, Finding } from "@/types/assessment.types";

export const assessmentService = {
  createAssessment: (payload: { companyId: string; assessmentType: "Light" | "Full" }) =>
    apiClient.post<AssessmentSession>("/assessments", payload),

  getAssessments: (params?: { page?: number; limit?: number; status?: string; companyId?: string }) =>
    apiClient.get<AssessmentSession[]>("/assessments", { params }),

  getCompanyAssessments: (companyId: string) =>
    apiClient.get<AssessmentSession[]>(`/assessments/company/${companyId}`),

  getAssessmentById: (id: string) =>
    apiClient.get<AssessmentSession>(`/assessments/${id}`),

  saveAnswers: (id: string, answers: AnswerItem[]) =>
    apiClient.put(`/assessments/${id}/answers`, { answers }),

  getProgress: (id: string) =>
    apiClient.get(`/assessments/${id}/progress`),

  getGaps: (id: string) =>
    apiClient.get(`/assessments/${id}/gaps`),

  submitAssessment: (id: string) =>
    apiClient.post(`/assessments/${id}/submit`),

  getPresignedUrl: (id: string, payload: { fileName: string; fileType: string }) =>
    apiClient.post<{ presignedUrl: string; key: string }>(`/assessments/${id}/evidence/presigned-url`, payload),

  getFindings: (id: string) =>
    apiClient.get<Finding[]>(`/assessments/${id}/findings`),

  getRecommendations: (id: string) =>
    apiClient.get(`/assessments/${id}/recommendations`),

  getReportDownloadUrl: (id: string) =>
    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1"}/assessments/${id}/report`,

  getExportDownloadUrl: (id: string) =>
    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1"}/assessments/${id}/export`,
};
