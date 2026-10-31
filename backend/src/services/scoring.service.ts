import {
  IAssessmentSession,
  IScoreSnapshot,
  IPillarScore,
  MaturityLevel,
} from "../models/AssessmentSession.js";
import { IAssessmentFramework } from "../models/AssessmentFramework.js";

export interface GovernanceGap {
  questionId: string;
  pillarId: string;
  pillarName: string;
  questionText: string;
  controlDescription?: string;
  exceptionStatus?: string;
  scoreValue?: number;
  evidenceNotes?: string;
  regulatoryAlignments?: {
    euAiAct?: string;
    nistAiRmf?: string;
    iso42001?: string;
    oecdAi?: string;
  };
}

export class ScoringService {
  /**
   * Deterministically calculates the score snapshot for an assessment session
   */
  public static calculateScores(
    session: IAssessmentSession,
    framework: IAssessmentFramework
  ): IScoreSnapshot {
    if (session.assessmentType === "Full") {
      return this.calculateFullAssessmentScores(session, framework);
    } else {
      return this.calculateLightAssessmentScores(session, framework);
    }
  }

  /**
   * Exception-based compliance percentage for Full Assessment (65 controls across 7 pillars)
   * Aligns with the GRAICE Full Assessment Workbook Dashboard formulas:
   * - Tracks No Exception Noted, Exception Noted, and Not Assessed per pillar and overall
   * - Computes compliance against total active controls in scope so unassessed controls
   *   cannot artificially inflate a partial assessment to 100% Advanced maturity
   * - Respects configurable pillar weights and dynamic framework maturityThresholds
   */
  private static calculateFullAssessmentScores(
    session: IAssessmentSession,
    framework: IAssessmentFramework
  ): IScoreSnapshot {
    const answerMap = new Map(session.answers.map((a) => [a.questionId, a]));
    const activeQuestions = framework.questions.filter((q) => q.isActive !== false);

    const pillarScores: IPillarScore[] = framework.pillars.map((pillar) => {
      const pillarQuestions = activeQuestions.filter(
        (q) => q.pillarId === pillar.pillarId || q.pillarNumber === pillar.pillarNumber
      );

      let noExceptions = 0;
      let exceptions = 0;
      let notAssessed = 0;

      for (const q of pillarQuestions) {
        const ans = answerMap.get(q.questionId);
        if (
          !ans ||
          (!ans.exceptionStatus && !ans.selectedOptionCode) ||
          ans.exceptionStatus === "NotAssessed" ||
          ans.selectedOptionCode === "NOT_ASSESSED"
        ) {
          notAssessed++;
        } else if (
          ans.exceptionStatus === "NoExceptionNoted" ||
          ans.selectedOptionCode === "NO_EXCEPTION_NOTED"
        ) {
          noExceptions++;
        } else if (
          ans.exceptionStatus === "ExceptionNoted" ||
          ans.selectedOptionCode === "EXCEPTION_NOTED"
        ) {
          exceptions++;
        } else {
          notAssessed++;
        }
      }

      const totalControlsInPillar = pillarQuestions.length;
      const compliancePercentage =
        totalControlsInPillar > 0
          ? Math.round((noExceptions / totalControlsInPillar) * 100 * 10) / 10
          : 0;

      return {
        pillarId: pillar.pillarId,
        pillarName: pillar.name,
        pillarNumber: pillar.pillarNumber,
        scoreEarned: noExceptions,
        scoreMax: totalControlsInPillar,
        percentage: compliancePercentage,
        exceptionsNoted: exceptions,
        noExceptionsNoted: noExceptions,
        notAssessed,
        totalControls: totalControlsInPillar,
        compliancePercentage,
      };
    });

    const totalNoExceptionsNoted = pillarScores.reduce(
      (sum, p) => sum + (p.noExceptionsNoted || 0),
      0
    );
    const totalExceptionsNoted = pillarScores.reduce(
      (sum, p) => sum + (p.exceptionsNoted || 0),
      0
    );
    const totalNotAssessed = pillarScores.reduce(
      (sum, p) => sum + (p.notAssessed || 0),
      0
    );
    const totalControlsAssessed = totalNoExceptionsNoted + totalExceptionsNoted;
    const totalControls = pillarScores.reduce(
      (sum, p) => sum + (p.totalControls || 0),
      0
    );

    // Check if custom pillar weights are configured
    const hasCustomWeights = framework.pillars.some(
      (p) => typeof p.weight === "number" && p.weight !== 1
    );

    let overallCompliancePercentage = 0;
    if (hasCustomWeights) {
      let weightedSum = 0;
      let totalWeight = 0;
      framework.pillars.forEach((pillar, idx) => {
        const weight = typeof pillar.weight === "number" ? pillar.weight : 1;
        const pScore = pillarScores[idx];
        if (pScore && (pScore.totalControls || 0) > 0 && weight > 0) {
          weightedSum += pScore.percentage * weight;
          totalWeight += weight;
        }
      });
      overallCompliancePercentage =
        totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 0;
    } else {
      overallCompliancePercentage =
        totalControls > 0
          ? Math.round((totalNoExceptionsNoted / totalControls) * 100 * 10) / 10
          : 0;
    }

    const thresholds = framework.maturityThresholds || {
      initialMax: 39,
      emergingMax: 69,
      establishedMax: 89,
      advancedMax: 100,
    };

    let maturityLevel: MaturityLevel = "Initial";
    if (overallCompliancePercentage > thresholds.establishedMax) {
      maturityLevel = "Advanced";
    } else if (overallCompliancePercentage > thresholds.emergingMax) {
      maturityLevel = "Established";
    } else if (overallCompliancePercentage > thresholds.initialMax) {
      maturityLevel = "Emerging";
    } else {
      maturityLevel = "Initial";
    }

    return {
      overallScore: overallCompliancePercentage,
      maxPossibleScore: thresholds.advancedMax || 100,
      overallPercentage: overallCompliancePercentage,
      totalExceptionsNoted,
      totalNoExceptionsNoted,
      totalNotAssessed,
      totalControlsAssessed,
      compliancePercentage: overallCompliancePercentage,
      maturityLevel,
      pillarScores,
      calculatedAt: new Date(),
    };
  }

