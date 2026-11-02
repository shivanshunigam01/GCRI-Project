"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  AssessmentGapsResponse,
  AssessmentPillarsResponse,
  AssessmentRecommendationsResponse,
  AssessmentSummaryResponse,
  MaturityLevel,
} from "@/types/assessment.types";
import { AssessmentReportsPanel } from "@/components/features/assessments/AssessmentReportsPanel";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Award,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileSearch,
  Layers,
  Lightbulb,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";

const PILLAR_ACCENTS = [
  "from-teal-500 to-emerald-600",
  "from-blue-500 to-indigo-600",
  "from-violet-500 to-purple-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-cyan-500 to-sky-600",
  "from-indigo-500 to-blue-700",
];

function maturityTheme(level: MaturityLevel) {
  switch (level) {
    case "Advanced":
      return {
        badge: "bg-emerald-500/15 text-emerald-100 border-emerald-400/30",
        glow: "shadow-[0_0_48px_-8px_rgba(16,185,129,0.55)]",
        ring: "#34d399",
        label: "Advanced maturity",
      };
    case "Established":
      return {
        badge: "bg-sky-500/15 text-sky-100 border-sky-400/30",
        glow: "shadow-[0_0_48px_-8px_rgba(56,189,248,0.5)]",
        ring: "#38bdf8",
        label: "Established maturity",
      };
    case "Emerging":
      return {
        badge: "bg-amber-500/15 text-amber-100 border-amber-400/30",
        glow: "shadow-[0_0_48px_-8px_rgba(251,191,36,0.45)]",
        ring: "#fbbf24",
        label: "Emerging maturity",
      };
    default:
      return {
        badge: "bg-slate-500/20 text-slate-200 border-slate-400/25",
        glow: "shadow-[0_0_48px_-8px_rgba(148,163,184,0.35)]",
        ring: "#94a3b8",
        label: "Initial maturity",
      };
  }
}

function scoreRingPercent(summary: AssessmentSummaryResponse, isLight: boolean) {
  if (isLight && summary.maxPossibleScore > 0) {
    return Math.min(100, Math.round((summary.overallScore / summary.maxPossibleScore) * 100));
  }
  return Math.min(100, Math.round(summary.overallPercentage ?? summary.compliancePercentage ?? 0));
}

function formatCalculatedAt(iso?: string) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return null;
  }
}

function ScoreRing({
  percent,
  strokeColor,
  children,
}: {
  percent: number;
  strokeColor: string;
  children: React.ReactNode;
}) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;

  return (
    <div className="relative h-[148px] w-[148px] shrink-0">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 128 128" aria-hidden>
        <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="10" />
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke={strokeColor}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
        {children}
      </div>
    </div>
  );
}

