import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import type { GraiceReportData, ReportControlEvaluation } from "./reportTypes.js";

/** Professional design tokens — GRAICE audit report */
const C = {
  navy: "#102C3A",
  teal: "#145568",
  accent: "#1499A3",
  green: "#28A66A",
  text: "#24323D",
  secondary: "#667583",
  border: "#D7E0E6",
  headerBg: "#F1F5F8",
  rowAlt: "#F8FAFB",
  bannerBg: "#F3F6F8",
  exception: "#B45345",
  white: "#FFFFFF",
};

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 52; // ~18.3 mm
const MARGIN_TOP = 56; // ~20 mm
const MARGIN_BOTTOM = 52; // ~18 mm
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const FOOTER_Y = PAGE_H - 34;
const CONTENT_BOTTOM = FOOTER_Y - 10;

const FONT_REG = "SourceSans";
const FONT_SEMI = "SourceSans-Semibold";
const FONT_BOLD = "SourceSans-Bold";

type PDFDoc = PDFKit.PDFDocument;

function resolveAssetDirs(): string[] {
  return [
    path.resolve(process.cwd(), "assets"),
    path.resolve(process.cwd(), "backend/assets"),
    path.resolve(process.cwd(), "../assets"),
  ];
}

function logoPaths(): { gcrai?: string; graice?: string } {
  const base = resolveAssetDirs()
    .map((d) => path.join(d, "report"))
    .find((d) => fs.existsSync(d));
  if (!base) return {};
  const gcrai = path.join(base, "gcrai-logo.png");
  const graice = path.join(base, "graice-logo.png");
  return {
    gcrai: fs.existsSync(gcrai) ? gcrai : undefined,
    graice: fs.existsSync(graice) ? graice : undefined,
  };
}

function fontPaths(): { regular?: string; semibold?: string; bold?: string } {
  const base = resolveAssetDirs()
    .map((d) => path.join(d, "fonts"))
    .find((d) => fs.existsSync(d));
  if (!base) return {};
  const regular = path.join(base, "SourceSans3-Regular.ttf");
  const semibold = path.join(base, "SourceSans3-Semibold.ttf");
  const bold = path.join(base, "SourceSans3-Bold.ttf");
  return {
    regular: fs.existsSync(regular) ? regular : undefined,
    semibold: fs.existsSync(semibold) ? semibold : undefined,
    bold: fs.existsSync(bold) ? bold : undefined,
  };
}

function registerFonts(doc: PDFDoc): void {
  const fonts = fontPaths();
  if (fonts.regular) doc.registerFont(FONT_REG, fonts.regular);
  if (fonts.semibold) doc.registerFont(FONT_SEMI, fonts.semibold);
  if (fonts.bold) doc.registerFont(FONT_BOLD, fonts.bold);
  // Fallbacks if TTF missing
  if (!fonts.regular) {
    (doc as unknown as { _fontFallback?: boolean })._fontFallback = true;
  }
}

function F(doc: PDFDoc, weight: "reg" | "semi" | "bold"): string {
  const fonts = fontPaths();
  if (weight === "bold" && fonts.bold) return FONT_BOLD;
  if (weight === "semi" && fonts.semibold) return FONT_SEMI;
  if (fonts.regular) {
    if (weight === "bold" || weight === "semi") return fonts.bold ? FONT_BOLD : FONT_REG;
    return FONT_REG;
  }
  return weight === "reg" ? "Helvetica" : "Helvetica-Bold";
}

class ReportPdfRenderer {
  private doc: PDFDoc;
  private data: GraiceReportData;
  private y: number;
  private logos: { gcrai?: string; graice?: string };

  constructor(doc: PDFDoc, data: GraiceReportData) {
    this.doc = doc;
    this.data = data;
    this.y = MARGIN_TOP;
    this.logos = logoPaths();
  }

  render(): void {
    this.drawCoverAndExecutive();
    this.drawDetailedFindings();
    this.drawRemediationRoadmap();
    this.drawControlEvaluations();
    this.finalizePageNumbers();
  }

  private font(weight: "reg" | "semi" | "bold" = "reg"): string {
    return F(this.doc, weight);
  }

  private ensureSpace(needed: number): boolean {
    if (this.y + needed > CONTENT_BOTTOM) {
      this.addPage();
      return true;
    }
    return false;
  }

  private addPage(): void {
    this.doc.addPage();
    this.y = MARGIN_TOP;
  }

