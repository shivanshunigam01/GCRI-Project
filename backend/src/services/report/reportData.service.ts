import { IAssessmentSession, IAnswer } from "../../models/AssessmentSession.js";
import {
  IAssessmentFramework,
  IDocumentRequestItem,
  IMeetingRequestItem,
  IQuestionControl,
} from "../../models/AssessmentFramework.js";
import { ICompany } from "../../models/Company.js";
import { IUser } from "../../models/User.js";
import { ScoringService } from "../scoring.service.js";
import type {
  GraiceReportData,
  ReportControlEvaluation,
  ReportKpis,
  ReportPillarProgress,
  ReportRemediationItem,
} from "./reportTypes.js";

function formatDate(value?: Date | string | null): string {
  if (!value) {
    return new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusLabel(status: string): string {
  if (status === "Submitted") return "Complete";
  if (status === "InProgress") return "In Progress";
  return status;
}

function testStatusLabel(status?: string): string {
  if (status === "Complete") return "Complete";
  if (status === "InProgress") return "In-Progress";
  if (status === "NotStarted") return "Not Started";
  return status || "Not Started";
}

function exceptionStatusLabel(
  assessmentType: "Light" | "Full",
  answer: IAnswer | undefined,
  isGap: boolean
): string {
  const meaningfulCode =
    answer?.selectedOptionCode && answer.selectedOptionCode !== "NOT_ASSESSED"
      ? answer.selectedOptionCode
      : undefined;

  if (!answer || (answer.testStatus === "NotStarted" && !meaningfulCode)) {
    return "Not Assessed";
  }
  if (assessmentType === "Full") {
    if (
      answer.exceptionStatus === "ExceptionNoted" ||
      meaningfulCode === "EXCEPTION_NOTED"
    ) {
      return "Exception Noted";
    }
    if (
      answer.exceptionStatus === "NoExceptionNoted" ||
      meaningfulCode === "NO_EXCEPTION_NOTED"
    ) {
      return "No Exception Noted";
    }
    return "Not Assessed";
  }
  if (isGap) return "Exception Noted";
  if (meaningfulCode || answer.testStatus === "Complete") {
    return "No Exception Noted";
  }
  return "Not Assessed";
}

function isLandscapeQuestion(q: IQuestionControl): boolean {
  return q.pillarNumber === 0 || q.pillarId === "ai-landscape";
}

function parseProcedureSteps(raw?: string): string[] {
  if (!raw?.trim()) return [];
  const numbered = raw
    .trim()
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (numbered.length > 1) {
    return numbered.map((s) => s.replace(/^\d+[\).\s-]+/, "").trim()).filter(Boolean);
  }
  return raw
    .split(/(?<=\.)\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Pillar progress — mirrors assessment.controller getAssessmentProgress rules
 * so report KPIs stay aligned with GET /assessments/:id/progress.
 */
export function buildPillarProgress(
  session: IAssessmentSession,
  framework: IAssessmentFramework
): ReportPillarProgress[] {
  const answerMap = new Map(session.answers.map((a) => [a.questionId, a]));
  const activeQuestions = framework.questions.filter((q) => q.isActive !== false);

  const sectionsToTrack =
    session.assessmentType === "Light"
      ? [
          ...framework.pillars.filter((p) => p.pillarNumber === 0 || p.pillarId === "ai-landscape"),
          ...framework.pillars.filter((p) => p.pillarNumber !== 0 && p.pillarId !== "ai-landscape"),
        ]
      : framework.pillars.filter((p) => p.pillarNumber !== 0 && p.pillarId !== "ai-landscape");

  // Prefer bound pillars; if empty, derive from questions
  const pillars =
    sectionsToTrack.length > 0
      ? sectionsToTrack
      : [
          ...new Map(
            activeQuestions.map((q) => [
              q.pillarId,
              {
                pillarId: q.pillarId,
                pillarNumber: q.pillarNumber,
                name: q.pillarName,
              },
            ])
          ).values(),
        ];

  return pillars
    .filter((p) => p.pillarNumber !== 0 && p.pillarId !== "ai-landscape")
    .map((p) => {
      const questions = activeQuestions.filter(
        (q) => q.pillarId === p.pillarId || q.pillarNumber === p.pillarNumber
      );
      let complete = 0;
      let inProgress = 0;
      let notStarted = 0;
      let exceptionsNoted = 0;
      let noExceptions = 0;

      for (const q of questions) {
        const a = answerMap.get(q.questionId);
        const meaningfulCode =
          a?.selectedOptionCode && a.selectedOptionCode !== "NOT_ASSESSED"
            ? a.selectedOptionCode
            : undefined;

        if (session.assessmentType === "Full") {
          const assessed =
            a?.exceptionStatus === "NoExceptionNoted" ||
            a?.exceptionStatus === "ExceptionNoted" ||
            meaningfulCode === "NO_EXCEPTION_NOTED" ||
            meaningfulCode === "EXCEPTION_NOTED";
          const working =
            !!a &&
            !assessed &&
            (a.testStatus === "InProgress" ||
              Boolean(a.evidenceNotes?.trim()) ||
              Boolean(a.workPaperReference?.trim()) ||
              Boolean(a.evidenceAttachmentUrl));

          if (assessed) {
            complete++;
            if (
              a!.exceptionStatus === "ExceptionNoted" ||
              meaningfulCode === "EXCEPTION_NOTED"
            ) {
              exceptionsNoted++;
            }
            if (
              a!.exceptionStatus === "NoExceptionNoted" ||
              meaningfulCode === "NO_EXCEPTION_NOTED"
            ) {
              noExceptions++;
            }
          } else if (working) {
            inProgress++;
          } else {
            notStarted++;
          }
          continue;
        }

        if (
          !a ||
          (a.testStatus === "NotStarted" && !meaningfulCode) ||
          (!a.testStatus && !meaningfulCode)
        ) {
          notStarted++;
        } else if (a.testStatus === "InProgress" && !meaningfulCode) {
          inProgress++;
        } else {
          complete++;
          if (
            a.exceptionStatus === "ExceptionNoted" ||
            meaningfulCode === "EXCEPTION_NOTED"
          ) {
            exceptionsNoted++;
          }
          if (
            a.exceptionStatus === "NoExceptionNoted" ||
            meaningfulCode === "NO_EXCEPTION_NOTED"
          ) {
            noExceptions++;
          }
        }
      }

      const total = questions.length;
      const completionPercentage =
        total > 0 ? Math.round((complete / total) * 100 * 10) / 10 : 0;

      return {
        pillarId: p.pillarId,
        pillarNumber: p.pillarNumber,
        pillarName: p.name,
        total,
        complete,
        inProgress,
        notStarted,
        exceptionsNoted,
        noExceptions,
        completionPercentage,
      };
    });
}

/**
 * Report KPI definitions (must stay internally consistent):
 * - totalControls: in-scope GRAICE controls in Status-by-Pillar (excludes AI-landscape)
 * - controlsAssessed: controls with Complete status in that same set
 * - completionPercentage: controlsAssessed / totalControls
 * - exceptionsNoted: count from ScoringService.extractGaps (authoritative gap list)
 * - notYetAssessed: Not Started + In-Progress in the same in-scope set
 *
 * Never use Light overallScore (0–120 points) as a control count.
 * Never prefer snapshot.totalExceptionsNoted when it is missing/zero for Light
 * while extractGaps returns gaps — Light snapshots omit exception totals.
 */
function buildKpis(
  session: IAssessmentSession,
  framework: IAssessmentFramework,
  pillarProgress: ReportPillarProgress[],
  gapCount: number
): ReportKpis {
  const snapshot =
    session.scoreSnapshot || ScoringService.calculateScores(session, framework);

  const totalControls = pillarProgress.reduce((s, p) => s + p.total, 0);
  const controlsAssessed = pillarProgress.reduce((s, p) => s + p.complete, 0);
  const notYetAssessed = pillarProgress.reduce(
    (s, p) => s + p.notStarted + p.inProgress,
    0
  );
  const completionPercentage =
    totalControls > 0
      ? Math.round((controlsAssessed / totalControls) * 100 * 10) / 10
      : 0;

  // Prefer extractGaps for report exception KPI (matches Detailed Findings / Remediation).
  const exceptionsNoted = gapCount;

  // Soft consistency check vs Full-assessment snapshot when present
  if (
    session.assessmentType === "Full" &&
    typeof snapshot.totalExceptionsNoted === "number" &&
    snapshot.totalExceptionsNoted !== gapCount
  ) {
    console.warn(
      `[ReportData] Exception count mismatch for session ${session._id}: ` +
        `snapshot=${snapshot.totalExceptionsNoted}, gaps=${gapCount}. Using gaps for report KPIs.`
    );
  }

  if (controlsAssessed + notYetAssessed !== totalControls) {
    console.warn(
      `[ReportData] Progress arithmetic inconsistency: assessed(${controlsAssessed}) + ` +
        `notYet(${notYetAssessed}) !== total(${totalControls})`
    );
  }

  return {
    controlsAssessed,
    completionPercentage,
    exceptionsNoted,
    notYetAssessed,
    overallScore: snapshot.overallScore,
    maxPossibleScore: snapshot.maxPossibleScore,
    overallPercentage: snapshot.overallPercentage,
    maturityLevel: snapshot.maturityLevel,
    totalControls,
  };
}

function executiveNarrative(
  data: {
    assessmentType: "Light" | "Full";
    organizationName: string;
    kpis: ReportKpis;
    gapCount: number;
  }
): string {
  const typeWord = data.assessmentType === "Light" ? "light (lite)" : "full";
  const maturity = data.kpis.maturityLevel || "Initial";
  const pct = data.kpis.overallPercentage ?? data.kpis.completionPercentage;
  const scorePhrase =
    data.assessmentType === "Light" &&
    data.kpis.overallScore != null &&
    data.kpis.maxPossibleScore
      ? ` The organization scored ${data.kpis.overallScore} of ${data.kpis.maxPossibleScore} available points`
      : "";
  return (
    `This ${typeWord} assessment provides a focused, evidence-based snapshot of responsible AI governance ` +
    `maturity for ${data.organizationName} against the GRAICE control framework.${scorePhrase} ` +
    `Overall scored maturity is classified as ${maturity}` +
    (pct !== undefined ? ` (compliance index ${pct}%).` : ".") +
    ` Results are intended to inform leadership investment priorities and next-step assurance planning` +
    (data.gapCount > 0
      ? `, with ${data.gapCount} control gap${data.gapCount === 1 ? "" : "s"} requiring remediation attention.`
      : ", with no governance exceptions identified in the assessed control set.")
  );
}

function whyInvestContent(assessmentType: "Light" | "Full", gapCount: number): {
  narrative: string;
  bullets: string[];
} {
  const typeWord = assessmentType.toLowerCase();
  if (gapCount === 0) {
    return {
      narrative:
        `This ${typeWord} review did not surface open control gaps in the assessed GRAICE control set. ` +
        `Continued investment in governance maintains audit readiness as AI adoption scales and regulatory expectations evolve.`,
      bullets: [
        "Sustained GRAICE assurance keeps leadership visibility across all seven governance pillars.",
        "Early governance investment reduces downstream remediation cost and audit friction.",
        "Strong governance supports alignment conversations with the EU AI Act, NIST AI RMF, and ISO/IEC 42001 — without asserting certified compliance.",
      ],
    };
  }
  return {
    narrative:
      `This ${typeWord} review surfaced ${gapCount} control gap${gapCount === 1 ? "" : "s"} ` +
      `across foundational governance areas. As AI adoption scales, unaddressed gaps increase operational ` +
      `and regulatory exposure. Closing these items strengthens readiness for deeper assurance.`,
    bullets: [
      "A full GRAICE assessment verifies remaining controls across all seven pillars with deeper evidence sampling.",
      "Early investment in governance reduces downstream remediation cost, audit friction, and regulatory risk.",
      "Stronger governance supports alignment with the EU AI Act, NIST AI RMF, and ISO/IEC 42001 — without asserting certified compliance.",
    ],
  };
}

function findingsForControl(
  answer: IAnswer | undefined,
  _question: IQuestionControl,
  isGap: boolean,
  gapNotes?: string
): string {
  if (answer?.evidenceNotes?.trim()) return answer.evidenceNotes.trim();
  if (gapNotes?.trim()) return gapNotes.trim();
  // Never substitute the control question/description as if it were an auditor observation.
  if (isGap) {
    return "Exception noted — no auditor observations recorded.";
  }
  if (answer && (answer.testStatus === "Complete" || answer.selectedOptionCode)) {
    return "No auditor observations recorded.";
  }
  return "No auditor observations recorded.";
}

function recommendationForControl(
  question: IQuestionControl,
  isGap: boolean
): string {
  if (!isGap) return "No action required.";
  if (question.remediationGuidance?.trim()) return question.remediationGuidance.trim();
  return (
    `Formalize policy documentation and implement continuous operational controls for ` +
    `${question.questionId} (${question.pillarName}) to remediate the noted audit exception.`
  );
}

function linkedDocuments(
  question: IQuestionControl,
  docs: IDocumentRequestItem[] | undefined
): string[] {
  if (!docs?.length) return [];
  const linked = new Set(question.linkedDocumentRequests || []);
  return docs
    .filter(
      (d) =>
        linked.has(d.documentId) ||
        d.linkedControls?.includes(question.questionId) ||
        d.pillarNumber === question.pillarNumber
    )
    .map((d) => d.title)
    .filter(Boolean)
    .slice(0, 8);
}

function linkedMeetings(
  question: IQuestionControl,
  meetings: IMeetingRequestItem[] | undefined
): string[] {
  if (!meetings?.length) return [];
  return meetings
    .filter((m) => m.pillarName === question.pillarName)
    .map((m) => m.topic)
    .filter(Boolean)
    .slice(0, 6);
}

export function buildGraiceReportData(input: {
  session: IAssessmentSession;
  company: ICompany;
  framework: IAssessmentFramework;
  auditor: IUser;
  conductedBy?: IUser | null;
}): GraiceReportData {
  const { session, company, framework, auditor, conductedBy } = input;
  const answerMap = new Map(session.answers.map((a) => [a.questionId, a]));
  const gaps = ScoringService.extractGaps(session, framework);
  const gapByControl = new Map(gaps.map((g) => [g.questionId, g]));
  const gapIds = new Set(gaps.map((g) => g.questionId));

  const activeQuestions = framework.questions
    .filter((q) => q.isActive !== false)
    .filter((q) => !isLandscapeQuestion(q))
    .sort((a, b) => {
      if (a.pillarNumber !== b.pillarNumber) return a.pillarNumber - b.pillarNumber;
      return a.order - b.order;
    });

  const pillarProgress = buildPillarProgress(session, framework);
  const kpis = buildKpis(session, framework, pillarProgress, gaps.length);

  const scope =
    activeQuestions.find((q) => q.organizationScope)?.organizationScope ||
    framework.questions.find((q) => q.organizationScope)?.organizationScope ||
    company.size ||
    "Not specified";

  const assessmentTitle =
    framework.title?.trim() ||
    session.clientContact?.title?.trim() ||
    `${company.name} — ${session.assessmentType} Assessment`;

  const auditorName =
    conductedBy?.name ||
    auditor.name ||
    conductedBy?.email ||
    auditor.email ||
    "Assessment team";

  const controls: ReportControlEvaluation[] = activeQuestions.map((q) => {
    const ans = answerMap.get(q.questionId);
    const gap = gapByControl.get(q.questionId);
    const isGap = gapIds.has(q.questionId);
    const priority: "High" | "Medium" | undefined = isGap
      ? gap?.scoreValue === 0
        ? "High"
        : "Medium"
      : undefined;

    return {
      questionId: q.questionId,
      pillarId: q.pillarId,
      pillarNumber: q.pillarNumber,
      pillarName: q.pillarName,
      assuranceTier: q.assuranceTier || "Tier 1",
      testStatus: testStatusLabel(ans?.testStatus),
      exceptionStatus: exceptionStatusLabel(session.assessmentType, ans, isGap),
      isGap,
      questionText: q.text,
      controlDescription: q.controlDescription,
      testProcedure: q.testProcedure,
      testProcedureSteps: parseProcedureSteps(q.testProcedure),
      linkedDocumentTitles: linkedDocuments(q, framework.documentRequests),
      linkedMeetingTopics: linkedMeetings(q, framework.meetingRequests),
      testerName: auditorName,
      testDate: formatDate(ans?.answeredAt || session.submittedAt || session.updatedAt),
      workPaperReference: ans?.workPaperReference,
      evidenceNotes: ans?.evidenceNotes,
      evidenceReference: ans?.evidenceAttachmentUrl
        ? "Evidence attachment recorded (access via authorized assessment workspace)"
        : undefined,
      findings: findingsForControl(ans, q, isGap, gap?.evidenceNotes),
      recommendation: recommendationForControl(q, isGap),
      priority,
      regulatoryAlignments: q.regulatoryAlignments || gap?.regulatoryAlignments,
    };
  });

  const remediation: ReportRemediationItem[] = gaps.map((g) => {
    const q = activeQuestions.find((qq) => qq.questionId === g.questionId);
    const control = controls.find((c) => c.questionId === g.questionId);
    return {
      controlId: g.questionId,
      pillarName: g.pillarName,
      pillarNumber: q?.pillarNumber || 0,
      finding: g.evidenceNotes?.trim() || "Exception noted — no auditor observations recorded.",
      priority: g.scoreValue === 0 ? "High" : "Medium",
      recommendedAction: control?.recommendation || recommendationForControl(
        q ||
          ({
            questionId: g.questionId,
            pillarName: g.pillarName,
            remediationGuidance: undefined,
          } as IQuestionControl),
        true
      ),
      regulatoryAlignments: g.regulatoryAlignments,
    };
  });

  const why = whyInvestContent(session.assessmentType, gaps.length);
  const assessmentId = session._id.toString();

  return {
    assessmentId,
    assessmentReference: `GRAICE-${session.assessmentType.toUpperCase()}-${assessmentId.slice(-8).toUpperCase()}`,
    organizationName: company.name,
    assessmentTitle,
    assessmentType: session.assessmentType,
    statusLabel: statusLabel(session.status),
    organizationScope: scope,
    frameworkVersion: session.frameworkVersion || framework.version,
    frameworkTitle: framework.title,
    generatedAt: formatDate(new Date()),
    submittedAt: session.submittedAt ? formatDate(session.submittedAt) : undefined,
    auditorName,
    executiveNarrative: executiveNarrative({
      assessmentType: session.assessmentType,
      organizationName: company.name,
      kpis,
      gapCount: gaps.length,
    }),
    whyInvestNarrative: why.narrative,
    whyInvestBullets: why.bullets,
    kpis,
    pillarProgress,
    gapCount: gaps.length,
    controls,
    remediation,
  };
}
