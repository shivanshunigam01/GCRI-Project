"use client";

import React, { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { assessmentService } from "@/services/assessment.service";
import {
  AssessmentSession,
  SaveAnswerItemInput,
  TestStatus,
  ExceptionStatus,
} from "@/types/assessment.types";
import { FrameworkPillar, Question } from "@/types/framework.types";
import { AssessmentWorkspaceSkeleton } from "@/components/shared/PageSkeletons";
import {
  ArrowLeft,
  ArrowRight,
  Shield,
  FileCheck2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  FileText,
  Lock,
  ChevronDown,
  ChevronRight,
  Info,
  Check,
  AlertCircle,
  ExternalLink,
  Loader2,
  Paperclip,
  BookmarkCheck,
  Bell,
} from "lucide-react";

export type EvaluationOption = "Pass" | "Fail" | "Inconclusive" | "N/A";

export default function AssessmentWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user, isAdmin } = useAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const [session, setSession] = useState<AssessmentSession | null>(null);
  const [pillars, setPillars] = useState<FrameworkPillar[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);

  // Active navigation state
  const [activePillarId, setActivePillarId] = useState<string>("");
  const [activeQuestionId, setActiveQuestionId] = useState<string>("");
  const [expandedPillars, setExpandedPillars] = useState<Record<string, boolean>>({});

  // Answers map: questionId -> SaveAnswerItemInput
  const [answersMap, setAnswersMap] = useState<Record<string, SaveAnswerItemInput>>({});

  // Auto-save tracking
  const [savingStatus, setSavingStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Evidence upload state
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Operational Reminder State
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderMessage, setReminderMessage] = useState<string | null>(null);

  // Load Session and Framework
  useEffect(() => {
    async function loadWorkspace() {
      setLoading(true);
      setError(null);
      setAccessDenied(false);

      if (isAdmin) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      try {
        const res = await assessmentService.getAssessmentById(id);
        const data = res?.data;
        if (!data?.session) {
          throw new Error("Assessment session not found.");
        }

        const sess = data.session;
        setSession(sess);

        const frameworkQuestions = data.framework?.questions || [];
        const frameworkPillars = data.framework?.pillars || [];
        setQuestions(frameworkQuestions);
        setPillars(frameworkPillars);

        // Pre-fill answers map from existing session answers
        const map: Record<string, SaveAnswerItemInput> = {};
        if (Array.isArray(sess.answers)) {
          sess.answers.forEach((ans: any) => {
            map[ans.questionId] = {
              questionId: ans.questionId,
              pillarId: ans.pillarId,
              testStatus: ans.testStatus || (ans.selectedOptionCode ? "Complete" : "NotStarted"),
              exceptionStatus: ans.exceptionStatus || "NoExceptionNoted",
              selectedOptionCode: ans.selectedOptionCode || "",
              scoreValue: ans.scoreValue ?? 0,
              evidenceNotes: ans.evidenceNotes || "",
              workPaperReference: ans.workPaperReference || "",
              evidenceAttachmentUrl: ans.evidenceAttachmentUrl || "",
              s3Key: ans.s3Key || "",
            };
          });
        }
        setAnswersMap(map);

        // Initialize active pillar and question
        const defaultPillarId =
          sess.resumptionAid?.currentPillarId ||
          frameworkPillars[0]?.pillarId ||
          "P1";
        setActivePillarId(defaultPillarId);
        setExpandedPillars({ [defaultPillarId]: true });

        const defaultQuestion =
          frameworkQuestions.find((q: Question) => q.questionId === sess.resumptionAid?.currentQuestionId) ||
          frameworkQuestions.find((q: Question) => q.pillarId === defaultPillarId) ||
          frameworkQuestions[0];

        if (defaultQuestion) {
          setActiveQuestionId(defaultQuestion.questionId);
        }
      } catch (err: any) {
        if (
          err?.response?.status === 403 &&
          err?.response?.data?.error?.code === "ADMIN_CONTENT_ACCESS_RESTRICTED"
        ) {
          setAccessDenied(true);
        } else {
          setError(
            err?.response?.data?.error?.message ||
              err?.message ||
              "Failed to load assessment evaluation."
          );
        }
      } finally {
        setLoading(false);
      }
    }

    loadWorkspace();
  }, [id, isAdmin]);

  // Debounced auto-save function
  const triggerAutoSave = (updatedAnswer: SaveAnswerItemInput) => {
    if (session?.status === "Submitted" || session?.status === "Archived") {
      return;
    }

    setSavingStatus("saving");
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await assessmentService.saveAnswers(id, [updatedAnswer]);
        setSavingStatus("saved");
        setTimeout(() => setSavingStatus("idle"), 2500);
      } catch (err) {
        setSavingStatus("error");
      }
    }, 1200);
  };

  // Option selection handler ("Pass" | "Fail" | "Inconclusive" | "N/A")
  const handleSelectOption = (option: EvaluationOption) => {
    if (session?.status === "Submitted" || session?.status === "Archived") return;
    if (!activeQuestionId) return;

    const existing = answersMap[activeQuestionId] || {
      questionId: activeQuestionId,
      pillarId: activePillarId,
      testStatus: "Complete" as TestStatus,
      exceptionStatus: "NoExceptionNoted" as ExceptionStatus,
      selectedOptionCode: option,
      scoreValue: 0,
      evidenceNotes: "",
      workPaperReference: "",
      evidenceAttachmentUrl: "",
    };

    let calculatedScore = 0;
    let autoException: ExceptionStatus = existing.exceptionStatus || "NoExceptionNoted";

    if (option === "Pass") {
      calculatedScore = 4;
    } else if (option === "Fail") {
      calculatedScore = 0;
      autoException = "ExceptionNoted";
    } else if (option === "Inconclusive") {
      calculatedScore = 2;
    } else if (option === "N/A") {
      calculatedScore = 4;
    }

    const updated: SaveAnswerItemInput = {
      ...existing,
      pillarId: activePillarId,
      selectedOptionCode: option,
      testStatus: "Complete",
      scoreValue: calculatedScore,
      exceptionStatus: autoException,
    };

    setAnswersMap((prev) => ({
      ...prev,
      [activeQuestionId]: updated,
    }));

    triggerAutoSave(updated);
  };

  // Generic field modifier
  const handleAnswerFieldChange = (field: keyof SaveAnswerItemInput, value: any) => {
    if (session?.status === "Submitted" || session?.status === "Archived") return;
    if (!activeQuestionId) return;

    const existing = answersMap[activeQuestionId] || {
      questionId: activeQuestionId,
      pillarId: activePillarId,
      testStatus: "NotStarted" as TestStatus,
      exceptionStatus: "NoExceptionNoted" as ExceptionStatus,
      selectedOptionCode: "",
      scoreValue: 0,
      evidenceNotes: "",
      workPaperReference: "",
      evidenceAttachmentUrl: "",
    };

    const updated: SaveAnswerItemInput = {
      ...existing,
      [field]: value,
    };

    setAnswersMap((prev) => ({
      ...prev,
      [activeQuestionId]: updated,
    }));

    triggerAutoSave(updated);
  };

  // Evidence file upload handler
  const handleEvidenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeQuestionId) return;

    setUploadingEvidence(true);
    setUploadError(null);
    try {
      const res = await assessmentService.uploadEvidence(id, activeQuestionId, file);
      const url = res?.data?.url || (res?.data as any)?.key || file.name;

      const existing = answersMap[activeQuestionId] || {
        questionId: activeQuestionId,
        pillarId: activePillarId,
        testStatus: "InProgress" as TestStatus,
        exceptionStatus: "NoExceptionNoted" as ExceptionStatus,
        selectedOptionCode: "",
        scoreValue: 0,
        evidenceNotes: "",
        workPaperReference: "",
        evidenceAttachmentUrl: "",
      };

      const updated = {
        ...existing,
        evidenceAttachmentUrl: url,
        s3Key: res?.data?.key,
      };

      setAnswersMap((prev) => ({
        ...prev,
        [activeQuestionId]: updated,
      }));

      triggerAutoSave(updated);
    } catch (err: any) {
      setUploadError(err?.response?.data?.error?.message || "Failed to upload evidence.");
    } finally {
      setUploadingEvidence(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Active question and pillar details
  const activeQuestionIndex = questions.findIndex((q) => q.questionId === activeQuestionId);
  const activeQuestion = questions[activeQuestionIndex] || null;
  const currentAnswer = (activeQuestionId && answersMap[activeQuestionId]) || {
    questionId: activeQuestionId,
    pillarId: activePillarId,
    testStatus: "NotStarted" as TestStatus,
    exceptionStatus: "NoExceptionNoted" as ExceptionStatus,
    selectedOptionCode: "",
    scoreValue: 0,
    evidenceNotes: "",
    workPaperReference: "",
    evidenceAttachmentUrl: "",
  };

  // Calculate overall metrics
  const totalQuestionsCount = questions.length;
  const answeredQuestionsCount = Object.values(answersMap).filter(
    (a) => !!a.selectedOptionCode || a.testStatus === "Complete"
  ).length;
  const progressPct =
    totalQuestionsCount > 0
      ? Math.round((answeredQuestionsCount / totalQuestionsCount) * 100)
      : 0;

  // Question navigation helpers
  const goToNextQuestion = () => {
    if (activeQuestionIndex < questions.length - 1) {
      const nextQ = questions[activeQuestionIndex + 1];
      setActiveQuestionId(nextQ.questionId);
      setActivePillarId(nextQ.pillarId);
      setExpandedPillars((prev) => ({ ...prev, [nextQ.pillarId]: true }));
    }
  };

  const goToPreviousQuestion = () => {
    if (activeQuestionIndex > 0) {
      const prevQ = questions[activeQuestionIndex - 1];
      setActiveQuestionId(prevQ.questionId);
      setActivePillarId(prevQ.pillarId);
      setExpandedPillars((prev) => ({ ...prev, [prevQ.pillarId]: true }));
    }
  };

  const handleSendReminder = async () => {
    setSendingReminder(true);
    setReminderMessage(null);
    try {
      const res = await assessmentService.sendReminder(id);
      setReminderMessage(res?.data?.message || "Assessment reminder dispatched to stakeholders!");
      setTimeout(() => setReminderMessage(null), 5000);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to dispatch reminder.");
    } finally {
      setSendingReminder(false);
    }
  };

  // Admin confidentiality block
  if (accessDenied) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm">
        <div className="p-3 bg-amber-50 text-amber-600 rounded-full inline-flex">
          <Shield className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 font-editorial">
            Admin Confidentiality Boundary
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            By architectural design (Zero-Knowledge Regulatory Assurance), Platform Administrators are strictly prohibited from viewing or modifying confidential client assessment answers, evidence files, or scores.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/assessments"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Assessments Directory
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return <AssessmentWorkspaceSkeleton />;
  }

  if (error || !session) {
    return (
      <div className="p-8 bg-white rounded-xl border border-red-200 text-center space-y-3">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Assessment Error</h2>
        <p className="text-xs text-slate-500">{error || "Assessment session could not be loaded."}</p>
        <Link
          href="/assessments"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Return to Assessments
        </Link>
      </div>
    );
  }

  const isLocked = session.status === "Submitted" || session.status === "Archived";
  const orgName = (session.companyId as any)?.name || "Client Organization";

  return (
    <div className="space-y-4">
      {/* Locked Notification Banner */}
      {isLocked && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong>Cryptographically Finalized:</strong> This assessment was submitted and locked on{" "}
              {session.submittedAt ? new Date(session.submittedAt).toLocaleDateString() : "date"}. Answers and evidence are permanent and read-only.
            </span>
          </div>
          <Link
            href={`/assessments/${id}/results`}
            className="font-bold underline hover:text-amber-950 shrink-0 ml-4"
          >
            View Score Radar &amp; Reports →
          </Link>
        </div>
      )}

      {/* Top Session Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            href="/assessments"
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition shadow-2xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 font-editorial truncate max-w-sm">
                {orgName}
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                {session.assessmentType} Assessment
              </span>
              <span className="text-xs text-slate-400 font-mono">v{session.frameworkVersion}</span>
            </div>
            <p className="text-xs text-slate-500">
              Control evaluation across 7 GRAICE Pillars with deterministic compliance weighting.
            </p>
          </div>
        </div>

        {/* Auto-save Pulse & Review Action */}
        <div className="flex items-center gap-3">
          {/* Auto-Save Pulse Indicator */}
          {!isLocked && (
            <div className="flex items-center gap-1.5 text-xs">
              {savingStatus === "saving" && (
                <span className="flex items-center gap-1 text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                  Saving...
                </span>
              )}
              {savingStatus === "saved" && (
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  Auto-saved
                </span>
              )}
              {savingStatus === "error" && (
                <span className="flex items-center gap-1 text-red-500 font-medium">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Save failed
                </span>
              )}
            </div>
          )}

          {!isLocked && (
            <button
              type="button"
              disabled={sendingReminder}
              onClick={handleSendReminder}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition"
              title="Dispatch an assessment reminder email to client contact or assigned auditor"
            >
              {sendingReminder ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
              ) : (
                <Bell className="h-3.5 w-3.5 text-blue-600" />
              )}
              <span>Send Reminder</span>
            </button>
          )}

          <Link
            href={`/assessments/${id}/review`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0c162c] hover:bg-slate-800 text-white font-semibold text-xs rounded-lg shadow-sm transition"
          >
            <BookmarkCheck className="h-3.5 w-3.5" />
            Proceed to Review
          </Link>
        </div>
      </div>

      {reminderMessage && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
            <span>{reminderMessage}</span>
          </div>
          <button
            onClick={() => setReminderMessage(null)}
            className="text-slate-400 hover:text-slate-600 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* 3-Column Workspace Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ========================================================================= */}
        {/* COLUMN 1 (Left): 7 Pillars Accordion Tree                                  */}
        {/* ========================================================================= */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-3 max-h-[800px] overflow-y-auto">
          <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Framework Pillars
            </span>
            <span className="text-[11px] font-semibold text-slate-500">
              {answeredQuestionsCount}/{totalQuestionsCount}
            </span>
          </div>

          <div className="space-y-1.5">
            {pillars.map((pillar) => {
              const pillarQuestions = questions.filter((q) => q.pillarId === pillar.pillarId);
              const answeredInPillar = pillarQuestions.filter(
                (q) => !!answersMap[q.questionId]?.selectedOptionCode
              ).length;
              const isExpanded = !!expandedPillars[pillar.pillarId];
              const isPillarActive = activePillarId === pillar.pillarId;

              return (
                <div key={pillar.pillarId} className="rounded-lg border border-slate-100 overflow-hidden">
                  {/* Pillar Header */}
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedPillars((prev) => ({
                        ...prev,
                        [pillar.pillarId]: !prev[pillar.pillarId],
                      }))
                    }
                    className={`w-full flex items-center justify-between p-2.5 text-left text-xs font-semibold transition ${
                      isPillarActive
                        ? "bg-slate-50 text-blue-700"
                        : "text-slate-700 hover:bg-slate-50/60"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[10px] text-slate-400 shrink-0">
                        P{pillar.pillarNumber}
                      </span>
                      <span className="truncate">{pillar.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-slate-400 font-normal">
                        {answeredInPillar}/{pillarQuestions.length}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {/* Sub-Question Controls List */}
                  {isExpanded && (
                    <div className="bg-slate-50/50 border-t border-slate-100 p-1 space-y-0.5">
                      {pillarQuestions.map((q) => {
                        const isQActive = activeQuestionId === q.questionId;
                        const option = answersMap[q.questionId]?.selectedOptionCode;

                        let statusColor = "bg-slate-300";
                        if (option === "Pass") statusColor = "bg-emerald-500";
                        else if (option === "Fail") statusColor = "bg-rose-500";
                        else if (option === "Inconclusive") statusColor = "bg-amber-500";
                        else if (option === "N/A") statusColor = "bg-slate-400";

                        return (
                          <button
                            key={q.questionId}
                            type="button"
                            onClick={() => {
                              setActiveQuestionId(q.questionId);
                              setActivePillarId(q.pillarId);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left text-[11px] transition ${
                              isQActive
                                ? "bg-white text-blue-700 font-bold shadow-2xs border border-blue-200"
                                : "text-slate-600 hover:bg-white/80"
                            }`}
                          >
                            <span className="truncate max-w-[170px]">
                              {q.questionId}: {q.text}
                            </span>
                            <span className={`h-2 w-2 rounded-full shrink-0 ${statusColor}`} />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 2 (Center): Active Question Control Card                           */}
        {/* ========================================================================= */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs space-y-6">
          {activeQuestion ? (
            <>
              {/* Question Header */}
              <div className="space-y-2 border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                    {activeQuestion.questionId}
                  </span>
                  {(activeQuestion.regulatoryAlignments?.euAiAct || activeQuestion.regulatoryAlignments?.nistAiRmf) && (
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {activeQuestion.regulatoryAlignments.euAiAct || activeQuestion.regulatoryAlignments.nistAiRmf}
                    </span>
                  )}
                </div>
                <h2 className="text-base font-bold text-slate-900 leading-snug">
                  {activeQuestion.text}
                </h2>
                {activeQuestion.controlDescription && (
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {activeQuestion.controlDescription}
                  </p>
                )}
              </div>

              {/* Guidance & Test Procedure Accordion */}
              {(activeQuestion.testProcedure || activeQuestion.remediationGuidance || activeQuestion.helpText) && (
                <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Info className="h-4 w-4 text-blue-600 shrink-0" />
                    <span>Auditor Guidance &amp; Verification Procedures</span>
                  </div>
                  {activeQuestion.testProcedure && (
                    <div>
                      <span className="font-semibold text-slate-700">Test Procedure: </span>
                      <span className="text-slate-600">{activeQuestion.testProcedure}</span>
                    </div>
                  )}
                  {activeQuestion.helpText && (
                    <div>
                      <span className="font-semibold text-slate-700">Scope / Guidance: </span>
                      <span className="text-slate-600">{activeQuestion.helpText}</span>
                    </div>
                  )}
                  {activeQuestion.remediationGuidance && (
                    <div>
                      <span className="font-semibold text-slate-700">Remediation Guidance: </span>
                      <span className="text-slate-600">{activeQuestion.remediationGuidance}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Segmented Response Buttons */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Auditor Evaluation Decision
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(["Pass", "Fail", "Inconclusive", "N/A"] as EvaluationOption[]).map((option) => {
                    const isSelected = currentAnswer.selectedOptionCode === option;
                    let style = "border-slate-200 hover:border-slate-300 text-slate-700";

                    if (isSelected) {
                      if (option === "Pass") style = "border-emerald-600 bg-emerald-50 text-emerald-800 font-bold ring-2 ring-emerald-500/20";
                      else if (option === "Fail") style = "border-rose-600 bg-rose-50 text-rose-800 font-bold ring-2 ring-rose-500/20";
                      else if (option === "Inconclusive") style = "border-amber-600 bg-amber-50 text-amber-800 font-bold ring-2 ring-amber-500/20";
                      else if (option === "N/A") style = "border-slate-600 bg-slate-100 text-slate-900 font-bold ring-2 ring-slate-400/20";
                    }

                    return (
                      <button
                        key={option}
                        type="button"
                        disabled={isLocked}
                        onClick={() => handleSelectOption(option)}
                        className={`py-2.5 px-3 rounded-lg border text-center text-xs transition-all ${style}`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Exception Status Switch */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-xs font-bold text-slate-900">Flag as Non-Compliance Exception?</span>
                  <p className="text-[11px] text-slate-500">
                    Records this control in the Findings &amp; Exceptions Remediation Tracker.
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => handleAnswerFieldChange("exceptionStatus", "NoExceptionNoted")}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                      currentAnswer.exceptionStatus === "NoExceptionNoted"
                        ? "bg-emerald-600 text-white"
                        : "bg-white text-slate-600 border border-slate-200"
                    }`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => handleAnswerFieldChange("exceptionStatus", "ExceptionNoted")}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                      currentAnswer.exceptionStatus === "ExceptionNoted"
                        ? "bg-rose-600 text-white"
                        : "bg-white text-slate-600 border border-slate-200"
                    }`}
                  >
                    Yes (Exception)
                  </button>
                </div>
              </div>

              {/* Work Paper Reference & Evidence Notes */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Work Paper Reference (e.g. WP-AI-01)
                  </label>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={currentAnswer.workPaperReference || ""}
                    onChange={(e) => handleAnswerFieldChange("workPaperReference", e.target.value)}
                    placeholder="Reference code or document ID..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Auditor Verification Notes &amp; Findings Justification
                  </label>
                  <textarea
                    rows={3}
                    disabled={isLocked}
                    value={currentAnswer.evidenceNotes || ""}
                    onChange={(e) => handleAnswerFieldChange("evidenceNotes", e.target.value)}
                    placeholder="Enter observation notes, verified policies, interview summaries..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-y"
                  />
                </div>
              </div>

              {/* Evidence Attachment Section */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5 text-slate-500" />
                    Attached Evidence Document
                  </label>
                  {!isLocked && (
                    <button
                      type="button"
                      disabled={uploadingEvidence}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                    >
                      <UploadCloud className="h-3.5 w-3.5" />
                      {uploadingEvidence ? "Uploading..." : "+ Attach Document"}
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleEvidenceUpload}
                  />
                </div>

                {uploadError && (
                  <p className="text-[11px] text-red-600">{uploadError}</p>
                )}

                {/* Evidence Item */}
                {currentAnswer.evidenceAttachmentUrl ? (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex items-center gap-2 truncate max-w-sm">
                      <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                      <span className="truncate font-medium text-slate-800">
                        {currentAnswer.evidenceAttachmentUrl}
                      </span>
                    </div>
                    <a
                      href={currentAnswer.evidenceAttachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:text-blue-700 p-1"
                      title="Open document"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No evidence file attached to this control.</p>
                )}
              </div>

              {/* Prev / Next Navigation Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={goToPreviousQuestion}
                  disabled={activeQuestionIndex === 0}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Previous Control
                </button>
                <button
                  type="button"
                  onClick={goToNextQuestion}
                  disabled={activeQuestionIndex === questions.length - 1}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-[#0c162c] text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40 transition"
                >
                  Next Control <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              Select a control question from the left navigation tree to evaluate.
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 3 (Right): Session Overview & Jump Grid                            */}
        {/* ========================================================================= */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-4">
          <div className="pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Evaluation Progress
            </h3>
          </div>

          {/* Progress Percentage Gauge */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Completed Controls</span>
              <span className="font-extrabold text-slate-900">{progressPct}%</span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-500 text-right">
              {answeredQuestionsCount} of {totalQuestionsCount} controls evaluated
            </div>
          </div>

          {/* Question Jump Grid */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-700">Quick Jump Grid</span>
            <div className="grid grid-cols-5 gap-1.5 max-h-[360px] overflow-y-auto p-1">
              {questions.map((q, idx) => {
                const isCurrent = activeQuestionId === q.questionId;
                const option = answersMap[q.questionId]?.selectedOptionCode;

                let btnStyle = "bg-slate-100 text-slate-600 hover:bg-slate-200";
                if (option === "Pass") btnStyle = "bg-emerald-500 text-white font-bold";
                else if (option === "Fail") btnStyle = "bg-rose-500 text-white font-bold";
                else if (option === "Inconclusive") btnStyle = "bg-amber-500 text-white font-bold";
                else if (option === "N/A") btnStyle = "bg-slate-400 text-white";

                return (
                  <button
                    key={q.questionId}
                    type="button"
                    onClick={() => {
                      setActiveQuestionId(q.questionId);
                      setActivePillarId(q.pillarId);
                      setExpandedPillars((prev) => ({ ...prev, [q.pillarId]: true }));
                    }}
                    className={`h-8 rounded text-[11px] flex items-center justify-center transition ${btnStyle} ${
                      isCurrent ? "ring-2 ring-blue-600 ring-offset-1 font-extrabold" : ""
                    }`}
                    title={`${q.questionId}: ${q.text}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px] text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Pass</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>Fail</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span>Inconclusive</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-300" />
              <span>Unanswered</span>
            </div>
          </div>

          {/* Review & Lock Button */}
          <div className="pt-3 border-t border-slate-100">
            <Link
              href={`/assessments/${id}/review`}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-sm transition"
            >
              <FileCheck2 className="h-4 w-4" />
              Proceed to Review &amp; Submit
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