  private keepWithNext(headingH: number, bodyNeed: number): void {
    if (this.y + headingH + Math.min(bodyNeed, 48) > CONTENT_BOTTOM) {
      this.addPage();
    }
  }

  private hLine(y: number, color = C.border, width = 0.8): void {
    this.doc
      .strokeColor(color)
      .lineWidth(width)
      .moveTo(MARGIN_X, y)
      .lineTo(PAGE_W - MARGIN_X, y)
      .stroke();
  }

  private drawGradientRule(y: number): void {
    const segments = 32;
    const segW = CONTENT_W / segments;
    for (let i = 0; i < segments; i++) {
      const t = i / (segments - 1);
      // green → teal accent
      const r = Math.round(40 + (20 - 40) * t);
      const g = Math.round(166 + (85 - 166) * t);
      const b = Math.round(106 + (104 - 106) * t);
      this.doc.rect(MARGIN_X + i * segW, y, segW + 0.3, 2.2).fill(`rgb(${r},${g},${b})`);
    }
  }

  private drawLogos(): void {
    const logoH = 42;
    if (this.logos.gcrai) {
      this.doc.save();
      this.doc.roundedRect(MARGIN_X, this.y, 128, logoH, 5).fill(C.navy);
      this.doc.restore();
      this.doc.image(this.logos.gcrai, MARGIN_X + 6, this.y + 3, {
        height: 36,
        fit: [116, 36],
      });
    }
    if (this.logos.graice) {
      this.doc.image(this.logos.graice, PAGE_W - MARGIN_X - 118, this.y, {
        height: logoH,
        fit: [118, logoH],
      });
    }
    this.y += logoH + 14;
  }

  private sectionHeading(title: string): void {
    this.keepWithNext(28, 40);
    this.doc
      .fillColor(C.navy)
      .font(this.font("bold"))
      .fontSize(15)
      .text(title, MARGIN_X, this.y, { width: CONTENT_W });
    this.y += 22;
  }

