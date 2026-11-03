"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { assessmentService } from "@/services/assessment.service";
import {
  AssessmentProgressResponse,
  AssessmentSession,
  ExceptionStatus,
  TestStatus,
} from "@/types/assessment.types";
import { FrameworkQuestion } from "@/types/framework.types";
import { getApiErrorMessage, getUserFacingApiError } from "@/lib/authUser";
import { useToast } from "@/context/ToastContext";
import { useFullAssessmentAutosave } from "@/hooks/useFullAssessmentAutosave";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { AssessmentWorkspaceSkeleton } from "@/components/shared/PageSkeletons";
import { FullEvidenceUpload } from "@/components/features/assessments/FullEvidenceUpload";
import {
  fullAnswerFromSessionItem,
  FullControlAnswerState,
  groupQuestionsByPillar,
  isControlAssessed,
  isControlInProgress,
  optionCodeForException,
} from "@/lib/fullAssessmentAnswers";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileCheck2,
  Loader2,
  RefreshCw,
  Save,
  ShieldAlert,
  Layers,
} from "lucide-react";

export interface FullAssessmentPlayerProps {
  assessmentId: string;
}

function companyLabel(session: AssessmentSession): string {
  const c = session.companyId;
  if (c && typeof c === "object" && "name" in c) {
    return String((c as { name?: string }).name || "Client organization");
  }
  return "Client organization";
}

const TEST_STATUS_OPTIONS: { value: TestStatus; label: string }[] = [
  { value: "NotStarted", label: "Not started" },
  { value: "InProgress", label: "In progress" },
  { value: "Complete", label: "Complete" },
];

const EXCEPTION_OPTIONS: { value: ExceptionStatus; label: string }[] = [
  { value: "NotAssessed", label: "Not assessed" },
  { value: "NoExceptionNoted", label: "No exception noted" },
  { value: "ExceptionNoted", label: "Exception noted" },
];

