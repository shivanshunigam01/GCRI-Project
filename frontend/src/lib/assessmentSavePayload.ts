import { FrameworkQuestion } from "@/types/framework.types";
import { SaveAnswerItemInput } from "@/types/assessment.types";
import { loadAssessmentDraft } from "@/lib/assessmentDraftStorage";

export function mergeDraftAnswers(
  serverAnswers: Record<string, string>,
  assessmentId: string
): Record<string, string> {
  const draft = loadAssessmentDraft(assessmentId);
  if (!draft?.answers) return { ...serverAnswers };
  return { ...serverAnswers, ...draft.answers };
}

export function buildSavePayloadFromAnswers(
  questions: FrameworkQuestion[],
  answersByQuestionId: Record<string, string>
): SaveAnswerItemInput[] {
  return questions
    .filter((q) => answersByQuestionId[q.questionId])
    .map((q) => ({
      questionId: q.questionId,
      pillarId: q.pillarId,
      selectedOptionCode: answersByQuestionId[q.questionId],
      testStatus: "Complete" as const,
    }));
}

export function answersMapFromSession(
  answers: Array<{ questionId: string; selectedOptionCode?: string }>
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const a of answers) {
    if (a.selectedOptionCode) map[a.questionId] = a.selectedOptionCode;
  }
  return map;
}