  /**
   * 120-Point cumulative scoring for Light Assessment (30 questions)
   * Following the GRAICE Light Assessment Online Questionnaire specification:
   * - 30 questions (4 in Section 1: Organization & AI Landscape + 26 across Pillars 1–7)
   * - Max score per question = 4, total max score = 120
   * - Preliminary Maturity Levels:
   *   Initial: 0–30 | Emerging: 31–60 | Established: 61–90 | Advanced: 91–120
   */
  private static calculateLightAssessmentScores(
    session: IAssessmentSession,
    framework: IAssessmentFramework
  ): IScoreSnapshot {
    const answerMap = new Map(session.answers.map((a) => [a.questionId, a]));
    const activeQuestions = framework.questions.filter((q) => q.isActive !== false);

    const resolveQuestionScore = (qId: string): number => {
      const ans = answerMap.get(qId);
      if (!ans) return 0;
      const qDef = activeQuestions.find((q) => q.questionId === qId);
      if (ans.selectedOptionCode && qDef?.responseOptions?.length) {
        const matched = qDef.responseOptions.find(
          (o) =>
            o.code.toLowerCase() === ans.selectedOptionCode!.toLowerCase() ||
            o.label.toLowerCase() === ans.selectedOptionCode!.toLowerCase()
        );
        if (matched) return matched.scoreValue;
      }
      return typeof ans.scoreValue === "number" ? ans.scoreValue : 0;
    };

    const pillarScores: IPillarScore[] = framework.pillars.map((pillar) => {
      const pillarQuestions = activeQuestions.filter(
        (q) => q.pillarId === pillar.pillarId || q.pillarNumber === pillar.pillarNumber
      );

      let earned = 0;
      const max = pillarQuestions.length * 4;

      for (const q of pillarQuestions) {
        earned += resolveQuestionScore(q.questionId);
      }

      const percentage = max > 0 ? Math.round((earned / max) * 100 * 10) / 10 : 0;

      return {
        pillarId: pillar.pillarId,
        pillarName: pillar.name,
        pillarNumber: pillar.pillarNumber,
        scoreEarned: earned,
        scoreMax: max,
        percentage,
        totalControls: pillarQuestions.length,
      };
    });

    // Calculate total score across all active questions (including Section 1: AI Landscape)
    let totalScore = 0;
    for (const q of activeQuestions) {
      totalScore += resolveQuestionScore(q.questionId);
    }

    const thresholds = framework.maturityThresholds || {
      initialMax: 30,
      emergingMax: 60,
      establishedMax: 90,
      advancedMax: 120,
    };

    const maxPossibleScore = thresholds.advancedMax || activeQuestions.length * 4 || 120;
    const overallPercentage =
      maxPossibleScore > 0
        ? Math.round((totalScore / maxPossibleScore) * 100 * 10) / 10
        : 0;

    let maturityLevel: MaturityLevel = "Initial";
    if (totalScore > thresholds.establishedMax) {
      maturityLevel = "Advanced";
    } else if (totalScore > thresholds.emergingMax) {
      maturityLevel = "Established";
    } else if (totalScore > thresholds.initialMax) {
      maturityLevel = "Emerging";
    } else {
      maturityLevel = "Initial";
    }

    return {
      overallScore: totalScore,
      maxPossibleScore,
      overallPercentage,
      maturityLevel,
      pillarScores,
      calculatedAt: new Date(),
    };
  }

  /**
   * Identifies governance gaps for remediation
   * Excludes Section 1 (pillarNumber === 0 / "ai-landscape") profile questions in Light Assessments
   * so organizational context answers (e.g. "No GenAI usage") are not flagged as governance gaps.
   */
  public static extractGaps(
    session: IAssessmentSession,
    framework: IAssessmentFramework
  ): GovernanceGap[] {
    const gaps: GovernanceGap[] = [];
    const questionMap = new Map(
      framework.questions
        .filter((q) => q.isActive !== false)
        .map((q) => [q.questionId, q])
    );

    for (const ans of session.answers) {
      const q = questionMap.get(ans.questionId);
      if (!q) continue;

      // Skip Section 1: Organization & AI Landscape profiling questions in Light Assessment
      if (q.pillarNumber === 0 || q.pillarId === "ai-landscape") {
        continue;
      }

      const isGap =
        session.assessmentType === "Full"
          ? ans.exceptionStatus === "ExceptionNoted" ||
            ans.selectedOptionCode === "EXCEPTION_NOTED"
          : (ans.testStatus === "Complete" || !!ans.selectedOptionCode) &&
            (ans.scoreValue || 0) === 0;

      if (isGap) {
        gaps.push({
          questionId: ans.questionId,
          pillarId: q.pillarId,
          pillarName: q.pillarName,
          questionText: q.text,
          controlDescription: q.controlDescription,
          exceptionStatus: ans.exceptionStatus,
          scoreValue: ans.scoreValue,
          evidenceNotes: ans.evidenceNotes,
          regulatoryAlignments: q.regulatoryAlignments,
        });
      }
    }

    return gaps;
  }
}
