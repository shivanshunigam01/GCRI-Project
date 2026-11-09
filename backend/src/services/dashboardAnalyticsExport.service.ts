import ExcelJS from "exceljs";
import type { DashboardAnalyticsPayload } from "./dashboardAnalytics.service.js";
import { reportLogoPaths } from "./report/reportAssets.js";
import { renderDashboardAnalyticsPdf } from "./dashboardAnalyticsPdf.renderer.js";

const XLS_NAVY = "FF102C3A";
const XLS_TEAL = "FF145568";
const XLS_HEADER_FG = "FFFFFFFF";
const XLS_ALT = "FFF8FAFB";
const XLS_BORDER = "FFD7E0E6";

export interface DashboardExportContext {
  scopeLabel: string;
  roleLabel: string;
  requestedBy?: string;
}

function styleExcelHeader(row: ExcelJS.Row, cols: number): void {
  for (let c = 1; c <= cols; c++) {
    const cell = row.getCell(c);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: XLS_TEAL } };
    cell.font = { bold: true, color: { argb: XLS_HEADER_FG }, size: 10 };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  }
}

function kpiRows(data: DashboardAnalyticsPayload): Array<[string, string | number]> {
  const k = data.kpis;
  return [
    ["Total users", k.totalUsers.value],
    ["Auditors / assessors", k.totalAuditors.value],
    ["Organizations", k.totalOrganizations.value],
    ["Assessments", k.totalAssessments.value],
    ["Compliance score", `${k.complianceScore.value}%`],
    ["Open risks", k.openRisks.value],
    ["Period", data.range],
    ["Generated", new Date(data.generatedAt).toISOString().slice(0, 19)],
  ];
}

export class DashboardAnalyticsExportService {
  public static async buildExcel(
    data: DashboardAnalyticsPayload,
    ctx: DashboardExportContext
  ): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = "GCRAI Platform";
    wb.created = new Date();
    const logos = reportLogoPaths();

    const summary = wb.addWorksheet("Executive Summary", { views: [{ showGridLines: false }] });
    summary.getColumn(1).width = 26;
    summary.getColumn(2).width = 70;
    let row = 1;
    if (logos.gcrai) {
      const id = wb.addImage({ filename: logos.gcrai, extension: "png" });
      summary.addImage(id, { tl: { col: 0, row: 0 }, ext: { width: 150, height: 44 } });
      row = 5;
    }
    summary.getRow(row).getCell(1).value = "Platform Operations & Governance — Analytics Export";
    summary.getRow(row).getCell(1).font = { bold: true, size: 14, color: { argb: XLS_NAVY } };
    summary.mergeCells(row, 1, row, 2);
    row += 1;
    summary.getRow(row).getCell(1).value = `Scope: ${ctx.scopeLabel}`;
    summary.getRow(row).getCell(2).value = `Role view: ${ctx.roleLabel}`;
    row += 2;

    kpiRows(data).forEach(([label, value]) => {
      const r = summary.getRow(row++);
      r.getCell(1).value = label;
      r.getCell(1).font = { bold: true, color: { argb: XLS_TEAL } };
      r.getCell(2).value = value;
    });
    row += 1;
    summary.getRow(row).getCell(1).value = "Executive notes";
    summary.getRow(row).getCell(1).font = { bold: true };
    row += 1;
    const outlierText =
      data.outliers.length > 0
        ? data.outliers.map((o) => `[${o.severity}] ${o.label}: ${o.detail}`).join("\n")
        : "No material outliers detected for this period.";
    summary.getRow(row).getCell(1).value = outlierText;
    summary.getRow(row).height = 80;
    summary.mergeCells(row, 1, row, 2);
    summary.getRow(row).getCell(1).alignment = { wrapText: true, vertical: "top" };

    const kpiSheet = wb.addWorksheet("KPI Delta");
    kpiSheet.addRow(["Metric", "Value", "Delta %", "Hint"]);
    styleExcelHeader(kpiSheet.getRow(1), 4);
    const kpiEntries: Array<keyof DashboardAnalyticsPayload["kpis"]> = [
      "totalUsers",
      "totalAuditors",
      "totalOrganizations",
      "totalAssessments",
      "complianceScore",
      "openRisks",
    ];
    const labels: Record<string, string> = {
      totalUsers: "Users",
      totalAuditors: "Auditors",
      totalOrganizations: "Organizations",
      totalAssessments: "Assessments",
      complianceScore: "Compliance",
      openRisks: "Open risks",
    };
    kpiEntries.forEach((key) => {
      const item = data.kpis[key];
      const suffix = "suffix" in item && item.suffix ? item.suffix : "";
      kpiSheet.addRow([
        labels[key] || key,
        `${item.value}${suffix}`,
        item.deltaPct,
        item.hint || "",
      ]);
    });
    kpiSheet.getColumn(1).width = 22;
    kpiSheet.getColumn(4).width = 36;

    const trend = wb.addWorksheet("Compliance Trend");
    trend.addRow(["Date", "Compliance %"]);
    styleExcelHeader(trend.getRow(1), 2);
    data.complianceTrend.forEach((p) => trend.addRow([p.date, p.value]));
    trend.views = [{ state: "frozen", ySplit: 1 }];

    const events = wb.addWorksheet("Security Events");
    events.addRow(["Date", "Event count"]);
    styleExcelHeader(events.getRow(1), 2);
    data.securityEventsTrend.forEach((p) => events.addRow([p.date, p.count]));

    const pillars = wb.addWorksheet("Pillar Compliance");
    pillars.addRow(["Pillar", "Name", "Completion %"]);
    styleExcelHeader(pillars.getRow(1), 3);
    data.complianceByPillar.forEach((p) => pillars.addRow([p.key, p.name, p.percentage]));

    const orgs = wb.addWorksheet("Top Organizations");
    orgs.addRow(["Organization", "Assessments", "Compliance %", "Plan", "Status"]);
    styleExcelHeader(orgs.getRow(1), 5);
    data.topOrganizations.forEach((o) =>
      orgs.addRow([o.name, o.assessmentCount, o.complianceScore, o.activePlan, o.status])
    );

    const auditors = wb.addWorksheet("Auditor Performance");
    auditors.addRow(["Name", "Email", "Assigned", "Completed", "Completion %"]);
    styleExcelHeader(auditors.getRow(1), 5);
    data.auditorPerformance.forEach((a) =>
      auditors.addRow([a.name, a.email, a.assigned, a.completed, a.completionRate])
    );

    const outSheet = wb.addWorksheet("Outliers");
    outSheet.addRow(["Type", "Severity", "Label", "Detail", "Value"]);
    styleExcelHeader(outSheet.getRow(1), 5);
    data.outliers.forEach((o) =>
      outSheet.addRow([o.type, o.severity, o.label, o.detail, o.value ?? ""])
    );
    outSheet.getColumn(4).width = 48;

    const activity = wb.addWorksheet("Recent Activity");
    activity.addRow(["Timestamp", "Action", "Actor", "Description"]);
    styleExcelHeader(activity.getRow(1), 4);
    data.recentActivity.forEach((a) =>
      activity.addRow([
        new Date(a.timestamp).toISOString(),
        a.title,
        a.actorEmail || "",
        a.description,
      ])
    );

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  public static buildPdf(data: DashboardAnalyticsPayload, ctx: DashboardExportContext): Promise<Buffer> {
    return renderDashboardAnalyticsPdf(data, ctx);
  }
}
