"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { assessmentService } from "@/services/assessment.service";
import {
  organizationNameFromSession,
  auditorNameFromSession,
  auditorEmailFromSession,
} from "@/lib/assessmentDisplay";
import { buildFullSavePayload, fullAnswerFromSessionItem } from "@/lib/fullAssessmentAnswers";
import { getApiErrorMessage, getUserFacingApiError } from "@/lib/authUser";
import { useToast } from "@/context/ToastContext";
import {
  AssessmentProgressResponse,
  AssessmentSession,
} from "@/types/assessment.types";
import { FrameworkQuestion } from "@/types/framework.types";
import { AssessmentReviewSkeleton } from "@/components/shared/PageSkeletons";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Send,
  Paperclip,
  User,
  ExternalLink,
} from "lucide-react";

interface FullAssessmentReviewProps {
  assessmentId: string;
}

export function FullAssessmentReview({ assessmentId }: FullAssessmentReviewProps) {
  const router = useRouter();
  const toast = useToast();

  const [session, setSession] = useState<AssessmentSession | null>(null);
  const [questions, setQuestions] = useState<FrameworkQuestion[]>([]);
  const [progress, setProgress] = useState<AssessmentProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [flushing, setFlushing] = useState(false);
  const [submitResult, setSubmitResult] = useState<string | null>(null);
  const [saveStatusNote, setSaveStatusNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!assessmentId) return;
    setLoading(true);
    setError(null);
    try {
      const detailRes = await assessmentService.getAssessmentById(assessmentId);
      const detail = detailRes?.data;
      if (!detail?.session) {
        setError("Could not load assessment session.");
        return;
      }
      setSession(detail.session);
      const qs = detail.framework?.questions
        ? [...detail.framework.questions]
            .filter((q) => q.isActive !== false)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        : [];
      setQuestions(qs);

      const progressRes = await assessmentService.getProgress(assessmentId);
      if (progressRes?.data) setProgress(progressRes.data);

      if (detail.session.status === "Submitted") {
        setSubmitResult("This assessment has already been submitted.");
      }
    } catch (err: unknown) {
      setError(getUserFacingApiError(err, "Full assessment review"));
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    load();
  }, [load]);

  const isSubmitted = session?.status === "Submitted";

  const answersByQuestionId = useMemo(() => {
    const map: Record<string, ReturnType<typeof fullAnswerFromSessionItem>> = {};
    for (const q of questions) {
      const existing = session?.answers?.find((a) => a.questionId === q.questionId);
      map[q.questionId] = fullAnswerFromSessionItem(existing);
    }
    return map;
  }, [questions, session]);

  const evidenceStats = useMemo(() => {
    let withEvidence = 0;
    let withNotes = 0;
    for (const a of session?.answers || []) {
      if (a.evidenceAttachmentUrl || a.s3Key) withEvidence++;
      if (a.evidenceNotes?.trim()) withNotes++;
    }
    return { withEvidence, withNotes };
  }, [session]);

  const exceptionCount = useMemo(() => {
    return (session?.answers || []).filter(
      (a) =>
        a.exceptionStatus === "ExceptionNoted" ||
        a.selectedOptionCode === "EXCEPTION_NOTED"
    ).length;
  }, [session]);

  const incompleteCount = useMemo(() => {
    if (!progress) return 0;
    return Math.max(0, progress.totalQuestions - progress.completedQuestions);
  }, [progress]);

  const attentionControls = useMemo(() => {
    return questions.filter((q) => {
      const a = session?.answers?.find((x) => x.questionId === q.questionId);
      if (!a) return true;
      if (a.exceptionStatus === "ExceptionNoted") return true;
      const meaningful =
        a.exceptionStatus === "NoExceptionNoted" ||
        a.selectedOptionCode === "NO_EXCEPTION_NOTED" ||
        a.selectedOptionCode === "EXCEPTION_NOTED";
      // NOT_ASSESSED placeholders and untouched rows still need attention
      if (!meaningful) return true;
      return false;
    });
  }, [questions, session]);

  const flushPending = async (): Promise<boolean> => {
    if (!session || isSubmitted) return true;
    setFlushing(true);
    setSaveStatusNote("Flushing evaluations…");
    try {
      const payload = buildFullSavePayload(questions, answersByQuestionId);
      if (payload.length > 0) {
        await assessmentService.saveAnswers(assessmentId, payload);
        setSaveStatusNote(`Saved ${payload.length} control(s) before submit.`);
        const refreshed = await assessmentService.getAssessmentById(assessmentId);
        if (refreshed?.data?.session) setSession(refreshed.data.session);
        const progressRes = await assessmentService.getProgress(assessmentId);
        if (progressRes?.data) setProgress(progressRes.data);
      } else {
        setSaveStatusNote("No pending control changes to flush.");
      }
      return true;
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, "Failed to save before submit.");
      setSaveStatusNote(msg);
      setSubmitResult(msg);
      return false;
    } finally {
      setFlushing(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!session || isSubmitted || submitting || !acknowledged) return;
    setSubmitting(true);
    setSubmitResult(null);
    setConfirmOpen(false);

    try {
      const flushed = await flushPending();
      if (!flushed) {
        setSubmitting(false);
        return;
      }

      const res = await assessmentService.submitAssessment(assessmentId);
      const msg = res?.data?.message || "Assessment submitted.";
      const status = res?.data?.session?.status || "Submitted";
      const maturity = res?.data?.scoreSnapshot?.maturityLevel;
      toast.success(`${msg} Status: ${status}${maturity ? ` · ${maturity}` : ""}.`);
      router.push(`/assessments/${assessmentId}/results`);
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      const msg = getApiErrorMessage(err, "Submission failed.");

      // Ambiguous network/timeout — re-check session before allowing retry
      if (!status || status >= 500 || status === 408) {
        try {
          const check = await assessmentService.getAssessmentById(assessmentId);
          if (check?.data?.session?.status === "Submitted") {
            toast.info("Assessment was already submitted. Opening results.");
            router.push(`/assessments/${assessmentId}/results`);
            return;
          }
        } catch {
          /* keep original error */
        }
      }

      if (status === 400 && /already submitted/i.test(msg)) {
        toast.info("Already submitted. Opening results.");
        router.push(`/assessments/${assessmentId}/results`);
        return;
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
            This Full assessment is locked (read-only). Scores, findings, and reports are available
            below.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <Link
              href={`/assessments/${assessmentId}/results`}
              className="inline-flex px-5 py-2.5 bg-emerald-700 text-white text-xs font-semibold rounded-xl"
            >
              Results &amp; reports
            </Link>
            <Link
              href={`/assessments/${assessmentId}/findings`}
              className="inline-flex px-5 py-2.5 border border-emerald-300 bg-white text-emerald-900 text-xs font-semibold rounded-xl"
            >
              Findings
            </Link>
            <Link
              href={`/assessments/${assessmentId}`}
              className="inline-flex px-5 py-2.5 border border-slate-200 bg-white text-slate-700 text-xs font-semibold rounded-xl"
            >
              Workspace
            </Link>
          </div>
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
          <h1 className="page-title font-editorial">Full Assessment review</h1>
          <p className="text-sm text-slate-500">
            Confirm control evaluations before final backend scoring. Incomplete controls may
            remain Not Assessed per scoring rules.
          </p>
        </div>
      </div>

      {incompleteCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex gap-3 text-sm text-amber-900">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p>
            <strong>{incompleteCount}</strong> control(s) are not fully completed. Submitting now
            is allowed by the backend; unassessed controls typically reduce compliance percentage.
          </p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <InfoCard title="Organization" value={organizationNameFromSession(session)} />
        <InfoCard title="Assessment type" value="Full" />
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

      {progress && (
        <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-900">Backend completion</h2>
          <p className="text-3xl font-bold text-slate-900 tabular-nums">
            {progress.overallCompletionPercentage}%
          </p>
          <p className="text-xs text-slate-500">
            {progress.completedQuestions} of {progress.totalQuestions} controls completed
          </p>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all"
              style={{ width: `${progress.overallCompletionPercentage}%` }}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 border-b">
                  <th className="py-2 pr-2">Pillar</th>
                  <th className="py-2">Done</th>
                  <th className="py-2">In progress</th>
                  <th className="py-2">Not started</th>
                  <th className="py-2">Exceptions</th>
                </tr>
              </thead>
              <tbody>
                {progress.pillarBreakdown?.map((p) => (
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
          <p className="text-2xl font-bold text-slate-900">
            {progress?.completedQuestions ?? "—"}
          </p>
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
            {evidenceStats.withEvidence} attachment(s) · {evidenceStats.withNotes} note(s) on
            record. Evidence is not a mandatory submit gate.
          </p>
        </div>
      </section>

      {attentionControls.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900">
            Controls requiring attention ({attentionControls.length})
          </h2>
          <ul className="max-h-56 overflow-y-auto divide-y divide-slate-100">
            {attentionControls.slice(0, 40).map((q) => {
              const a = session.answers?.find((x) => x.questionId === q.questionId);
              const label = !a
                ? "Not started"
                : a.exceptionStatus === "ExceptionNoted"
                  ? "Exception noted"
                  : a.testStatus === "InProgress"
                    ? "In progress"
                    : "Not assessed";
              return (
                <li
                  key={q.questionId}
                  className="py-2 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">
                      {q.questionId} · {q.text}
                    </p>
                    <p className="text-slate-500">{label}</p>
                  </div>
                  <Link
                    href={`/assessments/${assessmentId}?q=${encodeURIComponent(q.questionId)}`}
                    className="shrink-0 inline-flex items-center gap-1 text-indigo-700 font-semibold"
                  >
                    Open <ExternalLink className="h-3 w-3" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {saveStatusNote && (
        <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          {saveStatusNote}
        </p>
      )}

      <section className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm text-slate-700 leading-relaxed">
            I acknowledge that submitting this Full assessment will finalize responses and trigger
            backend scoring. This checkbox is a UI confirmation only.
          </span>
        </label>
        {submitResult && (
          <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
            {submitResult}
          </p>
        )}
        <button
          type="button"
          disabled={!acknowledged || submitting || flushing}
          onClick={() => setConfirmOpen(true)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-blue-600 text-white text-sm font-semibold rounded-xl disabled:opacity-50"
        >
          {submitting || flushing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />{" "}
              {flushing ? "Saving…" : "Submitting…"}
            </>
          ) : (
            <>
              <Send className="h-4 w-4" /> Final submit for scoring
            </>
          )}
        </button>
      </section>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Confirm final submission</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              This will lock the Full assessment and run backend scoring. You will not be able to
              edit controls or evidence afterward.
              {incompleteCount > 0 && (
                <>
                  {" "}
                  <strong>{incompleteCount}</strong> control(s) are still incomplete.
                </>
              )}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={submitting}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-700 rounded-lg disabled:opacity-50"
              >
                Confirm submit
              </button>
            </div>
          </div>
        </div>
      )}
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
