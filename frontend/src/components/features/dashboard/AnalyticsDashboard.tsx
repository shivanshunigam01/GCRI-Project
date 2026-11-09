"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  FileCheck2,
  Minus,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AnalyticsRange, DashboardAnalytics } from "@/types/analytics.types";

const RANGES: AnalyticsRange[] = ["30d", "90d", "6m", "1y"];
const STATUS_COLORS = ["#10b981", "#3b82f6", "#94a3b8"];
const RISK_COLORS = ["#e11d48", "#f97316", "#eab308", "#22c55e"];
const PLAN_COLORS = ["#b45309", "#64748b", "#ca8a04"];
const PILLAR_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#14b8a6", "#f43f5e"];

function formatShortDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatMonth(ym: string) {
  const [y, m] = ym.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString(undefined, { month: "short" });
}

function DeltaBadge({ delta, invert }: { delta: number; invert?: boolean }) {
  const positive = invert ? delta < 0 : delta > 0;
  const negative = invert ? delta > 0 : delta < 0;
  const Icon = delta === 0 ? Minus : positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums",
        positive && "text-emerald-600",
        negative && "text-rose-600",
        delta === 0 && "text-slate-500"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {delta > 0 ? "+" : ""}
      {delta}%
    </span>
  );
}

function ChartCard({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5 flex flex-col min-h-[280px]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          {subtitle ? <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  color,
  meta,
}: {
  label: string;
  value: number;
  color: string;
  meta?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-slate-700 truncate">{label}</span>
        <span className="tabular-nums font-semibold text-slate-900 shrink-0">
          {value}%{meta ? <span className="text-slate-400 font-medium"> · {meta}</span> : null}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

export interface AnalyticsDashboardProps {
  data: DashboardAnalytics | null;
  loading?: boolean;
  error?: string | null;
  range: AnalyticsRange;
  onRangeChange: (range: AnalyticsRange) => void;
  onRefresh?: () => void;
  title?: string;
  subtitle?: string;
  isAuditor?: boolean;
}

export function AnalyticsDashboard({
  data,
  loading,
  error,
  range,
  onRangeChange,
  onRefresh,
  title = "Platform Operations & Governance",
  subtitle = "Analytics · trends · outliers · operational telemetry",
  isAuditor = false,
}: AnalyticsDashboardProps) {
  const statusPie = useMemo(() => {
    if (!data) return [];
    const s = data.assessmentsByStatus;
    return [
      { name: "Completed", value: s.completed },
      { name: "In Progress", value: s.inProgress },
      { name: "Not Started", value: s.notStarted },
    ].filter((x) => x.value > 0);
  }, [data]);

  const riskPie = useMemo(() => {
    if (!data) return [];
    const r = data.riskSeverity;
    return [
      { name: "Critical", value: r.critical },
      { name: "High", value: r.high },
      { name: "Medium", value: r.medium },
      { name: "Low", value: r.low },
    ].filter((x) => x.value > 0);
  }, [data]);

  const planPie = useMemo(() => {
    if (!data) return [];
    const p = data.subscriptionDistribution;
    return [
      { name: "Bronze", value: p.bronze },
      { name: "Silver", value: p.silver },
      { name: "Gold", value: p.gold },
    ].filter((x) => x.value > 0);
  }, [data]);

  const kpiCards = data
    ? [
        {
          key: "users",
          label: isAuditor ? "Scoped Users" : "Total Platform Users",
          kpi: data.kpis.totalUsers,
          icon: Users,
          theme: "bg-blue-50 text-blue-700",
        },
        {
          key: "auditors",
          label: isAuditor ? "Active Assessor" : "Accredited Auditors",
          kpi: data.kpis.totalAuditors,
          icon: UserCheck,
          theme: "bg-emerald-50 text-emerald-700",
        },
        {
          key: "orgs",
          label: isAuditor ? "Assigned Organizations" : "Client Organizations",
          kpi: data.kpis.totalOrganizations,
          icon: Building2,
          theme: "bg-indigo-50 text-indigo-700",
        },
        {
          key: "assessments",
          label: "Total Assessments",
          kpi: data.kpis.totalAssessments,
          icon: FileCheck2,
          theme: "bg-teal-50 text-teal-700",
        },
        {
          key: "compliance",
          label: "Compliance Score",
          kpi: data.kpis.complianceScore,
          icon: TrendingUp,
          theme: "bg-violet-50 text-violet-700",
        },
        {
          key: "risks",
          label: "Open Security Risks",
          kpi: data.kpis.openRisks,
          icon: ShieldAlert,
          theme: data.kpis.openRisks.outlier
            ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
            : "bg-amber-50 text-amber-800",
          invertDelta: true,
        },
      ]
    : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="page-title page-title-lg font-editorial">{title}</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
              Analytics
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onRangeChange(r)}
                className={cn(
                  "px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition",
                  range === r
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              Refresh
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : null}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {kpiCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.key}
                  className={cn(
                    "rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs",
                    card.kpi.outlier && "border-rose-200 shadow-[0_0_0_1px_rgba(244,63,94,0.12)]"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center", card.theme)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <DeltaBadge delta={card.kpi.deltaPct} invert={card.invertDelta} />
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mt-3">
                    {card.label}
                  </p>
                  <p className="text-2xl font-bold text-slate-900 tabular-nums mt-0.5">
                    {card.kpi.value}
                    {card.kpi.suffix || ""}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                    {card.kpi.hint || `vs prior ${range}`}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <ChartCard
              className="xl:col-span-6"
              title="Compliance Performance Trend"
              subtitle={`Average submitted maturity · last ${data.periodDays} days`}
              action={
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                  {data.kpis.complianceScore.value}%
                </span>
              }
            >
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.complianceTrend}>
                    <defs>
                      <linearGradient id="complianceFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatShortDate}
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      minTickGap={28}
                    />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748b" }} width={32} />
                    <Tooltip
                      labelFormatter={(v) => formatShortDate(String(v))}
                      formatter={(v) => [`${v}%`, "Compliance"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#4f46e5"
                      strokeWidth={2.5}
                      fill="url(#complianceFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              className="xl:col-span-3"
              title="Assessment Status"
              subtitle={`${data.assessmentsByStatus.total} total sessions`}
            >
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusPie}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={2}
                    >
                      {statusPie.map((_, i) => (
                        <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-1">
                {[
                  ["Completed", data.assessmentsByStatus.completed, STATUS_COLORS[0]],
                  ["In Progress", data.assessmentsByStatus.inProgress, STATUS_COLORS[1]],
                  ["Not Started", data.assessmentsByStatus.notStarted, STATUS_COLORS[2]],
                ].map(([label, value, color]) => (
                  <div key={String(label)} className="flex items-center justify-between text-[11px]">
                    <span className="inline-flex items-center gap-1.5 text-slate-600">
                      <span className="h-2 w-2 rounded-full" style={{ background: String(color) }} />
                      {label}
                    </span>
                    <span className="font-semibold tabular-nums text-slate-900">{value as number}</span>
                  </div>
                ))}
              </div>
            </ChartCard>

            <ChartCard
              className="xl:col-span-3"
              title="Risk Severity Distribution"
              subtitle={`${data.riskSeverity.total} open exceptions`}
            >
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskPie.length ? riskPie : [{ name: "None", value: 1 }]}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={2}
                    >
                      {(riskPie.length ? riskPie : [{ name: "None", value: 1 }]).map((_, i) => (
                        <Cell
                          key={i}
                          fill={riskPie.length ? RISK_COLORS[i % RISK_COLORS.length] : "#e2e8f0"}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-1.5 mt-1">
                {[
                  ["Critical", data.riskSeverity.critical, RISK_COLORS[0]],
                  ["High", data.riskSeverity.high, RISK_COLORS[1]],
                  ["Medium", data.riskSeverity.medium, RISK_COLORS[2]],
                  ["Low", data.riskSeverity.low, RISK_COLORS[3]],
                ].map(([label, value, color]) => (
                  <div key={String(label)} className="flex items-center justify-between text-[11px] px-1.5 py-1 rounded-lg bg-slate-50">
                    <span className="inline-flex items-center gap-1 text-slate-600">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: String(color) }} />
                      {label}
                    </span>
                    <span className="font-bold tabular-nums">{value as number}</span>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <ChartCard
              className="xl:col-span-5"
              title="Security Events Timeline"
              subtitle="Audit trail volume over the selected period"
            >
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.securityEventsTrend}>
                    <defs>
                      <linearGradient id="eventsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatShortDate}
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      minTickGap={28}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} width={28} />
                    <Tooltip labelFormatter={(v) => formatShortDate(String(v))} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#7c3aed"
                      strokeWidth={2}
                      fill="url(#eventsFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              className="xl:col-span-4"
              title="Organization Growth"
              subtitle="Cumulative tenant growth (6 months)"
            >
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.organizationGrowth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="month"
                      tickFormatter={formatMonth}
                      tick={{ fontSize: 10, fill: "#64748b" }}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} width={28} />
                    <Tooltip labelFormatter={(v) => formatMonth(String(v))} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#059669"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#059669" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              className="xl:col-span-3"
              title="SaaS Subscription Distribution"
              subtitle={`${data.subscriptionDistribution.total} tenants`}
            >
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={planPie.length ? planPie : [{ name: "None", value: 1 }]}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={42}
                      outerRadius={64}
                      paddingAngle={2}
                    >
                      {(planPie.length ? planPie : [{ name: "None", value: 1 }]).map((_, i) => (
                        <Cell
                          key={i}
                          fill={planPie.length ? PLAN_COLORS[i % PLAN_COLORS.length] : "#e2e8f0"}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1 mt-1">
                {[
                  ["Bronze", data.subscriptionDistribution.bronze, PLAN_COLORS[0]],
                  ["Silver", data.subscriptionDistribution.silver, PLAN_COLORS[1]],
                  ["Gold", data.subscriptionDistribution.gold, PLAN_COLORS[2]],
                ].map(([label, value, color]) => (
                  <div key={String(label)} className="flex items-center justify-between text-[11px]">
                    <span className="inline-flex items-center gap-1.5 text-slate-600">
                      <span className="h-2 w-2 rounded-full" style={{ background: String(color) }} />
                      {label}
                    </span>
                    <span className="font-semibold tabular-nums">{value as number}</span>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <ChartCard
              className="xl:col-span-4"
              title="Compliance by GRAICE Pillar"
              subtitle="Control completion across seven pillars"
            >
              <div className="space-y-3">
                {data.complianceByPillar.map((p, i) => (
                  <ProgressRow
                    key={p.key}
                    label={`${p.key} · ${p.name}`}
                    value={p.percentage}
                    color={PILLAR_COLORS[i % PILLAR_COLORS.length]}
                  />
                ))}
              </div>
            </ChartCard>

            <ChartCard
              className="xl:col-span-4"
              title="Organization Compliance (Top 5)"
              subtitle="Highest maturity scores among tenants"
            >
              <div className="space-y-3">
                {data.topOrganizations.length === 0 ? (
                  <p className="text-xs text-slate-500">No scored organizations yet.</p>
                ) : (
                  data.topOrganizations.map((org, i) => (
                    <div key={org._id} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 truncate">{org.name}</p>
                          <p className="text-[10px] text-slate-500">
                            {org.assessmentCount} assessments · {org.activePlan}
                          </p>
                        </div>
                        <span className="font-bold tabular-nums text-slate-900">
                          {org.complianceScore}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{ width: `${org.complianceScore}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ChartCard>

            <ChartCard
              className="xl:col-span-4"
              title="Auditor Performance"
              subtitle="Assigned vs completed assessment workload"
            >
              <div className="space-y-3">
                {data.auditorPerformance.length === 0 ? (
                  <p className="text-xs text-slate-500">No auditor activity yet.</p>
                ) : (
                  data.auditorPerformance.map((a) => (
                    <div key={`${a.email}-${a.name}`} className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {initials(a.name) || "A"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-800 truncate">{a.name}</p>
                          <span className="text-[11px] font-bold text-emerald-700 tabular-nums">
                            {a.completionRate}%
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mb-1">
                          {a.completed}/{a.assigned} completed
                        </p>
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${a.completionRate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <ChartCard
              className="xl:col-span-4"
              title="Assessment Pipeline"
              subtitle="Completion mix across the portfolio"
            >
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-semibold text-slate-700">Overall completion</span>
                    <span className="font-bold text-slate-900">
                      {data.assessmentPipeline.completedPct}%
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100 overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${data.assessmentPipeline.completedPct}%` }}
                    />
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${data.assessmentPipeline.inProgressPct}%` }}
                    />
                    <div
                      className="h-full bg-slate-300"
                      style={{ width: `${data.assessmentPipeline.notStartedPct}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    ["Completed", data.assessmentPipeline.completed, "text-emerald-700 bg-emerald-50"],
                    ["In Progress", data.assessmentPipeline.inProgress, "text-blue-700 bg-blue-50"],
                    ["Not Started", data.assessmentPipeline.notStarted, "text-slate-700 bg-slate-50"],
                  ].map(([label, value, tone]) => (
                    <div key={String(label)} className={cn("rounded-xl px-2 py-3", tone)}>
                      <p className="text-lg font-bold tabular-nums">{value as number}</p>
                      <p className="text-[10px] font-semibold">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>

            <ChartCard
              className="xl:col-span-4"
              title="Recent Client Organizations"
              subtitle="Newest tenants in scope"
              action={
                <Link href="/organizations" className="text-[11px] font-semibold text-indigo-600 hover:underline">
                  View all
                </Link>
              }
            >
              <div className="space-y-2">
                {data.recentOrganizations.map((org) => (
                  <div
                    key={org._id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{org.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {org.activePlan} · {org.assessmentCount} assessments
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        org.status === "Active"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-800"
                      )}
                    >
                      {org.status}
                    </span>
                  </div>
                ))}
              </div>
            </ChartCard>

            <ChartCard
              className="xl:col-span-4"
              title="Recent Security Audit Trail"
              subtitle="Latest non-denied platform events"
              action={
                !isAuditor ? (
                  <Link
                    href="/admin/audit-logs"
                    className="text-[11px] font-semibold text-indigo-600 hover:underline"
                  >
                    View all
                  </Link>
                ) : null
              }
            >
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {data.recentActivity.map((evt) => (
                  <div key={evt.id} className="rounded-xl border border-slate-100 px-3 py-2.5">
                    <p className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                      {evt.title}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                      {evt.actorEmail || evt.description}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(evt.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
