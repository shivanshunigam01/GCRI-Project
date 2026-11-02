import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { assessmentService } from "@/services/assessment.service";
import type {
  AnswerItem,
  AssessmentDetailResponse,
  AssessmentFindingsResponse,
  AssessmentPillarProgressItem,
  AssessmentProgressResponse,
  AssessmentRecommendationsResponse,
  AssessmentSummaryResponse,
  AssessmentType,
  Finding,
} from "@/types/assessment.types";
import type { FrameworkQuestion } from "@/types/framework.types";

/** Colors matched to GRAICE sample report — darker body for print readability */
const NAVY: [number, number, number] = [8, 36, 52];
const TEAL: [number, number, number] = [20, 70, 86];
const CYAN: [number, number, number] = [8, 145, 168];
const MUTED: [number, number, number] = [71, 85, 105];
const BODY: [number, number, number] = [30, 41, 59];
const RED: [number, number, number] = [176, 74, 50];
const HEADER_BG: [number, number, number] = [232, 238, 244];
const ROW_ALT: [number, number, number] = [248, 250, 252];
const BANNER_BG: [number, number, number] = [241, 245, 249];
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 12;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_Y = PAGE_H - 12;

type DocWithTable = jsPDF & { lastAutoTable?: { finalY: number } };

async function loadImageDataUrl(path: string): Promise<string | null> {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function formatDate(iso?: string): string {
  if (!iso) return new Date().toISOString().slice(0, 10);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function orgName(summary: AssessmentSummaryResponse): string {
  const org = summary.organization;
  if (org && typeof org === "object" && "name" in org) return org.name;
  return "Organization";
}

function statusLabel(status: string): string {
  if (status === "Submitted") return "Complete";
  if (status === "InProgress") return "In Progress";
  return status;
}

function testStatusLabel(status?: string): string {
  if (status === "Complete") return "Complete";
  if (status === "InProgress") return "In-Progress";
  if (status === "NotStarted") return "Not Started";
  return status || "Not Started";
}

function exceptionLabel(
  assessmentType: AssessmentType,
  answer: AnswerItem | undefined,
  isGap: boolean
): string {
  if (!answer || answer.testStatus === "NotStarted") {
    if (assessmentType === "Full" && answer?.exceptionStatus === "NotAssessed") return "Not Assessed";
    if (!answer?.selectedOptionCode && assessmentType === "Light") return "Not Assessed";
  }
  if (assessmentType === "Full") {
    if (answer?.exceptionStatus === "ExceptionNoted") return "Exception Noted";
    if (answer?.exceptionStatus === "NoExceptionNoted") return "No Exception Noted";
    return "Not Assessed";
  }
  if (isGap) return "Exception Noted";
  if (answer?.selectedOptionCode || answer?.testStatus === "Complete") return "No Exception Noted";
  return "Not Assessed";
}

function findingsText(
  answer: AnswerItem | undefined,
  question: FrameworkQuestion,
  finding?: Finding
): string {
  if (answer?.evidenceNotes?.trim()) return answer.evidenceNotes.trim();
  if (finding?.evidenceNotes?.trim()) return finding.evidenceNotes.trim();
  if (finding?.recommendedAction) return finding.recommendedAction;
  if (question.controlDescription?.trim()) return question.controlDescription.trim();
  return question.text;
}

function recommendationText(
  question: FrameworkQuestion,
  finding?: Finding,
  recAction?: string
): string {
  if (recAction?.trim()) return recAction.trim();
  if (finding?.recommendedAction?.trim()) return finding.recommendedAction.trim();
  if (question.remediationGuidance?.trim()) return question.remediationGuidance.trim();
  return "No action required.";
}

function testerName(
  answer: AnswerItem | undefined,
  detail: AssessmentDetailResponse
): string {
  const testedBy = answer?.testedByUserId;
  if (testedBy && typeof testedBy === "object" && "name" in testedBy && testedBy.name) {
    return testedBy.name;
  }
  const conducted = detail.session.conductedByUserId;
  if (conducted && typeof conducted === "object" && "name" in conducted && conducted.name) {
    return conducted.name;
  }
  return detail.session.clientContact?.name || "Assessment team";
}

function isLandscapeQuestion(q: FrameworkQuestion): boolean {
  return q.pillarNumber === 0 || q.pillarId === "ai-landscape";
}

function drawLogos(doc: jsPDF, gcrai: string | null, graice: string | null, y: number): number {
  if (gcrai) {
    doc.setFillColor(...NAVY);
    doc.roundedRect(MARGIN, y - 1, 48, 17, 2, 2, "F");
    doc.addImage(gcrai, "PNG", MARGIN + 2, y, 44, 15);
  }
  if (graice) {
    doc.addImage(graice, "PNG", PAGE_W - MARGIN - 42, y - 1, 42, 17);
  }
  return y + 22;
}

function drawGradientRule(doc: jsPDF, y: number): number {
  const segments = 24;
  const segW = CONTENT_W / segments;
  for (let i = 0; i < segments; i++) {
    const t = i / (segments - 1);
    const r = Math.round(14 + (11 - 14) * t);
    const g = Math.round(165 + (45 - 165) * t);
    const b = Math.round(185 + (64 - 185) * t);
    doc.setFillColor(r, g, b);
    doc.rect(MARGIN + i * segW, y, segW + 0.2, 1.4, "F");
  }
  return y + 7;
}

function drawSectionTitle(doc: jsPDF, title: string, y: number, withRule = false): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...NAVY);
  doc.text(title, MARGIN, y);
  if (withRule) {
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, y + 3.5, PAGE_W - MARGIN, y + 3.5);
    return y + 12;
  }
  return y + 10;
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > FOOTER_Y - 4) {
    doc.addPage();
    return 16;
  }
  return y;
}

