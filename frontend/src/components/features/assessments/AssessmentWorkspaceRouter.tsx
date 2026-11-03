"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { assessmentService } from "@/services/assessment.service";
import { AssessmentType } from "@/types/assessment.types";
import { getUserFacingApiError } from "@/lib/authUser";
import { AssessmentWorkspaceSkeleton } from "@/components/shared/PageSkeletons";
import { AssessmentPlayer } from "@/components/features/assessments/AssessmentPlayer";
import { FullAssessmentPlayer } from "@/components/features/assessments/FullAssessmentPlayer";
import { AlertCircle, RefreshCw } from "lucide-react";

/**
 * Loads session type once, then mounts Light or Full player.
 * Light AssessmentPlayer behavior is preserved unchanged.
 */
export function AssessmentWorkspaceRouter({ assessmentId }: { assessmentId: string }) {
  const [assessmentType, setAssessmentType] = useState<AssessmentType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolveType = useCallback(async () => {
    if (!assessmentId) {
      setError("Invalid assessment link.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await assessmentService.getAssessmentById(assessmentId);
      const type = res?.data?.session?.assessmentType;
      if (!type) {
        setError("Assessment session returned an unexpected format.");
        setAssessmentType(null);
        return;
      }
      setAssessmentType(type);
    } catch (err: unknown) {
      setError(getUserFacingApiError(err, "this assessment"));
      setAssessmentType(null);
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    resolveType();
  }, [resolveType]);

  if (loading) {
    return <AssessmentWorkspaceSkeleton />;
  }

  if (error || !assessmentType) {
    return (
      <div className="max-w-2xl mx-auto p-8 bg-white rounded-xl border border-red-200 text-center space-y-4">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
        <p className="text-sm text-slate-700">{error || "Unable to open assessment."}</p>
        <div className="flex justify-center gap-3">
          <Link href="/assessments" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
            Back to assessments
          </Link>
          <button
            type="button"
            onClick={resolveType}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700"
          >
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (assessmentType === "Full") {
    return (
      <Suspense fallback={<AssessmentWorkspaceSkeleton />}>
        <FullAssessmentPlayer assessmentId={assessmentId} />
      </Suspense>
    );
  }

  return <AssessmentPlayer assessmentId={assessmentId} />;
}
