"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { assessmentService } from "@/services/assessment.service";
import { AssessmentSession } from "@/types/assessment.types";
import { FrameworkQuestion } from "@/types/framework.types";
import { getApiErrorMessage, getUserFacingApiError } from "@/lib/authUser";
import { useToast } from "@/context/ToastContext";
import {
  clearAssessmentDraft,
  computeResumeIndex,
  loadAssessmentDraft,
  mergeAnswersWithDraft,
  saveAssessmentDraft,
} from "@/lib/assessmentDraftStorage";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { AssessmentWorkspaceSkeleton } from "@/components/shared/PageSkeletons";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Lock,
  RefreshCw,
  Save,
  FileCheck2,
  ListChecks,
  CircleDashed,
  Sparkles,
  SkipForward,
  ClipboardCheck,
} from "lucide-react";

export interface AssessmentPlayerProps {
  assessmentId: string;
}

interface SectionGroup {
  key: string;
  label: string;
  questionIndices: number[];
}

function companyLabel(session: AssessmentSession): string {
  const c = session.companyId;
  if (c && typeof c === "object" && "name" in c) {
    return String((c as { name?: string }).name || "Client organization");
  }
  return "Client organization";
}

function sectionKeyForQuestion(q: FrameworkQuestion): string {
  return q.section || q.pillarName || q.pillarId || "general";
}

function StatPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "emerald" | "amber" | "sky" | "rose";
}) {
  const tones = {
    slate: "bg-slate-100 text-slate-800 border-slate-200",
    emerald: "bg-emerald-50 text-emerald-800 border-emerald-200",
    amber: "bg-amber-50 text-amber-900 border-amber-200",
    sky: "bg-sky-50 text-sky-900 border-sky-200",
    rose: "bg-rose-50 text-rose-800 border-rose-200",
  };
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5 flex flex-col gap-0.5 min-w-[88px] transition-transform hover:scale-[1.02]",
        tones[tone]
      )}
    >
      <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</span>
      <span className="text-xl font-bold tabular-nums leading-none">
        <AnimatedNumber value={value} duration={600} />
      </span>
    </div>
  );
}