function lastTableY(doc: jsPDF, fallback: number): number {
  return (doc as DocWithTable).lastAutoTable?.finalY ?? fallback;
}

function parseProcedureSteps(raw?: string): string[] {
  if (!raw?.trim()) return [];
  const text = raw.trim();
  const numbered = text.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  if (numbered.length > 1) return numbered.map((s) => s.replace(/^\d+[\).\s-]+/, "").trim());
  return text
    .split(/(?<=\.)\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function drawPillBadge(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  opts?: { danger?: boolean }
): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  const padX = 2.6;
  const w = doc.getTextWidth(text) + padX * 2;
  const h = 6;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(x, y - 4.2, w, h, 1.4, 1.4, "FD");
  if (opts?.danger) doc.setTextColor(...RED);
  else doc.setTextColor(...BODY);
  doc.text(text, x + padX, y);
  return x + w + 2.8;
}

function buildPillarRows(
  progress: AssessmentProgressResponse,
  questions: FrameworkQuestion[],
  answerMap: Map<string, AnswerItem>,
  frameworkPillars: { pillarId: string; pillarNumber?: number; name: string }[]
): AssessmentPillarProgressItem[] {
  const fromProgress = (progress.pillarBreakdown || progress.pillarProgress || []).filter(
    (p) => p.pillarId !== "ai-landscape" && (p.pillarNumber ?? 1) !== 0
  );

  const byId = new Map(fromProgress.map((p) => [p.pillarId, p]));

  const source =
    frameworkPillars.length > 0
      ? frameworkPillars.filter((p) => p.pillarId !== "ai-landscape" && (p.pillarNumber ?? 1) !== 0)
      : [...new Map(questions.map((q) => [q.pillarId, { pillarId: q.pillarId, pillarNumber: q.pillarNumber, name: q.pillarName }])).values()];

  return source
    .sort((a, b) => (a.pillarNumber ?? 0) - (b.pillarNumber ?? 0))
    .map((p) => {
      const existing = byId.get(p.pillarId);
      if (existing && (existing.total ?? 0) > 0) return existing;

      const pillarQs = questions.filter((q) => q.pillarId === p.pillarId);
      let notStarted = 0;
      let inProgress = 0;
      let complete = 0;
      let exceptionsNoted = 0;
      pillarQs.forEach((q) => {
        const ans = answerMap.get(q.questionId);
        if (!ans || ans.testStatus === "NotStarted") notStarted += 1;
        else if (ans.testStatus === "InProgress") inProgress += 1;
        else complete += 1;
        if (ans?.exceptionStatus === "ExceptionNoted") exceptionsNoted += 1;
      });
      const total = pillarQs.length;
      return {
        pillarId: p.pillarId,
        pillarNumber: p.pillarNumber,
        pillarName: p.name || existing?.pillarName || p.pillarId,
        total,
        complete,
        inProgress,
        notStarted,
        exceptionsNoted,
        completionPercentage: total ? Math.round((complete / total) * 100) : 0,
      };
    });
}

