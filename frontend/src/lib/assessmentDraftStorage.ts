const DRAFT_KEY_PREFIX = "graice_assessment_draft:";

export interface AssessmentLocalDraft {
  assessmentId: string;
  answers: Record<string, string>;
  skippedQuestionIds: string[];
  currentIndex: number;
  updatedAt: string;
}

function draftKey(assessmentId: string): string {
  return `${DRAFT_KEY_PREFIX}${assessmentId}`;
}

export function loadAssessmentDraft(assessmentId: string): AssessmentLocalDraft | null {
  if (typeof window === "undefined" || !assessmentId) return null;
  try {
    const raw = localStorage.getItem(draftKey(assessmentId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AssessmentLocalDraft;
    if (parsed.assessmentId !== assessmentId) return null;
    if (!parsed.answers || typeof parsed.answers !== "object") return null;
    return {
      assessmentId,
      answers: parsed.answers,
      skippedQuestionIds: Array.isArray(parsed.skippedQuestionIds)
        ? parsed.skippedQuestionIds
        : [],
      currentIndex:
        typeof parsed.currentIndex === "number" && parsed.currentIndex >= 0
          ? parsed.currentIndex
          : 0,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function saveAssessmentDraft(
  assessmentId: string,
  data: Omit<AssessmentLocalDraft, "assessmentId" | "updatedAt">
): void {
  if (typeof window === "undefined" || !assessmentId) return;
  const payload: AssessmentLocalDraft = {
    assessmentId,
    answers: data.answers,
    skippedQuestionIds: data.skippedQuestionIds,
    currentIndex: data.currentIndex,
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(draftKey(assessmentId), JSON.stringify(payload));
  } catch {
    /* quota or private mode — ignore */
  }
}

export function clearAssessmentDraft(assessmentId: string): void {
  if (typeof window === "undefined" || !assessmentId) return;
  localStorage.removeItem(draftKey(assessmentId));
}

/** Merge server answers with local draft; draft wins on conflict. */
export function mergeAnswersWithDraft(
  serverAnswers: Record<string, string>,
  draft: AssessmentLocalDraft | null
): Record<string, string> {
  if (!draft?.answers) return { ...serverAnswers };
  return { ...serverAnswers, ...draft.answers };
}

export function computeResumeIndex(
  questionIds: string[],
  answers: Record<string, string>,
  skippedQuestionIds: Set<string>,
  preferredIndex?: number
): number {
  if (questionIds.length === 0) return 0;

  if (
    typeof preferredIndex === "number" &&
    preferredIndex >= 0 &&
    preferredIndex < questionIds.length
  ) {
    return preferredIndex;
  }

  for (let i = 0; i < questionIds.length; i++) {
    const id = questionIds[i];
    if (!answers[id] && !skippedQuestionIds.has(id)) return i;
  }
  return Math.max(0, questionIds.length - 1);
}
