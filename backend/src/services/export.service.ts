import * as XLSX from "xlsx";
import { IAssessmentSession } from "../models/AssessmentSession.js";
import { ICompany } from "../models/Company.js";
import { IAssessmentFramework } from "../models/AssessmentFramework.js";
import { ScoringService } from "./scoring.service.js";

export class ExportService {
  /**
   * Generates a multi-sheet Excel workbook containing complete audit findings
   */
  public static generateAssessmentExcel(
    session: IAssessmentSession,
    company: ICompany,
    framework: IAssessmentFramework
  ): Buffer {
    const wb = XLSX.utils.book_new();
    const snapshot = session.scoreSnapshot || ScoringService.calculateScores(session, framework);

    // ==========================================
    // SHEET 1: EXECUTIVE SUMMARY
    // ==========================================
    const summaryData = [
      ["GRAICE Responsible AI Governance Assessment Report"],
      ["Confidential — For Authorized Stakeholder Use Only"],
      [],
      ["Property", "Value"],
      ["Organization Name", company.name],
      ["Domain", company.domain || "N/A"],
      ["Assessment Type", `${session.assessmentType} Assessment`],
      ["Framework Version", session.frameworkVersion],
      ["Status", session.status],
      ["Overall Compliance Rating", `${snapshot.overallPercentage}%`],
      ["Maturity Classification", snapshot.maturityLevel],
      ["Controls Evaluated", `${snapshot.totalControlsAssessed || snapshot.overallScore} / ${snapshot.maxPossibleScore}`],
      ["Exceptions Noted", snapshot.totalExceptionsNoted || 0],
      ["No Exceptions Noted", snapshot.totalNoExceptionsNoted || 0],
      ["Submission Date", session.submittedAt ? new Date(session.submittedAt).toISOString() : "In Progress"],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Executive Summary");

    // ==========================================
    // SHEET 2: PILLAR PERFORMANCE
    // ==========================================
    const pillarData = [
      ["Pillar #", "Pillar Name", "Total Controls", "No Exceptions", "Exceptions Noted", "Compliance %"],
    ];
    snapshot.pillarScores.forEach((p) => {
      pillarData.push([
        p.pillarNumber ? `P${p.pillarNumber}` : p.pillarId,
        p.pillarName,
        String(p.totalControls || p.scoreMax),
        String(p.noExceptionsNoted ?? p.scoreEarned),
        String(p.exceptionsNoted ?? 0),
        `${p.percentage}%`,
      ]);
    });
    const wsPillars = XLSX.utils.aoa_to_sheet(pillarData);
    XLSX.utils.book_append_sheet(wb, wsPillars, "Pillar Breakdown");

    // ==========================================
    // SHEET 3: CONTROL RESPONSES & EVIDENCE
    // ==========================================
    const answerMap = new Map(session.answers.map((a) => [a.questionId, a]));
    const controlData = [
      [
        "Control ID",
        "Pillar",
        "Control Requirement",
        "Exception Status",
        "Test Status",
        "Score",
        "Auditor Notes",
        "Evidence Attached",
        "Evidence URL",
      ],
    ];

    framework.questions.forEach((q) => {
      const ans = answerMap.get(q.questionId);
      controlData.push([
        q.questionId,
        q.pillarName || q.pillarId,
        q.text,
        ans?.exceptionStatus || "NotAssessed",
        ans?.testStatus || "NotStarted",
        String(ans?.scoreValue ?? 0),
        ans?.evidenceNotes || "",
        ans?.evidenceAttachmentUrl ? "Yes" : "No",
        ans?.evidenceAttachmentUrl || "",
      ]);
    });
    const wsControls = XLSX.utils.aoa_to_sheet(controlData);
    XLSX.utils.book_append_sheet(wb, wsControls, "Detailed Controls");

    return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  }
}
