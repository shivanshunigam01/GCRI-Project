"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { assessmentService } from "@/services/assessment.service";
import {
  Finding,
  AssessmentFindingsResponse,
} from "@/types/assessment.types";
import { AssessmentFindingsSkeleton } from "@/components/shared/PageSkeletons";
import {
  ArrowLeft,
  Shield,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Filter,
  Search,
  ExternalLink,
  Loader2,
  ChevronDown,
  ChevronRight,
  Info,
} from "lucide-react";

export default function AssessmentFindingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { isAdmin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const [findingsData, setFindingsData] = useState<AssessmentFindingsResponse | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [expandedFindingId, setExpandedFindingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadFindings() {
      setLoading(true);
      setError(null);
      setAccessDenied(false);

      if (isAdmin) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      try {
        const res = await assessmentService.getFindings(id);
        if (res?.data) {
          setFindingsData(res.data);
        }
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
              "Failed to load findings and exceptions."
          );
        }
      } finally {
        setLoading(false);
      }
    }

    loadFindings();
  }, [id, isAdmin]);

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
            By architectural design (Zero-Knowledge Regulatory Assurance), Platform Administrators are restricted from viewing confidential client findings, identified exceptions, or remediation roadmaps.
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
    return <AssessmentFindingsSkeleton />;
  }

  if (error || !findingsData) {
    return (
      <div className="p-8 bg-white rounded-xl border border-red-200 text-center space-y-3 max-w-lg mx-auto my-12">
        <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Findings Unavailable</h2>
        <p className="text-xs text-slate-500">{error || "Could not retrieve findings data."}</p>
        <Link
          href={`/assessments/${id}/results`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Results
        </Link>
      </div>
    );
  }

  const allFindings = findingsData.findings || [];
  const summary = findingsData.summary || {
    total: findingsData.totalFindings || 0,
    open: allFindings.filter((f) => f.status === "Open").length,
    inProgress: allFindings.filter((f) => f.status === "In Progress").length,
    resolved: allFindings.filter((f) => f.status === "Resolved").length,
  };

  const filteredFindings = allFindings.filter((f) => {
    if (severityFilter !== "All" && f.severity !== severityFilter) return false;
    if (statusFilter !== "All" && f.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const title = f.title?.toLowerCase() || "";
      const text = f.questionText?.toLowerCase() || "";
      const pillar = f.pillarName?.toLowerCase() || "";
      const idStr = f.findingId?.toLowerCase() || f.controlId?.toLowerCase() || "";
      return title.includes(q) || text.includes(q) || pillar.includes(q) || idStr.includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/assessments/${id}/results`}
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition shadow-2xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-editorial">
                Findings &amp; Remediation Hub
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                {summary.total} Exceptions
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Actionable non-compliance exceptions mapped to regulatory requirements and remediation tasks.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href={`/assessments/${id}/results`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition"
          >
            Radar Results
          </Link>
          <a
            href={assessmentService.getExportDownloadUrl(id)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" /> Export Excel
          </a>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Total Exceptions
          </span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{summary.total}</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Open (Action Needed)
          </span>
          <div className="text-2xl font-extrabold text-rose-600 mt-1">{summary.open}</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            In Remediation
          </span>
          <div className="text-2xl font-extrabold text-blue-600 mt-1">{summary.inProgress}</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Resolved
          </span>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">{summary.resolved}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search findings by control, title, or pillar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Severity Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <Filter className="h-3.5 w-3.5 text-slate-400" /> Severity:
          </div>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Severities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Findings List */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        {filteredFindings.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {filteredFindings.map((finding) => {
              const isExpanded = expandedFindingId === finding.findingId;

              let severityBadge = "bg-blue-50 text-blue-700 border-blue-200";
              if (finding.severity === "High") severityBadge = "bg-rose-50 text-rose-700 border-rose-200";
              else if (finding.severity === "Medium") severityBadge = "bg-amber-50 text-amber-700 border-amber-200";

              let statusBadge = "bg-rose-50 text-rose-700 border-rose-200";
              if (finding.status === "In Progress") statusBadge = "bg-blue-50 text-blue-700 border-blue-200";
              else if (finding.status === "Resolved") statusBadge = "bg-emerald-50 text-emerald-700 border-emerald-200";

              return (
                <div key={finding.findingId} className="transition-colors hover:bg-slate-50/50">
                  <div
                    onClick={() =>
                      setExpandedFindingId(isExpanded ? null : finding.findingId)
                    }
                    className="p-5 flex items-start justify-between gap-4 cursor-pointer select-none"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-700">
                          {finding.findingId || finding.controlId}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          • {finding.pillarName}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${severityBadge}`}>
                          {finding.severity} Severity
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusBadge}`}>
                          {finding.status}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">
                        {finding.title || finding.questionText}
                      </h3>
                      {finding.questionText && finding.title && (
                        <p className="text-xs text-slate-500 truncate max-w-2xl">
                          {finding.questionText}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pt-1 text-slate-400">
                      <span className="text-[11px] font-semibold hidden sm:inline text-blue-600">
                        {isExpanded ? "Hide Remediation" : "View Remediation"}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-blue-600" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Remediation Drawer */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-1 bg-slate-50/80 border-t border-slate-100 text-xs space-y-3">
                      {finding.recommendedAction && (
                        <div className="p-3 bg-white rounded-lg border border-slate-200/80 space-y-1">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                            <Info className="h-3.5 w-3.5 text-blue-600" />
                            Recommended Regulatory Remediation
                          </span>
                          <p className="text-slate-600 leading-relaxed text-xs">
                            {finding.recommendedAction}
                          </p>
                        </div>
                      )}

                      {finding.regulatoryAlignments && (
                        <div className="flex items-center gap-2 flex-wrap text-[11px]">
                          <span className="font-bold text-slate-700">Citations:</span>
                          {finding.regulatoryAlignments.euAiAct && (
                            <span className="px-2 py-0.5 bg-blue-100/70 text-blue-800 rounded font-medium">
                              EU AI Act: {finding.regulatoryAlignments.euAiAct}
                            </span>
                          )}
                          {finding.regulatoryAlignments.nistAiRmf && (
                            <span className="px-2 py-0.5 bg-indigo-100/70 text-indigo-800 rounded font-medium">
                              NIST AI RMF: {finding.regulatoryAlignments.nistAiRmf}
                            </span>
                          )}
                          {finding.regulatoryAlignments.iso42001 && (
                            <span className="px-2 py-0.5 bg-purple-100/70 text-purple-800 rounded font-medium">
                              ISO 42001: {finding.regulatoryAlignments.iso42001}
                            </span>
                          )}
                        </div>
                      )}

                      {finding.evidenceNotes && (
                        <div className="text-slate-500">
                          <strong>Auditor Notes:</strong> {finding.evidenceNotes}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center space-y-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
            <h4 className="text-sm font-bold text-slate-900">No Findings Found</h4>
            <p className="text-xs text-slate-400">
              No findings match your selected filter criteria.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