  private drawCoverAndExecutive(): void {
    this.drawLogos();

    this.doc
      .fillColor(C.accent)
      .font(this.font("semi"))
      .fontSize(10.5)
      .text("GRAICE RESPONSIBLE AI ASSESSMENT", MARGIN_X, this.y);
    this.y += 18;

    // Org name — max ~22pt, wraps fully (no ellipsis)
    this.doc
      .fillColor(C.navy)
      .font(this.font("bold"))
      .fontSize(22)
      .text(this.data.organizationName, MARGIN_X, this.y, {
        width: CONTENT_W,
        lineGap: 1,
      });
    this.y +=
      this.doc.heightOfString(this.data.organizationName, {
        width: CONTENT_W,
        lineGap: 1,
      }) + 6;

    const subtitle = this.data.assessmentTitle;
    this.doc
      .fillColor(C.text)
      .font(this.font("reg"))
      .fontSize(11)
      .text(subtitle, MARGIN_X, this.y, { width: CONTENT_W, lineGap: 1 });
    this.y +=
      this.doc.heightOfString(subtitle, { width: CONTENT_W, lineGap: 1 }) + 10;

    this.drawGradientRule(this.y);
    this.y += 14;

    // Metadata grid with subtle row dividers
    const meta: [string, string][] = [
      ["Assessment type", this.data.assessmentType],
      ["Status", this.data.statusLabel],
      ["Organization scope", this.data.organizationScope],
      ["Framework version", this.data.frameworkVersion],
      ["Generated", this.data.generatedAt],
      ["Maturity level", this.data.kpis.maturityLevel || "—"],
      ["Auditor / Assessor", this.data.auditorName],
      ["Assessment reference", this.data.assessmentReference],
    ];

    const rowH = 16;
    const rows = Math.ceil(meta.length / 2);
    for (let r = 0; r < rows; r++) {
      const y = this.y + r * rowH;
      if (r > 0) this.hLine(y - 2, "#E8EEF2", 0.5);
      for (let c = 0; c < 2; c++) {
        const item = meta[r * 2 + c];
        if (!item) continue;
        const x = c === 0 ? MARGIN_X : PAGE_W / 2 + 4;
        this.doc
          .fillColor(C.secondary)
          .font(this.font("reg"))
          .fontSize(8.5)
          .text(`${item[0]}: `, x, y, { continued: true });
        this.doc.fillColor(C.navy).font(this.font("semi")).text(item[1]);
      }
    }
    this.y += rows * rowH + 16;

    // Executive Summary
    this.sectionHeading("Executive Summary");
    this.doc
      .fillColor(C.text)
      .font(this.font("reg"))
      .fontSize(10)
      .text(this.data.executiveNarrative, MARGIN_X, this.y, {
        width: CONTENT_W,
        lineGap: 2,
        align: "left",
      });
    this.y +=
      this.doc.heightOfString(this.data.executiveNarrative, {
        width: CONTENT_W,
        lineGap: 2,
      }) + 12;

    // KPI cards
    this.ensureSpace(64);
    const kpis: [string, string, boolean?][] = [
      [String(this.data.kpis.controlsAssessed), "Controls assessed"],
      [`${this.data.kpis.completionPercentage}%`, "Completion"],
      [
        String(this.data.kpis.exceptionsNoted),
        "Exceptions noted",
        this.data.kpis.exceptionsNoted > 0,
      ],
      [String(this.data.kpis.notYetAssessed), "Not yet assessed"],
    ];
    const gap = 8;
    const boxW = (CONTENT_W - gap * 3) / 4;
    const boxH = 56;
    kpis.forEach(([value, label, danger], i) => {
      const x = MARGIN_X + i * (boxW + gap);
      this.doc
        .roundedRect(x, this.y, boxW, boxH, 4)
        .lineWidth(1)
        .fillAndStroke(C.white, C.border);
      this.doc
        .fillColor(danger ? C.exception : C.navy)
        .font(this.font("bold"))
        .fontSize(18)
        .text(value, x + 10, this.y + 12, { width: boxW - 20 });
      this.doc
        .fillColor(C.secondary)
        .font(this.font("reg"))
        .fontSize(8.5)
        .text(label, x + 10, this.y + 36, { width: boxW - 20 });
    });
    this.y += boxH + 14;

    // Status by Pillar
    this.sectionHeading("Status by Pillar");
    const pillarRows = this.data.pillarProgress.map((p) => [
      p.pillarName,
      String(p.notStarted),
      String(p.inProgress),
      String(p.complete),
      String(p.total),
      `${p.completionPercentage}%`,
    ]);
    this.drawTable(
      ["Pillar", "Not Started", "In-Progress", "Complete", "Total", "Completion"],
      pillarRows,
      [170, 70, 70, 70, 55, 76],
      { numericAlignFrom: 1 }
    );
    this.y += 14;

    // Why Invest — keep with executive content when possible
    this.drawWhyInvest();
  }

  private drawWhyInvest(): void {
    const bulletBlock = this.data.whyInvestBullets
      .map((b) => `•  ${b}`)
      .join("\n");
    const narrH = this.doc.heightOfString(this.data.whyInvestNarrative, {
      width: CONTENT_W - 28,
      lineGap: 2,
    });
    const bulletsH = this.doc.heightOfString(bulletBlock, {
      width: CONTENT_W - 28,
      lineGap: 2,
    });
    const boxH = 24 + narrH + 8 + bulletsH + 14;
    const blockH = 22 + boxH + 8;

    // Keep heading + banner together — never orphan the title at page bottom.
    if (this.y + blockH > CONTENT_BOTTOM) {
      this.addPage();
    }

    this.doc
      .fillColor(C.navy)
      .font(this.font("bold"))
      .fontSize(15)
      .text("Why Invest in Governance Now", MARGIN_X, this.y);
    this.y += 20;

    const boxTop = this.y;
    this.doc
      .roundedRect(MARGIN_X, boxTop, CONTENT_W, boxH, 4)
      .lineWidth(1)
      .fillAndStroke(C.bannerBg, C.border);

    let cy = boxTop + 10;
    this.doc
      .fillColor(C.text)
      .font(this.font("reg"))
      .fontSize(10)
      .text(this.data.whyInvestNarrative, MARGIN_X + 14, cy, {
        width: CONTENT_W - 28,
        lineGap: 2,
      });
    cy += narrH + 8;
    this.doc
      .fillColor(C.text)
      .font(this.font("reg"))
      .fontSize(10)
      .text(bulletBlock, MARGIN_X + 14, cy, {
        width: CONTENT_W - 28,
        lineGap: 2.5,
      });
    this.y = boxTop + boxH + 10;
  }

