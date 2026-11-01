"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  dashboardService,
  buildAuditorAssessmentsQuery,
  AuditorPipelineFilter,
} from "@/services/dashboard.service";
import { companyService } from "@/services/company.service";
import { StatCard } from "@/components/shared/StatCard";
import { DashboardPageSkeleton } from "@/components/shared/PageSkeletons";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import {
  AuditorDashboardSummary,
  AdminDashboardSummary,
  AdminAssessmentItem,
  AuditorAssessmentsItem,
  AuditorOrganizationItem,
  AuditorPillarPerformance,
  AuditorActiveAssessment,
} from "@/types/dashboard.types";
import { useDashboardScope } from "@/context/DashboardScopeContext";
import {
  FileCheck2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  ArrowUpRight,
  TrendingUp,
  FileText,
  Calendar,
  Users,
  UserCheck,
  ShieldCheck,
  Layers,
  Award,
  SlidersHorizontal,
  HelpCircle,
  FolderLock,
  Crown,
  Lock,
  BookOpen,
  LayoutGrid,
  Settings,
  Shield,
  RefreshCw,
  PlusCircle,
  Search,
  ExternalLink,
  ChevronRight,
  Activity,
  BarChart3,
  Radar,
  Sparkles,
  Filter,
  CheckCircle,
  Compass,
  X,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                               MAIN COMPONENT                               */
/* -------------------------------------------------------------------------- */

export default function DashboardPage() {
  const { user, isSuperAdmin, isAdmin } = useAuth();
  const { setOrganizations, refreshTrigger } = useDashboardScope();
  const roleView: "Admin" | "Auditor" = isAdmin ? "Admin" : "Auditor";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auditor state
  const [auditorSummary, setAuditorSummary] = useState<AuditorDashboardSummary | null>(null);
  const [auditorAssessments, setAuditorAssessments] = useState<AuditorAssessmentsItem[]>([]);
  const [auditorOrgs, setAuditorOrgs] = useState<AuditorOrganizationItem[]>([]);

  // Admin state
  const [adminSummary, setAdminSummary] = useState<AdminDashboardSummary | null>(null);
  const [adminAssessments, setAdminAssessments] = useState<AdminAssessmentItem[]>([]);

  const fetchAuditorAssessments = useCallback(
    async (params?: Parameters<typeof dashboardService.getAuditorAssessments>[0]) => {
      const res = await dashboardService.getAuditorAssessments({ limit: 100, ...params });
      if (res?.data?.assessments) {
        setAuditorAssessments(res.data.assessments);
      } else {
        setAuditorAssessments([]);
      }
    },
    []
  );

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      if (roleView === "Admin") {
        const [sumRes, assessRes, compRes] = await Promise.all([
          dashboardService.getAdminSummary(),
          dashboardService.getAdminAssessments({ limit: 100 }),
          companyService.getCompanies({ limit: 200 }).catch(() => null),
        ]);
        if (sumRes?.data) {
          setAdminSummary(sumRes.data);
        }
        if (compRes?.data && Array.isArray(compRes.data)) {
          setOrganizations(
            compRes.data.map((c: any) => ({
              _id: c._id,
              name: c.name,
              domain: c.domain,
              industry: c.industry,
              status: c.status,
              activePlan: c.activePlan || c.subscription?.plan || "Bronze",
            }))
          );
        } else if (sumRes?.data?.recentOrganizations) {
          setOrganizations(sumRes.data.recentOrganizations);
        }
        if (assessRes?.data?.assessments) setAdminAssessments(assessRes.data.assessments);
      } else {
        const [sumRes, assessRes, orgsRes] = await Promise.all([
          dashboardService.getAuditorSummary(),
          dashboardService.getAuditorAssessments({ limit: 100 }),
          dashboardService.getAuditorOrganizations(),
        ]);
        if (sumRes?.data) setAuditorSummary(sumRes.data);
        if (assessRes?.data?.assessments) {
          setAuditorAssessments(assessRes.data.assessments);
        } else {
          setAuditorAssessments([]);
        }
        if (orgsRes?.data?.organizations) {
          setAuditorOrgs(orgsRes.data.organizations);
          setOrganizations(orgsRes.data.organizations);
        }
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message ||
          err?.message ||
          "Failed to load real-time dashboard data"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [roleView, refreshTrigger]);

  if (loading) {
    return <DashboardPageSkeleton roleView={roleView} />;
  }

  if (error) {
    return (
      <div className="p-8 bg-white rounded-xl border border-red-200 text-center space-y-4 shadow-xs">
        <div className="inline-flex p-3 rounded-full bg-red-50 text-red-600">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Failed to load dashboard</h2>
          <p className="text-sm text-slate-500 mt-1">{error}</p>
        </div>
        <button
          onClick={fetchDashboard}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition"
        >
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {roleView === "Auditor" ? (
        <AuditorDashboardContent
          summary={auditorSummary}
          assessments={auditorAssessments}
          organizations={auditorOrgs}
          userName={user?.name || "Auditor"}
          onRefresh={fetchDashboard}
          onFetchAssessments={fetchAuditorAssessments}
        />
      ) : (
        <AdminDashboardContent
          summary={adminSummary}
          assessments={adminAssessments}
          isSuperAdmin={isSuperAdmin}
          onRefresh={fetchDashboard}
        />
      )}
    </div>
  );
}


interface DonutSegmentInput {
  key: string;
  label: string;
  count: number;
  color: string;
}

interface CalculatedDonutSegment extends DonutSegmentInput {
  ratio: number;
  percentage: number;
  rawLength: number;
  dashLength: number;
  offset: number;
  circumference: number;
}

function calculateDonutSegments(
  segments: DonutSegmentInput[],
  total: number,
  radius: number = 38
): CalculatedDonutSegment[] {
  const circumference = 2 * Math.PI * radius; // ~238.761
  const activeSegments = segments.filter((s) => s.count > 0);
  const hasMultiple = activeSegments.length > 1;
  const gap = hasMultiple ? 2.5 : 0; // 2.5px micro-gap between segments if multiple

  let accumulatedOffset = 0;

  return activeSegments.map((seg) => {
    const ratio = total > 0 ? seg.count / total : 0;
    const rawLength = ratio * circumference;
    const dashLength = Math.max(1, rawLength - gap);
    // Center the gap symmetrically on the boundary
    const offset = accumulatedOffset - (hasMultiple ? gap / 2 : 0);
    accumulatedOffset -= rawLength;

    return {
      ...seg,
      ratio,
      percentage: Math.round(ratio * 100),
      rawLength,
      dashLength,
      offset,
      circumference,
    };
  });
}

/* -------------------------------------------------------------------------- */
/*                       SCREEN 1: AUDITOR DASHBOARD                          */
/* -------------------------------------------------------------------------- */

function AuditorDashboardContent({
  summary,
  assessments,
  organizations,
  userName,
  onRefresh,
  onFetchAssessments,
}: {
  summary: AuditorDashboardSummary | null;
  assessments: AuditorAssessmentsItem[];
  organizations: AuditorOrganizationItem[];
  userName: string;
  onRefresh: () => void;
  onFetchAssessments: (
    params?: Parameters<typeof dashboardService.getAuditorAssessments>[0]
  ) => Promise<void>;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [assessmentsLoading, setAssessmentsLoading] = useState(false);
  const skipAssessmentsRefetch = useRef(true);
  const { selectedOrgFilter, setSelectedOrgFilter } = useDashboardScope();
  const [pipelineFilter, setPipelineFilter] = useState<AuditorPipelineFilter>("All");
  const [pipelineSearch, setPipelineSearch] = useState("");
  const [hoveredPillarIndex, setHoveredPillarIndex] = useState<number | null>(null);
  const [lifecycleHover, setLifecycleHover] = useState<"Completed" | "InProgress" | "NotStarted" | null>(null);
  const [frameworkHover, setFrameworkHover] = useState<"Full" | "Light" | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setIsMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (skipAssessmentsRefetch.current) {
      skipAssessmentsRefetch.current = false;
      return;
    }
    let cancelled = false;
    (async () => {
      setAssessmentsLoading(true);
      try {
        await onFetchAssessments(
          buildAuditorAssessmentsQuery(pipelineFilter, selectedOrgFilter)
        );
      } finally {
        if (!cancelled) setAssessmentsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pipelineFilter, selectedOrgFilter, onFetchAssessments]);

  // Standard 7 GRAICE Pillars Definition
  const STANDARD_PILLARS = [
    { pillarId: "ethical-leadership", pillarNumber: 1, name: "Ethical Leadership" },
    { pillarId: "data-governance-integrity", pillarNumber: 2, name: "Data Governance & Integrity" },
    { pillarId: "purpose-driven-innovation", pillarNumber: 3, name: "Purpose-Driven Innovation" },
    { pillarId: "human-centric-use", pillarNumber: 4, name: "Human-Centric Use" },
    { pillarId: "responsible-implementation", pillarNumber: 5, name: "Responsible Implementation" },
    { pillarId: "ai-literacy-workforce-readiness", pillarNumber: 6, name: "AI Literacy & Workforce Readiness" },
    { pillarId: "transparency-auditability", pillarNumber: 7, name: "Transparency & Auditability" },
  ];

  // Filter assessments based on selected client organization scope
  const scopedAssessments = useMemo(() => {
    if (selectedOrgFilter === "all") return assessments;
    return assessments.filter((a) => {
      const orgId =
        (a.organization as any)?._id?.toString() ||
        (a.organization as any)?.toString() ||
        (a as any).companyId?._id?.toString() ||
        (a as any).companyId?.toString();
      return orgId === selectedOrgFilter;
    });
  }, [assessments, selectedOrgFilter]);

  const mapSummaryPillarPerformance = (backendPillars: AuditorPillarPerformance[]) => {
    const results = STANDARD_PILLARS.map((std) => {
      const match = backendPillars.find(
        (p) =>
          p.pillarNumber === std.pillarNumber ||
          p.canonicalPillarId === std.pillarId ||
          p.pillarId === std.pillarId ||
          p.pillarId === `P${std.pillarNumber}`
      );
      const pct = match?.completionPercentage ?? 0;
      return {
        pillarId: std.pillarId,
        pillarNumber: std.pillarNumber,
        name: std.name,
        completionPercentage: pct,
        scoreEarned: Math.round((pct / 100) * 16),
        scoreMax: 16,
      };
    });
    const avgSum = results.reduce((acc, p) => acc + p.completionPercentage, 0);
    const overallAvg =
      results.length > 0 ? Math.round((avgSum / results.length) * 10) / 10 : 0;
    let tierName = "Tier 1: Initial";
    if (overallAvg >= 75) tierName = "Tier 4: Advanced";
    else if (overallAvg >= 50) tierName = "Tier 3: Established";
    else if (overallAvg >= 25) tierName = "Tier 2: Emerging";
    return {
      pillars: results,
      overallAvgScore: overallAvg,
      maturityTier: tierName,
      evaluatedSessionsCount: summary?.stats?.totalAssessments ?? 0,
    };
  };

  // Derive Pillar Scores: summary API first (portfolio view), then scoreSnapshots
  const derivedPillarData = useMemo(() => {
    if (
      selectedOrgFilter === "all" &&
      summary?.pillarPerformance &&
      summary.pillarPerformance.length > 0
    ) {
      return mapSummaryPillarPerformance(summary.pillarPerformance);
    }

    const scopedPool = scopedAssessments.filter(
      (a) => a.scoreSnapshot?.pillarScores && a.scoreSnapshot.pillarScores.length > 0
    );
    const scoredScoped = scopedPool.filter((s) =>
      s.scoreSnapshot?.pillarScores?.some((p) => (p.percentage ?? 0) > 0 || (p.scoreEarned ?? 0) > 0)
    );
    const allScored = assessments.filter((s) =>
      s.scoreSnapshot?.pillarScores?.some((p) => (p.percentage ?? 0) > 0 || (p.scoreEarned ?? 0) > 0)
    );

    const sessionsToUse =
      scoredScoped.length > 0
        ? scoredScoped
        : scopedPool.length > 0
        ? scopedPool
        : allScored.length > 0
        ? allScored
        : assessments.filter((a) => a.scoreSnapshot?.pillarScores?.length);

    if (sessionsToUse.length > 0) {
      const results = STANDARD_PILLARS.map((std) => {
        let totalPct = 0;
        let totalEarned = 0;
        let totalMax = 0;
        let matches = 0;

        sessionsToUse.forEach((s) => {
          const match = s.scoreSnapshot?.pillarScores.find((ps) => {
            const normPsId = (ps.pillarId || "").toLowerCase().replace(/[^a-z]/g, "");
            const normPsName = (ps.pillarName || "").toLowerCase().replace(/[^a-z]/g, "");
            const normStdId = std.pillarId.toLowerCase().replace(/[^a-z]/g, "");
            const normStdName = std.name.toLowerCase().replace(/[^a-z]/g, "");
            return (
              normPsId === normStdId ||
              normPsName === normStdName ||
              (ps.pillarNumber && ps.pillarNumber === std.pillarNumber)
            );
          });
          if (match) {
            totalPct += match.percentage ?? 0;
            totalEarned += match.scoreEarned ?? 0;
            totalMax += match.scoreMax ?? 0;
            matches++;
          }
        });

        const avgPct = matches > 0 ? Math.round((totalPct / matches) * 10) / 10 : 0;
        const avgEarned = matches > 0 ? Math.round(totalEarned / matches) : 0;
        const avgMax = matches > 0 ? Math.round(totalMax / matches) : 16;

        return {
          pillarId: std.pillarId,
          pillarNumber: std.pillarNumber,
          name: std.name,
          completionPercentage: avgPct,
          scoreEarned: avgEarned,
          scoreMax: avgMax,
        };
      });

      const avgSum = results.reduce((acc, p) => acc + p.completionPercentage, 0);
      const overallAvg = results.length > 0 ? Math.round((avgSum / results.length) * 10) / 10 : 0;

      let tierName = "Tier 1: Initial";
      if (overallAvg >= 75) tierName = "Tier 4: Advanced";
      else if (overallAvg >= 50) tierName = "Tier 3: Established";
      else if (overallAvg >= 25) tierName = "Tier 2: Emerging";

      return {
        pillars: results,
        overallAvgScore: overallAvg,
        maturityTier: tierName,
        evaluatedSessionsCount: sessionsToUse.length,
      };
    }

    if (summary?.pillarPerformance?.length) {
      return mapSummaryPillarPerformance(summary.pillarPerformance);
    }

    // Default 0 placeholder
    return {
      pillars: STANDARD_PILLARS.map((std) => ({
        ...std,
        completionPercentage: 0,
        scoreEarned: 0,
        scoreMax: 16,
      })),
      overallAvgScore: 0,
      maturityTier: "Tier 1: Initial",
      evaluatedSessionsCount: 0,
    };
  }, [scopedAssessments, summary, selectedOrgFilter, assessments]);

  const scopedOrg = useMemo(
    () => organizations.find((o) => o._id === selectedOrgFilter),
    [organizations, selectedOrgFilter]
  );
  const isPortfolioView = selectedOrgFilter === "all";

  const inProgressAssessments = scopedAssessments.filter((a) => a.status === "InProgress");
  const completedAssessments = scopedAssessments.filter((a) => a.status === "Submitted");

  const totalAssessments = isPortfolioView
    ? (summary?.stats?.totalAssessments ?? scopedAssessments.length)
    : (scopedOrg?.assessmentsSummary?.total ?? scopedAssessments.length);

  const inProgressCount = isPortfolioView
    ? (summary?.stats?.inProgressAssessments ?? inProgressAssessments.length)
    : (scopedOrg?.assessmentsSummary?.inProgress ?? inProgressAssessments.length);

  const completedCount = isPortfolioView
    ? (summary?.stats?.completedAssessments ?? completedAssessments.length)
    : (scopedOrg?.assessmentsSummary?.completed ?? completedAssessments.length);

  const notStartedCount = isPortfolioView
    ? Math.max(0, totalAssessments - completedCount - inProgressCount)
    : (scopedOrg?.assessmentsSummary?.notStarted ??
      Math.max(0, totalAssessments - completedCount - inProgressCount));

  const completedRatio = totalAssessments > 0 ? completedCount / totalAssessments : 0;
  const inProgressRatio = totalAssessments > 0 ? inProgressCount / totalAssessments : 0;
  const overallCompletion =
    isPortfolioView && summary?.overallCompletionPercentage != null
      ? summary.overallCompletionPercentage
      : totalAssessments > 0
      ? Math.round((completedCount / totalAssessments) * 100)
      : 0;

  const lightCount = isPortfolioView
    ? (summary?.assessmentTypes?.lightCount ??
      scopedAssessments.filter((a) => a.assessmentType === "Light").length)
    : scopedAssessments.filter((a) => a.assessmentType === "Light").length;

  const fullCount = isPortfolioView
    ? (summary?.assessmentTypes?.fullCount ??
      scopedAssessments.filter((a) => a.assessmentType === "Full").length)
    : scopedAssessments.filter((a) => a.assessmentType === "Full").length;

  const lightPct =
    isPortfolioView && summary?.assessmentTypes
      ? summary.assessmentTypes.lightPercentage
      : totalAssessments > 0
      ? Math.round((lightCount / totalAssessments) * 100)
      : 0;

  const fullPct =
    isPortfolioView && summary?.assessmentTypes
      ? summary.assessmentTypes.fullPercentage
      : totalAssessments > 0
      ? Math.round((fullCount / totalAssessments) * 100)
      : 0;

  const resumeActive = useMemo((): {
    kind: "summary";
    data: AuditorActiveAssessment;
  } | {
    kind: "assessment";
    data: AuditorAssessmentsItem;
  } | null => {
    if (isPortfolioView && summary?.activeAssessments?.length) {
      return { kind: "summary", data: summary.activeAssessments[0] };
    }
    if (inProgressAssessments.length > 0) {
      return { kind: "assessment", data: inProgressAssessments[0] };
    }
    return null;
  }, [isPortfolioView, summary?.activeAssessments, inProgressAssessments]);

  // Memoized segmented donut calculations for Assessment Lifecycle
  const lifecycleSegments = useMemo(() => {
    const rawSegments: DonutSegmentInput[] = [
      { key: "Completed", label: "Completed", count: completedCount, color: "#10b981" },
      { key: "InProgress", label: "In Progress", count: inProgressCount, color: "#3b82f6" },
      { key: "NotStarted", label: "Not Started", count: notStartedCount, color: "#94a3b8" },
    ];
    return calculateDonutSegments(rawSegments, totalAssessments);
  }, [completedCount, inProgressCount, notStartedCount, totalAssessments]);

  // Memoized segmented donut calculations for Framework Mix
  const frameworkSegments = useMemo(() => {
    const rawSegments: DonutSegmentInput[] = [
      { key: "Full", label: "Full Assessment", count: fullCount, color: "#1e40af" },
      { key: "Light", label: "Light Assessment", count: lightCount, color: "#0284c7" },
    ];
    return calculateDonutSegments(rawSegments, totalAssessments);
  }, [fullCount, lightCount, totalAssessments]);

  // Maturity classification breakdown across scoped assessments
  const maturityDistribution = useMemo(() => {
    const counts = { Initial: 0, Emerging: 0, Established: 0, Advanced: 0 };
    completedAssessments.forEach((a) => {
      const lvl = a.scoreSnapshot?.maturityLevel;
      if (lvl && lvl in counts) {
        counts[lvl as keyof typeof counts]++;
      } else {
        counts.Initial++;
      }
    });
    return counts;
  }, [completedAssessments]);

  // Findings list and count
  const findingsCount = summary?.stats?.totalFindings ?? 0;
  const latestFindings = summary?.latestFindings ?? [];

  // Pipeline table: status/type/org from GET /dashboard/auditor/assessments; search is client-only
  const filteredPipeline = useMemo(() => {
    return scopedAssessments.filter((a) => {
      if (pipelineSearch.trim()) {
        const query = pipelineSearch.toLowerCase();
        const orgName = ((a.organization as any)?.name || "").toLowerCase();
        const type = (a.assessmentType || "").toLowerCase();
        const status = (a.status || "").toLowerCase();
        if (!orgName.includes(query) && !type.includes(query) && !status.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [scopedAssessments, pipelineSearch]);

  return (
    <div className="space-y-6">
      {/* -------------------------------------------------------------------- */}
      {/* GREETING HEADER                                                      */}
      {/* -------------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-editorial">
              Good Morning, {userName} 👋
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Telemetry
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time GRAICE AI assurance, 7-pillar telemetry, and audit lifecycle management.
          </p>
        </div>

        <div className="text-left md:text-right hidden sm:block">
          <div className="text-xs text-slate-500 font-medium">
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </div>
          <div className="text-xs text-slate-600 italic font-serif mt-0.5">
            &ldquo;Responsible AI today, a more trustworthy tomorrow.&rdquo;
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 4 TOP INTERACTIVE METRIC CARDS (4 ONLY, SEPARATE METRICS)            */}
      {/* -------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Assessments Pipeline"
          value={totalAssessments}
          trend={`${completedCount} Completed • ${inProgressCount} Active`}
          trendType="up"
          icon={FileCheck2}
          theme="blue"
          delay={0}
          onClick={() => setPipelineFilter("All")}
        />
        <StatCard
          label="My Organizations"
          value={organizations.length || summary?.stats?.assignedOrganizations || 0}
          trend="Assigned Client Tenants"
          trendType="neutral"
          icon={Building2}
          theme="purple"
          delay={70}
        />
        <StatCard
          label="Governance Assurance"
          value={derivedPillarData.overallAvgScore}
          suffix="%"
          trend={derivedPillarData.maturityTier}
          trendType="up"
          icon={Award}
          theme="emerald"
          delay={140}
        />
        <StatCard
          label="Compliance Findings"
          value={findingsCount}
          trend={findingsCount > 0 ? `${findingsCount} Action Required` : "Audit Compliant"}
          trendType={findingsCount > 0 ? "warning" : "up"}
          icon={AlertTriangle}
          theme={findingsCount > 0 ? "rose" : "teal"}
          delay={210}
        />
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* ROW 2: 7 GRAICE PILLARS RADAR + PILLAR BREAKDOWN (SAME ROW, 2 CARDS) */}
      {/* -------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* CARD 1: 7 GRAICE Pillars Assurance (Interactive Radar Spider Graph) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-300 group flex flex-col justify-between relative overflow-hidden">
          {/* Ambient Corner Glow */}
          <div className="pointer-events-none absolute -top-16 -right-16 w-44 h-44 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all duration-500" />

          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 relative z-10">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">7 GRAICE Pillars Assurance</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                  derivedPillarData.overallAvgScore >= 75
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : derivedPillarData.overallAvgScore >= 50
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : derivedPillarData.overallAvgScore >= 25
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-blue-50 text-blue-700 border-blue-200"
                }`}>
                  {derivedPillarData.maturityTier}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Evaluated average: <strong className="text-slate-800">{derivedPillarData.overallAvgScore}%</strong> across 7 core governance pillars.
              </p>
            </div>
            <div className="p-1.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shrink-0 group-hover:bg-blue-100 transition-colors">
              <Radar className="h-4 w-4" />
            </div>
          </div>

          {/* Radar Chart Display Area */}
          <div className="py-1 flex-1 flex flex-col items-center justify-center relative z-10">
            <SevenPillarRadarChart
              pillars={derivedPillarData.pillars}
              isMounted={isMounted}
              hoveredIndex={hoveredPillarIndex}
              onHoverIndex={setHoveredPillarIndex}
              size={215}
            />
            {/* Active Hover Detail Tooltip Pill */}
            <div className="mt-1.5 min-h-[26px] w-full text-center">
              {hoveredPillarIndex !== null && derivedPillarData.pillars[hoveredPillarIndex] ? (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-white text-[11px] font-medium shadow-md animate-in fade-in zoom-in-95">
                  <span className="font-bold text-sky-400">
                    P{derivedPillarData.pillars[hoveredPillarIndex].pillarNumber}: {derivedPillarData.pillars[hoveredPillarIndex].name}
                  </span>
                  <span>•</span>
                  <span className="font-extrabold text-emerald-400">
                    {derivedPillarData.pillars[hoveredPillarIndex].completionPercentage}%
                  </span>
                  <span className="text-[10px] text-slate-300">
                    ({derivedPillarData.pillars[hoveredPillarIndex].scoreEarned} / {derivedPillarData.pillars[hoveredPillarIndex].scoreMax} pts)
                  </span>
                </div>
              ) : (
                <span className="text-[10.5px] text-slate-400 italic">
                  Hover over any pillar vertex or bar to inspect score and weight.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* CARD 2: Governance Pillars Breakdown (Progress Bars) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-300 group flex flex-col justify-between relative overflow-hidden">
          {/* Ambient Corner Glow */}
          <div className="pointer-events-none absolute -top-16 -right-16 w-44 h-44 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all duration-500" />

          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 relative z-10">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Governance Pillar Breakdown</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Assurance score and weighted points by pillar</p>
            </div>
            <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2.5 py-0.5 rounded-full">
              7 Pillars
            </span>
          </div>

          <div className="py-1 flex-1 flex flex-col justify-between space-y-1.5 relative z-10">
            {derivedPillarData.pillars.map((p, idx) => {
              const isHovered = hoveredPillarIndex === idx;
              return (
                <div
                  key={p.pillarId}
                  onMouseEnter={() => setHoveredPillarIndex(idx)}
                  onMouseLeave={() => setHoveredPillarIndex(null)}
                  className={`group/pillar cursor-pointer px-2.5 py-1.5 rounded-xl border transition-all duration-200 ${
                    isHovered
                      ? "bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-sky-50/80 border-blue-200 shadow-xs -translate-y-0.5 ring-1 ring-blue-400/30"
                      : "bg-slate-50/70 hover:bg-slate-50/90 border-slate-100"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-4.5 w-4.5 rounded-md font-bold text-[9.5px] flex items-center justify-center shrink-0 transition-colors ${
                          isHovered ? "bg-blue-600 text-white shadow-2xs" : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        P{p.pillarNumber}
                      </span>
                      <span
                        className={`font-semibold text-xs transition-colors ${
                          isHovered ? "text-blue-950 font-bold" : "text-slate-800"
                        }`}
                      >
                        {p.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 tabular-nums">
                        {p.scoreEarned}/{p.scoreMax} pts
                      </span>
                      <span
                        className={`font-bold text-[11px] tabular-nums px-1.5 py-0.5 rounded-md border shadow-2xs transition-all ${
                          isHovered
                            ? "bg-white text-blue-700 border-blue-200 scale-105"
                            : "bg-white text-slate-900 border-slate-200/80"
                        }`}
                      >
                        <AnimatedNumber value={p.completionPercentage} suffix="%" delay={idx * 30} />
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200/70 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400 rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: isMounted ? `${p.completionPercentage}%` : "0%",
                        transitionDelay: `${idx * 40}ms`,
                        filter: isHovered ? "drop-shadow(0 0 6px rgba(59, 130, 246, 0.7))" : "none",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* ROW 3: ASSESSMENT LIFECYCLE & FRAMEWORK MIX (SHIFTED JUST BELOW)     */}
      {/* -------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* CARD 1: Assessment Lifecycle (Span 6) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:shadow-sm transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Assessment Lifecycle</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Audit completion ratio</p>
            </div>
            <span className="text-xs text-slate-600 font-semibold bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/70">
              {totalAssessments} Total
            </span>
          </div>

          <div className="py-3 flex flex-col sm:flex-row items-center justify-around flex-1 gap-4">
            {/* SVG Donut with Mathematically Perfect Chained Arcs */}
            <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90 origin-center" viewBox="0 0 100 100">
                {/* Full 360-degree Background Base Track */}
                <circle cx="50" cy="50" r="38" fill="none" stroke="#f1f5f9" strokeWidth="8.5" />

                {/* Chained Segments */}
                {lifecycleSegments.map((seg) => {
                  const isHovered = lifecycleHover === seg.key;
                  const isOtherHovered = lifecycleHover !== null && !isHovered;

                  return (
                    <circle
                      key={seg.key}
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke={seg.color}
                      strokeWidth={isHovered ? 10.5 : 8.5}
                      strokeDasharray={`${isMounted ? seg.dashLength : 0} ${seg.circumference}`}
                      strokeDashoffset={seg.offset}
                      strokeLinecap="butt"
                      className="cursor-pointer"
                      style={{
                        transition:
                          "stroke-dasharray 0.9s cubic-bezier(0.16, 1, 0.3, 1), stroke-width 0.2s ease, opacity 0.25s ease",
                        opacity: isOtherHovered ? 0.3 : 1,
                      }}
                      onMouseEnter={() => setLifecycleHover(seg.key as any)}
                      onMouseLeave={() => setLifecycleHover(null)}
                      onClick={() => {
                        if (seg.key === "Completed") setPipelineFilter("Submitted");
                        if (seg.key === "InProgress") setPipelineFilter("InProgress");
                      }}
                    />
                  );
                })}
              </svg>

              {/* Center Metrics (Crisp, High-Contrast Typography) */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none">
                {lifecycleHover === "Completed" ? (
                  <div className="animate-in fade-in zoom-in-95 flex flex-col items-center">
                    <span className="text-2xl font-black text-emerald-600 leading-none">{completedCount}</span>
                    <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mt-1">
                      {Math.round(completedRatio * 100)}% Done
                    </span>
                  </div>
                ) : lifecycleHover === "InProgress" ? (
                  <div className="animate-in fade-in zoom-in-95 flex flex-col items-center">
                    <span className="text-2xl font-black text-blue-600 leading-none">{inProgressCount}</span>
                    <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider mt-1">
                      {Math.round(inProgressRatio * 100)}% Active
                    </span>
                  </div>
                ) : lifecycleHover === "NotStarted" ? (
                  <div className="animate-in fade-in zoom-in-95 flex flex-col items-center">
                    <span className="text-2xl font-black text-slate-600 leading-none">{notStartedCount}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Pending</span>
                  </div>
                ) : (
                  <>
                    <span className="text-2xl font-black text-slate-900 leading-none">
                      <AnimatedNumber value={overallCompletion} suffix="%" delay={150} />
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-1">Completion</span>
                  </>
                )}
              </div>
            </div>

            {/* Modern Legend Tiles */}
            <div className="space-y-1.5 text-xs w-full sm:max-w-[210px]">
              <div
                onClick={() => setPipelineFilter("Submitted")}
                onMouseEnter={() => setLifecycleHover("Completed")}
                onMouseLeave={() => setLifecycleHover(null)}
                className={`flex items-center justify-between p-2 rounded-xl border transition-all duration-200 cursor-pointer ${
                  lifecycleHover === "Completed"
                    ? "bg-emerald-50/70 border-emerald-200 shadow-2xs"
                    : "bg-slate-50/60 border-slate-100 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-slate-700 font-medium text-xs">Completed</span>
                </div>
                <span className="font-bold text-slate-900 text-xs tabular-nums bg-white px-2 py-0.5 rounded-md border border-slate-200/80 shadow-2xs">
                  <AnimatedNumber value={completedCount} delay={200} />
                </span>
              </div>

              <div
                onClick={() => setPipelineFilter("InProgress")}
                onMouseEnter={() => setLifecycleHover("InProgress")}
                onMouseLeave={() => setLifecycleHover(null)}
                className={`flex items-center justify-between p-2 rounded-xl border transition-all duration-200 cursor-pointer ${
                  lifecycleHover === "InProgress"
                    ? "bg-blue-50/70 border-blue-200 shadow-2xs"
                    : "bg-slate-50/60 border-slate-100 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                  <span className="text-slate-700 font-medium text-xs">In Progress</span>
                </div>
                <span className="font-bold text-slate-900 text-xs tabular-nums bg-white px-2 py-0.5 rounded-md border border-slate-200/80 shadow-2xs">
                  <AnimatedNumber value={inProgressCount} delay={250} />
                </span>
              </div>

              <div
                onMouseEnter={() => setLifecycleHover("NotStarted")}
                onMouseLeave={() => setLifecycleHover(null)}
                className={`flex items-center justify-between p-2 rounded-xl border transition-all duration-200 cursor-default ${
                  lifecycleHover === "NotStarted"
                    ? "bg-slate-100/80 border-slate-300 shadow-2xs"
                    : "bg-slate-50/60 border-slate-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-slate-300 shrink-0" />
                  <span className="text-slate-600 font-medium text-xs">Not Started</span>
                </div>
                <span className="font-bold text-slate-900 text-xs tabular-nums bg-white px-2 py-0.5 rounded-md border border-slate-200/80 shadow-2xs">
                  <AnimatedNumber value={notStartedCount} delay={300} />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: Assessment Framework Split (Span 6) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:shadow-sm transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Framework Mix</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Light vs Full standard distribution</p>
            </div>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-500">
              <Compass className="h-4 w-4" />
            </div>
          </div>

          <div className="py-3 flex flex-col sm:flex-row items-center justify-around flex-1 gap-4">
            {/* SVG Ring Gauge with Mathematically Perfect Chained Arcs */}
            <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90 origin-center" viewBox="0 0 100 100">
                {/* Full 360-degree Background Base Track */}
                <circle cx="50" cy="50" r="38" fill="none" stroke="#f1f5f9" strokeWidth="8.5" />

                {/* Chained Segments */}
                {frameworkSegments.map((seg) => {
                  const isHovered = frameworkHover === seg.key;
                  const isOtherHovered = frameworkHover !== null && !isHovered;

                  return (
                    <circle
                      key={seg.key}
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke={seg.color}
                      strokeWidth={isHovered ? 10.5 : 8.5}
                      strokeDasharray={`${isMounted ? seg.dashLength : 0} ${seg.circumference}`}
                      strokeDashoffset={seg.offset}
                      strokeLinecap="butt"
                      className="cursor-pointer"
                      style={{
                        transition:
                          "stroke-dasharray 0.9s cubic-bezier(0.16, 1, 0.3, 1), stroke-width 0.2s ease, opacity 0.25s ease",
                        opacity: isOtherHovered ? 0.3 : 1,
                      }}
                      onMouseEnter={() => setFrameworkHover(seg.key as any)}
                      onMouseLeave={() => setFrameworkHover(null)}
                      onClick={() => {
                        if (seg.key === "Full") setPipelineFilter("Full");
                        if (seg.key === "Light") setPipelineFilter("Light");
                      }}
                    />
                  );
                })}
              </svg>

              {/* Center Metrics (Crisp Typography) */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none">
                {frameworkHover === "Full" ? (
                  <div className="animate-in fade-in zoom-in-95 flex flex-col items-center">
                    <span className="text-2xl font-black text-blue-700 leading-none">{fullCount}</span>
                    <span className="text-[9px] text-blue-700 font-bold uppercase tracking-wider mt-1">
                      Full ({fullPct}%)
                    </span>
                  </div>
                ) : frameworkHover === "Light" ? (
                  <div className="animate-in fade-in zoom-in-95 flex flex-col items-center">
                    <span className="text-2xl font-black text-cyan-600 leading-none">{lightCount}</span>
                    <span className="text-[9px] text-cyan-600 font-bold uppercase tracking-wider mt-1">
                      Light ({lightPct}%)
                    </span>
                  </div>
                ) : (
                  <>
                    <span className="text-2xl font-black text-slate-900 leading-none">
                      <AnimatedNumber value={totalAssessments} delay={250} />
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider mt-1">Audits</span>
                  </>
                )}
              </div>
            </div>

            {/* Consistent Legend Tiles */}
            <div className="space-y-1.5 text-xs w-full sm:max-w-[210px]">
              <div
                onClick={() => setPipelineFilter("Full")}
                onMouseEnter={() => setFrameworkHover("Full")}
                onMouseLeave={() => setFrameworkHover(null)}
                className={`flex items-center justify-between p-2 rounded-xl border transition-all duration-200 cursor-pointer ${
                  frameworkHover === "Full"
                    ? "bg-indigo-50/70 border-indigo-200 shadow-2xs"
                    : "bg-slate-50/60 border-slate-100 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#1e40af] shrink-0" />
                  <div>
                    <span className="text-slate-700 font-medium text-xs block">Full Assessment</span>
                    <span className="text-[10px] text-slate-400">65 Controls</span>
                  </div>
                </div>
                <span className="font-bold text-slate-900 text-xs tabular-nums bg-white px-2 py-0.5 rounded-md border border-slate-200/80 shadow-2xs">
                  {fullCount} ({fullPct}%)
                </span>
              </div>

              <div
                onClick={() => setPipelineFilter("Light")}
                onMouseEnter={() => setFrameworkHover("Light")}
                onMouseLeave={() => setFrameworkHover(null)}
                className={`flex items-center justify-between p-2 rounded-xl border transition-all duration-200 cursor-pointer ${
                  frameworkHover === "Light"
                    ? "bg-sky-50/70 border-sky-200 shadow-2xs"
                    : "bg-slate-50/60 border-slate-100 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#0284c7] shrink-0" />
                  <div>
                    <span className="text-slate-700 font-medium text-xs block">Light Assessment</span>
                    <span className="text-[10px] text-slate-400">15 Controls</span>
                  </div>
                </div>
                <span className="font-bold text-slate-900 text-xs tabular-nums bg-white px-2 py-0.5 rounded-md border border-slate-200/80 shadow-2xs">
                  {lightCount} ({lightPct}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* ROW 3: MATURITY TIER GAUGE + FINDINGS EXCEPTION BREAKDOWN            */}
      {/* -------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* CARD 1: Governance Maturity Classification (Span 6) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Governance Maturity Classification</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                GRAICE 4-tier assurance rating based on audited client scores
              </p>
            </div>
            <Award className="h-4 w-4 text-amber-500" />
          </div>

          <div className="py-4 space-y-4 flex-1 flex flex-col justify-center">
            {/* 4-Tier Segmented Stepper */}
            <div className="grid grid-cols-4 gap-2">
              <div
                className={`p-3 rounded-xl border text-center transition ${
                  derivedPillarData.overallAvgScore < 25
                    ? "bg-amber-50/70 border-amber-300 ring-2 ring-amber-100"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tier 1</div>
                <div className="text-xs font-bold text-slate-900 mt-0.5">Initial</div>
                <div className="text-[10px] text-slate-400 mt-0.5">0 - 25%</div>
                <div className="mt-2 text-xs font-bold text-slate-700 bg-white/80 py-0.5 rounded">
                  {maturityDistribution.Initial} Audits
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border text-center transition ${
                  derivedPillarData.overallAvgScore >= 25 && derivedPillarData.overallAvgScore < 50
                    ? "bg-blue-50/70 border-blue-300 ring-2 ring-blue-100"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Tier 2</div>
                <div className="text-xs font-bold text-slate-900 mt-0.5">Emerging</div>
                <div className="text-[10px] text-slate-400 mt-0.5">26 - 50%</div>
                <div className="mt-2 text-xs font-bold text-blue-800 bg-white/80 py-0.5 rounded">
                  {maturityDistribution.Emerging} Audits
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border text-center transition ${
                  derivedPillarData.overallAvgScore >= 50 && derivedPillarData.overallAvgScore < 75
                    ? "bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-100"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tier 3</div>
                <div className="text-xs font-bold text-slate-900 mt-0.5">Established</div>
                <div className="text-[10px] text-slate-400 mt-0.5">51 - 75%</div>
                <div className="mt-2 text-xs font-bold text-slate-700 bg-white/80 py-0.5 rounded">
                  {maturityDistribution.Established} Audits
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border text-center transition ${
                  derivedPillarData.overallAvgScore >= 75
                    ? "bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-100"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tier 4</div>
                <div className="text-xs font-bold text-slate-900 mt-0.5">Advanced</div>
                <div className="text-[10px] text-slate-400 mt-0.5">76 - 100%</div>
                <div className="mt-2 text-xs font-bold text-slate-700 bg-white/80 py-0.5 rounded">
                  {maturityDistribution.Advanced} Audits
                </div>
              </div>
            </div>

            {/* Overall Score Meter Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Assurance Maturity Target</span>
                <span className="font-bold text-slate-900">
                  {derivedPillarData.overallAvgScore}% / 100%
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 via-blue-500 to-emerald-500 rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: isMounted ? `${Math.min(100, Math.max(8, derivedPillarData.overallAvgScore))}%` : "0%",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: Risk Findings & Assurance Exceptions (Span 6) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Risk Findings &amp; Exceptions</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Flagged exceptions requiring remediation across audits
              </p>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                findingsCount > 0
                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}
            >
              {findingsCount > 0 ? `${findingsCount} Exceptions` : "100% Compliant"}
            </span>
          </div>

          <div className="py-2 flex-1 flex flex-col justify-center">
            {latestFindings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] font-semibold text-slate-400 uppercase border-b border-slate-100">
                    <tr>
                      <th className="py-2">Finding</th>
                      <th className="py-2">Organization</th>
                      <th className="py-2 text-center">Severity</th>
                      <th className="py-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {latestFindings.map((fnd, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="py-2 font-mono text-[11px] text-slate-700 font-medium truncate max-w-[110px]">
                          {fnd.findingId || fnd.controlId}
                        </td>
                        <td className="py-2 text-slate-600 font-medium truncate max-w-[120px]">
                          {fnd.organizationName}
                        </td>
                        <td className="py-2 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              fnd.severity === "High"
                                ? "bg-rose-50 text-rose-700"
                                : fnd.severity === "Medium"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {fnd.severity}
                          </span>
                        </td>
                        <td className="py-2 text-right">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {fnd.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-2">
                <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Zero Critical Exceptions Flagged</h4>
                  <p className="text-[11px] text-slate-500 max-w-sm mt-0.5">
                    All completed evaluations meet the baseline GRAICE compliance requirements without outstanding high-severity exceptions.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* ROW 4: RESUME ACTIVE ASSESSMENT HERO + ASSIGNED ORGANIZATIONS        */}
      {/* -------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* CARD 1: Resume Active Evaluation Hero (Span 5) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-850 to-[#0c162c] text-white rounded-2xl p-6 shadow-md flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-44 h-44 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

          {resumeActive ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Active Session
                </span>
                <span className="text-xs font-semibold text-slate-300">
                  {resumeActive.data.completionPercentage}% Answered
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">
                  {resumeActive.kind === "summary"
                    ? resumeActive.data.organizationName
                    : (resumeActive.data.organization as any)?.name || "Assigned Organization"}
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {resumeActive.data.assessmentType} Assessment currently in progress. Resume evaluation at{" "}
                  <strong className="text-sky-300">
                    {resumeActive.kind === "summary"
                      ? resumeActive.data.resumptionAid.currentPillarName ||
                        resumeActive.data.resumptionAid.currentPillarId
                      : resumeActive.data.resumptionAid?.currentPillarName ||
                        resumeActive.data.resumptionAid?.currentPillarId ||
                        "P1: Ethical Leadership"}
                  </strong>
                  .
                </p>
              </div>

              <div className="space-y-1">
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-sky-400 rounded-full"
                    style={{ width: `${resumeActive.data.completionPercentage}%` }}
                  />
                </div>
              </div>

              <div className="pt-1">
                <Link
                  href={`/assessments/${resumeActive.data._id}`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition"
                >
                  <span>Resume Assessment</span>
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  All Caught Up
                </span>
                <Sparkles className="h-4 w-4 text-emerald-400" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">Start New Evaluation</h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  No active assessment sessions in progress. Select any assigned client organization to launch a Light or Full GRAICE assessment.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href="/assessments/new"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-semibold shadow-md transition"
                >
                  <span>Launch Assessment</span>
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* CARD 2: Assigned Client Organizations Directory (Span 7) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Assigned Organizations Directory</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Client organizations under your assurance portfolio
              </p>
            </div>
            <Link
              href="/organizations"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View Directory</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto flex-1">
            {organizations.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] font-semibold text-slate-400 uppercase border-b border-slate-100">
                  <tr>
                    <th className="py-2.5">Organization</th>
                    <th className="py-2.5">Industry</th>
                    <th className="py-2.5">Plan</th>
                    <th className="py-2.5 text-center">Audits</th>
                    <th className="py-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {organizations.map((org) => (
                    <tr
                      key={org._id}
                      onClick={() => setSelectedOrgFilter(org._id)}
                      className={`hover:bg-slate-50 transition cursor-pointer ${
                        selectedOrgFilter === org._id ? "bg-blue-50/50" : ""
                      }`}
                    >
                      <td className="py-2.5 flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-lg bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                          {org.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 truncate max-w-[130px]">{org.name}</div>
                          <div className="text-[10px] text-slate-400">{org.domain || "Internal Org"}</div>
                        </div>
                      </td>
                      <td className="py-2.5 text-slate-500 truncate max-w-[100px]">{org.industry || "General"}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          {org.activePlan || "Bronze"}
                        </span>
                      </td>
                      <td className="py-2.5 text-center font-bold text-slate-800">
                        {org.assessmentsSummary?.total ?? 0}
                      </td>
                      <td className="py-2.5 text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            org.status === "Active"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {org.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No organizations assigned to your auditor account yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* ROW 5: INTERACTIVE ASSESSMENT PIPELINE EXPLORER & FILTERABLE TABLE    */}
      {/* -------------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Assessment Pipeline Explorer</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Filterable ledger of live evaluations, compliance scores, and reports
            </p>
          </div>

          {/* Search bar & filter pills */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search audits..."
                value={pipelineSearch}
                onChange={(e) => setPipelineSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-44"
              />
            </div>

            {/* Filter pills */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              {(["All", "InProgress", "Submitted", "Light", "Full"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setPipelineFilter(tab)}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    pipelineFilter === tab
                      ? "bg-white text-slate-900 shadow-2xs font-semibold"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {tab === "InProgress" ? "In Progress" : tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div
          className={`overflow-x-auto transition-opacity ${assessmentsLoading ? "opacity-60 pointer-events-none" : ""}`}
        >
          {assessmentsLoading && filteredPipeline.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading assessments…
            </div>
          ) : filteredPipeline.length > 0 ? (
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] font-semibold text-slate-400 uppercase border-b border-slate-100">
                <tr>
                  <th className="py-2.5">Organization</th>
                  <th className="py-2.5">Framework</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5 text-center">Score &amp; Maturity</th>
                  <th className="py-2.5">Last Updated</th>
                  <th className="py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPipeline.map((a) => (
                  <tr key={a._id} className="hover:bg-slate-50 transition">
                    <td className="py-3">
                      <div className="font-semibold text-slate-900">
                        {(a.organization as any)?.name || "Assigned Company"}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {(a.organization as any)?.domain || (a.organization as any)?.industry || "Enterprise"}
                      </div>
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          a.assessmentType === "Full"
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                            : "bg-sky-50 text-sky-700 border border-sky-200"
                        }`}
                      >
                        {a.assessmentType} Assessment
                      </span>
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          a.status === "Submitted"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            a.status === "Submitted" ? "bg-emerald-500" : "bg-blue-500 animate-pulse"
                          }`}
                        />
                        {a.status === "Submitted" ? "Submitted" : "In Progress"}
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      {a.scoreSnapshot ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[11px] font-bold">
                          <span>{a.scoreSnapshot.overallPercentage}%</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-[10px] font-semibold text-blue-700">
                            {a.scoreSnapshot.maturityLevel}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">
                          {a.completionPercentage}% Done
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-slate-500">
                      {new Date(a.submittedAt || a.updatedAt || a.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/assessments/${a._id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-semibold transition"
                      >
                        <span>{a.status === "Submitted" ? "View Results" : "Resume"}</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400 space-y-2">
              <p>No assessment records match the selected filter.</p>
              <button
                onClick={() => {
                  setPipelineFilter("All");
                  setPipelineSearch("");
                  setSelectedOrgFilter("all");
                }}
                className="text-blue-600 font-semibold hover:underline"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*             SEVEN PILLAR SPIDER / RADAR CHART SVG COMPONENT                */
/* -------------------------------------------------------------------------- */

interface PillarChartItem {
  pillarId: string;
  pillarNumber: number;
  name: string;
  completionPercentage: number;
  scoreEarned: number;
  scoreMax: number;
}

function SevenPillarRadarChart({
  pillars,
  isMounted,
  hoveredIndex,
  onHoverIndex,
  size = 230,
}: {
  pillars: PillarChartItem[];
  isMounted: boolean;
  hoveredIndex: number | null;
  onHoverIndex: (idx: number | null) => void;
  size?: number;
}) {
  const centerX = size / 2;
  const centerY = size / 2 - 2;
  const maxRadius = Math.round(size * 0.33);
  const numPillars = 7;

  // Concentric heptagon levels (20%, 40%, 60%, 80%, 100%)
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

  // Calculate heptagon vertices for any given radius
  const getPolygonPoints = (radius: number) => {
    return Array.from({ length: numPillars })
      .map((_, i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / numPillars;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
  };

  // Calculate actual data polygon points based on completion percentages
  const dataPoints = pillars.map((p, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / numPillars;
    const normalizedVal = isMounted ? Math.min(100, Math.max(8, p.completionPercentage)) / 100 : 0.08;
    const r = maxRadius * normalizedVal;
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle),
      angle,
      rawPercentage: p.completionPercentage,
    };
  });

  const dataPolygonString = dataPoints.map((pt) => `${pt.x.toFixed(2)},${pt.y.toFixed(2)}`).join(" ");

  return (
    <div className="relative flex items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible select-none"
      >
        <defs>
          <radialGradient id="radarRadialGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
            <stop offset="70%" stopColor="#2563eb" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.15" />
          </radialGradient>
        </defs>

        {/* Concentric Heptagonal Reference Grid */}
        {gridLevels.map((lvl, idx) => (
          <polygon
            key={idx}
            points={getPolygonPoints(maxRadius * lvl)}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={idx === gridLevels.length - 1 ? 1.5 : 1}
            strokeDasharray={idx < gridLevels.length - 1 ? "3 3" : undefined}
          />
        ))}

        {/* 7 Radial Axis Spokes */}
        {Array.from({ length: numPillars }).map((_, i) => {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / numPillars;
          const endX = centerX + maxRadius * Math.cos(angle);
          const endY = centerY + maxRadius * Math.sin(angle);
          return (
            <line
              key={i}
              x1={centerX}
              y1={centerY}
              x2={endX}
              y2={endY}
              stroke="#cbd5e1"
              strokeWidth={1}
            />
          );
        })}

        {/* Shaded Data Polygon with Smooth Animation */}
        <polygon
          points={dataPolygonString}
          fill="url(#radarRadialGradient)"
          stroke="#2563eb"
          strokeWidth={2.5}
          strokeLinejoin="round"
          className="transition-all duration-1000 ease-out"
        />

        {/* Axis Labels (P1 to P7) */}
        {pillars.map((p, i) => {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / numPillars;
          const labelRadius = maxRadius + 14;
          const labelX = centerX + labelRadius * Math.cos(angle);
          const labelY = centerY + labelRadius * Math.sin(angle) + 3;
          const isHovered = hoveredIndex === i;

          return (
            <text
              key={i}
              x={labelX}
              y={labelY}
              textAnchor="middle"
              className={`text-[10px] font-bold cursor-pointer transition-all duration-200 ${
                isHovered ? "fill-blue-600 font-extrabold scale-110" : "fill-slate-600"
              }`}
              onMouseEnter={() => onHoverIndex(i)}
              onMouseLeave={() => onHoverIndex(null)}
            >
              P{p.pillarNumber}
            </text>
          );
        })}

        {/* Interactive Vertex Dots */}
        {dataPoints.map((pt, i) => {
          const isHovered = hoveredIndex === i;
          return (
            <g key={i}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isHovered ? 8 : 4.5}
                fill={isHovered ? "#2563eb" : "#ffffff"}
                stroke="#2563eb"
                strokeWidth={isHovered ? 3 : 2}
                className="cursor-pointer transition-all duration-300"
                onMouseEnter={() => onHoverIndex(i)}
                onMouseLeave={() => onHoverIndex(null)}
              />
              {/* Invisible larger hit target */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={16}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => onHoverIndex(i)}
                onMouseLeave={() => onHoverIndex(null)}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                         SCREEN 7: ADMIN PANEL                              */
/* -------------------------------------------------------------------------- */

function AdminDashboardContent({
  summary,
  assessments,
  isSuperAdmin = false,
  onRefresh,
}: {
  summary: AdminDashboardSummary | null;
  assessments: AdminAssessmentItem[];
  isSuperAdmin?: boolean;
  onRefresh: () => void;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const { selectedOrgFilter, setSelectedOrgFilter, organizations } = useDashboardScope();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [adminStatusHover, setAdminStatusHover] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setIsMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const isScoped = selectedOrgFilter !== "all";
  const scopedOrg = useMemo(() => {
    if (!isScoped) return null;
    return organizations.find((o) => o._id === selectedOrgFilter) || null;
  }, [isScoped, organizations, selectedOrgFilter]);

  // Scoped assessments based on header scope filter
  const scopedAssessments = useMemo(() => {
    if (!isScoped) return assessments;
    return assessments.filter((a) => {
      const orgId =
        (a.organization as any)?._id?.toString() ||
        (a.organization as any)?.toString() ||
        (a as any).companyId?._id?.toString() ||
        (a as any).companyId?.toString();
      return orgId === selectedOrgFilter;
    });
  }, [assessments, isScoped, selectedOrgFilter]);

  // Assessments by status (scoped or global)
  const byStatus = useMemo(() => {
    if (!isScoped) {
      return (
        summary?.assessmentsByStatus ?? {
          total: assessments.length,
          completed: assessments.filter((a) => a.status === "Submitted").length,
          inProgress: assessments.filter((a) => a.status === "InProgress").length,
          notStarted: assessments.filter((a) => (a.status as string) === "NotStarted" || (a.status as string) === "Draft").length,
          overdue: 0,
        }
      );
    }
    const completed = scopedAssessments.filter((a) => a.status === "Submitted").length;
    const inProgress = scopedAssessments.filter((a) => a.status === "InProgress").length;
    const notStarted = scopedAssessments.filter((a) => (a.status as string) === "NotStarted" || (a.status as string) === "Draft").length;
    return {
      total: scopedAssessments.length,
      completed,
      inProgress,
      notStarted,
      overdue: 0,
    };
  }, [isScoped, scopedAssessments, summary?.assessmentsByStatus, assessments]);

  const subDist = summary?.subscriptionDistribution ?? { total: 0, bronze: 0, silver: 0, gold: 0 };
  const recentOrgs = summary?.recentOrganizations ?? [];
  const recentActivity = summary?.recentActivity ?? [];

  // Segmented Donut: Assessments by Status
  const adminStatusSegments = useMemo(() => {
    const rawSegments: DonutSegmentInput[] = [
      { key: "Completed", label: "Completed", count: byStatus.completed, color: "#10b981" },
      { key: "InProgress", label: "In Progress", count: byStatus.inProgress, color: "#3b82f6" },
      { key: "NotStarted", label: "Not Started", count: byStatus.notStarted, color: "#94a3b8" },
    ];
    return calculateDonutSegments(rawSegments, byStatus.total);
  }, [byStatus.completed, byStatus.inProgress, byStatus.notStarted, byStatus.total]);

  // Filtered assessments list (scoped + local status/search filter)
  const filteredAssessments = scopedAssessments.filter((a) => {
    if (statusFilter !== "All" && a.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const orgName = ((a.organization as any)?.name || "").toLowerCase();
      const auditorName = ((a.auditor as any)?.name || "").toLowerCase();
      if (!orgName.includes(q) && !auditorName.includes(q)) return false;
    }
    return true;
  });

  const completedPct = byStatus.total > 0 ? Math.round((byStatus.completed / byStatus.total) * 100) : 0;
  const inProgressPct = byStatus.total > 0 ? Math.round((byStatus.inProgress / byStatus.total) * 100) : 0;
  const notStartedPct = byStatus.total > 0 ? Math.round((byStatus.notStarted / byStatus.total) * 100) : 0;

  const bronzePct = subDist.total > 0 ? Math.round((subDist.bronze / subDist.total) * 100) : 0;
  const silverPct = subDist.total > 0 ? Math.round((subDist.silver / subDist.total) * 100) : 0;
  const goldPct = subDist.total > 0 ? Math.round((subDist.gold / subDist.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* -------------------------------------------------------------------- */}
      {/* HEADER: EXECUTIVE OPERATIONS & GOVERNANCE                            */}
      {/* -------------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-editorial">
              {isSuperAdmin ? "Platform Operations & Governance" : "Organization Governance & Compliance"}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Telemetry
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isSuperAdmin
              ? "Global multi-tenant governance, auditor accreditation, compliance frameworks, and security audit logs."
              : "Tenant oversight, team assessors, active assessment workloads, and audit activity."}
          </p>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* FILTERED SCOPE BANNER (VISIBLE WHEN HEADER SCOPE IS SELECTED)        */}
      {/* -------------------------------------------------------------------- */}
      {isScoped && scopedOrg && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 via-indigo-50/50 to-blue-50 border border-blue-200/90 rounded-2xl shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-sm shadow-xs">
              {scopedOrg.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-blue-900">Filtered Tenant Scope:</span>
                <span className="text-sm font-bold text-slate-900">{scopedOrg.name}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  {scopedOrg.activePlan || "Bronze"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {scopedOrg.domain || scopedOrg.industry || "Enterprise Tenant"} • {scopedAssessments.length} Audits in Scope • Metrics &amp; tables dynamically filtered
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedOrgFilter("all")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl transition shadow-2xs self-start sm:self-auto cursor-pointer"
          >
            <X className="h-3.5 w-3.5 text-slate-400" />
            Reset Global Scope
          </button>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* ROW 1 & 2: 8 DISTINCT EXECUTIVE OPERATIONAL STAT CARDS (MAX 4/ROW)   */}
      {/* -------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Users */}
        <StatCard
          label={isScoped ? "Tenant Registered Users" : "Total Platform Users"}
          value={isScoped ? (scopedAssessments[0]?.clientContact ? 1 : 1) : (summary?.stats?.totalUsers ?? 0)}
          trend={isScoped ? `${scopedOrg?.name} Assured` : `${summary?.stats?.totalAuditors ?? 0} Accredited Auditors`}
          trendType="neutral"
          icon={Users}
          theme="blue"
          delay={0}
        />

        {/* Card 2: Auditors */}
        <StatCard
          label={isScoped ? "Assigned Assessor" : "Accredited Auditors"}
          value={isScoped ? (scopedAssessments.find((a) => a.auditor)?.auditor?.name ? 1 : 0) : (summary?.stats?.totalAuditors ?? 0)}
          trend={isScoped ? (scopedAssessments.find((a) => a.auditor)?.auditor?.name || "Assessor Active") : "Certified Assessors Active"}
          trendType="neutral"
          icon={UserCheck}
          theme="emerald"
          delay={25}
        />

        {/* Card 3: Client Organizations */}
        <StatCard
          label={isScoped ? "Scoped Enterprise Tenant" : "Client Organizations"}
          value={isScoped ? 1 : (summary?.stats?.totalOrganizations ?? 0)}
          trend={isScoped ? `${scopedOrg?.domain || "Isolated Tenant"}` : "Active Multi-Tenant Directory"}
          trendType="neutral"
          icon={Building2}
          theme="purple"
          delay={50}
        />

        {/* Card 4: Evaluation Criteria (Distinct from Subscriptions, eliminates redundancy) */}
        <StatCard
          label="Evaluation Criteria"
          value={summary?.stats?.questionsCount ?? 95}
          trend="Standardized Control Questions"
          trendType="neutral"
          icon={BookOpen}
          theme="amber"
          delay={75}
        />

        {/* Card 5: Assessments Pipeline */}
        <StatCard
          label="Assessments Pipeline"
          value={byStatus.total}
          trend={`${byStatus.completed} Submitted (${completedPct}%)`}
          trendType="up"
          icon={FileCheck2}
          theme="teal"
          delay={100}
          onClick={() => setStatusFilter("All")}
        />

        {/* Card 6: Compliance Framework */}
        <StatCard
          label="Compliance Framework"
          value={summary?.stats?.frameworkVersions ?? 1}
          prefix="v"
          trend={`${summary?.stats?.controlsCount ?? 65} Controls • 7 Pillars`}
          trendType="neutral"
          icon={Layers}
          theme="sky"
          delay={125}
        />

        {/* Card 7: Evidence Vault */}
        <StatCard
          label="Audit Evidence Vault"
          value={isScoped ? (scopedAssessments.length > 0 ? 1 : 0) : (summary?.stats?.evidenceItemsCount ?? 0)}
          trend="Cryptographic Proofs Locked"
          trendType="neutral"
          icon={FolderLock}
          theme="rose"
          delay={150}
        />

        {/* Card 8: Reports & Security Logs */}
        <StatCard
          label="Reports & Security Logs"
          value={isScoped ? scopedAssessments.filter((a) => a.status === "Submitted").length : (summary?.stats?.reportsCount ?? 0)}
          trend={`${recentActivity.length} Recent Security Events`}
          trendType="neutral"
          icon={ShieldCheck}
          theme="slate"
          delay={175}
        />
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* ROW 2: 2 DISTINCT ANALYTICS CARDS (1 DONUT + 1 SAAS MATRIX)          */}
      {/* -------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* CARD 1: Assessments by Status (Donut Chart) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:shadow-sm transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {isScoped ? `${scopedOrg?.name} Assessments` : "Platform Assessments by Status"}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isScoped ? "Filtered lifecycle breakdown for this tenant" : "Global audit pipeline distribution"}
              </p>
            </div>
            <span className="text-xs text-slate-600 font-semibold bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/70">
              {byStatus.total} Total
            </span>
          </div>

          <div className="py-3 flex flex-col sm:flex-row items-center justify-around flex-1 gap-4">
            {/* SVG Donut with Mathematically Perfect Chained Arcs */}
            <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90 origin-center" viewBox="0 0 100 100">
                {/* Full 360-degree Background Base Track */}
                <circle cx="50" cy="50" r="38" fill="none" stroke="#f1f5f9" strokeWidth="8.5" />

                {/* Chained Segments */}
                {adminStatusSegments.map((seg) => {
                  const isHovered = adminStatusHover === seg.key;
                  const isOtherHovered = adminStatusHover !== null && !isHovered;

                  return (
                    <circle
                      key={seg.key}
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke={seg.color}
                      strokeWidth={isHovered ? 10.5 : 8.5}
                      strokeDasharray={`${isMounted ? seg.dashLength : 0} ${seg.circumference}`}
                      strokeDashoffset={seg.offset}
                      strokeLinecap="butt"
                      className="cursor-pointer"
                      style={{
                        transition:
                          "stroke-dasharray 0.9s cubic-bezier(0.16, 1, 0.3, 1), stroke-width 0.2s ease, opacity 0.25s ease",
                        opacity: isOtherHovered ? 0.3 : 1,
                      }}
                      onMouseEnter={() => setAdminStatusHover(seg.key)}
                      onMouseLeave={() => setAdminStatusHover(null)}
                      onClick={() => {
                        if (seg.key === "Completed") setStatusFilter("Submitted");
                        if (seg.key === "InProgress") setStatusFilter("InProgress");
                      }}
                    />
                  );
                })}
              </svg>

              {/* Center Typography */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none">
                {adminStatusHover === "Completed" ? (
                  <div className="animate-in fade-in zoom-in-95 flex flex-col items-center">
                    <span className="text-2xl font-black text-emerald-600 leading-none">{byStatus.completed}</span>
                    <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mt-1">
                      {completedPct}% Done
                    </span>
                  </div>
                ) : adminStatusHover === "InProgress" ? (
                  <div className="animate-in fade-in zoom-in-95 flex flex-col items-center">
                    <span className="text-2xl font-black text-blue-600 leading-none">{byStatus.inProgress}</span>
                    <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider mt-1">
                      {inProgressPct}% Active
                    </span>
                  </div>
                ) : adminStatusHover === "NotStarted" ? (
                  <div className="animate-in fade-in zoom-in-95 flex flex-col items-center">
                    <span className="text-2xl font-black text-slate-600 leading-none">{byStatus.notStarted}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Pending</span>
                  </div>
                ) : (
                  <>
                    <span className="text-2xl font-black text-slate-900 leading-none">
                      <AnimatedNumber value={byStatus.total} delay={150} />
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-1">Audits</span>
                  </>
                )}
              </div>
            </div>

            {/* Modern Legend Tiles */}
            <div className="space-y-1.5 text-xs w-full sm:max-w-[210px]">
              <div
                onClick={() => setStatusFilter("Submitted")}
                onMouseEnter={() => setAdminStatusHover("Completed")}
                onMouseLeave={() => setAdminStatusHover(null)}
                className={`flex items-center justify-between p-2 rounded-xl border transition-all duration-200 cursor-pointer ${
                  adminStatusHover === "Completed"
                    ? "bg-emerald-50/70 border-emerald-200 shadow-2xs"
                    : "bg-slate-50/60 border-slate-100 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-slate-700 font-medium text-xs">Completed</span>
                </div>
                <span className="font-bold text-slate-900 text-xs tabular-nums bg-white px-2 py-0.5 rounded-md border border-slate-200/80 shadow-2xs">
                  {byStatus.completed} ({completedPct}%)
                </span>
              </div>

              <div
                onClick={() => setStatusFilter("InProgress")}
                onMouseEnter={() => setAdminStatusHover("InProgress")}
                onMouseLeave={() => setAdminStatusHover(null)}
                className={`flex items-center justify-between p-2 rounded-xl border transition-all duration-200 cursor-pointer ${
                  adminStatusHover === "InProgress"
                    ? "bg-blue-50/70 border-blue-200 shadow-2xs"
                    : "bg-slate-50/60 border-slate-100 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                  <span className="text-slate-700 font-medium text-xs">In Progress</span>
                </div>
                <span className="font-bold text-slate-900 text-xs tabular-nums bg-white px-2 py-0.5 rounded-md border border-slate-200/80 shadow-2xs">
                  {byStatus.inProgress} ({inProgressPct}%)
                </span>
              </div>

              <div
                onMouseEnter={() => setAdminStatusHover("NotStarted")}
                onMouseLeave={() => setAdminStatusHover(null)}
                className={`flex items-center justify-between p-2 rounded-xl border transition-all duration-200 cursor-default ${
                  adminStatusHover === "NotStarted"
                    ? "bg-slate-100/80 border-slate-300 shadow-2xs"
                    : "bg-slate-50/60 border-slate-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-slate-300 shrink-0" />
                  <span className="text-slate-600 font-medium text-xs">Not Started</span>
                </div>
                <span className="font-bold text-slate-900 text-xs tabular-nums bg-white px-2 py-0.5 rounded-md border border-slate-200/80 shadow-2xs">
                  {byStatus.notStarted} ({notStartedPct}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: SaaS Licensing & Tenant Architecture Matrix (Completely distinct layout, NOT a duplicate donut) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:shadow-sm transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">SaaS Licensing &amp; Plan Matrix</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Tier distribution, tenant features &amp; SLA allocation</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/80 text-xs font-bold shadow-2xs">
              <Crown className="h-3.5 w-3.5 text-amber-600" />
              <span>{subDist.total} Active Plans</span>
            </div>
          </div>

          <div className="py-2.5 space-y-3.5 flex-1">
            {/* Visual Proportional Horizontal Track */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-slate-600">Plan Allocation Progress</span>
                <span className="font-bold text-slate-900">{bronzePct}% Bronze • {silverPct}% Silver • {goldPct}% Gold</span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex p-0.5 shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-amber-600 to-amber-700 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.max(bronzePct, 5)}%` }}
                  title={`Bronze: ${subDist.bronze} (${bronzePct}%)`}
                />
                {silverPct > 0 && (
                  <div
                    className="h-full bg-slate-500 rounded-full transition-all duration-1000"
                    style={{ width: `${silverPct}%` }}
                    title={`Silver: ${subDist.silver} (${silverPct}%)`}
                  />
                )}
                {goldPct > 0 && (
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-1000"
                    style={{ width: `${goldPct}%` }}
                    title={`Gold: ${subDist.gold} (${goldPct}%)`}
                  />
                )}
              </div>
            </div>

            {/* 3 Tier Specification Cards */}
            <div className="grid grid-cols-1 gap-2 text-xs">
              {/* Bronze Tier Card */}
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-amber-200/90 bg-amber-50/40 hover:bg-amber-50/80 transition shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-7 w-7 rounded-lg bg-[#b45309] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                    B
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">Bronze Starter</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                        Primary SaaS
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">Core AI Governance • Baseline Controls • Standard Reports</p>
                  </div>
                </div>
                <div className="text-right shrink-0 pl-2">
                  <div className="font-black text-slate-900 text-xs tabular-nums">{subDist.bronze} Tenants</div>
                  <div className="text-[10px] text-emerald-600 font-semibold">{bronzePct}% active</div>
                </div>
              </div>

              {/* Silver Tier Card */}
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-100/60 transition shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-7 w-7 rounded-lg bg-slate-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                    S
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">Silver Scale</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        Mid-Market
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">Multi-Assessor Team • Evidence Ingestion • API Access</p>
                  </div>
                </div>
                <div className="text-right shrink-0 pl-2">
                  <div className="font-black text-slate-900 text-xs tabular-nums">{subDist.silver} Tenants</div>
                  <div className="text-[10px] text-slate-400 font-semibold">{silverPct}% active</div>
                </div>
              </div>

              {/* Gold Tier Card */}
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-amber-300/80 bg-amber-50/30 hover:bg-amber-50/70 transition shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-7 w-7 rounded-lg bg-[#f59e0b] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                    G
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">Gold Enterprise</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                        Enterprise SLA
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">Continuous Telemetry • Custom Frameworks • 99.9% SLA</p>
                  </div>
                </div>
                <div className="text-right shrink-0 pl-2">
                  <div className="font-black text-slate-900 text-xs tabular-nums">{subDist.gold} Tenants</div>
                  <div className="text-[10px] text-slate-400 font-semibold">{goldPct}% active</div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Navigation */}
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-400">Multi-tenant isolation &amp; RBAC enforced</span>
            <Link
              href="/subscriptions"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition inline-flex items-center gap-1"
            >
              Manage Subscriptions &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* ROW 3: RECENT ORGANIZATIONS & RECENT SECURITY AUDIT EVENTS           */}
      {/* -------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Card 1: Recent Organizations */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Client Organizations</h3>
              <p className="text-[11px] text-slate-500">Live directory of onboarded tenant companies</p>
            </div>
            <Link href="/organizations" className="text-xs font-semibold text-blue-600 hover:underline">
              View All Directory →
            </Link>
          </div>

          <div className="overflow-x-auto">
            {recentOrgs.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead className="text-[11px] font-semibold text-slate-400 uppercase border-b border-slate-100">
                  <tr>
                    <th className="py-2.5">Organization</th>
                    <th className="py-2.5">Active Plan</th>
                    <th className="py-2.5 text-center">Audits</th>
                    <th className="py-2.5 text-center">Users</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5 text-right">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentOrgs.map((o) => {
                    const isSelected = isScoped && o._id === selectedOrgFilter;
                    return (
                      <tr
                        key={o._id}
                        className={`transition-colors ${
                          isSelected ? "bg-blue-50/70" : "hover:bg-slate-50/80"
                        }`}
                      >
                        <td className="py-2.5 font-semibold text-slate-800">
                          <div className="flex items-center gap-2">
                            <span>{o.name}</span>
                            {isSelected && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                Selected Scope
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              o.activePlan === "Gold"
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : o.activePlan === "Silver"
                                ? "bg-slate-100 text-slate-700 border-slate-200"
                                : "bg-amber-50/70 text-amber-900 border-amber-200/80"
                            }`}
                          >
                            {o.activePlan || "Bronze"}
                          </span>
                        </td>
                        <td className="py-2.5 text-center font-medium text-slate-700 tabular-nums">
                          {o.assessmentCount}
                        </td>
                        <td className="py-2.5 text-center font-medium text-slate-700 tabular-nums">
                          {o.userCount}
                        </td>
                        <td className="py-2.5">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {o.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-500 text-right">
                          {new Date(o.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No client organizations registered on the platform yet.
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Recent Activity Feed */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Security Audit Trail</h3>
              <p className="text-[11px] text-slate-500">Immutable platform security events</p>
            </div>
            <Link href="/admin/audit-logs" className="text-xs font-semibold text-blue-600 hover:underline">
              Audit Logs →
            </Link>
          </div>

          <div className="py-1 divide-y divide-slate-100 space-y-2 flex-1">
            {recentActivity.length > 0 ? (
              recentActivity.map((act) => (
                <div key={act.id} className="pt-2.5 first:pt-0 flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-xl shrink-0 bg-blue-50 text-blue-600 border border-blue-100">
                      <ShieldCheck className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{act.title}</div>
                      <div className="text-slate-500 text-[11px] truncate max-w-[190px]">{act.description}</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">
                    {new Date(act.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No recent security events recorded in the audit trail.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* ROW 4: PLATFORM ASSESSMENT PIPELINE (FULL OPERATIONAL TRACKING)      */}
      {/* -------------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                {isScoped ? `${scopedOrg?.name} Assessment Pipeline` : "Platform Assessment Pipeline"}
              </h3>
              {filteredAssessments.length > 10 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  Top 10 of {filteredAssessments.length}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isScoped
                ? `Operational assessments filtered for ${scopedOrg?.name}`
                : "Operational lifecycle tracking across all organizations, assigned accredited auditors, and status."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Status Filter Tabs */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold text-slate-600">
              {(["All", "Submitted", "InProgress"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md transition ${
                    statusFilter === st ? "bg-white text-slate-900 shadow-2xs" : "hover:text-slate-900"
                  }`}
                >
                  {st === "Submitted" ? "Completed" : st}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search pipeline..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-44"
              />
            </div>
            <Link href="/assessments" className="text-xs font-semibold text-blue-600 hover:underline">
              View All ({filteredAssessments.length}) →
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredAssessments.length > 0 ? (
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] font-semibold text-slate-400 uppercase border-b border-slate-100">
                <tr>
                  <th className="py-2.5">Organization</th>
                  <th className="py-2.5">Assigned Auditor</th>
                  <th className="py-2.5">Type</th>
                  <th className="py-2.5">Framework</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5 text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAssessments.slice(0, 10).map((a) => (
                  <tr key={a._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 font-semibold text-slate-800">
                      {a.organization?.name || "Client Org"}
                    </td>
                    <td className="py-2.5 text-slate-600">
                      {a.auditor?.name || "Assigned Assessor"}
                    </td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {a.assessmentType}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-500">v{a.frameworkVersion}</td>
                    <td className="py-2.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          a.status === "Submitted"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : a.status === "InProgress"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            a.status === "Submitted"
                              ? "bg-emerald-500"
                              : a.status === "InProgress"
                              ? "bg-blue-500 animate-pulse"
                              : "bg-slate-400"
                          }`}
                        />
                        {a.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-500 text-right">
                      {new Date(a.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              {isScoped
                ? `No assessment evaluations found matching '${scopedOrg?.name || "current scope"}'.`
                : "No assessment evaluations match your current filter."}
            </div>
          )}
        </div>

        {filteredAssessments.length > 10 && (
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Showing top 10 most recent assessments</span>
            <Link
              href="/assessments"
              className="font-semibold text-blue-600 hover:text-blue-800 transition inline-flex items-center gap-1"
            >
              View all {filteredAssessments.length} assessments &rarr;
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
