"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { assessmentService } from "@/services/assessment.service";
import { AssessmentConfidentialGate } from "@/components/features/assessments/AssessmentConfidentialGate";
import { FullAssessmentReview } from "@/components/features/assessments/FullAssessmentReview";
import { AssessmentReviewSkeleton } from "@/components/shared/PageSkeletons";
import {
  organizationNameFromSession,
  auditorNameFromSession,
  auditorEmailFromSession,
} from "@/lib/assessmentDisplay";
import {
  answersMapFromSession,
  buildSavePayloadFromAnswers,
  mergeDraftAnswers,
} from "@/lib/assessmentSavePayload";
import { clearAssessmentDraft } from "@/lib/assessmentDraftStorage";
import { getApiErrorMessage, getUserFacingApiError } from "@/lib/authUser";
import { useToast } from "@/context/ToastContext";
import { AssessmentSession, AssessmentType } from "@/types/assessment.types";
import { FrameworkQuestion } from "@/types/framework.types";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Send,
  Paperclip,
  User,
  RefreshCw,
} from "lucide-react";

export default function AssessmentReviewPage() {
  return (
    <AssessmentConfidentialGate>
      <AssessmentReviewRouter />
    </AssessmentConfidentialGate>
  );
}

function AssessmentReviewRouter() {
  const params = useParams();
  const assessmentId = typeof params?.id === "string" ? params.id : "";
  const [assessmentType, setAssessmentType] = useState<AssessmentType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolve = useCallback(async () => {
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
      setError(getUserFacingApiError(err, "assessment review"));
      setAssessmentType(null);
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    resolve();
  }, [resolve]);

  if (loading) return <AssessmentReviewSkeleton />;

  if (error || !assessmentType) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center space-y-3">
        <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto" />
        <p className="text-sm text-slate-700">{error || "Assessment not found."}</p>
        <div className="flex justify-center gap-3">
          <Link href="/assessments" className="text-sm font-semibold text-slate-600">
            Back
          </Link>
          <button
            type="button"
            onClick={resolve}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700"
          >
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (assessmentType === "Full") {
    return <FullAssessmentReview assessmentId={assessmentId} />;
  }

  return <LightAssessmentReviewContent assessmentId={assessmentId} />;
}

