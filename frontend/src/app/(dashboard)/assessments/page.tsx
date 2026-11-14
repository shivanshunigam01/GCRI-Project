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
import { AssessmentSession, AssessmentType } from "@/types/assessment.types";
import { AssessmentShareModal } from "@/components/features/assessments/AssessmentShareModal";
import { AssessmentListSkeleton } from "@/components/shared/PageSkeletons";
import { ListPagination } from "@/components/shared/ListPagination";
import { useClientPagination } from "@/hooks/useClientPagination";
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
  Share2,
} from "lucide-react";

export default function AssessmentsPage() {
  const router = useRouter();
  const { user, isAdmin, isSuperAdmin, isOrgAdmin, isAssessor } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenantSessions, setTenantSessions] = useState<AssessmentSession[]>([]);
  const [shareTarget, setShareTarget] = useState<{ id: string; label: string } | null>(null);

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
      if (isSuperAdmin) {
        setAdminAssessments([]);
        setTenantSessions([]);
        setAuditorAssessments([]);
        return;
      }
      if (isOrgAdmin) {
        const res = await assessmentService.getAssessments({
          status: statusFilter === "All" ? undefined : statusFilter,
          assessmentType:
            typeFilter === "All" ? undefined : (typeFilter as AssessmentType),
          limit: 100,
        });
        const list = Array.isArray(res?.data) ? res.data : [];
        setTenantSessions(list);
        setAdminAssessments([]);
      } else if (isAdmin) {
        const res = await dashboardService.getAdminAssessments({
          status: statusFilter === "All" ? undefined : statusFilter,
          assessmentType: typeFilter === "All" ? undefined : typeFilter,
          search: searchQuery || undefined,
          limit: 100,
        });
        if (res?.data?.assessments) {
          setAdminAssessments(res.data.assessments);
        }
      } else {
        const res = await dashboardService.getAuditorAssessments({
          status: statusFilter === "All" ? undefined : statusFilter,
          assessmentType: typeFilter === "All" ? undefined : typeFilter,
          limit: 100,
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
  }, [isAdmin, isOrgAdmin, isSuperAdmin, statusFilter, typeFilter]);

  const filteredTenantSessions = tenantSessions.filter((s) => {
    if (!searchQuery) return true;
    const name =
      typeof s.companyId === "object" && s.companyId
        ? (s.companyId as { name?: string }).name?.toLowerCase() || ""
        : "";
    return name.includes(searchQuery.toLowerCase());
  });

  const tenantPagination = useClientPagination(filteredTenantSessions);

  // Client-side search filtering for auditor assessments
  const filteredAuditorAssessments = auditorAssessments.filter((item) => {
    if (!searchQuery) return true;
    const name = item.organization?.name?.toLowerCase() || "";
    const type = item.assessmentType.toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || type.includes(q);
  });

  const adminPagination = useClientPagination(adminAssessments);
  const auditorPagination = useClientPagination(filteredAuditorAssessments);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-700/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-title font-editorial">
              Assessments Workspace
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
              {isAdmin ? "Platform Audit Tracker" : "Auditor Workload"}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isAdmin
              ? "Operational metadata tracking across client assessments. Confidential answers are strictly restricted."
              : "Execute evaluations across 7 GRAICE Pillars, capture evidence, and generate audit reports."}
          </p>
        </div>

        {(isAssessor || isOrgAdmin) && !isSuperAdmin && (
          <div>
            <Link
              href="/assessments/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0c162c] hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white font-semibold text-sm rounded-lg shadow-sm transition"
            >
              <Plus className="h-4 w-4" />
              Start Assessment
            </Link>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900/90 p-4 rounded-xl border border-slate-200/90 dark:border-slate-700 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by client organization..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
            <Filter className="h-3.5 w-3.5 text-slate-400" /> Status:
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-2 font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-2 font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Types</option>
            <option value="Light">Light Assessment (30 Q)</option>
            <option value="Full">Full Framework</option>
          </select>

          <button
            onClick={fetchAssessments}
            className="p-2 border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition"
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
        <div className="p-8 bg-white dark:bg-slate-900 rounded-xl border border-red-200 dark:border-red-900 text-center space-y-3">
          <AlertCircle className="h-6 w-6 text-red-500 mx-auto" />
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{error}</p>
          <button
            onClick={fetchAssessments}
            className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
          >
            Retry
          </button>
        </div>
      ) : isSuperAdmin ? (
        <div className="p-10 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 text-center space-y-3">
          <Lock className="h-8 w-8 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-800">
            Super Admin does not access assessment content
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Manage <Link href="/admin/tenants" className="text-teal-700 font-semibold hover:underline">tenant workspaces</Link> and
            invite Tenant Admins. They run client assessments inside each workspace.
          </p>
        </div>
      ) : isOrgAdmin ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-700 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Tenant sessions ({tenantPagination.total})
            </span>
            <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Metadata only — share with auditors; no answer access
            </span>
          </div>
          {tenantPagination.total > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] font-semibold text-slate-400 uppercase bg-slate-50/80 border-b">
                    <tr>
                      <th className="py-3 px-5">Organization</th>
                      <th className="py-3 px-4">Lead auditor</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tenantPagination.pageItems.map((s) => {
                      const orgName =
                        typeof s.companyId === "object" && s.companyId
                          ? (s.companyId as { name?: string }).name
                          : "Client";
                      const lead =
                        typeof s.conductedByUserId === "object" && s.conductedByUserId
                          ? (s.conductedByUserId as { name?: string }).name
                          : "—";
                      return (
                        <tr key={s._id} className="hover:bg-slate-50/80">
                          <td className="py-3.5 px-5 font-semibold text-slate-900">{orgName}</td>
                          <td className="py-3.5 px-4 text-slate-600">{lead}</td>
                          <td className="py-3.5 px-4">{s.assessmentType}</td>
                          <td className="py-3.5 px-4">{s.status}</td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                setShareTarget({ id: s._id, label: `${orgName} · ${s.assessmentType}` })
                              }
                              className="inline-flex items-center gap-1 text-teal-700 font-semibold hover:underline"
                            >
                              <Share2 className="h-3.5 w-3.5" /> Share
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <ListPagination
                page={tenantPagination.page}
                totalPages={tenantPagination.totalPages}
                total={tenantPagination.total}
                from={tenantPagination.from}
                to={tenantPagination.to}
                onPrevious={tenantPagination.goPrev}
                onNext={tenantPagination.goNext}
                itemLabel="assessments"
              />
            </>
          ) : (
            <div className="p-12 text-center text-xs text-slate-500">No assessments in this workspace yet.</div>
          )}
        </div>
      ) : isAdmin ? (
        /* Admin Assessment Pipeline Table */
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-700 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              Platform Sessions ({adminPagination.total})
            </span>
            <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
              🔒 Confidential content restricted
            </span>
          </div>

          {adminPagination.total > 0 ? (
            <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[11px] font-semibold text-slate-400 uppercase bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-5">Organization</th>
                    <th className="py-3 px-4">Assigned Auditor</th>
                    <th className="py-3 px-4">Evaluation Type</th>
                    <th className="py-3 px-4">Framework</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {adminPagination.pageItems.map((a) => (
                    <tr key={a._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                      <td className="py-3.5 px-5 font-semibold text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                          <span>{a.organization?.name || "Client Organization"}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {a.auditor?.name || "Assigned Assessor"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                          {a.assessmentType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 font-mono">
                        v{a.frameworkVersion}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                            a.status === "Submitted"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                              : a.status === "InProgress"
                              ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800"
                              : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600"
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-right">
                        {new Date(a.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ListPagination
              page={adminPagination.page}
              totalPages={adminPagination.totalPages}
              total={adminPagination.total}
              from={adminPagination.from}
              to={adminPagination.to}
              onPrevious={adminPagination.goPrev}
              onNext={adminPagination.goNext}
              itemLabel="assessments"
            />
            </>
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
          {auditorPagination.total > 0 ? (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {auditorPagination.pageItems.map((item) => {
                const isSubmitted = item.status === "Submitted";
                const isArchived = item.status === "Archived";
                const pct = item.completionPercentage || 0;

                return (
                  <div
                    key={item._id}
                    className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-700 p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-500 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 group-hover:text-blue-600 dark:group-hover:text-cyan-300 transition-colors truncate">
                            {item.organization?.name || "Client Organization"}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {item.organization?.industry || "Enterprise"} • {item.organization?.activePlan || "Bronze"}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                            item.assessmentType === "Full"
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800"
                              : "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800"
                          }`}
                        >
                          {item.assessmentType}
                        </span>
                      </div>

                      {/* Progress Bar — % answered, not submit status */}
                      <div className="space-y-1.5 pt-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600 dark:text-slate-300 font-medium">
                            {isSubmitted ? "Controls answered" : "Evaluation progress"}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-slate-50">{pct}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
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
                        {isSubmitted && pct < 100 && (
                          <p className="text-[10px] text-slate-400 leading-snug">
                            Submitted with some controls left unanswered / not assessed.
                          </p>
                        )}
                      </div>

                      {/* Status — this is the real completion signal */}
                      <div className="flex items-center justify-between text-xs pt-1 text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          {isSubmitted ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : isArchived ? (
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                          ) : (
                            <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          )}
                          <span className="font-medium text-slate-700 dark:text-slate-200">
                            {isSubmitted
                              ? "Completed · Submitted (locked)"
                              : isArchived
                                ? "Archived"
                                : "In progress · not submitted yet"}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {new Date(item.updatedAt || item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 flex items-center justify-between">
                      {isSubmitted ? (
                        <>
                          <Link
                            href={`/assessments/${item._id}/results`}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 transition"
                          >
                            <Shield className="h-3.5 w-3.5" /> View Radar &amp; Reports
                          </Link>
                          <Link
                            href={`/assessments/${item._id}/findings`}
                            className="text-xs font-semibold text-blue-600 dark:text-cyan-400 hover:underline"
                          >
                            Findings →
                          </Link>
                        </>
                      ) : (
                        <div className="flex flex-col sm:flex-row gap-2 w-full">
                          <Link
                            href={`/assessments/${item._id}`}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-[#0c162c] hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-xs font-semibold rounded-lg shadow-2xs transition"
                          >
                            Resume <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                          <Link
                            href={`/assessments/${item._id}/review`}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold rounded-lg transition"
                          >
                            Review &amp; submit
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900">
              <ListPagination
                page={auditorPagination.page}
                totalPages={auditorPagination.totalPages}
                total={auditorPagination.total}
                from={auditorPagination.from}
                to={auditorPagination.to}
                onPrevious={auditorPagination.goPrev}
                onNext={auditorPagination.goNext}
                itemLabel="assessments"
                className="border-t-0"
              />
            </div>
            </>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300 rounded-full inline-flex">
                <FileCheck2 className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">No active assessments found</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  You have no assessments matching this criteria. Initiate a new assessment for your assigned client organizations.
                </p>
              </div>
              <Link
                href="/assessments/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0c162c] dark:bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 dark:hover:bg-teal-500 transition shadow-sm"
              >
                <Plus className="h-4 w-4" /> Start Assessment
              </Link>
            </div>
          )}
        </div>
      )}
      <AssessmentShareModal
        open={Boolean(shareTarget)}
        sessionId={shareTarget?.id ?? ""}
        sessionLabel={shareTarget?.label}
        onClose={() => setShareTarget(null)}
      />
    </div>
  );
}
