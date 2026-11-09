import PDFDocument from "pdfkit";
import type { DashboardAnalyticsPayload } from "./dashboardAnalytics.service.js";
import type { DashboardExportContext } from "./dashboardAnalyticsExport.service.js";
import { reportLogoPaths } from "./report/reportAssets.js";

const C = {
  navy: "#102C3A",
  teal: "#145568",
  accent: "#1499A3",
  indigo: "#4F46E5",
  emerald: "#059669",
  amber: "#D97706",
  rose: "#B45345",
  text: "#24323D",
  muted: "#667583",
  border: "#D7E0E6",
  headerBg: "#145568",
  rowAlt: "#F3F6F8",
  white: "#FFFFFF",
  banner: "#E8F4F6",
};

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 48;
const MARGIN_TOP = 52;
const FOOTER_Y = PAGE_H - 42;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const CONTENT_BOTTOM = FOOTER_Y - 14;

type Doc = PDFKit.PDFDocument;

function formatShortDate(iso: string | Date): string {
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function deltaLabel(delta: number): string {
  if (delta > 0) return `+${delta}%`;
  if (delta < 0) return `${delta}%`;
  return "0%";
}

class DashboardAnalyticsPdfBuilder {
  private doc: Doc;
  private data: DashboardAnalyticsPayload;
  private ctx: DashboardExportContext;
  private y: number;
  private logos = reportLogoPaths();
  private pageNumber = 0;

  constructor(doc: Doc, data: DashboardAnalyticsPayload, ctx: DashboardExportContext) {
    this.doc = doc;
    this.data = data;
    this.ctx = ctx;
    this.y = MARGIN_TOP;
  }

  render(): void {
    this.drawCover();
    this.drawKpiRibbon();
    this.drawAssessmentAndRiskTables();
    this.drawPipelineAndPlans();
    this.ensureSpace(120);
    this.sectionTitle("Compliance trend");
    this.drawComplianceTrendTable();
    this.sectionTitle("GRAICE pillar completion");
    this.drawPillarTable();
    this.sectionTitle("Top organizations by maturity");
    this.drawTopOrgsTable();
    this.sectionTitle("Auditor / assessor performance");
    this.drawAuditorTable();
    if (this.data.outliers.length > 0) {
      this.sectionTitle("Insights & outliers");
      this.drawOutliersTable();
    }
    this.sectionTitle("Recent security audit trail");
    this.drawActivityTable();
    this.finalizePageNumbers();
  }

  private ensureSpace(needed: number): void {
    if (this.y + needed > CONTENT_BOTTOM) {
      this.addPage();
    }
  }

  private addPage(): void {
    this.doc.addPage();
    this.pageNumber += 1;
    this.y = MARGIN_TOP;
    this.drawPageHeaderStrip();
  }

  private drawPageHeaderStrip(): void {
    this.doc.rect(MARGIN_X, this.y - 8, CONTENT_W, 3).fill(C.accent);
    this.y += 4;
    this.doc
      .fillColor(C.muted)
      .font("Helvetica")
      .fontSize(7.5)
      .text(
        `GCRAI Analytics · ${this.ctx.scopeLabel} · ${this.data.range}`,
        MARGIN_X,
        this.y,
        { width: CONTENT_W, align: "right" }
      );
    this.y += 16;
  }

  private sectionTitle(title: string): void {
    this.ensureSpace(36);
    this.doc.rect(MARGIN_X, this.y, 4, 18).fill(C.accent);
    this.doc
      .fillColor(C.navy)
      .font("Helvetica-Bold")
      .fontSize(13)
      .text(title, MARGIN_X + 10, this.y + 2);
    this.y += 26;
    this.doc
      .strokeColor(C.border)
      .lineWidth(0.5)
      .moveTo(MARGIN_X, this.y)
      .lineTo(PAGE_W - MARGIN_X, this.y)
      .stroke();
    this.y += 10;
  }

  private drawCover(): void {
    const logos = this.logos;
    if (logos.gcrai) {
      this.doc.save();
      this.doc.roundedRect(MARGIN_X, this.y, 118, 40, 4).fill(C.navy);
      this.doc.restore();
      this.doc.image(logos.gcrai, MARGIN_X + 5, this.y + 4, { height: 32, fit: [108, 32] });
    }
    if (logos.graice) {
      this.doc.image(logos.graice, PAGE_W - MARGIN_X - 110, this.y, { height: 40, fit: [110, 40] });
    }
    this.y += 52;

    this.doc
      .fillColor(C.accent)
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("PLATFORM OPERATIONS & GOVERNANCE", MARGIN_X, this.y);
    this.y += 16;

    this.doc
      .fillColor(C.navy)
      .font("Helvetica-Bold")
      .fontSize(20)
      .text("Analytics & Operations Report", MARGIN_X, this.y, { width: CONTENT_W });
    this.y += 28;

    const metaBoxH = 72;
    this.doc
      .roundedRect(MARGIN_X, this.y, CONTENT_W, metaBoxH, 6)
      .fillAndStroke(C.banner, C.border);
    const meta: [string, string][] = [
      ["Scope", this.ctx.scopeLabel],
      ["Role view", this.ctx.roleLabel],
      ["Reporting period", `${this.data.range.toUpperCase()} (${this.data.periodDays} days)`],
      ["Generated", formatShortDate(this.data.generatedAt)],
    ];
    if (this.ctx.requestedBy) meta.push(["Requested by", this.ctx.requestedBy]);
    let my = this.y + 10;
    meta.forEach(([k, v], i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = col === 0 ? MARGIN_X + 12 : MARGIN_X + CONTENT_W / 2;
      const yy = my + row * 28;
      this.doc.fillColor(C.muted).font("Helvetica").fontSize(8).text(`${k}: `, x, yy, { continued: true });
      this.doc.fillColor(C.text).font("Helvetica-Bold").fontSize(8).text(v);
    });
    this.y += metaBoxH + 16;
  }

  private drawKpiRibbon(): void {
    this.sectionTitle("Executive KPI ribbon");
    const k = this.data.kpis;
    const cards: { value: string; label: string; delta: number; accent: string; danger?: boolean }[] = [
      { value: String(k.totalUsers.value), label: "Platform users", delta: k.totalUsers.deltaPct, accent: C.indigo },
      { value: String(k.totalAuditors.value), label: "Assessors", delta: k.totalAuditors.deltaPct, accent: C.emerald },
      { value: String(k.totalOrganizations.value), label: "Organizations", delta: k.totalOrganizations.deltaPct, accent: C.teal },
      { value: String(k.totalAssessments.value), label: "Assessments", delta: k.totalAssessments.deltaPct, accent: C.accent },
      {
        value: `${k.complianceScore.value}%`,
        label: "Compliance score",
        delta: k.complianceScore.deltaPct,
        accent: C.indigo,
      },
      {
        value: String(k.openRisks.value),
        label: "Open risks",
        delta: k.openRisks.deltaPct,
        accent: C.rose,
        danger: true,
      },
    ];

    const gap = 8;
    const cols = 3;
    const boxW = (CONTENT_W - gap * (cols - 1)) / cols;
    const boxH = 58;
    cards.forEach((card, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      if (col === 0 && row > 0) this.y += boxH + gap;
      const x = MARGIN_X + col * (boxW + gap);
      const y = this.y;

      this.doc.roundedRect(x, y, boxW, boxH, 5).lineWidth(1).fillAndStroke(C.white, C.border);
      this.doc.rect(x, y, boxW, 4).fill(card.accent);

      this.doc
        .fillColor(card.danger ? C.rose : C.navy)
        .font("Helvetica-Bold")
        .fontSize(17)
        .text(card.value, x + 10, y + 12, { width: boxW - 20 });
      this.doc.fillColor(C.muted).font("Helvetica").fontSize(8).text(card.label, x + 10, y + 34, { width: boxW - 20 });
      const dColor = card.delta > 0 ? C.emerald : card.delta < 0 ? C.rose : C.muted;
      this.doc
        .fillColor(dColor)
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .text(deltaLabel(card.delta), x + 10, y + 46, { width: boxW - 20, align: "right" });
    });
    this.y += boxH + 18;
  }

  private drawAssessmentAndRiskTables(): void {
    this.sectionTitle("Assessment status & risk severity");
    const s = this.data.assessmentsByStatus;
    this.drawTable(
      ["Status", "Count", "% of portfolio"],
      [
        ["Completed", String(s.completed), `${s.total ? Math.round((s.completed / s.total) * 100) : 0}%`],
        ["In progress", String(s.inProgress), `${s.total ? Math.round((s.inProgress / s.total) * 100) : 0}%`],
        ["Not started", String(s.notStarted), `${s.total ? Math.round((s.notStarted / s.total) * 100) : 0}%`],
        ["Total", String(s.total), "100%"],
      ],
      [200, 120, 140]
    );

    this.y += 14;
    const r = this.data.riskSeverity;
    this.drawTable(
      ["Severity", "Open exceptions"],
      [
        ["Critical", String(r.critical)],
        ["High", String(r.high)],
        ["Medium", String(r.medium)],
        ["Low", String(r.low)],
        ["Total", String(r.total)],
      ],
      [280, 180]
    );
  }

  private drawPipelineAndPlans(): void {
    this.ensureSpace(100);
    this.sectionTitle("Pipeline & subscription mix");
    const p = this.data.assessmentPipeline;
    const mix = this.data.assessmentTypeMix;
    const sub = this.data.subscriptionDistribution;

    this.drawTable(
      ["Pipeline stage", "Count", "Share"],
      [
        ["Completed", String(p.completed), `${p.completedPct}%`],
        ["In progress", String(p.inProgress), `${p.inProgressPct}%`],
        ["Not started", String(p.notStarted), `${p.notStartedPct}%`],
      ],
      [180, 100, 120]
    );
    this.y += 12;
    this.drawTable(
      ["Assessment type", "Sessions"],
      [
        ["Light", String(mix.light)],
        ["Full", String(mix.full)],
        ["Total in scope", String(mix.total)],
      ],
      [240, 200]
    );
    this.y += 12;
    this.drawTable(
      ["SaaS plan", "Tenants"],
      [
        ["Bronze", String(sub.bronze)],
        ["Silver", String(sub.silver)],
        ["Gold", String(sub.gold)],
        ["Total", String(sub.total)],
      ],
      [240, 200]
    );
  }

  private drawComplianceTrendTable(): void {
    const points = this.data.complianceTrend;
    const step = Math.max(1, Math.floor(points.length / 14));
    const sampled = points.filter((_, i) => i % step === 0 || i === points.length - 1);
    this.drawTable(
      ["Date", "Avg compliance %"],
      sampled.map((p) => [formatShortDate(p.date), `${p.value}%`]),
      [220, 200]
    );
  }

  private drawPillarTable(): void {
    this.drawTable(
      ["Pillar", "Name", "Completion %"],
      this.data.complianceByPillar.map((p) => [p.key, p.name, `${p.percentage}%`]),
      [52, 280, 100]
    );
  }

  private drawTopOrgsTable(): void {
    const rows =
      this.data.topOrganizations.length > 0
        ? this.data.topOrganizations.map((o) => [
            o.name,
            String(o.assessmentCount),
            `${o.complianceScore}%`,
            o.activePlan,
            o.status,
          ])
        : [["—", "0", "—", "—", "No data"]];
    this.drawTable(
      ["Organization", "Assessments", "Compliance", "Plan", "Status"],
      rows,
      [160, 70, 70, 60, 80]
    );
  }

  private drawAuditorTable(): void {
    const rows =
      this.data.auditorPerformance.length > 0
        ? this.data.auditorPerformance.map((a) => [
            a.name,
            String(a.assigned),
            String(a.completed),
            `${a.completionRate}%`,
          ])
        : [["—", "0", "0", "—"]];
    this.drawTable(["Assessor", "Assigned", "Completed", "Completion %"], rows, [200, 80, 80, 100]);
  }

  private drawOutliersTable(): void {
    this.drawTable(
      ["Severity", "Type", "Signal", "Detail"],
      this.data.outliers.slice(0, 15).map((o) => [
        o.severity.toUpperCase(),
        o.type,
        o.label,
        o.detail.length > 120 ? `${o.detail.slice(0, 117)}...` : o.detail,
      ]),
      [58, 72, 120, CONTENT_W - 58 - 72 - 120 - 8],
      { severityCol: 0 }
    );
  }

  private drawActivityTable(): void {
    const rows = this.data.recentActivity.slice(0, 12).map((a) => [
      formatShortDate(a.timestamp),
      a.title,
      a.actorEmail || "—",
    ]);
    this.drawTable(["When", "Event", "Actor"], rows, [90, 200, CONTENT_W - 290]);
  }

  private drawTable(
    headers: string[],
    rows: string[][],
    colWidths: number[],
    opts?: { severityCol?: number }
  ): void {
    const rowH = 20;
    const headerH = 22;
    const tableW = colWidths.reduce((a, b) => a + b, 0);
    if (tableW > CONTENT_W + 2) {
      const scale = CONTENT_W / tableW;
      for (let i = 0; i < colWidths.length; i++) colWidths[i] = Math.floor(colWidths[i] * scale);
    }

    this.ensureSpace(headerH + Math.min(rows.length, 4) * rowH + 10);

    let x0 = MARGIN_X;
    this.doc.rect(x0, this.y, colWidths.reduce((a, b) => a + b, 0), headerH).fill(C.headerBg);
    let x = x0;
    headers.forEach((h, i) => {
      this.doc
        .fillColor(C.white)
        .font("Helvetica-Bold")
        .fontSize(8)
        .text(h, x + 6, this.y + 6, { width: colWidths[i] - 10, align: "left" });
      x += colWidths[i];
    });
    this.y += headerH;

    rows.forEach((row, ri) => {
      this.ensureSpace(rowH + 4);
      const bg = ri % 2 === 1 ? C.rowAlt : C.white;
      const totalW = colWidths.reduce((a, b) => a + b, 0);
      this.doc.rect(x0, this.y, totalW, rowH).fill(bg);
      this.doc.strokeColor(C.border).lineWidth(0.4).rect(x0, this.y, totalW, rowH).stroke();

      let cx = x0;
      row.forEach((cell, ci) => {
        let fg = C.text;
        if (opts?.severityCol === ci) {
          const u = cell.toUpperCase();
          if (u === "CRITICAL") fg = C.rose;
          else if (u === "HIGH") fg = C.amber;
        }
        this.doc
          .fillColor(fg)
          .font(ci === 0 && opts?.severityCol === 0 ? "Helvetica-Bold" : "Helvetica")
          .fontSize(7.5)
          .text(cell, cx + 6, this.y + 5, { width: colWidths[ci] - 10, ellipsis: true });
        cx += colWidths[ci];
      });
      this.y += rowH;
    });
    this.y += 8;
  }

  private finalizePageNumbers(): void {
    const range = this.doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      this.doc.switchToPage(i);
      this.doc
        .strokeColor(C.border)
        .lineWidth(0.5)
        .moveTo(MARGIN_X, FOOTER_Y - 8)
        .lineTo(PAGE_W - MARGIN_X, FOOTER_Y - 8)
        .stroke();
      this.doc
        .fillColor(C.muted)
        .font("Helvetica")
        .fontSize(7)
        .text(
          "Confidential — GCRAI Platform analytics export. Authorized operational use only.",
          MARGIN_X,
          FOOTER_Y,
          { width: CONTENT_W, align: "center" }
        );
      this.doc
        .fillColor(C.muted)
        .font("Helvetica-Bold")
        .fontSize(7)
        .text(`Page ${i - range.start + 1} of ${range.count}`, MARGIN_X, FOOTER_Y + 10, {
          width: CONTENT_W,
          align: "right",
        });
    }
  }
}

export function renderDashboardAnalyticsPdf(
  data: DashboardAnalyticsPayload,
  ctx: DashboardExportContext
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 0,
        bufferPages: true,
        info: {
          Title: "GCRAI Analytics Report",
          Author: "GCRAI Platform",
          Subject: `Analytics ${data.range}`,
        },
      });
      const buffers: Buffer[] = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("error", reject);
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      const builder = new DashboardAnalyticsPdfBuilder(doc, data, ctx);
      builder.render();
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