/** Existing Light Assessment review — preserved behavior. */
function LightAssessmentReviewContent({ assessmentId }: { assessmentId: string }) {
  const router = useRouter();
  const toast = useToast();

  const [session, setSession] = useState<AssessmentSession | null>(null);
  const [questions, setQuestions] = useState<FrameworkQuestion[]>([]);
  const [progress, setProgress] = useState<Awaited<
    ReturnType<typeof assessmentService.getProgress>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!assessmentId) return;
    setLoading(true);
    setError(null);
    try {
      const [detailRes] = await Promise.all([
        assessmentService.getAssessmentById(assessmentId),
      ]);
      const detail = detailRes?.data;
      if (!detail?.session) {
        setError("Could not load assessment session.");
        return;
      }
      setSession(detail.session);
      const qs = detail.framework?.questions
        ? [...detail.framework.questions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        : [];
      setQuestions(qs);

      if (detail.session.status !== "Submitted" && qs.length > 0) {
        const merged = mergeDraftAnswers(
          answersMapFromSession(detail.session.answers),
          assessmentId
        );
        const payload = buildSavePayloadFromAnswers(qs, merged);
        if (payload.length > 0) {
          await assessmentService.saveAnswers(assessmentId, payload);
          const refreshed = await assessmentService.getAssessmentById(assessmentId);
          if (refreshed?.data?.session) setSession(refreshed.data.session);
        }
      }

      const progressRes = await assessmentService.getProgress(assessmentId);
      setProgress(progressRes);

      if (detail.session.status === "Submitted") {
        setSubmitResult("This assessment has already been submitted.");
      }
    } catch (err: unknown) {
      setError(getUserFacingApiError(err, "assessment review"));
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    load();
  }, [load]);

  const progressData = progress?.data;
  const isSubmitted = session?.status === "Submitted";

  const evidenceStats = useMemo(() => {
    if (!session?.answers) return { withEvidence: 0, withNotes: 0 };
    let withEvidence = 0;
    let withNotes = 0;
    for (const a of session.answers) {
      if (a.evidenceAttachmentUrl || a.s3Key) withEvidence++;
      if (a.evidenceNotes?.trim()) withNotes++;
    }
    return { withEvidence, withNotes };
  }, [session]);

  const exceptionCount = useMemo(() => {
    if (!session?.answers) return 0;
    return session.answers.filter(
      (a) =>
        a.exceptionStatus === "ExceptionNoted" || a.selectedOptionCode === "EXCEPTION_NOTED"
    ).length;
  }, [session]);

  const incompleteCount = useMemo(() => {
    if (!progressData) return 0;
    return Math.max(0, progressData.totalQuestions - progressData.completedQuestions);
  }, [progressData]);

  const handleFinalSubmit = async () => {
    if (!session || isSubmitted || submitting || !acknowledged) return;
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const merged = mergeDraftAnswers(answersMapFromSession(session.answers), assessmentId);
      const payload = buildSavePayloadFromAnswers(questions, merged);
      if (payload.length > 0) {
        await assessmentService.saveAnswers(assessmentId, payload);
      }
      const res = await assessmentService.submitAssessment(assessmentId);
      clearAssessmentDraft(assessmentId);
      const msg = res?.data?.message || "Assessment submitted.";
      const status = res?.data?.session?.status || "Submitted";
      const maturity = res?.data?.scoreSnapshot?.maturityLevel;
      toast.success(`${msg} Status: ${status}${maturity ? ` · ${maturity}` : ""}.`);
      router.push(`/assessments/${assessmentId}/results`);
    } catch (err: unknown) {
      const statusCode = (err as { status?: number })?.status;
      const msg = getApiErrorMessage(err, "Submission failed.");
      if (!statusCode || statusCode >= 500 || statusCode === 408) {
        try {
          const check = await assessmentService.getAssessmentById(assessmentId);
          if (check?.data?.session?.status === "Submitted") {
            clearAssessmentDraft(assessmentId);
            toast.info("Assessment was already submitted. Opening results.");
            router.push(`/assessments/${assessmentId}/results`);
            return;
          }
        } catch {
          /* keep error */
        }
      }
      setSubmitResult(msg);
      toast.error(msg);
      setSubmitting(false);
    }
  };

  if (loading) return <AssessmentReviewSkeleton />;

  if (error || !session) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center space-y-3">
        <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto" />
        <p className="text-sm text-slate-700">{error || "Assessment not found."}</p>
        <Link href={`/assessments/${assessmentId}`} className="text-sm font-semibold text-blue-700">
          Back to workspace
        </Link>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3">
          <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
          <h1 className="text-lg font-bold text-slate-900">Already submitted</h1>
          <p className="text-sm text-slate-600">
            This assessment is locked. View results and reports below.
          </p>
          <Link
            href={`/assessments/${assessmentId}/results`}
            className="inline-flex px-5 py-2.5 bg-emerald-700 text-white text-xs font-semibold rounded-xl"
          >
            View results
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-start gap-3 border-b border-slate-200 pb-4">
        <Link
          href={`/assessments/${assessmentId}`}
          className="p-2 rounded-lg border border-slate-200 bg-white shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="page-title font-editorial">Pre-submission review</h1>
          <p className="text-sm text-slate-500">
            Confirm completion before final scoring. Unanswered controls may score as zero per backend
            rules.
          </p>
        </div>
      </div>

      {incompleteCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex gap-3 text-sm text-amber-900">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p>
            <strong>{incompleteCount}</strong> control(s) are not fully completed. Submitting now may
            score unanswered items as zero or not assessed.
          </p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <InfoCard title="Organization" value={organizationNameFromSession(session)} />
        <InfoCard title="Assessment type" value={session.assessmentType} />
        <InfoCard title="Framework version" value={session.frameworkVersion} />
        <InfoCard
          title="Auditor"
          value={
            <>
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> {auditorNameFromSession(session)}
              </span>
              {auditorEmailFromSession(session) && (
                <span className="text-xs font-normal text-slate-500 block mt-0.5">
                  {auditorEmailFromSession(session)}
                </span>
              )}
            </>
          }
        />
      </div>

      {progressData && (
        <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-900">Completion</h2>
          <p className="text-3xl font-bold text-slate-900 tabular-nums">
            {progressData.overallCompletionPercentage}%
          </p>
          <p className="text-xs text-slate-500">
            {progressData.completedQuestions} of {progressData.totalQuestions} controls completed
          </p>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${progressData.overallCompletionPercentage}%` }}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 border-b">
                  <th className="py-2 pr-2">Pillar</th>
                  <th className="py-2">Done</th>
                  <th className="py-2">Incomplete</th>
                  <th className="py-2">Not started</th>
                  <th className="py-2">Exceptions</th>
                </tr>
              </thead>
              <tbody>
                {progressData.pillarBreakdown?.map((p) => (
                  <tr key={p.pillarId} className="border-b border-slate-50">
                    <td className="py-2 pr-2 font-medium text-slate-800">{p.pillarName}</td>
                    <td className="py-2">{p.complete}</td>
                    <td className="py-2">{p.inProgress}</td>
                    <td className="py-2">{p.notStarted}</td>
                    <td className="py-2">{p.exceptionsNoted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="bg-white rounded-2xl border border-slate-200 p-5 grid sm:grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-slate-900">{progressData?.completedQuestions ?? "—"}</p>
          <p className="text-[11px] uppercase font-semibold text-slate-500">Completed</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-amber-700">{incompleteCount}</p>
          <p className="text-[11px] uppercase font-semibold text-slate-500">Incomplete / open</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-rose-700">{exceptionCount}</p>
          <p className="text-[11px] uppercase font-semibold text-slate-500">Exceptions noted</p>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-3">
        <Paperclip className="h-5 w-5 text-slate-400" />
        <div className="text-sm">
          <p className="font-semibold text-slate-900">Evidence summary</p>
          <p className="text-slate-500 text-xs mt-0.5">
            {evidenceStats.withEvidence} attachment(s) · {evidenceStats.withNotes} note(s) on record
            (no mandatory evidence gate on submit).
          </p>
        </div>
      </section>

      <section className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm text-slate-700 leading-relaxed">
            I acknowledge that submitting this assessment will finalize responses and trigger backend
            scoring. This checkbox is a UI confirmation only and does not replace any formal attestation
            required by my organization or client contract.
          </span>
        </label>
        {submitResult && (
          <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
            {submitResult}
          </p>
        )}
        <button
          type="button"
          disabled={!acknowledged || submitting}
          onClick={handleFinalSubmit}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-blue-600 text-white text-sm font-semibold rounded-xl disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" /> Final submit for scoring
            </>
          )}
        </button>
      </section>
    </div>
  );
}

function InfoCard({ title, value }: { title: string; value: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{title}</p>
      <p className="text-sm font-semibold text-slate-900 mt-1">{value}</p>
    </div>
  );
}