export function FullAssessmentPlayer({ assessmentId }: FullAssessmentPlayerProps) {
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLinkQuestionId = searchParams.get("q");

  const [session, setSession] = useState<AssessmentSession | null>(null);
  const [questions, setQuestions] = useState<FrameworkQuestion[]>([]);
  const [frameworkTitle, setFrameworkTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [answersByQuestionId, setAnswersByQuestionId] = useState<
    Record<string, FullControlAnswerState>
  >({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dirty, setDirty] = useState(false);

  const [progress, setProgress] = useState<AssessmentProgressResponse | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [navigatingReview, setNavigatingReview] = useState(false);

  const isSubmitted = session?.status === "Submitted";

  const refreshProgress = useCallback(async () => {
    if (!assessmentId) return;
    setProgressLoading(true);
    setProgressError(null);
    try {
      const res = await assessmentService.getProgress(assessmentId);
      if (res?.data) setProgress(res.data);
    } catch (err: unknown) {
      setProgressError(getApiErrorMessage(err, "Failed to load progress."));
    } finally {
      setProgressLoading(false);
    }
  }, [assessmentId]);

  const {
    status: autosaveStatus,
    notice: autosaveNotice,
    flush: flushAutosave,
    retry: retryAutosave,
  } = useFullAssessmentAutosave({
    assessmentId,
    questions,
    answersByQuestionId,
    dirty,
    setDirty,
    enabled: Boolean(session && !isSubmitted),
    onSaved: () => {
      void refreshProgress();
    },
  });

  const loadAssessment = useCallback(async () => {
    if (!assessmentId) {
      setError("Invalid assessment link.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await assessmentService.getAssessmentById(assessmentId);
      const payload = res?.data;
      if (!payload?.session) {
        setError("Assessment session returned an unexpected format.");
        setSession(null);
        setQuestions([]);
        return;
      }

      if (payload.session.assessmentType !== "Full") {
        setError("This workspace is for Full assessments only.");
        setSession(payload.session);
        setQuestions([]);
        return;
      }

      setSession(payload.session);

      const fw = payload.framework;
      if (!fw?.questions?.length) {
        setQuestions([]);
        setFrameworkTitle(fw?.title || "");
        setError(
          "No published Full framework controls were returned for this session. Confirm the Full framework is seeded and published."
        );
        return;
      }

      const sorted = [...fw.questions]
        .filter((q) => q.isActive !== false)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setQuestions(sorted);
      setFrameworkTitle(
        fw.title || `Full Assessment · v${payload.session.frameworkVersion}`
      );

      const initial: Record<string, FullControlAnswerState> = {};
      for (const q of sorted) {
        const existing = (payload.session.answers || []).find(
          (a) => a.questionId === q.questionId
        );
        initial[q.questionId] = fullAnswerFromSessionItem(existing);
      }
      setAnswersByQuestionId(initial);
      setDirty(false);

      const linkIdx = deepLinkQuestionId
        ? sorted.findIndex((q) => q.questionId === deepLinkQuestionId)
        : -1;
      const resumeId = payload.session.resumptionAid?.currentQuestionId;
      const resumeIdx = resumeId
        ? sorted.findIndex((q) => q.questionId === resumeId)
        : -1;
      setCurrentIndex(linkIdx >= 0 ? linkIdx : resumeIdx >= 0 ? resumeIdx : 0);

      void refreshProgress();
    } catch (err: unknown) {
      setError(getUserFacingApiError(err, "this Full assessment"));
      setSession(null);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [assessmentId, deepLinkQuestionId, refreshProgress]);

  useEffect(() => {
    loadAssessment();
  }, [loadAssessment]);

  const pillars = useMemo(() => groupQuestionsByPillar(questions), [questions]);

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion
    ? answersByQuestionId[currentQuestion.questionId]
    : undefined;

  /** Local presentation counts (while saves pending) — labeled separately from API progress. */
  const localCounts = useMemo(() => {
    let completed = 0;
    let inProgress = 0;
    let notTested = 0;
    let exceptions = 0;
    for (const q of questions) {
      const state = answersByQuestionId[q.questionId];
      if (!state) {
        notTested++;
        continue;
      }
      if (state.exceptionStatus === "ExceptionNoted") exceptions++;
      if (isControlAssessed(state) || state.testStatus === "Complete") {
        completed++;
      } else if (isControlInProgress(state)) {
        inProgress++;
      } else {
        notTested++;
      }
    }
    return { completed, inProgress, notTested, exceptions, total: questions.length };
  }, [questions, answersByQuestionId]);

  const apiInProgressTotal = useMemo(() => {
    if (!progress?.pillarBreakdown) return null;
    return progress.pillarBreakdown.reduce((s, p) => s + (p.inProgress || 0), 0);
  }, [progress]);

  const apiNotStartedTotal = useMemo(() => {
    if (!progress?.pillarBreakdown) return null;
    return progress.pillarBreakdown.reduce((s, p) => s + (p.notStarted || 0), 0);
  }, [progress]);

  const apiExceptionsTotal = useMemo(() => {
    if (!progress?.pillarBreakdown) return null;
    return progress.pillarBreakdown.reduce((s, p) => s + (p.exceptionsNoted || 0), 0);
  }, [progress]);

  const displayCompleted = progress?.completedQuestions ?? localCounts.completed;
  const displayTotal = progress?.totalQuestions ?? localCounts.total;
  const displayPercent =
    progress?.overallCompletionPercentage ??
    (localCounts.total
      ? Math.round((localCounts.completed / localCounts.total) * 100)
      : 0);
  const displayInProgress = apiInProgressTotal ?? localCounts.inProgress;
  const displayNotStarted = apiNotStartedTotal ?? localCounts.notTested;
  const displayExceptions = apiExceptionsTotal ?? localCounts.exceptions;

  const pillarStats = useMemo(() => {
    return pillars.map((p) => {
      const fromApi = progress?.pillarBreakdown?.find(
        (b) => b.pillarId === p.pillarId || b.pillarNumber === p.pillarNumber
      );
      if (fromApi) {
        return {
          ...p,
          completed: fromApi.complete,
          total: fromApi.total,
          percent: Math.round(fromApi.completionPercentage || 0),
        };
      }
      let completed = 0;
      for (const q of p.questions) {
        const state = answersByQuestionId[q.questionId];
        if (state && (isControlAssessed(state) || state.testStatus === "Complete")) {
          completed++;
        }
      }
      const total = p.questions.length;
      return {
        ...p,
        completed,
        total,
        percent: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });
  }, [pillars, answersByQuestionId, progress]);

  const updateCurrent = (patch: Partial<FullControlAnswerState>) => {
    if (!currentQuestion || isSubmitted) return;
    setAnswersByQuestionId((prev) => {
      const prevState = prev[currentQuestion.questionId] || fullAnswerFromSessionItem();
      const next: FullControlAnswerState = { ...prevState, ...patch };

      if (patch.exceptionStatus !== undefined) {
        // Clear placeholder codes for NotAssessed so autosave won't fan out to every control
        next.selectedOptionCode =
          patch.exceptionStatus === "NotAssessed"
            ? undefined
            : optionCodeForException(patch.exceptionStatus);
        if (
          patch.exceptionStatus !== "NotAssessed" &&
          next.testStatus === "NotStarted"
        ) {
          next.testStatus = "Complete";
        }
      }

      return { ...prev, [currentQuestion.questionId]: next };
    });
    setDirty(true);
  };

  const handleManualSave = async () => {
    const ok = await flushAutosave();
    if (ok) {
      toast.success("Evaluations saved.", {
        dedupeKey: "full-assessment-manual-save",
        durationMs: 2200,
      });
    }
  };

  const handleEvidenceUploaded = async (result: {
    fileUrl: string;
    s3Key: string;
    fileName: string;
  }) => {
    if (!currentQuestion || isSubmitted) return;
    const qid = currentQuestion.questionId;
    setAnswersByQuestionId((prev) => {
      const prevState = prev[qid] || fullAnswerFromSessionItem();
      return {
        ...prev,
        [qid]: {
          ...prevState,
          evidenceAttachmentUrl: result.fileUrl,
          testStatus:
            prevState.testStatus === "NotStarted" ? "InProgress" : prevState.testStatus,
        },
      };
    });

    // Persist attachment onto answer row (backend upload only links if row already exists)
    const state = {
      ...(answersByQuestionId[qid] || fullAnswerFromSessionItem()),
      evidenceAttachmentUrl: result.fileUrl,
      testStatus:
        (answersByQuestionId[qid]?.testStatus || "NotStarted") === "NotStarted"
          ? ("InProgress" as const)
          : answersByQuestionId[qid]?.testStatus || ("InProgress" as const),
    };
    try {
      await assessmentService.saveAnswers(assessmentId, [
        {
          questionId: qid,
          pillarId: currentQuestion.pillarId,
          testStatus: state.testStatus,
          exceptionStatus: state.exceptionStatus,
          selectedOptionCode:
            state.exceptionStatus === "NotAssessed"
              ? undefined
              : state.selectedOptionCode ||
                optionCodeForException(state.exceptionStatus),
          evidenceNotes: state.evidenceNotes.trim() || undefined,
          workPaperReference: state.workPaperReference.trim() || undefined,
          evidenceAttachmentUrl: result.fileUrl,
          s3Key: result.s3Key,
        },
      ]);
      setDirty(false);
      toast.success(`Evidence attached: ${result.fileName}`, {
        dedupeKey: "full-evidence-upload",
        durationMs: 2500,
      });
      void refreshProgress();
    } catch (err: unknown) {
      setDirty(true);
      toast.error(getApiErrorMessage(err, "File uploaded but linking to control failed."));
    }
  };

  const goToIndex = (index: number) => {
    if (index < 0 || index >= questions.length) return;
    setCurrentIndex(index);
  };

  const goToPillar = (pillarId: string) => {
    const idx = questions.findIndex((q) => q.pillarId === pillarId);
    if (idx >= 0) setCurrentIndex(idx);
  };

  const goToReview = async () => {
    if (navigatingReview) return;
    setNavigatingReview(true);
    try {
      if (!isSubmitted && dirty) {
        const ok = await flushAutosave();
        if (!ok) {
          toast.error("Save failed. Fix errors before opening review.");
          setNavigatingReview(false);
          return;
        }
      }
      router.push(`/assessments/${assessmentId}/review`);
    } catch {
      setNavigatingReview(false);
    }
  };

  if (loading) {
    return <AssessmentWorkspaceSkeleton />;
  }

  if (error && !session) {
    return (
      <div className="max-w-2xl mx-auto p-8 bg-white rounded-xl border border-red-200 text-center space-y-4">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
        <p className="text-sm text-slate-700">{error}</p>
        <div className="flex justify-center gap-3">
          <Link href="/assessments" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
            Back to assessments
          </Link>
          <button
            type="button"
            onClick={loadAssessment}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700"
          >
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!session || !currentQuestion || !currentAnswer) {
    return null;
  }

  const activePillarId = currentQuestion.pillarId;
  const saveLabel =
    autosaveStatus === "saving"
      ? "Saving…"
      : autosaveStatus === "saved"
        ? "Saved"
        : autosaveStatus === "failed"
          ? "Save failed"
          : dirty
            ? "Unsaved"
            : "Idle";

  return (
    <div className="max-w-[1400px] mx-auto pb-12 space-y-4">
      <div className="glass-header rounded-2xl px-4 sm:px-6 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Link
            href="/assessments"
            className="p-2 rounded-xl border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 transition shadow-2xs shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="page-title font-editorial truncate">{frameworkTitle}</h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-700 text-white">
                Full
              </span>
              {isSubmitted && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Submitted · read-only
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {companyLabel(session)} · Framework v{session.frameworkVersion} ·{" "}
              {questions.length} controls
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadAssessment}
            className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg text-slate-600 hover:bg-white inline-flex items-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          {!isSubmitted && (
            <>
              <button
                type="button"
                onClick={handleManualSave}
                disabled={autosaveStatus === "saving"}
                className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg bg-white hover:bg-slate-50 inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {autosaveStatus === "saving" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {dirty ? "Save now" : "Save"}
              </button>
              {autosaveStatus === "failed" && (
                <button
                  type="button"
                  onClick={() => void retryAutosave()}
                  className="px-3 py-2 text-xs font-semibold border border-rose-200 text-rose-700 rounded-lg bg-rose-50"
                >
                  Retry save
                </button>
              )}
              <button
                type="button"
                onClick={goToReview}
                disabled={navigatingReview || autosaveStatus === "saving"}
                className="px-4 py-2 text-xs font-semibold bg-gradient-to-r from-teal-600 to-blue-600 text-white rounded-lg shadow-md hover:opacity-95 inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {navigatingReview ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ClipboardCheck className="h-3.5 w-3.5" />
                )}
                Review &amp; submit
              </button>
            </>
          )}
          {isSubmitted && (
            <>
              <Link
                href={`/assessments/${assessmentId}/results`}
                className="px-4 py-2 text-xs font-semibold bg-teal-600 text-white rounded-lg inline-flex items-center gap-1.5"
              >
                <FileCheck2 className="h-3.5 w-3.5" /> Results
              </Link>
              <Link
                href={`/assessments/${assessmentId}/findings`}
                className="px-4 py-2 text-xs font-semibold border border-indigo-200 bg-indigo-50 text-indigo-900 rounded-lg inline-flex items-center gap-1.5"
              >
                Findings
              </Link>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900 flex gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {autosaveNotice && (
        <div
          className={cn(
            "p-3 rounded-lg text-xs font-medium border",
            autosaveStatus === "saved"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : autosaveStatus === "failed"
                ? "bg-rose-50 text-rose-800 border-rose-200"
                : autosaveStatus === "saving"
                  ? "bg-sky-50 text-sky-900 border-sky-200"
                  : "bg-slate-50 text-slate-700 border-slate-200"
          )}
        >
          {autosaveNotice}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <aside className="xl:col-span-3 space-y-3 xl:sticky xl:top-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-indigo-600" />
              <div>
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Seven pillars
                </h2>
                <p className="text-[11px] text-slate-500">
                  {progress ? "Server progress" : "Local preview until first save"}
                </p>
              </div>
            </div>
            <ul className="max-h-[560px] overflow-y-auto p-2 space-y-1">
              {pillarStats.map((p) => {
                const active = p.pillarId === activePillarId;
                return (
                  <li key={p.pillarId}>
                    <button
                      type="button"
                      onClick={() => goToPillar(p.pillarId)}
                      className={cn(
                        "w-full text-left rounded-xl px-3 py-2.5 transition-all border",
                        active
                          ? "border-indigo-500/40 bg-indigo-50/70 shadow-sm ring-1 ring-indigo-500/10"
                          : "border-transparent hover:bg-slate-50"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-800 line-clamp-2">
                          P{p.pillarNumber}. {p.pillarName}
                        </span>
                        {p.percent === 100 ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        ) : null}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-medium text-slate-600">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100">
                          {p.total} controls
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          {p.completed} done
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-900">
                          {p.percent}%
                        </span>
                      </div>
                      <div className="mt-2 h-1 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 transition-all duration-500"
                          style={{ width: `${p.percent}%` }}
                        />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        <main className="xl:col-span-6">
          <article
            key={currentQuestion.questionId}
            className="assessment-question-enter bg-white rounded-2xl border border-slate-200/90 shadow-md overflow-hidden"
          >
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-700 text-white">
                  {currentQuestion.questionId}
                </span>
                <span>
                  Pillar {currentQuestion.pillarNumber}: {currentQuestion.pillarName}
                </span>
                {currentQuestion.assuranceTier && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      Tier: {currentQuestion.assuranceTier}
                    </span>
                  </>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                {currentQuestion.text}
              </h2>
              {currentQuestion.controlDescription && (
                <p className="text-xs text-slate-600 leading-relaxed">
                  {currentQuestion.controlDescription}
                </p>
              )}
            </div>

            <div className="p-5 sm:p-6 space-y-5">
              {currentQuestion.testProcedure && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Test procedure
                  </p>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {currentQuestion.testProcedure}
                  </p>
                </div>
              )}

              <fieldset disabled={isSubmitted} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Test status
                  </label>
                  <select
                    value={currentAnswer.testStatus}
                    onChange={(e) =>
                      updateCurrent({ testStatus: e.target.value as TestStatus })
                    }
                    className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  >
                    {TEST_STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Exception status
                  </label>
                  <select
                    value={currentAnswer.exceptionStatus}
                    onChange={(e) =>
                      updateCurrent({
                        exceptionStatus: e.target.value as ExceptionStatus,
                      })
                    }
                    className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  >
                    {EXCEPTION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </fieldset>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Auditor findings / evidence notes
                </label>
                <textarea
                  disabled={isSubmitted}
                  value={currentAnswer.evidenceNotes}
                  onChange={(e) => updateCurrent({ evidenceNotes: e.target.value })}
                  rows={4}
                  maxLength={3000}
                  placeholder="Document observations, interviews, and evidence review notes…"
                  className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-y min-h-[96px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Workpaper reference
                </label>
                <input
                  disabled={isSubmitted}
                  value={currentAnswer.workPaperReference}
                  onChange={(e) =>
                    updateCurrent({ workPaperReference: e.target.value })
                  }
                  maxLength={100}
                  placeholder="e.g. WP-P1-C03 / SharePoint path"
                  className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>

              <FullEvidenceUpload
                assessmentId={assessmentId}
                questionId={currentQuestion.questionId}
                disabled={isSubmitted}
                existingUrl={currentAnswer.evidenceAttachmentUrl}
                onUploaded={handleEvidenceUploaded}
              />

              {currentQuestion.regulatoryAlignments && (
                <div className="rounded-xl border border-slate-200 p-3.5 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Regulatory mappings
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    {currentQuestion.regulatoryAlignments.euAiAct && (
                      <p>
                        <span className="font-semibold text-slate-700">EU AI Act: </span>
                        <span className="text-slate-600">
                          {currentQuestion.regulatoryAlignments.euAiAct}
                        </span>
                      </p>
                    )}
                    {currentQuestion.regulatoryAlignments.nistAiRmf && (
                      <p>
                        <span className="font-semibold text-slate-700">NIST AI RMF: </span>
                        <span className="text-slate-600">
                          {currentQuestion.regulatoryAlignments.nistAiRmf}
                        </span>
                      </p>
                    )}
                    {currentQuestion.regulatoryAlignments.iso42001 && (
                      <p>
                        <span className="font-semibold text-slate-700">ISO 42001: </span>
                        <span className="text-slate-600">
                          {currentQuestion.regulatoryAlignments.iso42001}
                        </span>
                      </p>
                    )}
                    {currentQuestion.regulatoryAlignments.oecdAi && (
                      <p>
                        <span className="font-semibold text-slate-700">OECD AI: </span>
                        <span className="text-slate-600">
                          {currentQuestion.regulatoryAlignments.oecdAi}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-xs text-slate-500">
                Control{" "}
                <span className="font-semibold text-slate-800">{currentIndex + 1}</span> of{" "}
                <span className="font-semibold text-slate-800">{questions.length}</span>
                <span className="ml-2 font-medium text-slate-700">· {saveLabel}</span>
              </p>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => goToIndex(currentIndex - 1)}
                  disabled={currentIndex === 0}
                  className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 inline-flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                <button
                  type="button"
                  onClick={() => goToIndex(currentIndex + 1)}
                  disabled={currentIndex >= questions.length - 1}
                  className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 inline-flex items-center gap-1 shadow-md"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </article>
        </main>

        <aside className="xl:col-span-3 space-y-3 xl:sticky xl:top-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Overall progress
              </p>
              <button
                type="button"
                onClick={() => void refreshProgress()}
                disabled={progressLoading}
                className="text-[10px] font-semibold text-indigo-700 inline-flex items-center gap-1"
              >
                <RefreshCw className={cn("h-3 w-3", progressLoading && "animate-spin")} />
                Refresh
              </button>
            </div>
            {progressError && (
              <p className="text-[11px] text-rose-700">{progressError}</p>
            )}
            <p className="text-3xl font-bold text-slate-900 tabular-nums">
              <AnimatedNumber value={Math.round(displayPercent)} suffix="%" duration={700} />
            </p>
            <p className="text-[11px] text-slate-500">
              {progress
                ? "Authoritative backend completion"
                : "Local preview — save to sync server progress"}
            </p>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-700"
                style={{ width: `${Math.min(100, displayPercent)}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg border border-slate-200 px-2.5 py-2">
                <p className="text-slate-500 font-medium">Completed</p>
                <p className="text-base font-bold text-emerald-700 tabular-nums">
                  {displayCompleted}/{displayTotal}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 px-2.5 py-2">
                <p className="text-slate-500 font-medium">In progress</p>
                <p className="text-base font-bold text-blue-700 tabular-nums">
                  {displayInProgress}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 px-2.5 py-2">
                <p className="text-slate-500 font-medium">Not started</p>
                <p className="text-base font-bold text-slate-700 tabular-nums">
                  {displayNotStarted}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 px-2.5 py-2">
                <p className="text-slate-500 font-medium flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3 text-rose-500" /> Exceptions
                </p>
                <p className="text-base font-bold text-rose-700 tabular-nums">
                  {displayExceptions}
                </p>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Save status: <span className="font-semibold text-slate-800">{saveLabel}</span>
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 px-1">
              Quick navigation
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-[280px] overflow-y-auto">
              {questions.map((q, i) => {
                const state = answersByQuestionId[q.questionId];
                const assessed = state && isControlAssessed(state);
                const exception = state?.exceptionStatus === "ExceptionNoted";
                const inProg = state && isControlInProgress(state);
                const isCurrent = i === currentIndex;
                return (
                  <button
                    key={q.questionId}
                    type="button"
                    title={q.questionId}
                    onClick={() => goToIndex(i)}
                    className={cn(
                      "h-8 min-w-8 px-1 rounded-lg text-[10px] font-bold transition-all",
                      isCurrent && "ring-2 ring-indigo-500 ring-offset-1 scale-105",
                      exception && "bg-rose-500 text-white",
                      assessed && !exception && "bg-emerald-500 text-white",
                      inProg && !assessed && "bg-blue-100 text-blue-800",
                      !assessed && !inProg && "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
