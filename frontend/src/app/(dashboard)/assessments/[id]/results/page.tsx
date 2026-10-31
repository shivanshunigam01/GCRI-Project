"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { assessmentService } from "@/services/assessment.service";
import {
  AssessmentSummaryResponse,
  AssessmentPillarsResponse,
} from "@/types/assessment.types";
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  Shield,
  Award,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ExternalLink,
  Loader2,
  Layers,
  Sparkles,
  BarChart3,
  Calendar,
} from "lucide-react";

export default function AssessmentResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { isAdmin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const [summary, setSummary] = useState<AssessmentSummaryResponse | null>(null);
  const [pillarsData, setPillarsData] = useState<AssessmentPillarsResponse | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadResults() {
      setLoading(true);
      setError(null);
      setAccessDenied(false);

      if (isAdmin) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      try {
        const [sumRes, pilRes] = await Promise.all([
          assessmentService.getSummary(id),
          assessmentService.getPillars(id),
        ]);

        if (sumRes?.data) setSummary(sumRes.data);
        if (pilRes?.data) setPillarsData(pilRes.data);
      } catch (err: any) {
        if (
          err?.response?.status === 403 &&
          err?.response?.data?.error?.code === "ADMIN_CONTENT_ACCESS_RESTRICTED"
        ) {
          setAccessDenied(true);
        } else {
          setError(
            err?.response?.data?.error?.message ||
              err?.message ||
              "Failed to load assessment results."
          );
        }
      } finally {
        setLoading(false);
      }
    }

    loadResults();
  }, [id, isAdmin]);

  const handleGeneratePdf = async () => {
    setGeneratingPdf(true);
    setPdfSuccessMessage(null);
    try {
      const res = await assessmentService.generateReport(id);
      setPdfSuccessMessage(res?.data?.message || "PDF report generated successfully!");
      // Trigger download
      window.open(assessmentService.getReportDownloadUrl(id), "_blank");
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to generate report.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleDownloadExcel = () => {
    window.open(assessmentService.getExportDownloadUrl(id), "_blank");
  };

  if (accessDenied) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm">
        <div className="p-3 bg-amber-50 text-amber-600 rounded-full inline-flex">
          <Shield className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 font-editorial">
            Admin Confidentiality Boundary
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            By architectural design (Zero-Knowledge Regulatory Assurance), Platform Administrators are restricted from accessing client scoring snapshots, radar breakdowns, and audit reports.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/assessments"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Assessments Directory
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 rounded-lg w-1/3" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-xl border border-slate-200" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[400px]">
          <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200" />
          <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200" />
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="p-8 bg-white rounded-xl border border-red-200 text-center space-y-3">
        <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Results Error</h2>
        <p className="text-xs text-slate-500">{error || "Assessment results could not be found."}</p>
        <Link
          href="/assessments"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Return to Assessments
        </Link>
      </div>
    );
  }

  const orgName = (summary.organization as any)?.name || "Client Organization";
  const pillars = pillarsData?.pillars || [];

  // SVG Radar coordinates calculation for 7 pillars
  const numPillars = Math.max(pillars.length, 7);
  const cx = 150;
  const cy = 150;
  const radius = 100;

  // Concentric polygon grids (20%, 40%, 60%, 80%, 100%)
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];
  const gridPolygons = gridLevels.map((lvl) => {
    return Array.from({ length: numPillars }).map((_, i) => {
      const angle = (2 * Math.PI * i) / numPillars - Math.PI / 2;
      const x = cx + radius * lvl * Math.cos(angle);
      const y = cy + radius * lvl * Math.sin(angle);
      return `${x},${y}`;
    }).join(" ");
  });

  // Data polygon points
  const dataPolygonPoints = pillars.map((p, i) => {
    const angle = (2 * Math.PI * i) / numPillars - Math.PI / 2;
    const pct = (p.compliancePercentage || p.percentage || 0) / 100;
    const x = cx + radius * pct * Math.cos(angle);
    const y = cy + radius * pct * Math.sin(angle);
    return `${x},${y}`;
  }).join(" ");

  // Color according to maturity level
  const maturity = summary.maturityLevel || "Emerging";
  let maturityBadgeColor = "bg-blue-50 text-blue-700 border-blue-200";
  if (maturity === "Advanced") maturityBadgeColor = "bg-purple-50 text-purple-700 border-purple-200";
  else if (maturity === "Established") maturityBadgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
  else if (maturity === "Initial") maturityBadgeColor = "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/assessments"
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition shadow-2xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-editorial">
                Audit Results &amp; Compliance Radar
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                {summary.assessmentType}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Organization: <strong className="text-slate-800">{orgName}</strong> • Framework: v{summary.frameworkVersion}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href={`/assessments/${id}/findings`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition"
          >
            <Shield className="h-3.5 w-3.5 text-slate-500" />
            Findings Hub
          </Link>

          <button
            type="button"
            disabled={generatingPdf}
            onClick={handleGeneratePdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0c162c] hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-2xs transition"
          >
            {generatingPdf ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" /> Official PDF Report
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" /> Excel Export
          </button>
        </div>
      </div>

      {pdfSuccessMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{pdfSuccessMessage}</span>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Score Card */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Total Score Earned
          </span>
          <div className="mt-2">
            <div className="text-3xl font-extrabold text-slate-900">
              {summary.overallScore}{" "}
              <span className="text-sm font-normal text-slate-400">/ {summary.maxPossibleScore}</span>
            </div>
            <div className="text-xs font-semibold text-blue-600 mt-1">
              {summary.overallPercentage}% Score Ratio
            </div>
          </div>
        </div>

        {/* Maturity Tier */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Assurance Maturity Level
          </span>
          <div className="mt-2">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-extrabold border ${maturityBadgeColor}`}>
              {maturity} Level
            </span>
            <div className="text-xs text-slate-500 mt-2">
              Based on deterministic framework cutoffs.
            </div>
          </div>
        </div>

        {/* Compliance Percentage */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Framework Compliance
          </span>
          <div className="mt-2">
            <div className="text-3xl font-extrabold text-slate-900">
              {summary.compliancePercentage || summary.overallPercentage}%
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {summary.totalNoExceptionsNoted || 0} compliant controls
            </div>
          </div>
        </div>

        {/* Exceptions Count */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Exceptions Flagged
          </span>
          <div className="mt-2">
            <div className="text-3xl font-extrabold text-rose-600">
              {summary.totalExceptionsNoted || 0}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Remediation roadmap generated.
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts & Breakdown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Radar Spider Chart Card */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">7-Pillar Compliance Radar</h3>
              <p className="text-[11px] text-slate-500">Spider polygon benchmarking compliance across all 7 GRAICE Pillars.</p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              Radar View
            </span>
          </div>

          {/* SVG Radar Chart */}
          <div className="h-72 w-full flex items-center justify-center py-4">
            <svg viewBox="0 0 300 300" className="w-full h-full max-w-[280px] overflow-visible">
              <defs>
                <linearGradient id="radarFillGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.15" />
                </linearGradient>
              </defs>

              {/* Concentric Grid Polygons */}
              {gridPolygons.map((pts, idx) => (
                <polygon
                  key={idx}
                  points={pts}
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="1"
                  strokeDasharray={idx < 4 ? "2 2" : "none"}
                />
              ))}

              {/* Axis Spoke Lines */}
              {Array.from({ length: numPillars }).map((_, i) => {
                const angle = (2 * Math.PI * i) / numPillars - Math.PI / 2;
                const x2 = cx + radius * Math.cos(angle);
                const y2 = cy + radius * Math.sin(angle);
                return (
                  <line
                    key={`spoke-${i}`}
                    x1={cx}
                    y1={cy}
                    x2={x2}
                    y2={y2}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Filled Data Polygon */}
              {dataPolygonPoints && (
                <polygon
                  points={dataPolygonPoints}
                  fill="url(#radarFillGrad)"
                  stroke="#2563eb"
                  strokeWidth="2.5"
                  className="drop-shadow-xs"
                />
              )}

              {/* Data Vertex Dots and Labels */}
              {pillars.map((p, i) => {
                const angle = (2 * Math.PI * i) / numPillars - Math.PI / 2;
                const pct = (p.compliancePercentage || p.percentage || 0) / 100;
                const x = cx + radius * pct * Math.cos(angle);
                const y = cy + radius * pct * Math.sin(angle);

                // Label position slightly outside perimeter
                const labelRadius = radius + 22;
                const lx = cx + labelRadius * Math.cos(angle);
                const ly = cy + labelRadius * Math.sin(angle);

                return (
                  <g key={p.pillarId || i}>
                    <circle
                      cx={x}
                      cy={y}
                      r="4"
                      fill="#ffffff"
                      stroke="#2563eb"
                      strokeWidth="2"
                      className="hover:scale-125 transition-transform"
                    />
                    <text
                      x={lx}
                      y={ly}
                      fontSize="9"
                      fontWeight="bold"
                      fill="#475569"
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      P{p.pillarNumber || i + 1} ({p.compliancePercentage || p.percentage || 0}%)
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="text-[11px] text-slate-400 text-center pt-2 border-t border-slate-100">
            Outer boundary = 100% compliance target. Center point = 0% compliance.
          </div>
        </div>

        {/* Pillar Scores Table Card */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">7-Pillar Evaluation Breakdown</h3>
              <p className="text-[11px] text-slate-500">Scores earned, control counts, and compliance ratings.</p>
            </div>
            <BarChart3 className="h-4 w-4 text-slate-400" />
          </div>

          <div className="overflow-x-auto flex-1 py-2">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] font-semibold text-slate-400 uppercase border-b border-slate-100">
                <tr>
                  <th className="py-2.5">Pillar</th>
                  <th className="py-2.5 text-center">Score</th>
                  <th className="py-2.5 text-center">Exceptions</th>
                  <th className="py-2.5 text-right">Compliance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pillars.map((p) => {
                  const pct = p.compliancePercentage || p.percentage || 0;
                  return (
                    <tr key={p.pillarId} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 font-semibold text-slate-800">
                        <span className="font-mono text-slate-400 mr-1.5">P{p.pillarNumber}</span>
                        {p.pillarName}
                      </td>
                      <td className="py-2.5 text-center font-mono text-slate-700">
                        {p.scoreEarned} / {p.scoreMax}
                      </td>
                      <td className="py-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.exceptionsNoted > 0
                              ? "bg-rose-50 text-rose-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {p.exceptionsNoted}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-bold text-slate-900">{pct}%</span>
                          <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Need detailed remediation guidance?</span>
            <Link
              href={`/assessments/${id}/findings`}
              className="font-bold text-blue-600 hover:underline"
            >
              View Findings Remediation Hub →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