  private drawTable(
    headers: string[],
    rows: string[][],
    widths: number[],
    opts?: { exceptionCol?: number; numericAlignFrom?: number; fontSize?: number }
  ): void {
    const fontSize = opts?.fontSize ?? 9;
    const pad = 6;

    const drawHeader = () => {
      this.doc.rect(MARGIN_X, this.y, CONTENT_W, 22).fill(C.headerBg);
      this.doc
        .strokeColor(C.border)
        .lineWidth(1)
        .rect(MARGIN_X, this.y, CONTENT_W, 22)
        .stroke();
      let x = MARGIN_X;
      headers.forEach((h, i) => {
        this.doc
          .fillColor(C.navy)
          .font(this.font("semi"))
          .fontSize(fontSize)
          .text(h, x + pad, this.y + 7, {
            width: widths[i] - pad * 2,
            lineBreak: false,
          });
        if (i < headers.length - 1) {
          this.doc
            .strokeColor(C.border)
            .lineWidth(0.6)
            .moveTo(x + widths[i], this.y)
            .lineTo(x + widths[i], this.y + 22)
            .stroke();
        }
        x += widths[i];
      });
      this.y += 22;
    };

    this.ensureSpace(50);
    const tableTop = this.y;
    drawHeader();

    rows.forEach((row, rowIdx) => {
      const heights = row.map((cell, i) => {
        const h = this.doc.heightOfString(String(cell || "—"), {
          width: widths[i] - pad * 2,
        });
        return Math.max(22, h + pad * 2);
      });
      const rowH = Math.max(...heights);

      if (this.y + rowH > CONTENT_BOTTOM) {
        // close outer border for previous segment
        this.doc
          .strokeColor(C.border)
          .lineWidth(1)
          .rect(MARGIN_X, tableTop, CONTENT_W, this.y - tableTop)
          .stroke();
        this.addPage();
        drawHeader();
      }

      const rowTop = this.y;
      if (rowIdx % 2 === 0) {
        this.doc.rect(MARGIN_X, rowTop, CONTENT_W, rowH).fill(C.rowAlt);
      }

      let x = MARGIN_X;
      row.forEach((cell, i) => {
        const isException =
          opts?.exceptionCol === i && String(cell) === "Exception Noted";
        const align =
          opts?.numericAlignFrom !== undefined && i >= opts.numericAlignFrom
            ? "center"
            : "left";
        this.doc
          .fillColor(isException ? C.exception : C.text)
          .font(isException ? this.font("semi") : this.font("reg"))
          .fontSize(fontSize)
          .text(String(cell || "—"), x + pad, rowTop + pad, {
            width: widths[i] - pad * 2,
            align,
          });
        this.doc
          .strokeColor(C.border)
          .lineWidth(0.5)
          .moveTo(x + widths[i], rowTop)
          .lineTo(x + widths[i], rowTop + rowH)
          .stroke();
        x += widths[i];
      });

      this.doc
        .strokeColor(C.border)
        .lineWidth(0.5)
        .moveTo(MARGIN_X, rowTop + rowH)
        .lineTo(PAGE_W - MARGIN_X, rowTop + rowH)
        .stroke();

      this.y += rowH;
    });

    // Outer border
    this.doc
      .strokeColor(C.border)
      .lineWidth(1)
      .rect(MARGIN_X, tableTop, CONTENT_W, this.y - tableTop)
      .stroke();
  }

  private drawDetailedFindings(): void {
    // Continue on current page when Why Invest left enough room; otherwise fresh page.
    this.keepWithNext(28, 110);
    this.sectionHeading("Detailed Findings");

    const byPillar = new Map<number, ReportControlEvaluation[]>();
    for (const c of this.data.controls) {
      const list = byPillar.get(c.pillarNumber) || [];
      list.push(c);
      byPillar.set(c.pillarNumber, list);
    }

    for (const num of [...byPillar.keys()].sort((a, b) => a - b)) {
      const controls = byPillar.get(num) || [];
      if (!controls.length) continue;

      this.keepWithNext(28, 60);
      this.hLine(this.y, C.border, 0.7);
      this.y += 10;
      this.doc
        .fillColor(C.teal)
        .font(this.font("semi"))
        .fontSize(12)
        .text(`Pillar ${num}: ${controls[0].pillarName}`, MARGIN_X, this.y);
      this.y += 18;

      this.drawTable(
        ["Control", "Tier", "Status", "Exception", "Findings"],
        controls.map((c) => [
          c.questionId,
          c.assuranceTier,
          c.testStatus,
          c.exceptionStatus,
          c.findings,
        ]),
        [52, 42, 58, 92, CONTENT_W - 52 - 42 - 58 - 92],
        { exceptionCol: 3, fontSize: 8.5 }
      );
      this.y += 14;
    }
  }

