"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { assessmentService } from "@/services/assessment.service";
import {
  AssessmentRecommendation,
  Finding,
} from "@/types/assessment.types";
import { AssessmentConfidentialGate } from "@/components/features/assessments/AssessmentConfidentialGate";
import { AssessmentFindingsSkeleton } from "@/components/shared/PageSkeletons";
import { ListPagination } from "@/components/shared/ListPagination";
import { useClientPagination } from "@/hooks/useClientPagination";
import { getUserFacingApiError } from "@/lib/authUser";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  AlertTriangle,
  Search,
  Filter,
  ExternalLink,
  RefreshCw,
  Lightbulb,
  FileText,
} from "lucide-react";

const SEVERITIES = ["All", "High", "Medium", "Low"] as const;

export default function AssessmentFindingsPage() {
  return (
    <AssessmentConfidentialGate>
      <AssessmentFindingsContent />
    </AssessmentConfidentialGate>
  );
}

function AssessmentFindingsContent() {
  const params = useParams();
  const assessmentId = typeof params?.id === "string" ? params.id : "";

  const [findings, setFindings] = useState<Finding[]>([]);
  const [recommendations, setRecommendations] = useState<AssessmentRecommendation[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partialWarning, setPartialWarning] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState<(typeof SEVERITIES)[number]>("All");

  const load = useCallback(async () => {
    if (!assessmentId) return;
    setLoading(true);
    setError(null);
    setPartialWarning(null);
    try {
      const [findResult, recResult] = await Promise.allSettled([
        assessmentService.getFindings(assessmentId),
        assessmentService.getRecommendations(assessmentId),
      ]);

      if (findResult.status === "fulfilled" && findResult.value?.data) {
        const data = findResult.value.data;
        setFindings(data.findings ?? []);
        setSummary(
          data.summary
            ? {
                total: data.summary.total,
                open: data.summary.open,
                inProgress: data.summary.inProgress,
                resolved: data.summary.resolved,
              }
            : null
        );
      } else {
        setFindings([]);
        setSummary(null);
        setError(
          findResult.status === "rejected"
            ? getUserFacingApiError(findResult.reason, "findings")
            : "Findings unavailable."
        );
      }

      if (recResult.status === "fulfilled" && recResult.value?.data) {
        setRecommendations(recResult.value.data.recommendations ?? []);
      } else {
        setRecommendations([]);
        if (findResult.status === "fulfilled") {
          setPartialWarning("Remediation recommendations could not be loaded.");
        }
      }
    } catch (err: unknown) {
      setError(getUserFacingApiError(err, "findings"));
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return findings.filter((f) => {
      if (severity !== "All" && f.severity !== severity) return false;
      if (!q) return true;
      return (
        f.findingId.toLowerCase().includes(q) ||
        f.controlId.toLowerCase().includes(q) ||
        f.pillarName.toLowerCase().includes(q) ||
        f.questionText.toLowerCase().includes(q) ||
        f.title.toLowerCase().includes(q)
      );
    });
  }, [findings, search, severity]);

  const findingsPagination = useClientPagination(filtered);
  const recommendationsPagination = useClientPagination(recommendations);

  if (loading) return <AssessmentFindingsSkeleton />;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex items-start gap-3 border-b border-slate-200 pb-4">
        <Link
          href={`/assessments/${assessmentId}/results`}
          className="p-2 rounded-lg border border-slate-200 bg-white shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="page-title font-editorial">Findings &amp; recommendations</h1>
          <p className="text-sm text-slate-500">
            {summary
              ? `${summary.open} open · ${summary.inProgress} in progress · ${summary.resolved} resolved of ${summary.total}`
              : "Backend-derived Auditor findings"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/assessments/${assessmentId}/results`}
            className="text-xs font-semibold border border-slate-200 rounded-lg px-3 py-2 inline-flex gap-1 items-center"
          >
            <FileText className="h-3.5 w-3.5" /> Results &amp; reports
          </Link>
          <button
            type="button"
            onClick={load}
            className="text-xs font-semibold border border-slate-200 rounded-lg px-3 py-2 inline-flex gap-1"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-800 flex gap-2">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {partialWarning && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          {partialWarning}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search findings, controls, pillars…"
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as (typeof SEVERITIES)[number])}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2.5"
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s === "All" ? "All severities" : s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {findingsPagination.total === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <p className="text-sm font-semibold text-slate-800">No findings match your filters</p>
          <p className="text-xs text-slate-500 mt-2">
            {findings.length === 0
              ? "The API returned no findings for this assessment."
              : "Try clearing search or severity filters."}
          </p>
        </div>
      ) : (
        <>
        <ul className="space-y-4">
          {findingsPagination.pageItems.map((f) => (
            <li key={f.findingId} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-slate-500">{f.findingId}</p>
                  <h2 className="text-sm font-bold text-slate-900 mt-0.5">{f.title}</h2>
                </div>
                <div className="flex gap-2">
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                      f.severity === "High"
                        ? "bg-rose-100 text-rose-800"
                        : f.severity === "Medium"
                          ? "bg-amber-100 text-amber-900"
                          : "bg-slate-100 text-slate-700"
                    )}
                  >
                    {f.severity}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {f.status}
                  </span>
                </div>
              </div>
              <dl className="grid sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-slate-500">Pillar</dt>
                  <dd className="font-medium text-slate-800">{f.pillarName}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Control</dt>
                  <dd className="font-medium text-slate-800">{f.controlId}</dd>
                </div>
              </dl>
              <p className="text-xs text-slate-600 leading-relaxed">{f.questionText}</p>
              {f.evidenceNotes && (
                <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2">
                  <strong>Evidence notes:</strong> {f.evidenceNotes}
                </p>
              )}
              {f.evidenceAttachmentUrl && (
                <a
                  href={f.evidenceAttachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-blue-700 inline-flex items-center gap-1"
                >
                  Evidence attachment <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {f.regulatoryAlignments && (
                <div className="text-[11px] text-slate-500 space-y-0.5">
                  {f.regulatoryAlignments.euAiAct && (
                    <p>EU AI Act: {f.regulatoryAlignments.euAiAct}</p>
                  )}
                  {f.regulatoryAlignments.nistAiRmf && (
                    <p>NIST AI RMF: {f.regulatoryAlignments.nistAiRmf}</p>
                  )}
                  {f.regulatoryAlignments.iso42001 && (
                    <p>ISO 42001: {f.regulatoryAlignments.iso42001}</p>
                  )}
                  {f.regulatoryAlignments.oecdAi && (
                    <p>OECD AI: {f.regulatoryAlignments.oecdAi}</p>
                  )}
                </div>
              )}
              <p className="text-xs text-slate-800 border-t border-slate-100 pt-3">
                <strong>Recommended action:</strong> {f.recommendedAction}
              </p>
            </li>
          ))}
        </ul>
        <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
          <ListPagination
            page={findingsPagination.page}
            totalPages={findingsPagination.totalPages}
            total={findingsPagination.total}
            from={findingsPagination.from}
            to={findingsPagination.to}
            onPrevious={findingsPagination.goPrev}
            onNext={findingsPagination.goNext}
            itemLabel="findings"
            className="border-t-0"
          />
        </div>
        </>
      )}

      {recommendationsPagination.total > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Remediation recommendations
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {recommendationsPagination.total} prioritized remediation action
              {recommendationsPagination.total === 1 ? "" : "s"} from the assessment API
            </p>
          </div>
          <ol className="space-y-3">
            {recommendationsPagination.pageItems.map((r, i) => (
              <li
                key={r.recommendationId}
                className="relative rounded-xl border border-slate-200 bg-slate-50/60 pl-4 pr-4 py-3.5 overflow-hidden"
              >
                <div
                  className={cn(
                    "absolute left-0 top-0 bottom-0 w-1",
                    r.priority === "High" ? "bg-rose-500" : "bg-amber-400"
                  )}
                />
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700">
                    {recommendationsPagination.from + i}
                  </span>
                  <div className="min-w-0 space-y-1">
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wider",
                        r.priority === "High" ? "text-rose-600" : "text-amber-700"
                      )}
                    >
                      {r.priority} · {r.pillarName} · {r.questionId}
                    </span>
                    {r.controlText && (
                      <p className="text-xs text-slate-500 line-clamp-2">{r.controlText}</p>
                    )}
                    <p className="text-sm font-medium text-slate-800 leading-snug">
                      {r.recommendedAction}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <ListPagination
            page={recommendationsPagination.page}
            totalPages={recommendationsPagination.totalPages}
            total={recommendationsPagination.total}
            from={recommendationsPagination.from}
            to={recommendationsPagination.to}
            onPrevious={recommendationsPagination.goPrev}
            onNext={recommendationsPagination.goNext}
            itemLabel="recommendations"
            className="rounded-xl border border-slate-200"
          />
        </section>
      )}
    </div>
  );
}
