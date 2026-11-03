import {
  AnswerItem,
  ExceptionStatus,
  SaveAnswerItemInput,
  TestStatus,
} from "@/types/assessment.types";
import { FrameworkQuestion } from "@/types/framework.types";

export interface FullControlAnswerState {
  testStatus: TestStatus;
  exceptionStatus: ExceptionStatus;
  evidenceNotes: string;
  workPaperReference: string;
  evidenceAttachmentUrl?: string;
  selectedOptionCode?: string;
}

export const EMPTY_FULL_ANSWER: FullControlAnswerState = {
  testStatus: "NotStarted",
  exceptionStatus: "NotAssessed",
  evidenceNotes: "",
  workPaperReference: "",
};

/** Maps Full exception status ↔ framework response option codes from seed. */
export function optionCodeForException(status: ExceptionStatus): string {
  switch (status) {
    case "NoExceptionNoted":
      return "NO_EXCEPTION_NOTED";
    case "ExceptionNoted":
      return "EXCEPTION_NOTED";
    case "NotAssessed":
    default:
      return "NOT_ASSESSED";
  }
}

export function exceptionFromOptionCode(code?: string): ExceptionStatus {
  const normalized = (code || "").toUpperCase();
  if (
    normalized === "NO_EXCEPTION_NOTED" ||
    normalized === "NOEXCEPTIONNOTED"
  ) {
    return "NoExceptionNoted";
  }
  if (normalized === "EXCEPTION_NOTED" || normalized === "EXCEPTIONNOTED") {
    return "ExceptionNoted";
  }
  return "NotAssessed";
}

export function fullAnswerFromSessionItem(
  item?: AnswerItem
): FullControlAnswerState {
  if (!item) return { ...EMPTY_FULL_ANSWER };

  const exceptionStatus: ExceptionStatus =
    item.exceptionStatus || exceptionFromOptionCode(item.selectedOptionCode);

  return {
    testStatus: item.testStatus || "NotStarted",
    exceptionStatus,
    evidenceNotes: item.evidenceNotes || "",
    workPaperReference: item.workPaperReference || "",
    evidenceAttachmentUrl: item.evidenceAttachmentUrl || undefined,
    selectedOptionCode:
      item.selectedOptionCode || optionCodeForException(exceptionStatus),
  };
}

export function isControlAssessed(state: FullControlAnswerState): boolean {
  return (
    state.exceptionStatus === "NoExceptionNoted" ||
    state.exceptionStatus === "ExceptionNoted"
  );
}

export function isControlInProgress(state: FullControlAnswerState): boolean {
  if (isControlAssessed(state)) return false;
  return (
    state.testStatus === "InProgress" ||
    Boolean(state.evidenceNotes.trim()) ||
    Boolean(state.workPaperReference.trim())
  );
}

export function buildFullSavePayload(
  questions: FrameworkQuestion[],
  answersByQuestionId: Record<string, FullControlAnswerState>,
  onlyQuestionIds?: string[]
): SaveAnswerItemInput[] {
  const allow = onlyQuestionIds ? new Set(onlyQuestionIds) : null;

  return questions
    .filter((q) => {
      if (allow && !allow.has(q.questionId)) return false;
      const state = answersByQuestionId[q.questionId];
      if (!state) return false;
      // Persist any control that has been touched beyond pristine empty
      return (
        state.testStatus !== "NotStarted" ||
        state.exceptionStatus !== "NotAssessed" ||
        Boolean(state.evidenceNotes.trim()) ||
        Boolean(state.workPaperReference.trim()) ||
        Boolean(state.evidenceAttachmentUrl) ||
        Boolean(state.selectedOptionCode)
      );
    })
    .map((q) => {
      const state = answersByQuestionId[q.questionId];
      const exceptionStatus = state.exceptionStatus;
      const selectedOptionCode =
        state.selectedOptionCode || optionCodeForException(exceptionStatus);

      let testStatus = state.testStatus;
      if (isControlAssessed(state) && testStatus === "NotStarted") {
        testStatus = "Complete";
      }

      return {
        questionId: q.questionId,
        pillarId: q.pillarId,
        testStatus,
        exceptionStatus,
        selectedOptionCode,
        evidenceNotes: state.evidenceNotes.trim() || undefined,
        workPaperReference: state.workPaperReference.trim() || undefined,
        evidenceAttachmentUrl: state.evidenceAttachmentUrl || undefined,
      };
    });
}

export function groupQuestionsByPillar(questions: FrameworkQuestion[]) {
  const order: string[] = [];
  const map = new Map<
    string,
    {
      pillarId: string;
      pillarName: string;
      pillarNumber: number;
      questions: FrameworkQuestion[];
    }
  >();

  for (const q of questions) {
    const key = q.pillarId || `p-${q.pillarNumber}`;
    if (!map.has(key)) {
      order.push(key);
      map.set(key, {
        pillarId: key,
        pillarName: q.pillarName || key,
        pillarNumber: q.pillarNumber ?? order.length,
        questions: [],
      });
    }
    map.get(key)!.questions.push(q);
  }

  return order.map((k) => map.get(k)!);
}