function PillarRadar({
  pillars,
  chartId,
  hoveredIndex,
  onHoverIndex,
}: {
  pillars: { name: string; percentage: number; pillarNumber?: number }[];
  chartId: string;
  hoveredIndex: number | null;
  onHoverIndex: (idx: number | null) => void;
}) {
  const size = 260;
  const centerX = size / 2;
  const centerY = size / 2;
  const maxRadius = Math.round(size * 0.34);
  const numPillars = Math.max(pillars.length, 1);
  const gridLevels = [0.25, 0.5, 0.75, 1];

  const getPolygonPoints = (radius: number) =>
    Array.from({ length: numPillars })
      .map((_, i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / numPillars;
        return `${centerX + radius * Math.cos(angle)},${centerY + radius * Math.sin(angle)}`;
      })
      .join(" ");

  const dataPoints = pillars.map((p, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / numPillars;
    const normalizedVal = Math.min(100, Math.max(4, p.percentage)) / 100;
    const r = maxRadius * normalizedVal;
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle),
      angle,
      label: p.pillarNumber ? `P${p.pillarNumber}` : `P${i + 1}`,
      name: p.name,
      percentage: p.percentage,
    };
  });

  const dataPolygon = dataPoints.map((pt) => `${pt.x},${pt.y}`).join(" ");

  return (
    <div className="relative flex items-center justify-center py-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible select-none">
        <defs>
          <radialGradient id={`${chartId}-fill`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.12" />
          </radialGradient>
        </defs>
        {gridLevels.map((lvl, idx) => (
          <polygon
            key={idx}
            points={getPolygonPoints(maxRadius * lvl)}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={idx === gridLevels.length - 1 ? 1.25 : 1}
            strokeDasharray={idx < gridLevels.length - 1 ? "4 4" : undefined}
          />
        ))}
        {Array.from({ length: numPillars }).map((_, i) => {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / numPillars;
          return (
            <line
              key={i}
              x1={centerX}
              y1={centerY}
              x2={centerX + maxRadius * Math.cos(angle)}
              y2={centerY + maxRadius * Math.sin(angle)}
              stroke="#cbd5e1"
              strokeWidth={1}
            />
          );
        })}
        <polygon
          points={dataPolygon}
          fill={`url(#${chartId}-fill)`}
          stroke="#4f46e5"
          strokeWidth={2}
          strokeLinejoin="round"
          className="transition-all duration-700 ease-out"
        />
        {dataPoints.map((pt, i) => (
          <g key={i}>
            <circle
              cx={pt.x}
              cy={pt.y}
              r={hoveredIndex === i ? 6 : 4}
              fill={hoveredIndex === i ? "#4f46e5" : "#6366f1"}
              className="transition-all duration-200 cursor-pointer"
              onMouseEnter={() => onHoverIndex(i)}
              onMouseLeave={() => onHoverIndex(null)}
            />
            <text
              x={centerX + (maxRadius + 18) * Math.cos(pt.angle)}
              y={centerY + (maxRadius + 18) * Math.sin(pt.angle)}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-slate-500 text-[9px] font-bold"
            >
              {pt.label}
            </text>
          </g>
        ))}
      </svg>
      {hoveredIndex !== null && dataPoints[hoveredIndex] && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-center shadow-lg backdrop-blur-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
            {dataPoints[hoveredIndex].label}
          </p>
          <p className="text-xs font-semibold text-slate-800 max-w-[200px] truncate">
            {dataPoints[hoveredIndex].name}
          </p>
          <p className="text-sm font-bold tabular-nums text-slate-900">
            {dataPoints[hoveredIndex].percentage}%
          </p>
        </div>
      )}
    </div>
  );
}

export interface AssessmentResultsViewProps {
  assessmentId: string;
  summary: AssessmentSummaryResponse;
  pillars: AssessmentPillarsResponse | null;
  gaps: AssessmentGapsResponse | null;
  recommendations: AssessmentRecommendationsResponse | null;
  onRefresh: () => void;
}