  private drawRemediationRoadmap(): void {
    this.keepWithNext(40, 100);
    this.doc.roundedRect(MARGIN_X, this.y, CONTENT_W, 32, 3).fill(C.navy);
    this.doc
      .fillColor(C.white)
      .font(this.font("bold"))
      .fontSize(13)
      .text("Remediation Roadmap", MARGIN_X + 12, this.y + 10);
    this.y += 42;

    if (!this.data.remediation.length) {
      this.doc
        .fillColor(C.text)
        .font(this.font("reg"))
        .fontSize(10)
        .text("No remediation items identified for this assessment.", MARGIN_X, this.y);
      this.y += 18;
      return;
    }

    const sorted = [...this.data.remediation].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority === "High" ? -1 : 1;
      return a.pillarNumber - b.pillarNumber;
    });

    this.drawTable(
      ["Control", "Pillar", "Priority", "Finding / Identified Gap", "Recommendation"],
      sorted.map((r) => [
        r.controlId,
        r.pillarName,
        r.priority,
        r.finding,
        r.recommendedAction,
      ]),
      [48, 88, 48, 150, CONTENT_W - 48 - 88 - 48 - 150],
      { fontSize: 8.5 }
    );
  }

  private drawControlEvaluations(): void {
    this.addPage();
    this.drawLogos();
    this.sectionHeading("Control Detail");

    let currentPillar = -1;
    for (const control of this.data.controls) {
      if (control.pillarNumber !== currentPillar) {
        currentPillar = control.pillarNumber;
        this.keepWithNext(26, 80);
        this.doc
          .fillColor(C.teal)
          .font(this.font("semi"))
          .fontSize(12.5)
          .text(`Pillar ${control.pillarNumber}: ${control.pillarName}`, MARGIN_X, this.y);
        this.y += 18;
      }
      this.drawControlCard(control);
    }
  }

  private estimateCardMinHeight(control: ReportControlEvaluation): number {
    let h = 70;
    h += 20; // question
    if (control.controlDescription) h += 36;
    h += 40; // procedure
    h += 28; // findings + rec
    if (control.regulatoryAlignments) h += 50;
    return Math.min(h, 160);
  }

  private drawControlCard(control: ReportControlEvaluation): void {
    this.ensureSpace(this.estimateCardMinHeight(control));

    const cardX = MARGIN_X;
    const cardW = CONTENT_W;
    let segmentTop = this.y;
    let pageAtSegmentStart = (this.doc as PDFDoc & { _pageBufferStart?: number }).bufferedPageRange
      ? this.doc.bufferedPageRange().count
      : 1;

    const strokeOpenSegment = () => {
      const h = this.y - segmentTop + 4;
      if (h > 8) {
        this.doc
          .strokeColor(C.border)
          .lineWidth(1.1)
          .rect(cardX, segmentTop, cardW, h)
          .stroke();
      }
    };

    const onPageBreak = () => {
      // close border on previous page segment before ensureSpace adds a page
      strokeOpenSegment();
    };

    // Header bar
    const headerH = 28;
    this.doc.rect(cardX, this.y, cardW, headerH).fill(C.headerBg);
    this.doc
      .strokeColor(C.border)
      .lineWidth(1)
      .rect(cardX, this.y, cardW, headerH)
      .stroke();

    this.doc
      .fillColor(C.navy)
      .font(this.font("bold"))
      .fontSize(11)
      .text(control.questionId, cardX + 10, this.y + 9);

    let bx = cardX + 10 + this.doc.widthOfString(control.questionId) + 10;
    const badges = [
      { t: control.assuranceTier, danger: false },
      { t: control.testStatus, danger: false },
      { t: control.exceptionStatus, danger: control.exceptionStatus === "Exception Noted" },
    ];
    badges.forEach((b) => {
      const tw = this.doc.widthOfString(b.t) + 12;
      if (bx + tw > cardX + cardW - 10) return;
      this.doc
        .roundedRect(bx, this.y + 7, tw, 14, 3)
        .lineWidth(0.7)
        .fillAndStroke(C.white, C.border);
      this.doc
        .fillColor(b.danger ? C.exception : C.text)
        .font(this.font("semi"))
        .fontSize(7.5)
        .text(b.t, bx + 6, this.y + 10);
      bx += tw + 5;
    });
    this.y += headerH + 10;

    // Question
    this.doc
      .fillColor(C.navy)
      .font(this.font("semi"))
      .fontSize(10.5)
      .text(control.questionText, cardX + 10, this.y, {
        width: cardW - 20,
        lineGap: 1,
      });
    this.y +=
      this.doc.heightOfString(control.questionText, {
        width: cardW - 20,
        lineGap: 1,
      }) + 8;

    const softBreak = (need: number) => {
      if (this.y + need > CONTENT_BOTTOM) {
        onPageBreak();
        this.addPage();
        segmentTop = this.y;
        pageAtSegmentStart = this.doc.bufferedPageRange().count;
        // continuation cue
        this.doc
          .fillColor(C.secondary)
          .font(this.font("reg"))
          .fontSize(8)
          .text(`${control.questionId} (continued)`, cardX + 10, this.y);
        this.y += 14;
      }
    };

    const label = (t: string) => {
      softBreak(22);
      this.doc
        .fillColor(C.secondary)
        .font(this.font("semi"))
        .fontSize(8)
        .text(t.toUpperCase(), cardX + 10, this.y);
      this.y += 12;
    };

    const body = (t: string, size = 9.5) => {
      const lines = t.split(/\n/);
      for (const line of lines) {
        const chunk = line.length ? line : " ";
        const h = this.doc.heightOfString(chunk, { width: cardW - 20, lineGap: 1 });
        softBreak(h + 4);
        this.doc
          .fillColor(C.text)
          .font(this.font("reg"))
          .fontSize(size)
          .text(chunk, cardX + 10, this.y, { width: cardW - 20, lineGap: 1 });
        this.y += h + 3;
      }
      this.y += 4;
    };
    void pageAtSegmentStart;

    if (control.controlDescription?.trim()) {
      label("Description");
      body(control.controlDescription.trim());
    }

    const procedure =
      control.testProcedureSteps.length > 0
        ? control.testProcedureSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")
        : control.testProcedure?.trim() ||
          "No test procedure recorded for this control in the bound framework version.";
    label("Test Procedure");
    body(procedure);

    const evidenceParts: string[] = [];
    if (control.linkedDocumentTitles.length) {
      evidenceParts.push(`Documents: ${control.linkedDocumentTitles.join("; ")}`);
    }
    if (control.linkedMeetingTopics.length) {
      evidenceParts.push(`Meetings: ${control.linkedMeetingTopics.join("; ")}`);
    }
    if (control.workPaperReference) {
      evidenceParts.push(`Workpaper: ${control.workPaperReference}`);
    }
    if (control.evidenceNotes?.trim()) {
      evidenceParts.push(`Evidence notes: ${control.evidenceNotes.trim()}`);
    }
    if (control.evidenceReference) {
      evidenceParts.push(control.evidenceReference);
    }
    if (evidenceParts.length) {
      label("Evidence / Documentation");
      body(evidenceParts.join("\n"));
    }

    // Tester row
    softBreak(28);
    this.hLine(this.y, C.border, 0.5);
    this.y += 8;
    this.doc
      .fillColor(C.secondary)
      .font(this.font("reg"))
      .fontSize(8.5)
      .text(`Tester: ${control.testerName}`, cardX + 10, this.y, {
        continued: false,
        width: (cardW - 20) / 2,
      });
    this.doc
      .fillColor(C.secondary)
      .font(this.font("reg"))
      .fontSize(8.5)
      .text(`Test date: ${control.testDate}`, cardX + cardW / 2, this.y, {
        width: (cardW - 20) / 2,
      });
    this.y += 14;

    label("Findings");
    body(control.findings);
    label("Recommendations");
    body(control.recommendation);

    const align = control.regulatoryAlignments;
    if (align && (align.euAiAct || align.nistAiRmf || align.iso42001 || align.oecdAi)) {
      const rows: [string, string][] = [];
      if (align.euAiAct) rows.push(["EU AI Act", align.euAiAct]);
      if (align.nistAiRmf) rows.push(["NIST AI RMF", align.nistAiRmf]);
      if (align.iso42001) rows.push(["ISO/IEC 42001", align.iso42001]);
      if (align.oecdAi) rows.push(["OECD AI Principles", align.oecdAi]);
      const boxH = 18 + rows.length * 13;
      softBreak(boxH + 8);
      this.doc
        .roundedRect(cardX + 8, this.y, cardW - 16, boxH, 3)
        .fill(C.headerBg);
      this.doc
        .fillColor(C.secondary)
        .font(this.font("semi"))
        .fontSize(8)
        .text("FRAMEWORK ALIGNMENT", cardX + 16, this.y + 6);
      let ay = this.y + 18;
      rows.forEach(([k, v]) => {
        this.doc
          .fillColor(C.teal)
          .font(this.font("semi"))
          .fontSize(8.5)
          .text(k, cardX + 16, ay);
        this.doc
          .fillColor(C.text)
          .font(this.font("reg"))
          .fontSize(8.5)
          .text(v, cardX + 130, ay, { width: cardW - 150 });
        ay += 13;
      });
      this.y += boxH + 8;
    }

    strokeOpenSegment();
    this.y += 14;
  }

  private finalizePageNumbers(): void {
    const range = this.doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      this.doc.switchToPage(range.start + i);
      this.hLine(FOOTER_Y - 8, C.border, 0.6);
      this.doc
        .fillColor(C.secondary)
        .font(this.font("reg"))
        .fontSize(8)
        .text(
          `${this.data.assessmentReference}  ·  Confidential  ·  ${this.data.generatedAt}  ·  Page ${i + 1} of ${range.count}`,
          MARGIN_X,
          FOOTER_Y,
          { width: CONTENT_W, align: "left", lineBreak: false }
        );
    }
  }
}

