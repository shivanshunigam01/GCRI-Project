"use client";

import React, { useState } from "react";
import { assessmentService } from "@/services/assessment.service";
import { getApiErrorMessage, getUserFacingApiError } from "@/lib/authUser";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";
import { FileDown, FileSpreadsheet, Loader2, FileText } from "lucide-react";
import { downloadGraiceBrandedAssessmentPdf } from "@/lib/graiceAssessmentReportPdf";

interface AssessmentReportsPanelProps {
  assessmentId: string;
  className?: string;
}

export function AssessmentReportsPanel({ assessmentId, className }: AssessmentReportsPanelProps) {
  const toast = useToast();
  const [generating, setGenerating] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [lastGeneratedName, setLastGeneratedName] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      await downloadGraiceBrandedAssessmentPdf(assessmentId);
      const safeName = `GRAICE_Report_${assessmentId.slice(-6)}.pdf`;
      setLastGeneratedName(safeName);
      toast.success("GRAICE assessment PDF downloaded.");
    } catch (err: unknown) {
      toast.error(getUserFacingApiError(err, "report generation"));
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      // Always use the branded GRAICE layout (same as Generate PDF).
      await downloadGraiceBrandedAssessmentPdf(assessmentId);
      toast.success("Branded GRAICE PDF downloaded.");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to download PDF report."));
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (downloadingExcel) return;
    setDownloadingExcel(true);
    try {
      await assessmentService.downloadExportExcel(assessmentId);
      toast.success("Excel export download started.");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to download Excel export."));
    } finally {
      setDownloadingExcel(false);
    }
  };

  return (
    <div className={cn("bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4", className)}>
      <div>
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-500" /> Reports &amp; exports
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Generate / Download PDF both produce the branded GRAICE assessment report from your live
          assessment data. Excel uses the server export API.
        </p>
        {lastGeneratedName && (
          <p className="text-[11px] text-emerald-700 mt-2 font-medium">Latest: {lastGeneratedName}</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={generating}
          onClick={handleGenerate}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl bg-[#0c162c] text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          Generate PDF
        </button>
        <button
          type="button"
          disabled={downloadingPdf}
          onClick={handleDownloadPdf}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
        >
          {downloadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          Download PDF
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
      </div>
    </div>
  );
}
