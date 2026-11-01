"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { dashboardService } from "@/services/dashboard.service";
import { assessmentService } from "@/services/assessment.service";
import {
  AuditorAssessmentsItem,
  AdminAssessmentItem,
} from "@/types/dashboard.types";
import { AssessmentListSkeleton } from "@/components/shared/PageSkeletons";
import {
  FileCheck2,
  Plus,
  Search,
  Filter,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Shield,
  Layers,
  Calendar,
  Lock,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

export default function AssessmentsPage() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Data
  const [auditorAssessments, setAuditorAssessments] = useState<AuditorAssessmentsItem[]>([]);
  const [adminAssessments, setAdminAssessments] = useState<AdminAssessmentItem[]>([]);

  const fetchAssessments = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isAdmin) {
        const res = await dashboardService.getAdminAssessments({
          status: statusFilter === "All" ? undefined : statusFilter,
          assessmentType: typeFilter === "All" ? undefined : typeFilter,
          search: searchQuery || undefined,
          limit: 50,
        });
        if (res?.data?.assessments) {
          setAdminAssessments(res.data.assessments);
        }
      } else {
        const res = await dashboardService.getAuditorAssessments({
          status: statusFilter === "All" ? undefined : statusFilter,
          assessmentType: typeFilter === "All" ? undefined : typeFilter,
          limit: 50,
        });
        if (res?.data?.assessments) {
          setAuditorAssessments(res.data.assessments);
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || "Failed to load assessments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, [isAdmin, statusFilter, typeFilter]);

  // Client-side search filtering for auditor assessments
  const filteredAuditorAssessments = auditorAssessments.filter((item) => {
    if (!searchQuery) return true;
    const name = item.organization?.name?.toLowerCase() || "";
    const type = item.assessmentType.toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || type.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-editorial">
              Assessments Workspace
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              {isAdmin ? "Platform Audit Tracker" : "Auditor Workload"}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {isAdmin
              ? "Operational metadata tracking across client assessments. Confidential answers are strictly restricted."
              : "Execute evaluations across 7 GRAICE Pillars, capture evidence, and generate audit reports."}
          </p>
        </div>

        {!isAdmin && (
          <div>
            <Link
              href="/assessments/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0c162c] hover:bg-slate-800 text-white font-semibold text-sm rounded-lg shadow-sm transition"
            >
              <Plus className="h-4 w-4" />
              Start Assessment
            </Link>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by client organization..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <Filter className="h-3.5 w-3.5 text-slate-400" /> Status:
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Statuses</option>
            <option value="InProgress">In Progress</option>
            <option value="Submitted">Submitted (Locked)</option>
            <option value="Archived">Archived</option>
          </select>

          {/* Assessment Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Types</option>
            <option value="Light">Light Assessment (30 Q)</option>
            <option value="Full">Full Framework</option>
          </select>

          <button
            onClick={fetchAssessments}
            className="p-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-600 transition"
            title="Refresh assessments"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <AssessmentListSkeleton />
      ) : error ? (
        <div className="p-8 bg-white rounded-xl border border-red-200 text-center space-y-3">
          <AlertCircle className="h-6 w-6 text-red-500 mx-auto" />
          <p className="text-sm font-semibold text-slate-800">{error}</p>
          <button
            onClick={fetchAssessments}
            className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
          >
            Retry
          </button>
        </div>
      ) : isAdmin ? (
        /* Admin Assessment Pipeline Table */
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Platform Sessions ({adminAssessments.length})
            </span>
            <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
              🔒 Confidential content restricted
            </span>
          </div>

          {adminAssessments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[11px] font-semibold text-slate-400 uppercase bg-slate-50/80 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-5">Organization</th>
                    <th className="py-3 px-4">Assigned Auditor</th>
                    <th className="py-3 px-4">Evaluation Type</th>
                    <th className="py-3 px-4">Framework</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adminAssessments.map((a) => (
                    <tr key={a._id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-5 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                          <span>{a.organization?.name || "Client Organization"}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {a.auditor?.name || "Assigned Assessor"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {a.assessmentType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono">
                        v{a.frameworkVersion}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                            a.status === "Submitted"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : a.status === "InProgress"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-right">
                        {new Date(a.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center space-y-2">
              <FileCheck2 className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">No assessments found</p>
              <p className="text-xs text-slate-400">No assessments match your current filters.</p>
            </div>
          )}
        </div>
      ) : (
        /* Auditor Assessment Cards Grid */
        <div className="space-y-4">
          {filteredAuditorAssessments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredAuditorAssessments.map((item) => {
                const isSubmitted = item.status === "Submitted";
                const isArchived = item.status === "Archived";
                const pct = item.completionPercentage || 0;

                return (
                  <div
                    key={item._id}
                    className="group bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-slate-300 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                            {item.organization?.name || "Client Organization"}
                          </h3>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {item.organization?.industry || "Enterprise"} • {item.organization?.activePlan || "Bronze"}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                            item.assessmentType === "Full"
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : "bg-sky-50 text-sky-700 border-sky-200"
                          }`}
                        >
                          {item.assessmentType}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1.5 pt-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600 font-medium">Evaluation Progress</span>
                          <span className="font-bold text-slate-900">{pct}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              isSubmitted
                                ? "bg-emerald-500"
                                : pct > 70
                                ? "bg-blue-600"
                                : "bg-cyan-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      {/* Status and Aid Pill */}
                      <div className="flex items-center justify-between text-xs pt-1 text-slate-500">
                        <div className="flex items-center gap-1.5">
                          {isSubmitted ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Clock className="h-3.5 w-3.5 text-blue-600" />
                          )}
                          <span className="font-medium text-slate-700">
                            {isSubmitted ? "Submitted (Locked)" : "In Progress"}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {new Date(item.updatedAt || item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between">
                      {isSubmitted ? (
                        <>
                          <Link
                            href={`/assessments/${item._id}/results`}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition"
                          >
                            <Shield className="h-3.5 w-3.5" /> View Radar &amp; Reports
                          </Link>
                          <Link
                            href={`/assessments/${item._id}/findings`}
                            className="text-xs font-semibold text-blue-600 hover:underline"
                          >
                            Findings →
                          </Link>
                        </>
                      ) : (
                        <Link
                          href={`/assessments/${item._id}`}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-[#0c162c] hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition"
                        >
                          Resume Evaluation <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-full inline-flex">
                <FileCheck2 className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">No active assessments found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  You have no assessments matching this criteria. Initiate a new assessment for your assigned client organizations.
                </p>
              </div>
              <Link
                href="/assessments/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0c162c] text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition shadow-sm"
              >
                <Plus className="h-4 w-4" /> Start Assessment
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
