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
   * Option A: Exception-based compliance percentage for Full Assessment (65 controls)
   */
  private static calculateFullAssessmentScores(
    session: IAssessmentSession,
    framework: IAssessmentFramework
  ): IScoreSnapshot {
    const answerMap = new Map(session.answers.map((a) => [a.questionId, a]));

    const pillarScores: IPillarScore[] = framework.pillars.map((pillar) => {
      const pillarQuestions = framework.questions.filter(
        (q) => q.pillarId === pillar.pillarId
      );

      let noExceptions = 0;
      let exceptions = 0;
      let notAssessed = 0;

      for (const q of pillarQuestions) {
        const ans = answerMap.get(q.questionId);
        if (!ans || !ans.exceptionStatus || ans.exceptionStatus === "NotAssessed") {
          notAssessed++;
        } else if (ans.exceptionStatus === "NoExceptionNoted") {
          noExceptions++;
        } else if (ans.exceptionStatus === "ExceptionNoted") {
          exceptions++;
        }
      }

      const totalAssessed = noExceptions + exceptions;
      const compliancePercentage =
        totalAssessed > 0
          ? Math.round((noExceptions / totalAssessed) * 100 * 10) / 10
          : 0;

      return {
        pillarId: pillar.pillarId,
        pillarName: pillar.name,
        pillarNumber: pillar.pillarNumber,
        scoreEarned: noExceptions,
        scoreMax: pillarQuestions.length,
        percentage: compliancePercentage,
        exceptionsNoted: exceptions,
        noExceptionsNoted: noExceptions,
        notAssessed,
        totalControls: pillarQuestions.length,
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

    const overallCompliancePercentage =
      totalControlsAssessed > 0
        ? Math.round((totalNoExceptionsNoted / totalControlsAssessed) * 100 * 10) / 10
        : 0;

    let maturityLevel: MaturityLevel = "Initial";
    if (overallCompliancePercentage >= 90) {
      maturityLevel = "Advanced";
    } else if (overallCompliancePercentage >= 70) {
      maturityLevel = "Established";
    } else if (overallCompliancePercentage >= 40) {
      maturityLevel = "Emerging";
    } else {
      maturityLevel = "Initial";
    }

    return {
      overallScore: overallCompliancePercentage,
      maxPossibleScore: 100, // 100% compliance
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
   */
  private static calculateLightAssessmentScores(
    session: IAssessmentSession,
    framework: IAssessmentFramework
  ): IScoreSnapshot {
    const answerMap = new Map(session.answers.map((a) => [a.questionId, a]));

    const pillarScores: IPillarScore[] = framework.pillars.map((pillar) => {
      const pillarQuestions = framework.questions.filter(
        (q) => q.pillarId === pillar.pillarId
      );

      let earned = 0;
      const max = pillarQuestions.length * 4;

      for (const q of pillarQuestions) {
        const ans = answerMap.get(q.questionId);
        if (ans && typeof ans.scoreValue === "number") {
          earned += ans.scoreValue;
        }
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

    // Also include Section 1: AI Landscape questions if present
    const landscapeQuestions = framework.questions.filter(
      (q) => q.pillarId === "ai-landscape"
    );
    let totalScore = 0;
    for (const ans of session.answers) {
      totalScore += ans.scoreValue || 0;
    }

    const maxPossibleScore = 120;
    const overallPercentage = Math.round((totalScore / maxPossibleScore) * 100 * 10) / 10;

    let maturityLevel: MaturityLevel = "Initial";
    if (totalScore >= 91) {
      maturityLevel = "Advanced";
    } else if (totalScore >= 61) {
      maturityLevel = "Established";
    } else if (totalScore >= 31) {
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
   */
  public static extractGaps(
    session: IAssessmentSession,
    framework: IAssessmentFramework
  ): GovernanceGap[] {
    const gaps: GovernanceGap[] = [];
    const questionMap = new Map(framework.questions.map((q) => [q.questionId, q]));

    for (const ans of session.answers) {
      const q = questionMap.get(ans.questionId);
      if (!q) continue;

      const isGap =
        session.assessmentType === "Full"
          ? ans.exceptionStatus === "ExceptionNoted"
          : (ans.scoreValue || 0) === 0;

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
