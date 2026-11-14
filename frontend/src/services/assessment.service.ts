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
  AssessmentDetailResponse,
  AssessmentGapsResponse,
  SubmitAssessmentResponse,
  GenerateReportResponse,
} from "@/types/assessment.types";
import {
  downloadAssessmentExcel,
  downloadAssessmentPdf,
} from "@/lib/assessmentDownloads";
import { downloadGraiceBrandedAssessmentPdf } from "@/lib/graiceAssessmentReportPdf";

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
    apiClient.get<AssessmentDetailResponse>(`/assessments/${id}`),

  saveAnswers: (id: string, answers: SaveAnswerItemInput[]) =>
    apiClient.put<{ message: string; savedCount: number; totalAnswered: number }>(
      `/assessments/${id}/answers`,
      { answers }
    ),

  getProgress: (id: string) =>
    apiClient.get<AssessmentProgressResponse>(`/assessments/${id}/progress`),

  getGaps: (id: string) =>
    apiClient.get<AssessmentGapsResponse>(`/assessments/${id}/gaps`),

  submitAssessment: (id: string) =>
    apiClient.post<SubmitAssessmentResponse>(`/assessments/${id}/submit`),

  shareAssessment: (id: string, payload: { auditorId?: string; auditorIds?: string[] }) =>
    apiClient.post<{ message: string; session: AssessmentSession }>(
      `/assessments/${id}/share`,
      payload
    ),

  revokeAssessmentShare: (id: string, auditorId: string) =>
    apiClient.delete<{ message: string; sharedWith: unknown[] }>(
      `/assessments/${id}/share/${auditorId}`
    ),

  coSignAssessment: (id: string, payload?: { attestationNotes?: string }) =>
    apiClient.post<{ message: string; coSignatures: unknown[] }>(
      `/assessments/${id}/co-sign`,
      payload ?? {}
    ),

  getPresignedUrl: (
    id: string,
    payload: { questionId: string; fileName: string; contentType: string }
  ) =>
    apiClient.post<{
      uploadUrl: string;
      fileUrl: string;
      s3Key: string;
      expiresIn?: number;
    }>(`/assessments/${id}/evidence/presigned-url`, payload),

  /**
   * Direct multipart upload — backend attaches URL when an answer row already exists.
   * Caller should also persist evidenceAttachmentUrl/s3Key via saveAnswers for reliability.
   */
  uploadEvidence: (id: string, questionId: string, file: File) => {
    const formData = new FormData();
    formData.append("questionId", questionId);
    formData.append("file", file);
    return apiClient.post<{
      message: string;
      upload: {
        fileUrl: string;
        s3Key: string;
        fileName: string;
        fileSizeBytes: number;
        mimeType: string;
        storageType: "s3" | "local";
      };
    }>(`/assessments/${id}/evidence/upload`, formData);
  },

  getFindings: (id: string) =>
    apiClient.get<AssessmentFindingsResponse>(`/assessments/${id}/findings`),

  getRecommendations: (id: string) =>
    apiClient.get<AssessmentRecommendationsResponse>(`/assessments/${id}/recommendations`),

  getSummary: (id: string) =>
    apiClient.get<AssessmentSummaryResponse>(`/assessments/${id}/summary`),

  getPillars: (id: string) =>
    apiClient.get<AssessmentPillarsResponse>(`/assessments/${id}/pillars`),

  /** Backend PDFKit report — creates/updates reportMetadata on the session */
  generateReport: (id: string) =>
    apiClient.post<GenerateReportResponse>(`/assessments/${id}/report`),

  /** Authenticated GET of the server-generated PDF (`GET /assessments/:id/report`) */
  downloadServerReportPdf: (id: string) => downloadAssessmentPdf(id),

  /**
   * Client-side branded GRAICE PDF (jsPDF) built from live assessment APIs.
   * Does not replace the backend report service.
   */
  downloadBrandedReportPdf: (id: string) => downloadGraiceBrandedAssessmentPdf(id),

  /** @deprecated Prefer downloadServerReportPdf or downloadBrandedReportPdf */
  downloadReportPdf: (id: string) => downloadGraiceBrandedAssessmentPdf(id),

  downloadExportExcel: (id: string) => downloadAssessmentExcel(id),

  sendReminder: (id: string) =>
    apiClient.post<{ message: string }>(`/assessments/${id}/remind`),

  sendCompletion: (id: string) =>
    apiClient.post<{ message: string }>(`/assessments/${id}/notifications/completion`),

  getReportDownloadUrl: (id: string) =>
    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1"}/assessments/${id}/report`,

  getExportDownloadUrl: (id: string) =>
    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1"}/assessments/${id}/export`,
};