export function AssessmentPlayer({ assessmentId }: AssessmentPlayerProps) {
  const toast = useToast();

  const [session, setSession] = useState<AssessmentSession | null>(null);
  const [questions, setQuestions] = useState<FrameworkQuestion[]>([]);
  const [frameworkTitle, setFrameworkTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [answersByQuestionId, setAnswersByQuestionId] = useState<Record<string, string>>({});
  const [skippedQuestionIds, setSkippedQuestionIds] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [navLockMessage, setNavLockMessage] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const draftPersistReady = useRef(false);
  const restoredDraftRef = useRef(false);

  const loadAssessment = useCallback(async () => {
    if (!assessmentId) {
      setError("Invalid assessment link.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setSaveNotice(null);
    draftPersistReady.current = false;

    try {
      const res = await assessmentService.getAssessmentById(assessmentId);
      const payload = res?.data;
      if (!payload?.session) {
        setError("Assessment session returned an unexpected format.");
        setSession(null);
        setQuestions([]);
        return;
      }

      setSession(payload.session);

      const fw = payload.framework;
      if (!fw?.questions?.length) {
        setQuestions([]);
        setFrameworkTitle(fw?.title || "");
        setError(
          "No published framework questions were returned for this session. Confirm the Light framework is seeded and published on the backend."
        );
        return;
      }

      const sorted = [...fw.questions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setQuestions(sorted);
      setFrameworkTitle(fw.title || `${payload.session.assessmentType} Assessment`);

      const initial: Record<string, string> = {};
      for (const a of payload.session.answers || []) {
        if (a.selectedOptionCode) {
          initial[a.questionId] = a.selectedOptionCode;
        }
      }

      const questionIds = sorted.map((q) => q.questionId);
      const sessionSubmitted = payload.session.status === "Submitted";

      if (sessionSubmitted) {
        clearAssessmentDraft(assessmentId);
        setAnswersByQuestionId(initial);
        setSkippedQuestionIds(new Set());
        setCurrentIndex(
          computeResumeIndex(questionIds, initial, new Set(), sorted.length - 1)
        );
      } else {
        const draft = loadAssessmentDraft(assessmentId);
        const merged = mergeAnswersWithDraft(initial, draft);
        const skippedSet = new Set(draft?.skippedQuestionIds ?? []);
        for (const qid of Object.keys(merged)) {
          if (merged[qid]) skippedSet.delete(qid);
        }
        setAnswersByQuestionId(merged);
        setSkippedQuestionIds(skippedSet);
        setCurrentIndex(
          computeResumeIndex(questionIds, merged, skippedSet, draft?.currentIndex)
        );

        if (
          draft &&
          !restoredDraftRef.current &&
          (Object.keys(draft.answers).some((k) => draft.answers[k] !== initial[k]) ||
            (draft.skippedQuestionIds?.length ?? 0) > 0)
        ) {
          restoredDraftRef.current = true;
          toast.info("Restored your in-progress answers from this device.", {
            dedupeKey: "assessment-draft-restored",
            durationMs: 3500,
          });
        }
      }

      draftPersistReady.current = !sessionSubmitted;
    } catch (err: unknown) {
      setError(getUserFacingApiError(err, "this assessment"));
      setSession(null);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [assessmentId, toast]);

  useEffect(() => {
    loadAssessment();
  }, [loadAssessment]);

  useEffect(() => {
    restoredDraftRef.current = false;
  }, [assessmentId]);

  useEffect(() => {
    if (!draftPersistReady.current || !assessmentId || session?.status === "Submitted") {
      return;
    }
    saveAssessmentDraft(assessmentId, {
      answers: answersByQuestionId,
      skippedQuestionIds: Array.from(skippedQuestionIds),
      currentIndex,
    });
  }, [
    assessmentId,
    answersByQuestionId,
    skippedQuestionIds,
    currentIndex,
    session?.status,
  ]);

  const isSubmitted = session?.status === "Submitted";

  const answeredCount = useMemo(
    () => questions.filter((q) => Boolean(answersByQuestionId[q.questionId])).length,
    [questions, answersByQuestionId]
  );

  const skippedCount = useMemo(
    () => questions.filter((q) => skippedQuestionIds.has(q.questionId) && !answersByQuestionId[q.questionId]).length,
    [questions, skippedQuestionIds, answersByQuestionId]
  );

  const remainingCount = useMemo(
    () =>
      questions.filter(
        (q) => !answersByQuestionId[q.questionId] && !skippedQuestionIds.has(q.questionId)
      ).length,
    [questions, answersByQuestionId, skippedQuestionIds]
  );

  const progressPercent = useMemo(() => {
    if (questions.length === 0) return 0;
    return Math.round((answeredCount / questions.length) * 100);
  }, [answeredCount, questions.length]);

  const sections: SectionGroup[] = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, SectionGroup>();
    questions.forEach((q, index) => {
      const key = sectionKeyForQuestion(q);
      if (!map.has(key)) {
        order.push(key);
        map.set(key, { key, label: q.section || q.pillarName || key, questionIndices: [] });
      }
      map.get(key)!.questionIndices.push(index);
    });
    return order.map((k) => map.get(k)!);
  }, [questions]);

  const firstIncompleteIndex = useMemo(() => {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const answered = Boolean(answersByQuestionId[q.questionId]);
      const skipped = skippedQuestionIds.has(q.questionId);
      if (!answered && !skipped) return i;
    }
    return questions.length;
  }, [questions, answersByQuestionId, skippedQuestionIds]);

  const maxNavigableIndex = isSubmitted
    ? questions.length - 1
    : Math.min(firstIncompleteIndex, questions.length - 1);

  const currentQuestion = questions[currentIndex];
  const currentAnswered = currentQuestion
    ? Boolean(answersByQuestionId[currentQuestion.questionId])
    : false;
  const currentSkipped = currentQuestion
    ? skippedQuestionIds.has(currentQuestion.questionId) && !currentAnswered
    : false;
  const currentCanProceed = currentAnswered || currentSkipped;

  const canGoNext =
    currentCanProceed && currentIndex < questions.length - 1 && !isSubmitted;
  const canGoPrev = currentIndex > 0;

  const showNavLock = (message: string) => {
    setNavLockMessage(message);
    window.setTimeout(() => setNavLockMessage(null), 3200);
  };

  const tryNavigateToIndex = (index: number) => {
    if (index === currentIndex) return;
    if (isSubmitted) {
      setCurrentIndex(index);
      return;
    }
    if (index > maxNavigableIndex) {
      showNavLock("Answer or skip earlier questions before opening later ones.");
      return;
    }
    if (index > currentIndex && !currentCanProceed) {
      showNavLock("Select an answer or use Skip to continue.");
      return;
    }
    setCurrentIndex(index);
  };

  const handleSelectOption = (questionId: string, optionCode: string) => {
    if (isSubmitted) return;
    setAnswersByQuestionId((prev) => ({ ...prev, [questionId]: optionCode }));
    setSkippedQuestionIds((prev) => {
      const next = new Set(prev);
      next.delete(questionId);
      return next;
    });
    setSaveNotice(null);
    setNavLockMessage(null);
  };

  const handleSkipCurrentQuestion = () => {
    if (!currentQuestion || isSubmitted || currentAnswered) return;

    setSkippedQuestionIds((prev) => {
      const next = new Set(prev);
      next.add(currentQuestion.questionId);
      return next;
    });
    setNavLockMessage(null);
    toast.info("Question skipped — return anytime from the question map.", {
      dedupeKey: "assessment-skip",
      durationMs: 2200,
    });

    if (currentIndex < questions.length - 1) {
      window.setTimeout(() => setCurrentIndex((i) => i + 1), 180);
    }
  };

  const buildSavePayload = () =>
    questions
      .filter((q) => answersByQuestionId[q.questionId])
      .map((q) => ({
        questionId: q.questionId,
        pillarId: q.pillarId,
        selectedOptionCode: answersByQuestionId[q.questionId],
        testStatus: "Complete" as const,
      }));

  const handleSaveAnswers = async () => {
    if (!session || isSubmitted || saving) return;
    const toSave = buildSavePayload();
    if (toSave.length === 0) {
      setSaveNotice("Answer at least one question before saving.");
      return;
    }
    setSaving(true);
    setSaveNotice(null);
    try {
      await assessmentService.saveAnswers(assessmentId, toSave);
      saveAssessmentDraft(assessmentId, {
        answers: answersByQuestionId,
        skippedQuestionIds: Array.from(skippedQuestionIds),
        currentIndex,
      });
      setSaveNotice(`Saved ${toSave.length} answer${toSave.length === 1 ? "" : "s"} to the server.`);
      toast.success(`Saved ${toSave.length} answer${toSave.length === 1 ? "" : "s"} to the server.`, {
        dedupeKey: "assessment-server-save",
        durationMs: 2500,
      });
    } catch (err: unknown) {
      setSaveNotice(getApiErrorMessage(err, "Failed to save answers."));
    } finally {
      setSaving(false);
    }
  };

  const sectionStats = (section: SectionGroup) => {
    let answered = 0;
    let skipped = 0;
    for (const i of section.questionIndices) {
      const q = questions[i];
      if (answersByQuestionId[q.questionId]) answered++;
      else if (skippedQuestionIds.has(q.questionId)) skipped++;
    }
    const total = section.questionIndices.length;
    return { total, answered, skipped, remaining: total - answered - skipped };
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
          <button type="button" onClick={loadAssessment} className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!session || !currentQuestion) {
    return null;
  }

  const selected = answersByQuestionId[currentQuestion.questionId];

  return (
    <div className="max-w-6xl mx-auto pb-12 space-y-5">
      {/* Top bar */}
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
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900 text-white">
                {session.assessmentType}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {companyLabel(session)} · Framework v{session.frameworkVersion}
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
                onClick={handleSaveAnswers}
                disabled={saving}
                className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg bg-white hover:bg-slate-50 inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save
              </button>
              <Link
                href={`/assessments/${assessmentId}/review`}
                className="px-4 py-2 text-xs font-semibold bg-gradient-to-r from-teal-600 to-blue-600 text-white rounded-lg shadow-md hover:opacity-95 inline-flex items-center gap-1.5"
              >
                <ClipboardCheck className="h-3.5 w-3.5" /> Review &amp; submit
              </Link>
            </>
          )}
          {isSubmitted && (
            <Link
              href={`/assessments/${assessmentId}/results`}
              className="px-4 py-2 text-xs font-semibold bg-teal-600 text-white rounded-lg inline-flex items-center gap-1.5"
            >
              <FileCheck2 className="h-3.5 w-3.5" /> Results
            </Link>
          )}
        </div>
      </div>

      {/* Overall progress */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <ListChecks className="h-3.5 w-3.5" /> Assessment progress
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
              <AnimatedNumber value={progressPercent} suffix="%" duration={700} /> complete
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatPill label="Total" value={questions.length} tone="slate" />
            <StatPill label="Answered" value={answeredCount} tone="emerald" />
            <StatPill label="Skipped" value={skippedCount} tone="amber" />
            <StatPill label="Remaining" value={remainingCount} tone="sky" />
          </div>
        </div>
        <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700 ease-out",
              progressPercent >= 100 ? "bg-emerald-500" : "assessment-progress-shimmer"
            )}
            style={{ width: `${Math.max(progressPercent, currentAnswered ? 4 : 2)}%` }}
          />
        </div>
        <p className="text-[11px] text-slate-500">
          Question{" "}
          <span className="font-semibold text-slate-800">{currentIndex + 1}</span> of{" "}
          <span className="font-semibold text-slate-800">{questions.length}</span>
          {!isSubmitted && !currentCanProceed && (
            <span className="ml-2 inline-flex items-center gap-1 text-amber-700 font-medium">
              <Lock className="h-3 w-3" /> Answer or skip to unlock next
            </span>
          )}
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900 flex gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {navLockMessage && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-800 flex items-center gap-2 animate-[assessment-slide-in_0.3s_ease-out]">
          <Lock className="h-4 w-4 shrink-0" />
          {navLockMessage}
        </div>
      )}

      {saveNotice && (
        <div
          className={cn(
            "p-3 rounded-lg text-xs font-medium border",
            saveNotice.startsWith("Saved")
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-slate-50 text-slate-700 border-slate-200"
          )}
        >
          {saveNotice}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Sidebar — sections */}
        <aside className="lg:col-span-4 space-y-3 lg:sticky lg:top-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Sections</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Progress by module · locked until sequential completion</p>
            </div>
            <ul className="max-h-[420px] overflow-y-auto p-2 space-y-1">
              {sections.map((section) => {
                const stats = sectionStats(section);
                const sectionComplete = stats.remaining === 0 && stats.skipped === 0;
                const containsCurrent = section.questionIndices.includes(currentIndex);
                const firstInSection = section.questionIndices[0];
                const isSectionAccessible = isSubmitted || firstInSection <= maxNavigableIndex;

                return (
                  <li key={section.key}>
                    <button
                      type="button"
                      disabled={!isSectionAccessible}
                      onClick={() => {
                        if (!isSectionAccessible) {
                          showNavLock("Complete earlier questions before opening this section.");
                          return;
                        }
                        const target =
                          section.questionIndices.find(
                            (i) =>
                              isSubmitted ||
                              i <= maxNavigableIndex ||
                              answersByQuestionId[questions[i].questionId]
                          ) ?? firstInSection;
                        tryNavigateToIndex(target);
                      }}
                      className={cn(
                        "w-full text-left rounded-xl px-3 py-2.5 transition-all duration-200 border",
                        containsCurrent
                          ? "border-blue-500/40 bg-blue-50/60 shadow-sm ring-1 ring-blue-500/10"
                          : "border-transparent hover:bg-slate-50",
                        !isSectionAccessible && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-800 line-clamp-2">{section.label}</span>
                        {!isSectionAccessible ? (
                          <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                        ) : sectionComplete ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        ) : null}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-medium text-slate-600">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100">{stats.total} total</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          {stats.answered} done
                        </span>
                        {stats.skipped > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                            {stats.skipped} skipped
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-900">
                          {stats.remaining} left
                        </span>
                      </div>
                      <div className="mt-2 h-1 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-500"
                          style={{
                            width: `${stats.total ? (stats.answered / stats.total) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Question map */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Question map</p>
            <div className="flex flex-wrap gap-1.5">
              {questions.map((q, i) => {
                const answered = Boolean(answersByQuestionId[q.questionId]);
                const skipped = skippedQuestionIds.has(q.questionId) && !answered;
                const locked = !isSubmitted && i > maxNavigableIndex;
                const isCurrent = i === currentIndex;
                return (
                  <button
                    key={q.questionId}
                    type="button"
                    title={locked ? "Locked" : q.questionId}
                    onClick={() => tryNavigateToIndex(i)}
                    className={cn(
                      "h-8 w-8 rounded-lg text-[11px] font-bold transition-all duration-200",
                      isCurrent && "ring-2 ring-blue-500 ring-offset-1 scale-110",
                      answered && "bg-emerald-500 text-white",
                      skipped && !answered && "bg-amber-400 text-white",
                      !answered && !skipped && !locked && "bg-slate-100 text-slate-700 hover:bg-slate-200",
                      locked && "bg-slate-50 text-slate-300 cursor-not-allowed"
                    )}
                  >
                    {locked ? <Lock className="h-3 w-3 mx-auto" /> : i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Main question card */}
        <main className="lg:col-span-8">
          <article
            key={currentIndex}
            className="assessment-question-enter bg-white rounded-2xl border border-slate-200/90 shadow-md overflow-hidden"
          >
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900 text-white">
                  <Sparkles className="h-3 w-3" /> Q{currentIndex + 1}
                </span>
                <span>{currentQuestion.questionId}</span>
                <span className="text-slate-300">·</span>
                <span className="text-slate-600 normal-case">
                  {currentQuestion.section || currentQuestion.pillarName}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-3 leading-snug">
                {currentQuestion.text}
              </h2>
              {currentSkipped && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1">
                  <SkipForward className="h-3.5 w-3.5" /> Skipped — select an answer when ready
                </p>
              )}
              {currentQuestion.helpText && (
                <p className="text-xs text-slate-500 mt-2">{currentQuestion.helpText}</p>
              )}
            </div>

            <div className="p-5 sm:p-6 space-y-2.5">
              <fieldset disabled={isSubmitted} className="space-y-2.5">
                <legend className="sr-only">Choose one answer</legend>
                {(currentQuestion.responseOptions || [])
                  .slice()
                  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                  .map((opt) => {
                    const checked = selected === opt.code;
                    return (
                      <label
                        key={opt.code}
                        className={cn(
                          "flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
                          checked
                            ? "border-blue-600 bg-blue-50/70 shadow-sm assessment-option-selected"
                            : "border-slate-200 hover:border-blue-300 hover:bg-slate-50/80",
                          isSubmitted && "cursor-default opacity-90"
                        )}
                      >
                        <input
                          type="radio"
                          name={`q-${currentQuestion.questionId}`}
                          checked={checked}
                          onChange={() => handleSelectOption(currentQuestion.questionId, opt.code)}
                          className="mt-1 accent-blue-600"
                        />
                        <span className="text-sm text-slate-800 leading-relaxed">{opt.label}</span>
                      </label>
                    );
                  })}
              </fieldset>
            </div>

            <div className="px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                {!currentCanProceed && !isSubmitted ? (
                  <>
                    <CircleDashed className="h-3.5 w-3.5 text-amber-500" />
                    Pick an option or <strong className="text-slate-700">Skip</strong> to continue
                  </>
                ) : currentSkipped ? (
                  <>
                    <SkipForward className="h-3.5 w-3.5 text-amber-600" />
                    Skipped — use <strong className="text-slate-700">Next</strong> or answer above
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Ready to continue
                  </>
                )}
              </p>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => tryNavigateToIndex(currentIndex - 1)}
                  disabled={!canGoPrev}
                  className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 inline-flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                {!isSubmitted && !currentAnswered && (
                  <button
                    type="button"
                    onClick={handleSkipCurrentQuestion}
                    className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 inline-flex items-center gap-1.5 transition-colors"
                  >
                    <SkipForward className="h-4 w-4" /> Skip
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => tryNavigateToIndex(currentIndex + 1)}
                  disabled={!canGoNext}
                  className={cn(
                    "px-5 py-2.5 text-xs font-semibold rounded-xl inline-flex items-center gap-1 transition-all",
                    canGoNext
                      ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md"
                      : "bg-slate-200 text-slate-500 cursor-not-allowed"
                  )}
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </article>
        </main>
      </div>
    </div>
  );
}
