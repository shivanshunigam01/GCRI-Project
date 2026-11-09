"use client";

import React, { useState } from "react";
import { assessmentService } from "@/services/assessment.service";
import { getApiErrorMessage, getUserFacingApiError } from "@/lib/authUser";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";
import { FileDown, FileSpreadsheet, Loader2, FileText } from "lucide-react";

interface AssessmentReportsPanelProps {
  assessmentId: string;
  className?: string;
  /** When true, emphasize Full Assessment copy (default false keeps Light-neutral wording). */
  isFullAssessment?: boolean;
}

export function AssessmentReportsPanel({
  assessmentId,
  className,
  isFullAssessment = false,
}: AssessmentReportsPanelProps) {
  const toast = useToast();
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadPdf = async () => {
    if (downloadingPdf) return;
    setDownloadingPdf(true);
    setError(null);
    try {
      await assessmentService.downloadServerReportPdf(assessmentId);
      toast.success(
        "PDF report downloaded (GCRAI / GRAICE branding, executive summary, findings, remediation, and control detail)."
      );
    } catch (err: unknown) {
      const msg = getApiErrorMessage(
        err,
        "Failed to download PDF. Confirm you are assigned to this organization and try again."
      );
      setError(msg);
      toast.error(msg);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (downloadingExcel) return;
    setDownloadingExcel(true);
    setError(null);
    try {
      await assessmentService.downloadExportExcel(assessmentId);
      toast.success(
        "Excel workbook downloaded (executive summary, KPIs, pillars, remediation, and control detail)."
      );
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, "Failed to download Excel export.");
      setError(msg);
      toast.error(msg);
    } finally {
      setDownloadingExcel(false);
    }
  };

  const typeLabel = isFullAssessment ? "Full" : "Light";

  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4",
        className
      )}
    >
      <div>
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-500" /> Download reports
        </h3>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          Export this {typeLabel} assessment as a detailed PDF (logos, KPIs, pillar breakdown, findings,
          remediation roadmap, and per-control evidence) or a formatted Excel workbook with the same
          data structure.
          PDF is generated on the server when needed and stored on the session for faster re-downloads.
        </p>
      </div>

      {error && (
        <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={downloadingPdf}
          onClick={handleDownloadPdf}
          className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl bg-[#102C3A] text-white hover:bg-[#145568] disabled:opacity-50 shadow-sm"
        >
          {downloadingPdf ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4" />
          )}
          Download PDF report
        </button>
        <button
          type="button"
          disabled={downloadingExcel}
          onClick={handleDownloadExcel}
          className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-950 hover:bg-emerald-100 disabled:opacity-50"
        >
          {downloadingExcel ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="h-4 w-4" />
          )}
          Download Excel workbook
        </button>
      </div>
    </div>
  );
}