export function AssessmentResultsView({
  assessmentId,
  summary,
  pillars,
  gaps,
  recommendations,
  onRefresh,
}: AssessmentResultsViewProps) {
  const [radarHover, setRadarHover] = useState<number | null>(null);

  const orgName =
    typeof summary.organization === "object" && summary.organization && "name" in summary.organization
      ? String(summary.organization.name)
      : "Organization";

  const isLight = summary.assessmentType === "Light";
  const compliance = summary.compliancePercentage ?? summary.overallPercentage ?? 0;
  const ringPercent = scoreRingPercent(summary, isLight);
  const theme = maturityTheme(summary.maturityLevel);
  const calculatedLabel = formatCalculatedAt(summary.calculatedAt);
  const submittedLabel = summary.submittedAt
    ? new Date(summary.submittedAt).toLocaleDateString(undefined, { dateStyle: "medium" })
    : null;

  const radarPillars = useMemo(
    () =>
      (pillars?.pillars ?? []).map((p) => ({
        name: p.pillarName,
        pillarNumber: p.pillarNumber,
        percentage: p.compliancePercentage ?? p.percentage ?? 0,
      })),
    [pillars]
  );

  const controlsCoverage =
    summary.totalControlsAssessed > 0
      ? Math.round(
          ((summary.totalNoExceptionsNoted ?? 0) / summary.totalControlsAssessed) * 100
        )
      : null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-14">
      {/* Top nav */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/assessments"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <ArrowLeft className="h-4 w-4" />
          </span>
          All assessments
        </Link>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh results
        </button>
      </div>

      {summary.status !== "Submitted" && (
        <div className="surface-panel rounded-2xl p-4 flex gap-3 items-start border-amber-200/60 bg-gradient-to-r from-amber-50/90 to-white">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-950">
            <span className="font-semibold">Draft scores</span> — status is{" "}
            <span className="font-bold">{summary.status}</span>. Figures update as you answer; submit
            from review to lock the official record.
          </div>
        </div>
      )}

      {/* Hero */}
      <section
        className={cn(
          "relative overflow-hidden rounded-3xl border border-slate-800/40 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white",
          theme.glow
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 0%, rgba(56,189,248,0.35), transparent 45%), radial-gradient(circle at 90% 20%, rgba(99,102,241,0.35), transparent 40%)",
          }}
        />
        <div className="relative p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-10">
            <ScoreRing percent={ringPercent} strokeColor={theme.ring}>
              {isLight ? (
                <>
                  <span className="text-2xl font-bold tabular-nums leading-none">
                    <AnimatedNumber value={summary.overallScore} duration={900} />
                  </span>
                  <span className="text-[10px] font-semibold text-white/60 mt-1">
                    of {summary.maxPossibleScore} pts
                  </span>
                </>
              ) : (
                <>
                  <span className="text-2xl font-bold tabular-nums leading-none">
                    <AnimatedNumber value={ringPercent} suffix="%" duration={900} />
                  </span>
                  <span className="text-[10px] font-semibold text-white/60 mt-1">overall</span>
                </>
              )}
            </ScoreRing>

            <div className="flex-1 min-w-0 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
                  <Sparkles className="h-3 w-3" /> Results
                </span>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
                    isLight
                      ? "bg-sky-500/20 text-sky-100 border-sky-400/30"
                      : "bg-indigo-500/25 text-indigo-100 border-indigo-400/30"
                  )}
                >
                  {isLight ? "Lightweight" : "Full"} assessment
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
                    summary.status === "Submitted"
                      ? "bg-emerald-500/20 text-emerald-100 border-emerald-400/30"
                      : "bg-amber-500/20 text-amber-100 border-amber-400/30"
                  )}
                >
                  {summary.status === "Submitted" ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-300 animate-pulse" />
                  )}
                  {summary.status}
                </span>
              </div>

              <div>
                <h1 className="font-editorial text-3xl sm:text-4xl text-white tracking-tight">
                  Governance scorecard
                </h1>
                <p className="mt-2 text-sm text-slate-300 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 opacity-70" /> {orgName}
                  </span>
                  <span className="hidden sm:inline text-white/30">·</span>
                  <span>Framework v{summary.frameworkVersion}</span>
                  {submittedLabel && (
                    <>
                      <span className="hidden sm:inline text-white/30">·</span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 opacity-70" /> Submitted {submittedLabel}
                      </span>
                    </>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div
                  className={cn(
                    "inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5",
                    theme.badge
                  )}
                >
                  <Award className="h-5 w-5 shrink-0 opacity-90" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                      {theme.label}
                    </p>
                    <p className="text-lg font-bold leading-tight">{summary.maturityLevel}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                    Compliance index
                  </p>
                  <p className="text-lg font-bold tabular-nums">
                    <AnimatedNumber value={compliance} suffix="%" duration={800} />
                  </p>
                </div>
              </div>
            </div>
          </div>

          {calculatedLabel && (
            <p className="mt-6 text-[11px] text-white/40">
              Scores calculated {calculatedLabel}
            </p>
          )}
        </div>
      </section>

      {/* KPI strip */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          icon={<Target className="h-4 w-4 text-indigo-600" />}
          iconBg="bg-indigo-50"
          label="Overall performance"
          value={
            isLight
              ? `${summary.overallScore} / ${summary.maxPossibleScore}`
              : `${summary.overallPercentage}%`
          }
          hint={isLight ? `${ringPercent}% of maximum points` : `Max ${summary.maxPossibleScore}% scale`}
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4 text-teal-600" />}
          iconBg="bg-teal-50"
          label="Compliance"
          value={`${compliance}%`}
          hint="Weighted control alignment"
        />
        <KpiCard
          icon={<ClipboardCheck className="h-4 w-4 text-emerald-600" />}
          iconBg="bg-emerald-50"
          label="Controls assessed"
          value={String(summary.totalControlsAssessed ?? 0)}
          hint={
            controlsCoverage !== null
              ? `${controlsCoverage}% without exceptions noted`
              : `${summary.totalNoExceptionsNoted ?? 0} clear responses`
          }
        />
        <KpiCard
          icon={<FileSearch className="h-4 w-4 text-rose-600" />}
          iconBg="bg-rose-50"
          label="Exceptions & gaps"
          value={String(summary.totalExceptionsNoted ?? 0)}
          hint={`${gaps?.totalGapsIdentified ?? 0} governance gaps · ${summary.totalNotAssessed ?? 0} not assessed`}
        />
      </div>

      {/* Pillars */}
      {pillars && pillars.pillars.length > 0 && (
        <section className="surface-panel rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Layers className="h-5 w-5 text-indigo-600" />
                Seven-pillar breakdown
              </h2>
              <p className="text-sm text-slate-500 mt-1 max-w-xl">
                Performance across GRAICE pillars — hover chart points or scan the score bars below.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500 tabular-nums">
              Maturity: <span className="text-indigo-700">{pillars.maturityLevel}</span>
            </span>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div className="surface-card rounded-2xl p-4 border border-slate-200/80">
              <PillarRadar
                pillars={radarPillars}
                chartId={`results-radar-${assessmentId}`}
                hoveredIndex={radarHover}
                onHoverIndex={setRadarHover}
              />
            </div>

            <div className="space-y-4">
              {pillars.pillars.map((p, idx) => {
                const pct = p.compliancePercentage ?? p.percentage ?? 0;
                const accent = PILLAR_ACCENTS[idx % PILLAR_ACCENTS.length];
                return (
                  <div key={p.pillarId} className="group">
                    <div className="flex justify-between items-baseline gap-2 mb-1.5">
                      <span className="text-sm font-semibold text-slate-800 leading-snug">
                        {p.pillarName}
                      </span>
                      <span className="text-xs font-bold tabular-nums text-slate-600 shrink-0">
                        {p.scoreEarned}
                        <span className="text-slate-400 font-medium">/{p.scoreMax}</span>
                        <span className="ml-2 text-indigo-600">{pct}%</span>
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden shadow-inner">
                      <div
                        className={cn(
                          "h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out",
                          accent
                        )}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <div className="mt-1 flex gap-3 text-[10px] text-slate-500 font-medium">
                      <span>{p.totalControls} controls</span>
                      <span className="text-rose-600">{p.exceptionsNoted} exceptions</span>
                      <span className="text-emerald-600">{p.noExceptionsNoted} clear</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200/80">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/90 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Pillar</th>
                    <th className="px-4 py-3 text-right">Earned</th>
                    <th className="px-4 py-3 text-right">Max</th>
                    <th className="px-4 py-3 text-right">Score</th>
                    <th className="px-4 py-3 text-right">Exceptions</th>
                    <th className="px-4 py-3 text-right">No exc.</th>
                  </tr>
                </thead>
                <tbody>
                  {pillars.pillars.map((p, i) => (
                    <tr
                      key={p.pillarId}
                      className={cn(
                        "border-t border-slate-100 transition-colors hover:bg-indigo-50/40",
                        i % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                      )}
                    >
                      <td className="px-4 py-3 font-semibold text-slate-800">{p.pillarName}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{p.scoreEarned}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-500">{p.scoreMax}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-bold text-indigo-700">
                        {p.percentage}%
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-rose-600">
                        {p.exceptionsNoted}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-emerald-700">
                        {p.noExceptionsNoted}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Gaps */}
        {gaps && (
          <section className="surface-panel rounded-3xl p-6 space-y-4 flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-rose-600" />
                  Governance gaps
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {gaps.totalGapsIdentified} area{gaps.totalGapsIdentified === 1 ? "" : "s"} needing
                  attention
                </p>
              </div>
              {gaps.gaps.length > 0 && (
                <Link
                  href={`/assessments/${assessmentId}/findings`}
                  className="text-xs font-bold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-0.5 shrink-0"
                >
                  All findings <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>

            {gaps.gaps.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 p-8 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-3" />
                <p className="text-sm font-semibold text-emerald-900">No gaps flagged</p>
                <p className="text-xs text-emerald-800/70 mt-1 max-w-xs">
                  Current responses did not trigger gap analysis for this session.
                </p>
              </div>
            ) : (
              <ul className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                {gaps.gaps.slice(0, 6).map((g) => (
                  <li
                    key={g.questionId}
                    className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm hover:border-indigo-200/80 hover:shadow-md transition-all"
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                        {g.questionId}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500">{g.pillarName}</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed line-clamp-3">{g.questionText}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Recommendations */}
        {recommendations && (
          <section className="surface-panel rounded-3xl p-6 space-y-4 flex flex-col">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Prioritized recommendations
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {recommendations.totalRecommendations} action
                {recommendations.totalRecommendations === 1 ? "" : "s"} from your responses
              </p>
            </div>

            {recommendations.recommendations.length === 0 ? (
              <div className="flex-1 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center">
                <p className="text-sm font-semibold text-slate-700">No recommendations yet</p>
                <p className="text-xs text-slate-500 mt-1">Complete more controls to generate guidance.</p>
              </div>
            ) : (
              <ol className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                {recommendations.recommendations.slice(0, 6).map((r, i) => (
                  <li
                    key={r.recommendationId}
                    className="relative rounded-2xl border border-slate-200/80 bg-white pl-4 pr-4 py-3.5 shadow-sm overflow-hidden"
                  >
                    <div
                      className={cn(
                        "absolute left-0 top-0 bottom-0 w-1",
                        r.priority === "High" ? "bg-rose-500" : "bg-amber-400"
                      )}
                    />
                    <div className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <span
                          className={cn(
                            "text-[10px] font-bold uppercase tracking-wider",
                            r.priority === "High" ? "text-rose-600" : "text-amber-700"
                          )}
                        >
                          {r.priority} priority · {r.pillarName}
                        </span>
                        <p className="text-sm font-medium text-slate-800 mt-1 leading-snug">
                          {r.recommendedAction}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/assessments/${assessmentId}/findings`}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-blue-500 transition-all"
        >
          Explore findings <ChevronRight className="h-4 w-4" />
        </Link>
        <Link
          href={`/assessments/${assessmentId}`}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          Back to workspace
        </Link>
      </div>

      <AssessmentReportsPanel assessmentId={assessmentId} className="surface-panel rounded-3xl p-6" />
    </div>
  );
}

function KpiCard({
  icon,
  iconBg,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="surface-card rounded-2xl p-5 transition-transform hover:scale-[1.01]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums tracking-tight">{value}</p>
          <p className="text-[11px] text-slate-500 mt-1 leading-snug">{hint}</p>
        </div>
        <div className={cn("rounded-xl p-2.5 shrink-0", iconBg)}>{icon}</div>
      </div>
    </div>
  );
}
