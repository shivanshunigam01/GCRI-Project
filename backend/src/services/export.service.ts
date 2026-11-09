import ExcelJS from "exceljs";
import { IAssessmentSession } from "../models/AssessmentSession.js";
import { ICompany } from "../models/Company.js";
import { IAssessmentFramework } from "../models/AssessmentFramework.js";
import { IUser } from "../models/User.js";
import { buildGraiceReportData } from "./report/reportData.service.js";
import { reportLogoPaths } from "./report/reportAssets.js";
import type { GraiceReportData, ReportControlEvaluation, ReportRemediationItem } from "./report/reportTypes.js";

const NAVY = "FF102C3A";
const TEAL = "FF145568";
const HEADER_FG = "FFFFFFFF";
const ALT_ROW = "FFF8FAFB";
const BORDER = "FFD7E0E6";

function styleHeaderRow(row: ExcelJS.Row, colCount: number): void {
  row.height = 20;
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TEAL } };
    cell.font = { bold: true, color: { argb: HEADER_FG }, size: 10 };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: BORDER } },
      bottom: { style: "thin", color: { argb: BORDER } },
    };
  }
}

function styleDataRows(sheet: ExcelJS.Worksheet, startRow: number, endRow: number, colCount: number): void {
  for (let r = startRow; r <= endRow; r++) {
    const row = sheet.getRow(r);
    row.alignment = { vertical: "top", wrapText: true };
    const alt = (r - startRow) % 2 === 1;
    for (let c = 1; c <= colCount; c++) {
      const cell = row.getCell(c);
      if (alt) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW } };
      }
      cell.border = {
        left: { style: "hair", color: { argb: BORDER } },
        right: { style: "hair", color: { argb: BORDER } },
        bottom: { style: "hair", color: { argb: BORDER } },
      };
    }
  }
}

function regulatorySummary(control: ReportControlEvaluation): string {
  const a = control.regulatoryAlignments;
  if (!a) return "";
  const parts: string[] = [];
  if (a.euAiAct) parts.push(`EU AI Act: ${a.euAiAct}`);
  if (a.nistAiRmf) parts.push(`NIST AI RMF: ${a.nistAiRmf}`);
  if (a.iso42001) parts.push(`ISO 42001: ${a.iso42001}`);
  if (a.oecdAi) parts.push(`OECD: ${a.oecdAi}`);
  return parts.join(" | ");
}

function remediationRegulatory(item: ReportRemediationItem): string {
  const a = item.regulatoryAlignments;
  if (!a) return "";
  const parts: string[] = [];
  if (a.euAiAct) parts.push(`EU: ${a.euAiAct}`);
  if (a.nistAiRmf) parts.push(`NIST: ${a.nistAiRmf}`);
  if (a.iso42001) parts.push(`ISO: ${a.iso42001}`);
  if (a.oecdAi) parts.push(`OECD: ${a.oecdAi}`);
  return parts.join(" | ");
}