export function renderGraiceReportPdf(data: GraiceReportData): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    size: "A4",
    margins: {
      top: MARGIN_TOP,
      bottom: MARGIN_BOTTOM,
      left: MARGIN_X,
      right: MARGIN_X,
    },
    bufferPages: true,
    autoFirstPage: true,
    info: {
      Title: `GRAICE Responsible AI Assessment - ${data.organizationName}`,
      Author: "GCRAI / GRAICE Assessment Platform",
      Subject: `${data.assessmentType} Assessment Governance Report`,
      Keywords: `GRAICE,${data.assessmentReference}`,
    },
  });

  registerFonts(doc);
  new ReportPdfRenderer(doc, data).render();
  return doc;
}

export function validateReportConsistency(data: GraiceReportData): string[] {
  const issues: string[] = [];
  const pillarTotal = data.pillarProgress.reduce((s, p) => s + p.total, 0);
  const pillarComplete = data.pillarProgress.reduce((s, p) => s + p.complete, 0);
  const pillarOpen = data.pillarProgress.reduce(
    (s, p) => s + p.notStarted + p.inProgress,
    0
  );

  if (data.kpis.totalControls !== pillarTotal) {
    issues.push(
      `KPI totalControls (${data.kpis.totalControls}) != pillar sum (${pillarTotal})`
    );
  }
  if (data.kpis.controlsAssessed !== pillarComplete) {
    issues.push(
      `KPI controlsAssessed (${data.kpis.controlsAssessed}) != pillar complete (${pillarComplete})`
    );
  }
  if (data.kpis.notYetAssessed !== pillarOpen) {
    issues.push(
      `KPI notYetAssessed (${data.kpis.notYetAssessed}) != pillar open (${pillarOpen})`
    );
  }
  if (data.kpis.exceptionsNoted !== data.gapCount) {
    issues.push(
      `KPI exceptions (${data.kpis.exceptionsNoted}) != gapCount (${data.gapCount})`
    );
  }
  if (data.gapCount !== data.remediation.length) {
    issues.push(
      `gapCount (${data.gapCount}) != remediation rows (${data.remediation.length})`
    );
  }
  if (data.controls.length !== pillarTotal) {
    issues.push(
      `Control detail count (${data.controls.length}) != pillar total (${pillarTotal})`
    );
  }
  const exceptionRows = data.controls.filter(
    (c) => c.exceptionStatus === "Exception Noted"
  ).length;
  if (exceptionRows !== data.gapCount) {
    issues.push(
      `Detailed Findings Exception Noted rows (${exceptionRows}) != gapCount (${data.gapCount})`
    );
  }
  return issues;
}
