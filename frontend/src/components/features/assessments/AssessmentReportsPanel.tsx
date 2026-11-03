"use client";

import React, { useState } from "react";
import { assessmentService } from "@/services/assessment.service";
import { getApiErrorMessage, getUserFacingApiError } from "@/lib/authUser";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";
import { FileDown, FileSpreadsheet, Loader2, FileText, Sparkles } from "lucide-react";

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
  const [generating, setGenerating] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [downloadingBranded, setDownloadingBranded] = useState(false);
  const [lastGeneratedName, setLastGeneratedName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await assessmentService.generateReport(assessmentId);
      const meta = res?.data?.report;
      const name =
        meta?.fileName ||
        `GRAICE_${isFullAssessment ? "Full" : "Light"}_Report_${assessmentId.slice(-6)}.pdf`;
      setLastGeneratedName(name);
      toast.success("Server PDF generated. You can download it now.");
      // Immediately fetch the stored/server PDF after generation
      try {
        await assessmentService.downloadServerReportPdf(assessmentId);
        toast.success("Server PDF download started.");
      } catch (dlErr: unknown) {
        toast.error(
          getApiErrorMessage(
            dlErr,
            "Report was generated but download failed. Try Download PDF."
          )
        );
      }
    } catch (err: unknown) {
      const msg = getUserFacingApiError(err, "report generation");
      setError(msg);
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (downloadingPdf) return;
    setDownloadingPdf(true);
    setError(null);
    try {
      await assessmentService.downloadServerReportPdf(assessmentId);
      toast.success("Server PDF download started.");
    } catch (err: unknown) {
      const msg = getApiErrorMessage(
        err,
        "Failed to download PDF. Generate the report first if none exists."
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
      toast.success("Excel export download started.");
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, "Failed to download Excel export.");
      setError(msg);
      toast.error(msg);
    } finally {
      setDownloadingExcel(false);
    }
  };

  const handleBrandedPdf = async () => {
    if (downloadingBranded) return;
    setDownloadingBranded(true);
    setError(null);
    try {
      await assessmentService.downloadBrandedReportPdf(assessmentId);
      toast.success("Branded GRAICE PDF downloaded.");
    } catch (err: unknown) {
      const msg = getUserFacingApiError(err, "branded PDF");
      setError(msg);
      toast.error(msg);
    } finally {
      setDownloadingBranded(false);
    }
  };

  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4",
        className
      )}
    >
      <div>
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-500" /> Reports &amp; exports
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          {isFullAssessment
            ? "Generate the server Full Assessment PDF, download the stored report, or export Excel. Branded PDF is a separate client-rendered pack and does not replace the backend report service."
            : "Generate the server PDF, download the stored report, or export Excel. Branded PDF is a separate client-rendered pack and does not replace the backend report service."}
        </p>
        {lastGeneratedName && (
          <p className="text-[11px] text-emerald-700 mt-2 font-medium">
            Latest generated: {lastGeneratedName}
          </p>
        )}
      </div>

      {error && (
        <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={generating}
          onClick={handleGenerate}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl bg-[#0c162c] text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          Generate server PDF
        </button>
        <button
          type="button"
          disabled={downloadingPdf}
          onClick={handleDownloadPdf}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
        >
          {downloadingPdf ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4" />
          )}
          Download server PDF
        </button>
        <button
          type="button"
          disabled={downloadingExcel}
          onClick={handleDownloadExcel}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
        >
          {downloadingExcel ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="h-4 w-4" />
          )}
          Download Excel
        </button>
        <button
          type="button"
          disabled={downloadingBranded}
          onClick={handleBrandedPdf}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-900 hover:bg-indigo-100 disabled:opacity-50"
        >
          {downloadingBranded ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Branded GRAICE PDF
        </button>
      </div>
    </div>
  );
}
