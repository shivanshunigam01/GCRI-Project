import { downloadAssessmentFile } from "@/lib/assessmentDownloads";
import type { AnalyticsRange } from "@/types/analytics.types";

export async function downloadAdminDashboardExport(params: {
  format: "pdf" | "xlsx";
  range: AnalyticsRange;
  companyId?: string;
}): Promise<void> {
  const q = new URLSearchParams({
    format: params.format,
    range: params.range,
  });
  if (params.companyId) q.set("companyId", params.companyId);
  const ext = params.format === "pdf" ? "pdf" : "xlsx";
  await downloadAssessmentFile(
    `/dashboard/admin/analytics/export?${q.toString()}`,
    `GCRAI_Analytics_${params.range}.${ext}`
  );
}

export async function downloadAuditorDashboardExport(params: {
  format: "pdf" | "xlsx";
  range: AnalyticsRange;
}): Promise<void> {
  const q = new URLSearchParams({
    format: params.format,
    range: params.range,
  });
  const ext = params.format === "pdf" ? "pdf" : "xlsx";
  await downloadAssessmentFile(
    `/dashboard/auditor/analytics/export?${q.toString()}`,
    `GCRAI_Assessor_Analytics_${params.range}.${ext}`
  );
}