export async function downloadGraiceBrandedAssessmentPdf(assessmentId: string): Promise<void> {
  const [summaryRes, progressRes, detailRes, findingsRes, recsRes] = await Promise.all([
    assessmentService.getSummary(assessmentId),
    assessmentService.getProgress(assessmentId),
    assessmentService.getAssessmentById(assessmentId),
    assessmentService.getFindings(assessmentId),
    assessmentService.getRecommendations(assessmentId),
  ]);

  await buildAndSavePdf(
    assessmentId,
    summaryRes.data,
    progressRes.data,
    detailRes.data as AssessmentDetailResponse,
    findingsRes.data as AssessmentFindingsResponse,
    recsRes.data as AssessmentRecommendationsResponse
  );
}

async function buildAndSavePdf(
  assessmentId: string,
  summary: AssessmentSummaryResponse,
  progress: AssessmentProgressResponse,
  detail: AssessmentDetailResponse,
  findings: AssessmentFindingsResponse,
  recommendations: AssessmentRecommendationsResponse
): Promise<void> {
  const [gcraiLogo, graiceLogo] = await Promise.all([
    loadImageDataUrl("/report/gcrai-logo.png"),
    loadImageDataUrl("/report/graice-logo.png"),
  ]);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const session = detail.session;
  const framework = detail.framework;
  const allQuestions = (framework?.questions || []).filter((q) => q.isActive !== false);
  const questions = allQuestions.filter((q) => !isLandscapeQuestion(q));
  const answerMap = new Map(session.answers.map((a) => [a.questionId, a]));
  const findingByControl = new Map(findings.findings.map((f) => [f.controlId, f]));
  const recByControl = new Map(recommendations.recommendations.map((r) => [r.questionId, r]));
  const gapIds = new Set(findings.findings.map((f) => f.controlId));

  // Also treat Full-assessment ExceptionNoted answers as gaps for completeness
  session.answers.forEach((a) => {
    if (a.exceptionStatus === "ExceptionNoted" || a.selectedOptionCode === "EXCEPTION_NOTED") {
      gapIds.add(a.questionId);
    }
  });

  const org = orgName(summary);
  const systemLine =
    framework?.title?.trim() ||
    session.clientContact?.title?.trim() ||
    `${org} — ${summary.assessmentType} Assessment`;
  const subtitle = systemLine.toLowerCase().includes(org.toLowerCase())
    ? systemLine
    : `${org} — ${systemLine}`;
  const generated = formatDate(summary.submittedAt || summary.calculatedAt);
  const pillarRows = buildPillarRows(
    progress,
    questions,
    answerMap,
    (framework?.pillars || []).map((p) => ({
      pillarId: p.pillarId,
      pillarNumber: p.pillarNumber,
      name: p.name,
    }))
  );
  // KPIs must match Status-by-Pillar + findings gaps (never Light overallScore-as-controls).
  const pillarTotal = pillarRows.reduce((s, p) => s + (p.total ?? 0), 0);
  const controlsAssessed = pillarRows.reduce((s, p) => s + (p.complete ?? 0), 0);
  const notYetAssessed = pillarRows.reduce(
    (s, p) => s + (p.notStarted ?? 0) + (p.inProgress ?? 0),
    0
  );
  const completionPct =
    pillarTotal > 0 ? Math.round((controlsAssessed / pillarTotal) * 1000) / 10 : 0;
  const scope =
    questions.find((q) => q.organizationScope)?.organizationScope ||
    allQuestions.find((q) => q.organizationScope)?.organizationScope ||
    "Large & Complex Organizations";
  const gapCount = Math.max(findings.totalFindings ?? 0, findings.findings.length, gapIds.size);

  // ── Cover header ────────────────────────────────────────────────────
  let y = drawLogos(doc, gcraiLogo, graiceLogo, 11);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...CYAN);
  doc.text("GRAICE RESPONSIBLE AI ASSESSMENT", MARGIN, y);

  y += 9;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...NAVY);
  const orgLines = doc.splitTextToSize(org, CONTENT_W);
  doc.text(orgLines, MARGIN, y);
  y += orgLines.length * 8 + 2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...BODY);
  const subLines = doc.splitTextToSize(subtitle, CONTENT_W);
  doc.text(subLines, MARGIN, y);
  y += subLines.length * 5.5 + 4;
  y = drawGradientRule(doc, y);
  y += 5;

  const metaPairs: [string, string][] = [
    ["Assessment type", summary.assessmentType],
    ["Status", statusLabel(summary.status)],
    ["Organization scope", scope],
    ["Framework version", summary.frameworkVersion],
    ["Generated", generated],
    ["Maturity level", summary.maturityLevel],
  ];
  doc.setFontSize(10);
  metaPairs.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = col === 0 ? MARGIN : PAGE_W / 2 + 2;
    const rowY = y + row * 7;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(`${label}:`, x, rowY);
    const labelW = doc.getTextWidth(`${label}: `);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    doc.text(String(value), x + labelW, rowY);
  });
  y += Math.ceil(metaPairs.length / 2) * 7 + 10;

  // Executive Summary
  y = drawSectionTitle(doc, "Executive Summary", y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...BODY);
  const typeWord = summary.assessmentType.toLowerCase();
  const execText = `This ${typeWord} assessment provides a focused, evidence-based snapshot of responsible AI governance maturity against the GRAICE control framework. Overall compliance is ${summary.overallPercentage ?? summary.compliancePercentage ?? 0}% with maturity classified as ${summary.maturityLevel}. Results are intended to inform leadership investment priorities and next-step assurance planning.`;
  const execLines = doc.splitTextToSize(execText, CONTENT_W);
  doc.text(execLines, MARGIN, y);
  y += execLines.length * 5 + 7;

  const kpiLabels = [
    String(controlsAssessed),
    `${completionPct}%`,
    String(gapCount),
    String(notYetAssessed),
  ];
  const kpiTitles = ["Controls assessed", "Completion", "Exceptions noted", "Not yet assessed"];
  const boxW = (CONTENT_W - 9) / 4;
  kpiTitles.forEach((title, i) => {
    const x = MARGIN + i * (boxW + 3);
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, boxW, 22, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    if (i === 2 && Number(kpiLabels[2]) > 0) doc.setTextColor(...RED);
    else doc.setTextColor(...NAVY);
    doc.text(kpiLabels[i], x + 3.5, y + 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(title, x + 3.5, y + 17);
  });
  y += 30;

  // Status by Pillar — all pillars
  y = ensureSpace(doc, y, 55);
  y = drawSectionTitle(doc, "Status by Pillar", y);
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [["Pillar", "Not Started", "In-Progress", "Complete", "Total", "Completion"]],
    body: pillarRows.map((p) => [
      p.pillarName,
      String(p.notStarted ?? 0),
      String(p.inProgress ?? 0),
      String(p.complete ?? 0),
      String(p.total ?? 0),
      `${Math.round(p.completionPercentage ?? 0)}%`,
    ]),
    styles: {
      fontSize: 9.5,
      cellPadding: 3.2,
      textColor: BODY,
      lineColor: [203, 213, 225],
      lineWidth: 0.25,
      font: "helvetica",
    },
    headStyles: {
      fillColor: HEADER_BG,
      textColor: NAVY,
      fontStyle: "bold",
      fontSize: 9.5,
    },
    alternateRowStyles: { fillColor: ROW_ALT },
    theme: "grid",
  });
  y = lastTableY(doc, y + 40) + 12;

  // Why Invest
  y = ensureSpace(doc, y, 60);
  y = drawSectionTitle(doc, "Why Invest in Governance Now", y);
  const whyIntro = `This ${typeWord} review surfaced ${gapCount} control gap${gapCount === 1 ? "" : "s"} across foundational governance areas. Closing these items reduces regulatory exposure and strengthens readiness for deeper assurance.`;
  const whyLines = doc.splitTextToSize(whyIntro, CONTENT_W - 8);
  const bannerH = whyLines.length * 5 + 10;
  doc.setFillColor(...BANNER_BG);
  doc.roundedRect(MARGIN, y - 3, CONTENT_W, bannerH, 2, 2, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...BODY);
  doc.text(whyLines, MARGIN + 4, y + 4);
  y += bannerH + 7;

  const bullets = [
    "A full GRAICE assessment verifies remaining controls across all seven pillars with deeper evidence sampling.",
    "Early investment in governance reduces downstream remediation cost, audit friction, and regulatory risk.",
    "Stronger governance supports alignment with the EU AI Act, NIST AI RMF, and ISO/IEC 42001.",
  ];
  doc.setFontSize(10.5);
  doc.setTextColor(...BODY);
  bullets.forEach((b) => {
    y = ensureSpace(doc, y, 12);
    const lines = doc.splitTextToSize(b, CONTENT_W - 7);
    doc.text("•", MARGIN + 1, y);
    doc.text(lines, MARGIN + 6, y);
    y += lines.length * 5 + 3;
  });
  y += 8;

  // Detailed Findings — every pillar, every control
  doc.addPage();
  y = 16;
  y = drawSectionTitle(doc, "Detailed Findings", y);

  const pillarNumbers = [
    ...new Set(
      [
        ...pillarRows.map((p) => p.pillarNumber).filter((n): n is number => typeof n === "number"),
        ...questions.map((q) => q.pillarNumber),
      ].filter((n) => n > 0)
    ),
  ].sort((a, b) => a - b);

  for (const pillarNum of pillarNumbers) {
    const sample =
      questions.find((q) => q.pillarNumber === pillarNum) ||
      questions.find((q) => q.pillarId === pillarRows.find((p) => p.pillarNumber === pillarNum)?.pillarId);
    const pillarMeta = pillarRows.find((p) => p.pillarNumber === pillarNum);
    const pillarName = sample?.pillarName || pillarMeta?.pillarName || `Pillar ${pillarNum}`;
    const pillarId = sample?.pillarId || pillarMeta?.pillarId;

    const pillarQs = questions
      .filter((pq) => pq.pillarNumber === pillarNum || (pillarId && pq.pillarId === pillarId))
      .sort((a, b) => a.order - b.order);

    if (pillarQs.length === 0) continue;

    y = ensureSpace(doc, y, 36);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, y - 2, PAGE_W - MARGIN, y - 2);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12.5);
    doc.setTextColor(...TEAL);
    doc.text(`Pillar ${pillarNum}: ${pillarName}`, MARGIN, y + 5);
    y += 11;

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [["Control", "Tier", "Status", "Exception", "Findings"]],
      body: pillarQs.map((pq) => {
        const ans = answerMap.get(pq.questionId);
        const finding = findingByControl.get(pq.questionId);
        const isGap = gapIds.has(pq.questionId);
        return [
          pq.questionId,
          pq.assuranceTier || "Tier 1",
          testStatusLabel(ans?.testStatus),
          exceptionLabel(summary.assessmentType, ans, isGap),
          findingsText(ans, pq, finding),
        ];
      }),
      styles: {
        fontSize: 8.5,
        cellPadding: 2.8,
        overflow: "linebreak",
        valign: "top",
        textColor: BODY,
        lineColor: [203, 213, 225],
        lineWidth: 0.2,
        font: "helvetica",
      },
      headStyles: {
        fillColor: HEADER_BG,
        textColor: NAVY,
        fontStyle: "bold",
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: 20, fontStyle: "bold" },
        1: { cellWidth: 16 },
        2: { cellWidth: 20 },
        3: { cellWidth: 30 },
        4: { cellWidth: "auto" },
      },
      theme: "plain",
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 3) {
          const text = String(data.cell.raw);
          if (text === "Exception Noted") {
            data.cell.styles.textColor = RED;
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });
    y = lastTableY(doc, y + 20) + 10;
  }

  // Remediation Roadmap
  const roadmapSource =
    findings.findings.length > 0
      ? findings.findings
      : questions
          .filter((q) => gapIds.has(q.questionId))
          .map((q) => ({
            controlId: q.questionId,
            pillarName: q.pillarName,
            evidenceNotes: answerMap.get(q.questionId)?.evidenceNotes,
            questionText: q.text,
            recommendedAction:
              recByControl.get(q.questionId)?.recommendedAction ||
              q.remediationGuidance ||
              "Implement documented remediation per GRAICE guidance.",
          }));

  doc.addPage();
  y = 16;
  doc.setFillColor(...NAVY);
  doc.roundedRect(MARGIN, y, CONTENT_W, 14, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text("Remediation Roadmap", MARGIN + 5, y + 9.5);
  y += 20;

  if (roadmapSource.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...BODY);
    doc.text("No remediation items identified for this assessment.", MARGIN, y);
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [["Control", "Pillar", "Finding", "Recommendation"]],
      body: roadmapSource.map((f) => {
        const rec = recByControl.get(f.controlId);
        return [
          f.controlId,
          f.pillarName,
          ("evidenceNotes" in f && f.evidenceNotes) ||
            ("questionText" in f ? f.questionText : "") ||
            "",
          rec?.recommendedAction ||
            ("recommendedAction" in f ? f.recommendedAction : "") ||
            "Implement documented remediation per GRAICE guidance.",
        ];
      }),
      styles: {
        fontSize: 8.5,
        cellPadding: 3,
        overflow: "linebreak",
        valign: "top",
        textColor: BODY,
        font: "helvetica",
      },
      headStyles: {
        fillColor: HEADER_BG,
        textColor: NAVY,
        fontStyle: "bold",
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: 20, fontStyle: "bold" },
        1: { cellWidth: 32 },
        2: { cellWidth: 58 },
        3: { cellWidth: "auto" },
      },
      theme: "grid",
    });
  }

  // Control Detail — every control in every pillar
  doc.addPage();
  y = drawLogos(doc, gcraiLogo, graiceLogo, 11);
  y = drawSectionTitle(doc, "Control Detail", y, true);

  for (const pillarNum of pillarNumbers) {
    const sample = questions.find((q) => q.pillarNumber === pillarNum);
    const pillarMeta = pillarRows.find((p) => p.pillarNumber === pillarNum);
    const pillarName = sample?.pillarName || pillarMeta?.pillarName || `Pillar ${pillarNum}`;
    const pillarQs = questions
      .filter((pq) => pq.pillarNumber === pillarNum)
      .sort((a, b) => a.order - b.order);
    if (pillarQs.length === 0) continue;

    y = ensureSpace(doc, y, 24);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...TEAL);
    doc.text(`Pillar ${pillarNum}: ${pillarName}`, MARGIN, y);
    y += 10;

    for (const pq of pillarQs) {
      const ans = answerMap.get(pq.questionId);
      const finding = findingByControl.get(pq.questionId);
      const rec = recByControl.get(pq.questionId);
      const isGap = gapIds.has(pq.questionId);
      const exc = exceptionLabel(summary.assessmentType, ans, isGap);
      const steps = parseProcedureSteps(pq.testProcedure);
      const fText = findingsText(ans, pq, finding);
      const rText = recommendationText(pq, finding, rec?.recommendedAction);
      const align =
        pq.regulatoryAlignments || finding?.regulatoryAlignments || rec?.regulatoryAlignments;

      // Start each control card with enough room for the header block
      y = ensureSpace(doc, y, 55);
      const cardTop = y;
      let cy = y + 6;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...NAVY);
      doc.text(pq.questionId, MARGIN + 3.5, cy);
      let badgeX = MARGIN + 3.5 + doc.getTextWidth(pq.questionId) + 4;
      badgeX = drawPillBadge(doc, pq.assuranceTier || "Tier 1", badgeX, cy);
      badgeX = drawPillBadge(doc, testStatusLabel(ans?.testStatus), badgeX, cy);
      drawPillBadge(doc, exc, badgeX, cy, { danger: exc === "Exception Noted" });
      cy += 8;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(...NAVY);
      const qLines = doc.splitTextToSize(pq.text, CONTENT_W - 8);
      doc.text(qLines, MARGIN + 3.5, cy);
      cy += qLines.length * 4.8 + 4;

      if (pq.controlDescription?.trim()) {
        cy = ensureSpace(doc, cy, 16);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(...BODY);
        const dLines = doc.splitTextToSize(pq.controlDescription.trim(), CONTENT_W - 8);
        doc.text(dLines, MARGIN + 3.5, cy);
        cy += dLines.length * 4.3 + 4;
      }

      const writeLabeledBlock = (label: string, body: string, size = 9.5) => {
        cy = ensureSpace(doc, cy, 16);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(...MUTED);
        doc.text(label, MARGIN + 3.5, cy);
        cy += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(size);
        doc.setTextColor(...BODY);
        const lines = doc.splitTextToSize(body, CONTENT_W - 8);
        // Paginate long blocks
        for (const line of lines) {
          cy = ensureSpace(doc, cy, 8);
          doc.text(line, MARGIN + 3.5, cy);
          cy += 4.4;
        }
        cy += 3;
      };

      const procedureBody =
        steps.length > 0
          ? steps.map((s, i) => `${i + 1}. ${s}`).join("\n")
          : "1. Review available evidence against the control requirement.";
      writeLabeledBlock("TEST PROCEDURE", procedureBody);
      writeLabeledBlock(
        "TESTER & TEST DATE",
        `Tester: ${testerName(ans, detail)}    Test date: ${formatDate(
          ans?.answeredAt || summary.submittedAt || summary.calculatedAt
        )}`
      );
      writeLabeledBlock("FINDINGS", fText);
      writeLabeledBlock("RECOMMENDATIONS", rText);

      if (align && (align.euAiAct || align.nistAiRmf || align.iso42001 || align.oecdAi)) {
        const rows: [string, string][] = [];
        if (align.euAiAct) rows.push(["EU AI Act", align.euAiAct]);
        if (align.nistAiRmf) rows.push(["NIST AI RMF", align.nistAiRmf]);
        if (align.iso42001) rows.push(["ISO/IEC 42001", align.iso42001]);
        if (align.oecdAi) rows.push(["OECD AI Principles", align.oecdAi]);
        const boxH = 9 + rows.length * 5;
        cy = ensureSpace(doc, cy, boxH + 4);
        doc.setFillColor(240, 244, 248);
        doc.roundedRect(MARGIN + 2, cy, CONTENT_W - 4, boxH, 2, 2, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(...MUTED);
        doc.text("FRAMEWORK ALIGNMENT", MARGIN + 5, cy + 5.5);
        let ay = cy + 11;
        rows.forEach(([label, value]) => {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(...TEAL);
          doc.text(label, MARGIN + 5, ay);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...BODY);
          const vLines = doc.splitTextToSize(value, CONTENT_W - 58);
          doc.text(vLines[0] || "", MARGIN + 50, ay);
          ay += 5;
        });
        cy += boxH + 4;
      }

      // Only draw card border when card stayed on one page
      if (cy > cardTop && cy - cardTop < FOOTER_Y - 20) {
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.5);
        doc.roundedRect(MARGIN, cardTop, CONTENT_W, cy - cardTop + 3, 2.5, 2.5, "S");
      } else {
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.3);
        doc.line(MARGIN, cy + 1, PAGE_W - MARGIN, cy + 1);
      }
      y = cy + 8;
    }
  }

  // Page footers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
      `GRAICE Platform · ${generated} · Confidential · Page ${i} of ${pageCount}`,
      MARGIN,
      FOOTER_Y
    );
  }

  const safeOrg = org.replace(/[^a-zA-Z0-9_-]/g, "_");
  doc.save(`GRAICE_Report_${safeOrg}_${assessmentId.slice(-6)}.pdf`);
}