export class ExportService {
  /**
   * Multi-sheet Excel workbook aligned with the PDF report (buildGraiceReportData).
   */
  public static async generateAssessmentExcel(
    session: IAssessmentSession,
    company: ICompany,
    framework: IAssessmentFramework,
    auditor: IUser,
    conductedBy?: IUser | null
  ): Promise<Buffer> {
    const data = buildGraiceReportData({
      session,
      company,
      framework,
      auditor,
      conductedBy,
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = "GCRAI Platform";
    wb.created = new Date();
    wb.modified = new Date();
    wb.title = `GRAICE Assessment — ${data.organizationName}`;

    const logos = reportLogoPaths();

    // —— Sheet 1: Executive Summary ——
    const wsExec = wb.addWorksheet("Executive Summary", {
      views: [{ showGridLines: false }],
    });
    wsExec.getColumn(1).width = 28;
    wsExec.getColumn(2).width = 72;

    let startRow = 1;
    if (logos.gcrai) {
      const imgId = wb.addImage({
        filename: logos.gcrai,
        extension: "png",
      });
      wsExec.addImage(imgId, {
        tl: { col: 0, row: 0 },
        ext: { width: 160, height: 48 },
      });
      startRow = 5;
    }
    if (logos.graice) {
      const imgId = wb.addImage({
        filename: logos.graice,
        extension: "png",
      });
      wsExec.addImage(imgId, {
        tl: { col: 1.2, row: 0 },
        ext: { width: 140, height: 48 },
      });
    }

    const titleRow = wsExec.getRow(startRow);
    titleRow.getCell(1).value = "GRAICE Responsible AI Assessment — Executive Summary";
    titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: NAVY } };
    wsExec.mergeCells(startRow, 1, startRow, 2);
    startRow += 1;

    const meta: [string, string][] = [
      ["Organization", data.organizationName],
      ["Assessment type", data.assessmentType],
      ["Status", data.statusLabel],
      ["Framework", `${data.frameworkTitle || "GRAICE"} v${data.frameworkVersion}`],
      ["Organization scope", data.organizationScope],
      ["Maturity level", data.kpis.maturityLevel || "—"],
      ["Overall compliance", `${data.kpis.overallPercentage ?? 0}%`],
      ["Controls assessed", `${data.kpis.controlsAssessed} / ${data.kpis.totalControls}`],
      ["Exceptions noted", String(data.kpis.exceptionsNoted)],
      ["Generated", data.generatedAt],
      ["Submitted", data.submittedAt || "In progress"],
      ["Auditor / Assessor", data.auditorName],
      ["Reference", data.assessmentReference],
    ];

    meta.forEach(([label, value], i) => {
      const r = wsExec.getRow(startRow + i);
      r.getCell(1).value = label;
      r.getCell(1).font = { bold: true, color: { argb: TEAL } };
      r.getCell(2).value = value;
      r.getCell(2).alignment = { wrapText: true };
    });
    startRow += meta.length + 2;

    const narTitle = wsExec.getRow(startRow);
    narTitle.getCell(1).value = "Executive narrative";
    narTitle.getCell(1).font = { bold: true, size: 12, color: { argb: NAVY } };
    wsExec.mergeCells(startRow, 1, startRow, 2);
    startRow += 1;
    const nar = wsExec.getRow(startRow);
    nar.getCell(1).value = data.executiveNarrative;
    nar.height = 120;
    wsExec.mergeCells(startRow, 1, startRow, 2);
    nar.getCell(1).alignment = { wrapText: true, vertical: "top" };

  // —— Sheet 2: KPIs ——
    const wsKpi = wb.addWorksheet("KPI Dashboard");
    const kpiHeaders = ["Metric", "Value"];
    wsKpi.addRow(kpiHeaders);
    styleHeaderRow(wsKpi.getRow(1), 2);
    const kpiRows: [string, string | number][] = [
      ["Total controls", data.kpis.totalControls],
      ["Controls assessed", data.kpis.controlsAssessed],
      ["Completion %", `${data.kpis.completionPercentage}%`],
      ["Exceptions noted", data.kpis.exceptionsNoted],
      ["Not yet assessed", data.kpis.notYetAssessed],
      ["Overall score", `${data.kpis.overallScore ?? 0} / ${data.kpis.maxPossibleScore ?? 0}`],
      ["Compliance %", `${data.kpis.overallPercentage ?? 0}%`],
      ["Maturity", data.kpis.maturityLevel || "—"],
      ["Gaps / remediation items", data.gapCount],
    ];
    kpiRows.forEach((row) => wsKpi.addRow(row));
    styleDataRows(wsKpi, 2, 1 + kpiRows.length, 2);
    wsKpi.getColumn(1).width = 32;
    wsKpi.getColumn(2).width = 24;

  // —— Sheet 3: Pillar progress ——
    const wsPillar = wb.addWorksheet("Pillar Progress");
    const pillarHeaders = [
      "Pillar",
      "Name",
      "Total",
      "Complete",
      "In progress",
      "Not started",
      "Completion %",
      "Exceptions",
      "No exceptions",
    ];
    wsPillar.addRow(pillarHeaders);
    styleHeaderRow(wsPillar.getRow(1), pillarHeaders.length);
    data.pillarProgress.forEach((p) => {
      wsPillar.addRow([
        p.pillarNumber != null ? `P${p.pillarNumber}` : p.pillarId,
        p.pillarName,
        p.total,
        p.complete,
        p.inProgress,
        p.notStarted,
        p.completionPercentage,
        p.exceptionsNoted,
        p.noExceptions,
      ]);
    });
    const pillarEnd = 1 + data.pillarProgress.length;
    styleDataRows(wsPillar, 2, pillarEnd, pillarHeaders.length);
    wsPillar.autoFilter = { from: "A1", to: `I${pillarEnd}` };
    wsPillar.views = [{ state: "frozen", ySplit: 1 }];
    [14, 36, 8, 10, 12, 12, 12, 12, 14].forEach((w, i) => {
      wsPillar.getColumn(i + 1).width = w;
    });

  // —— Sheet 4: Remediation ——
    const wsRem = wb.addWorksheet("Remediation Plan");
    const remHeaders = [
      "Control ID",
      "Pillar",
      "Priority",
      "Finding",
      "Recommended action",
      "Owner",
      "Target date",
      "Regulatory alignment",
    ];
    wsRem.addRow(remHeaders);
    styleHeaderRow(wsRem.getRow(1), remHeaders.length);
    const sortedRem = [...data.remediation].sort((a, b) =>
      a.priority === b.priority ? a.pillarNumber - b.pillarNumber : a.priority === "High" ? -1 : 1
    );
    sortedRem.forEach((r) => {
      wsRem.addRow([
        r.controlId,
        r.pillarName,
        r.priority,
        r.finding,
        r.recommendedAction,
        r.responsibleOwner || "",
        r.targetDate || "",
        remediationRegulatory(r),
      ]);
    });
    const remEnd = Math.max(1, sortedRem.length);
    if (sortedRem.length > 0) {
      styleDataRows(wsRem, 2, 1 + remEnd, remHeaders.length);
    }
    wsRem.autoFilter = { from: "A1", to: `H${1 + remEnd}` };
    wsRem.views = [{ state: "frozen", ySplit: 1 }];
    [14, 22, 10, 42, 42, 16, 14, 36].forEach((w, i) => {
      wsRem.getColumn(i + 1).width = w;
    });

  // —— Sheet 5: Control detail ——
    const wsCtrl = wb.addWorksheet("Control Detail");
    const ctrlHeaders = [
      "Control ID",
      "Pillar",
      "Assurance tier",
      "Test status",
      "Exception status",
      "Gap?",
      "Control requirement",
      "Test procedure",
      "Findings",
      "Recommendation",
      "Tester",
      "Test date",
      "Work paper ref",
      "Evidence notes",
      "Evidence reference",
      "Linked documents",
      "Linked meetings",
      "Regulatory alignment",
    ];
    wsCtrl.addRow(ctrlHeaders);
    styleHeaderRow(wsCtrl.getRow(1), ctrlHeaders.length);
    data.controls.forEach((c) => {
      wsCtrl.addRow([
        c.questionId,
        `${c.pillarNumber}: ${c.pillarName}`,
        c.assuranceTier,
        c.testStatus,
        c.exceptionStatus,
        c.isGap ? "Yes" : "No",
        c.questionText,
        c.testProcedure || c.testProcedureSteps.join("\n"),
        c.findings,
        c.recommendation,
        c.testerName,
        c.testDate,
        c.workPaperReference || "",
        c.evidenceNotes || "",
        c.evidenceReference || "",
        c.linkedDocumentTitles.join("; "),
        c.linkedMeetingTopics.join("; "),
        regulatorySummary(c),
      ]);
    });
    const ctrlEnd = 1 + data.controls.length;
    if (data.controls.length > 0) {
      styleDataRows(wsCtrl, 2, ctrlEnd, ctrlHeaders.length);
    }
    wsCtrl.autoFilter = { from: "A1", to: `R${ctrlEnd}` };
    wsCtrl.views = [{ state: "frozen", ySplit: 1, xSplit: 2 }];
    [14, 22, 14, 12, 16, 8, 48, 36, 36, 36, 16, 12, 14, 28, 20, 24, 24, 32].forEach(
      (w, i) => {
        wsCtrl.getColumn(i + 1).width = w;
      }
    );

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }
}
