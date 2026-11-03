"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { assessmentService } from "@/services/assessment.service";
import {
  AssessmentGapsResponse,
  AssessmentPillarsResponse,
  AssessmentRecommendationsResponse,
  AssessmentSummaryResponse,
} from "@/types/assessment.types";
import { AssessmentConfidentialGate } from "@/components/features/assessments/AssessmentConfidentialGate";
import { AssessmentResultsView } from "@/components/features/assessments/AssessmentResultsView";
import { AssessmentResultsSkeleton } from "@/components/shared/PageSkeletons";
import { getUserFacingApiError } from "@/lib/authUser";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function AssessmentResultsPage() {
  return (
    <AssessmentConfidentialGate>
      <AssessmentResultsContent />
    </AssessmentConfidentialGate>
  );
}

function AssessmentResultsContent() {
  const params = useParams();
  const assessmentId = typeof params?.id === "string" ? params.id : "";

  const [summary, setSummary] = useState<AssessmentSummaryResponse | null>(null);
  const [pillars, setPillars] = useState<AssessmentPillarsResponse | null>(null);
  const [gaps, setGaps] = useState<AssessmentGapsResponse | null>(null);
  const [recommendations, setRecommendations] =
    useState<AssessmentRecommendationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partialWarning, setPartialWarning] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!assessmentId) return;
    setLoading(true);
    setError(null);
    setPartialWarning(null);
    try {
      const [sumResult, pilResult, gapResult, recResult] = await Promise.allSettled([
        assessmentService.getSummary(assessmentId),
        assessmentService.getPillars(assessmentId),
        assessmentService.getGaps(assessmentId),
        assessmentService.getRecommendations(assessmentId),
      ]);

      const warnings: string[] = [];

      if (sumResult.status === "fulfilled" && sumResult.value?.data) {
        setSummary(sumResult.value.data);
      } else {
        setSummary(null);
        setError(
          sumResult.status === "rejected"
            ? getUserFacingApiError(sumResult.reason, "assessment summary")
            : "Assessment summary unavailable."
        );
        return;
      }

      if (pilResult.status === "fulfilled" && pilResult.value?.data) {
        setPillars(pilResult.value.data);
      } else {
        setPillars(null);
        warnings.push("Pillar scores could not be loaded.");
      }

      if (gapResult.status === "fulfilled" && gapResult.value?.data) {
        setGaps(gapResult.value.data);
      } else {
        setGaps(null);
        warnings.push("Governance gaps could not be loaded.");
      }

      if (recResult.status === "fulfilled" && recResult.value?.data) {
        setRecommendations(recResult.value.data);
      } else {
        setRecommendations(null);
        warnings.push("Recommendations could not be loaded.");
      }

      if (warnings.length) setPartialWarning(warnings.join(" "));
    } catch (err: unknown) {
      setError(getUserFacingApiError(err, "assessment results"));
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <AssessmentResultsSkeleton />;

  if (error || !summary) {
    return (
      <div className="max-w-lg mx-auto py-16 px-6 text-center space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 border border-rose-100">
          <AlertTriangle className="h-7 w-7 text-rose-500" />
        </div>
        <p className="text-sm text-slate-700 leading-relaxed">{error || "Results unavailable."}</p>
        <div className="flex justify-center gap-3">
          <Link href="/assessments" className="text-sm font-semibold text-slate-600">
            Back
          </Link>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
          >
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {partialWarning && (
        <div className="max-w-6xl mx-auto px-1">
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{partialWarning}</span>
          </div>
        </div>
      )}
      <AssessmentResultsView
        assessmentId={assessmentId}
        summary={summary}
        pillars={pillars}
        gaps={gaps}
        recommendations={recommendations}
        onRefresh={load}
      />
    </div>
  );
}
