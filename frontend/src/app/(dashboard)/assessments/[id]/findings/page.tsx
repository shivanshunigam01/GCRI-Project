"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { assessmentService } from "@/services/assessment.service";
import { Finding } from "@/types/assessment.types";
import { AssessmentConfidentialGate } from "@/components/features/assessments/AssessmentConfidentialGate";
import { AssessmentFindingsSkeleton } from "@/components/shared/PageSkeletons";
import { getUserFacingApiError } from "@/lib/authUser";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  AlertTriangle,
  Search,
  Filter,
  ExternalLink,
  RefreshCw,
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
  const [summary, setSummary] = useState<{ total: number; open: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState<(typeof SEVERITIES)[number]>("All");

  const load = useCallback(async () => {
    if (!assessmentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await assessmentService.getFindings(assessmentId);
      const data = res?.data;
      setFindings(data?.findings ?? []);
      setSummary(data?.summary ? { total: data.summary.total, open: data.summary.open } : null);
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
          <h1 className="page-title font-editorial">Findings &amp; exceptions</h1>
          <p className="text-sm text-slate-500">
            {summary ? `${summary.open} open of ${summary.total} findings` : "Backend-derived findings"}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="text-xs font-semibold border border-slate-200 rounded-lg px-3 py-2 inline-flex gap-1"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-800 flex gap-2">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          {error}
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

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <p className="text-sm font-semibold text-slate-800">No findings match your filters</p>
          <p className="text-xs text-slate-500 mt-2">
            {findings.length === 0
              ? "The API returned no findings for this assessment."
              : "Try clearing search or severity filters."}
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {filtered.map((f) => (
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
                </div>
              )}
              <p className="text-xs text-slate-800 border-t border-slate-100 pt-3">
                <strong>Recommended action:</strong> {f.recommendedAction}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
