import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { IAssessmentSession, IReportMetadata } from "../models/AssessmentSession.js";
import { ICompany } from "../models/Company.js";
import { IAssessmentFramework, IQuestionControl } from "../models/AssessmentFramework.js";
import { IUser } from "../models/User.js";
import { ScoringService } from "./scoring.service.js";
import { s3Service } from "./s3.service.js";

const NAVY = "#0b2d40";
const TEAL = "#1a4b5a";
const CYAN = "#0ea5b9";
const MUTED = "#64748b";
const BODY = "#334155";
const RED = "#b04a32";
const HEADER_BG = "#eef2f6";
const BANNER_BG = "#f3f4f6";
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 40;
const CONTENT_W = PAGE_W - MARGIN * 2;

function formatDate(value?: Date | string | null): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toISOString().slice(0, 10);
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
  assessmentType: string,
  answer: IAssessmentSession["answers"][number] | undefined,
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
  answer: IAssessmentSession["answers"][number] | undefined,
  question: IQuestionControl,
  gapNotes?: string
): string {
  if (answer?.evidenceNotes?.trim()) return answer.evidenceNotes.trim();
  if (gapNotes?.trim()) return gapNotes.trim();
  if (question.controlDescription?.trim()) return question.controlDescription.trim();
  return question.text;
}

function recommendationText(question: IQuestionControl, isGap: boolean): string {
  if (question.remediationGuidance?.trim()) return question.remediationGuidance.trim();
  if (!isGap) return "No action required.";
  return "Implement documented remediation per GRAICE guidance.";
}

function parseProcedureSteps(raw?: string): string[] {
  if (!raw?.trim()) return [];
  const numbered = raw
    .trim()
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (numbered.length > 1) return numbered.map((s) => s.replace(/^\d+[\).\s-]+/, "").trim());
  return raw
    .split(/(?<=\.)\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function logoPaths(): { gcrai?: string; graice?: string } {
  const candidates = [
    path.resolve(process.cwd(), "assets/report"),
    path.resolve(process.cwd(), "backend/assets/report"),
    path.resolve(process.cwd(), "../assets/report"),
  ];
  const base = candidates.find((dir) => fs.existsSync(dir));
  if (!base) return {};
  const gcrai = path.join(base, "gcrai-logo.png");
  const graice = path.join(base, "graice-logo.png");
  return {
    gcrai: fs.existsSync(gcrai) ? gcrai : undefined,
    graice: fs.existsSync(graice) ? graice : undefined,
  };
}

export class ReportService {
  /**
   * Generates a branded GRAICE PDF matching the official assessment report layout.
   */
  public static async generateAssessmentReport(
    session: IAssessmentSession,
    company: ICompany,
    framework: IAssessmentFramework,
    auditor: IUser
  ): Promise<{ metadata: IReportMetadata; buffer: Buffer }> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          margin: MARGIN,
          size: "A4",
          info: {
            Title: `GRAICE Responsible AI Assessment - ${company.name}`,
            Author: "GCRAI / GRAICE Assessment Platform",
            Subject: `${session.assessmentType} Assessment Governance Report`,
          },
        });

        const buffers: Buffer[] = [];
        doc.on("data", (chunk) => buffers.push(chunk));
        doc.on("end", async () => {
          try {
            const pdfBuffer = Buffer.concat(buffers);
            const checksum = crypto.createHash("sha256").update(pdfBuffer).digest("hex");
            const timestamp = Date.now();
            const cleanCompName = company.name.replace(/[^a-zA-Z0-9_-]/g, "_");
            const fileName = `GRAICE_Report_${cleanCompName}_${session._id}_${timestamp}.pdf`;

            const reportsDir = path.join(s3Service.getUploadsDir(), "reports");
            if (!fs.existsSync(reportsDir)) {
              fs.mkdirSync(reportsDir, { recursive: true });
            }

            const localFilePath = path.join(reportsDir, fileName);
            await fs.promises.writeFile(localFilePath, pdfBuffer);

            const baseUrl = process.env.API_BASE_URL || "http://localhost:5001";
            const fileUrl = `${baseUrl}/uploads/reports/${fileName}`;

            const metadata: IReportMetadata = {
              fileName,
              filePath: localFilePath,
              fileUrl,
              fileSizeBytes: pdfBuffer.length,
              generatedAt: new Date(),
              generatedByUserId: auditor._id,
              checksum,
              storageType: "local",
            };

            resolve({ metadata, buffer: pdfBuffer });
          } catch (err) {
            reject(err);
          }
        });

        doc.on("error", (err) => reject(err));

        const snapshot = session.scoreSnapshot || ScoringService.calculateScores(session, framework);
        const gaps = ScoringService.extractGaps(session, framework);
        const gapIds = new Set(gaps.map((g) => g.questionId));
        const answerMap = new Map(session.answers.map((a) => [a.questionId, a]));
        const questions = (framework.questions || []).filter(
          (q) => q.isActive !== false && q.pillarNumber !== 0 && q.pillarId !== "ai-landscape"
        );
        const logos = logoPaths();
        const generated = formatDate(session.submittedAt || snapshot.calculatedAt);
        const typeWord = String(session.assessmentType || "Light").toLowerCase();
        const scope =
          questions.find((q) => q.organizationScope)?.organizationScope ||
          "Large & Complex Organizations";
        const subtitle =
          framework.title?.trim() ||
          session.clientContact?.title?.trim() ||
          `${company.name} — ${session.assessmentType} Assessment`;
        const systemLine = subtitle.toLowerCase().includes(company.name.toLowerCase())
          ? subtitle
          : `${company.name} — ${subtitle}`;

        const controlsAssessed =
          snapshot.totalControlsAssessed ??
          (snapshot.totalNoExceptionsNoted || 0) + (snapshot.totalExceptionsNoted || 0);
        const completionPct = Math.round(
          questions.length
            ? (session.answers.filter(
                (a) => a.testStatus === "Complete" || !!a.selectedOptionCode
              ).length /
                questions.length) *
                100
            : snapshot.overallPercentage || 0
        );
        const notAssessed = snapshot.totalNotAssessed ?? 0;
        const exceptionsNoted = snapshot.totalExceptionsNoted ?? gaps.length;

        let y = MARGIN;

        const ensureSpace = (needed: number) => {
          if (y + needed > PAGE_H - 40) {
            doc.addPage();
            y = MARGIN;
          }
        };

        const drawLogos = () => {
          if (logos.gcrai) {
            doc.save();
            doc.roundedRect(MARGIN, y - 2, 130, 44, 6).fill(NAVY);
            doc.restore();
            doc.image(logos.gcrai, MARGIN + 6, y, { width: 118, height: 40 });
          }
          if (logos.graice) {
            doc.image(logos.graice, PAGE_W - MARGIN - 118, y - 2, { width: 118, height: 44 });
          }
          y += 54;
        };

        const sectionTitle = (title: string) => {
          ensureSpace(28);
          doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(15).text(title, MARGIN, y);
          y += 24;
        };

        const drawTable = (
          headers: string[],
          rows: string[][],
          widths: number[],
          opts?: { exceptionCol?: number }
        ) => {
          const rowHBase = 18;
          const drawHeader = () => {
            let x = MARGIN;
            doc.rect(MARGIN, y, CONTENT_W, 20).fill(HEADER_BG);
            doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(9);
            headers.forEach((h, i) => {
              doc.text(h, x + 4, y + 6, { width: widths[i] - 8, lineBreak: false });
              x += widths[i];
            });
            y += 20;
          };

          ensureSpace(40);
          drawHeader();

          rows.forEach((row, rowIdx) => {
            // Measure findings-like tall cells
            const heights = row.map((cell, i) => {
              const h = doc.heightOfString(String(cell || ""), {
                width: widths[i] - 8,
                align: "left",
              });
              return Math.max(rowHBase, h + 10);
            });
            const rowH = Math.max(...heights);
            ensureSpace(rowH + 4);
            if (y === MARGIN) drawHeader();

            if (rowIdx % 2 === 0) {
              doc.rect(MARGIN, y, CONTENT_W, rowH).fill("#f8fafc");
            }
            doc.strokeColor("#e2e8f0").lineWidth(0.5);
            doc.moveTo(MARGIN, y + rowH).lineTo(PAGE_W - MARGIN, y + rowH).stroke();

            let x = MARGIN;
            row.forEach((cell, i) => {
              const isException =
                opts?.exceptionCol === i && String(cell) === "Exception Noted";
              doc
                .fillColor(isException ? RED : BODY)
                .font(isException ? "Helvetica-Bold" : "Helvetica")
                .fontSize(9)
                .text(String(cell || ""), x + 4, y + 5, {
                  width: widths[i] - 8,
                  align: "left",
                });
              x += widths[i];
            });
            y += rowH;
          });
        };

        // ── Header ────────────────────────────────────────────────
        drawLogos();
        doc.fillColor(CYAN).font("Helvetica-Bold").fontSize(11).text("GRAICE RESPONSIBLE AI ASSESSMENT", MARGIN, y);
        y += 18;
        doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(28).text(company.name, MARGIN, y);
        y += 32;
        doc.fillColor(BODY).font("Helvetica").fontSize(12).text(systemLine, MARGIN, y, {
          width: CONTENT_W,
        });
        y += 22;

        // Gradient-ish rule
        const segments = 20;
        const segW = CONTENT_W / segments;
        for (let i = 0; i < segments; i++) {
          const t = i / (segments - 1);
          const r = Math.round(14 + (11 - 14) * t);
          const g = Math.round(165 + (45 - 165) * t);
          const b = Math.round(185 + (64 - 185) * t);
          doc.rect(MARGIN + i * segW, y, segW + 0.5, 3).fill(`rgb(${r},${g},${b})`);
        }
        y += 16;

        // Metadata grid
        const meta: [string, string][] = [
          ["Assessment type", String(session.assessmentType)],
          ["Status", statusLabel(session.status)],
          ["Organization scope", scope],
          ["Framework version", session.frameworkVersion || framework.version],
          ["Generated", generated],
        ];
        meta.forEach(([label, value], i) => {
          const col = i % 2;
          const row = Math.floor(i / 2);
          const x = col === 0 ? MARGIN : PAGE_W / 2;
          const rowY = y + row * 16;
          doc.fillColor(MUTED).font("Helvetica").fontSize(9).text(`${label}: `, x, rowY, {
            continued: true,
          });
          doc.fillColor(NAVY).font("Helvetica-Bold").text(value);
        });
        y += Math.ceil(meta.length / 2) * 16 + 14;

        // Executive Summary
        sectionTitle("Executive Summary");
        const execText = `This ${typeWord} assessment provides a focused, evidence-based snapshot of responsible AI governance maturity against the GRAICE control framework. Results are intended to inform leadership investment priorities and next-step assurance planning.`;
        doc.fillColor(BODY).font("Helvetica").fontSize(10).text(execText, MARGIN, y, {
          width: CONTENT_W,
          align: "left",
        });
        y += doc.heightOfString(execText, { width: CONTENT_W }) + 12;

        const kpis: [string, string, boolean?][] = [
          [String(controlsAssessed), "Controls assessed"],
          [`${completionPct}%`, "Completion"],
          [String(exceptionsNoted), "Exceptions noted", exceptionsNoted > 0],
          [String(notAssessed), "Not yet assessed"],
        ];
        const boxW = (CONTENT_W - 24) / 4;
        kpis.forEach(([value, label, danger], i) => {
          const x = MARGIN + i * (boxW + 8);
          doc.roundedRect(x, y, boxW, 52, 4).lineWidth(1).strokeColor("#e2e8f0").fillAndStroke("#ffffff", "#e2e8f0");
          doc
            .fillColor(danger ? RED : NAVY)
            .font("Helvetica-Bold")
            .fontSize(18)
            .text(value, x + 10, y + 10, { width: boxW - 16 });
          doc
            .fillColor(MUTED)
            .font("Helvetica")
            .fontSize(8)
            .text(label, x + 10, y + 34, { width: boxW - 16 });
        });
        y += 68;

        // Status by Pillar
        sectionTitle("Status by Pillar");
        const pillarRows = (snapshot.pillarScores || [])
          .filter((p) => p.pillarId !== "ai-landscape" && (p.pillarNumber ?? 1) !== 0)
          .map((p) => {
            const pillarQs = questions.filter((q) => q.pillarId === p.pillarId);
            let notStarted = 0;
            let inProgress = 0;
            let complete = 0;
            pillarQs.forEach((q) => {
              const ans = answerMap.get(q.questionId);
              if (!ans || ans.testStatus === "NotStarted") notStarted += 1;
              else if (ans.testStatus === "InProgress") inProgress += 1;
              else complete += 1;
            });
            const total = p.totalControls || pillarQs.length || 0;
            const pct = total ? Math.round((complete / total) * 100) : Math.round(p.percentage || 0);
            return [
              p.pillarName,
              String(notStarted),
              String(inProgress),
              String(complete),
              String(total),
              `${pct}%`,
            ];
          });

        drawTable(
          ["Pillar", "Not Started", "In-Progress", "Complete", "Total", "Completion"],
          pillarRows,
          [170, 70, 70, 70, 55, 80]
        );
        y += 16;

        // Why Invest
        sectionTitle("Why Invest in Governance Now");
        const gapCount = gaps.length;
        const whyIntro = `This ${typeWord} review surfaced ${gapCount} control gap${
          gapCount === 1 ? "" : "s"
        } across foundational governance areas. Closing these items reduces regulatory exposure and strengthens readiness for deeper assurance.`;
        const whyH = doc.heightOfString(whyIntro, { width: CONTENT_W - 20 }) + 16;
        ensureSpace(whyH + 80);
        doc.roundedRect(MARGIN, y, CONTENT_W, whyH, 4).fill(BANNER_BG);
        doc.fillColor(BODY).font("Helvetica").fontSize(10).text(whyIntro, MARGIN + 10, y + 8, {
          width: CONTENT_W - 20,
        });
        y += whyH + 12;

        const bullets = [
          "A full GRAICE assessment verifies remaining controls across all seven pillars with deeper evidence sampling.",
          "Early investment in governance reduces downstream remediation cost, audit friction, and regulatory risk.",
          "Stronger governance supports alignment with the EU AI Act, NIST AI RMF, and ISO/IEC 42001.",
        ];
        bullets.forEach((b) => {
          ensureSpace(28);
          doc.fillColor(BODY).font("Helvetica").fontSize(10).text(`•  ${b}`, MARGIN + 4, y, {
            width: CONTENT_W - 8,
          });
          y += doc.heightOfString(`•  ${b}`, { width: CONTENT_W - 8 }) + 6;
        });
        y += 10;

        // Detailed Findings
        sectionTitle("Detailed Findings");
        const pillarNumbers = [...new Set(questions.map((q) => q.pillarNumber))].sort(
          (a, b) => a - b
        );

        for (const pillarNum of pillarNumbers) {
          const sample = questions.find((q) => q.pillarNumber === pillarNum);
          if (!sample) continue;
          const pillarQs = questions
            .filter((q) => q.pillarNumber === pillarNum)
            .sort((a, b) => a.order - b.order);

          ensureSpace(40);
          doc
            .strokeColor("#e2e8f0")
            .lineWidth(0.8)
            .moveTo(MARGIN, y)
            .lineTo(PAGE_W - MARGIN, y)
            .stroke();
          y += 10;
          doc
            .fillColor(TEAL)
            .font("Helvetica-Bold")
            .fontSize(11)
            .text(`Pillar ${sample.pillarNumber}: ${sample.pillarName}`, MARGIN, y);
          y += 18;

          const body = pillarQs.map((q) => {
            const ans = answerMap.get(q.questionId);
            const isGap = gapIds.has(q.questionId);
            const gap = gaps.find((g) => g.questionId === q.questionId);
            return [
              q.questionId,
              q.assuranceTier || "Tier 1",
              testStatusLabel(ans?.testStatus),
              exceptionLabel(session.assessmentType, ans, isGap),
              findingsText(ans, q, gap?.evidenceNotes),
            ];
          });

          drawTable(["Control", "Tier", "Status", "Exception", "Findings"], body, [55, 45, 55, 90, 270], {
            exceptionCol: 3,
          });
          y += 14;
        }

        // Remediation Roadmap
        doc.addPage();
        y = MARGIN;
        doc.roundedRect(MARGIN, y, CONTENT_W, 32, 4).fill(NAVY);
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(13).text("Remediation Roadmap", MARGIN + 12, y + 10);
        y += 44;

        if (gaps.length === 0) {
          doc
            .fillColor(BODY)
            .font("Helvetica")
            .fontSize(10)
            .text("No remediation items identified for this assessment.", MARGIN, y);
          y += 20;
        } else {
          const roadmapRows = gaps.map((g) => {
            const q = questions.find((qq) => qq.questionId === g.questionId);
            return [
              g.questionId,
              g.pillarName,
              g.evidenceNotes || g.questionText,
              q?.remediationGuidance || "Implement documented remediation per GRAICE guidance.",
            ];
          });
          drawTable(
            ["Control", "Pillar", "Finding", "Recommendation"],
            roadmapRows,
            [55, 95, 180, 185]
          );
        }

        // Control Detail cards
        doc.addPage();
        y = MARGIN;
        drawLogos();
        sectionTitle("Control Detail");

        for (const pillarNum of pillarNumbers) {
          const sample = questions.find((q) => q.pillarNumber === pillarNum);
          if (!sample) continue;
          const pillarQs = questions
            .filter((q) => q.pillarNumber === pillarNum)
            .sort((a, b) => a.order - b.order);

          ensureSpace(30);
          doc
            .fillColor(TEAL)
            .font("Helvetica-Bold")
            .fontSize(12)
            .text(`Pillar ${sample.pillarNumber}: ${sample.pillarName}`, MARGIN, y);
          y += 20;

          for (const q of pillarQs) {
            const ans = answerMap.get(q.questionId);
            const isGap = gapIds.has(q.questionId);
            const gap = gaps.find((g) => g.questionId === q.questionId);
            const exc = exceptionLabel(session.assessmentType, ans, isGap);
            const steps = parseProcedureSteps(q.testProcedure);
            const fText = findingsText(ans, q, gap?.evidenceNotes);
            const rText = recommendationText(q, isGap);
            const align = q.regulatoryAlignments || gap?.regulatoryAlignments;

            // Rough height estimate
            ensureSpace(120);
            const cardTop = y;
            let cy = y + 12;

            doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(11).text(q.questionId, MARGIN + 10, cy);

            const badges = [q.assuranceTier || "Tier 1", testStatusLabel(ans?.testStatus), exc];
            let bx = MARGIN + 10 + doc.widthOfString(q.questionId) + 12;
            badges.forEach((b) => {
              const bw = doc.widthOfString(b) + 14;
              doc.roundedRect(bx, cy - 3, bw, 14, 7).fillAndStroke("#f1f5f9", "#e2e8f0");
              doc
                .fillColor(b === "Exception Noted" ? RED : BODY)
                .font("Helvetica")
                .fontSize(7)
                .text(b, bx + 7, cy);
              bx += bw + 6;
            });
            cy += 18;

            doc
              .fillColor(NAVY)
              .font("Helvetica-Bold")
              .fontSize(10)
              .text(q.text, MARGIN + 10, cy, { width: CONTENT_W - 20 });
            cy += doc.heightOfString(q.text, { width: CONTENT_W - 20 }) + 8;

            if (q.controlDescription?.trim()) {
              doc
                .fillColor(BODY)
                .font("Helvetica")
                .fontSize(9)
                .text(q.controlDescription.trim(), MARGIN + 10, cy, { width: CONTENT_W - 20 });
              cy += doc.heightOfString(q.controlDescription.trim(), { width: CONTENT_W - 20 }) + 8;
            }

            const writeBlock = (label: string, body: string) => {
              if (cy > PAGE_H - 80) {
                // close card and continue on next page
                doc
                  .strokeColor("#e2e8f0")
                  .lineWidth(1)
                  .roundedRect(MARGIN, cardTop, CONTENT_W, cy - cardTop + 8, 6)
                  .stroke();
                doc.addPage();
                y = MARGIN;
                cy = y + 12;
              }
              doc.fillColor(MUTED).font("Helvetica-Bold").fontSize(8).text(label, MARGIN + 10, cy);
              cy += 12;
              doc.fillColor(BODY).font("Helvetica").fontSize(9).text(body, MARGIN + 10, cy, {
                width: CONTENT_W - 20,
              });
              cy += doc.heightOfString(body, { width: CONTENT_W - 20 }) + 10;
            };

            const procedureBody =
              steps.length > 0
                ? steps.map((s, i) => `${i + 1}. ${s}`).join("\n")
                : "1. Review available evidence against the control requirement.";
            writeBlock("TEST PROCEDURE", procedureBody);
            writeBlock(
              "Tester & Test Date",
              `Tester: ${auditor.name || auditor.email}    Test date: ${formatDate(
                ans?.answeredAt || session.submittedAt || snapshot.calculatedAt
              )}`
            );
            writeBlock("FINDINGS", fText);
            writeBlock("RECOMMENDATIONS", rText);

            if (align && (align.euAiAct || align.nistAiRmf || align.iso42001 || align.oecdAi)) {
              const rows: [string, string][] = [];
              if (align.euAiAct) rows.push(["EU AI Act", align.euAiAct]);
              if (align.nistAiRmf) rows.push(["NIST AI RMF", align.nistAiRmf]);
              if (align.iso42001) rows.push(["ISO/IEC 42001", align.iso42001]);
              if (align.oecdAi) rows.push(["OECD AI Principles", align.oecdAi]);
              const boxH = 18 + rows.length * 14;
              if (cy + boxH > PAGE_H - 40) {
                doc
                  .strokeColor("#e2e8f0")
                  .lineWidth(1)
                  .roundedRect(MARGIN, cardTop, CONTENT_W, cy - cardTop + 8, 6)
                  .stroke();
                doc.addPage();
                y = MARGIN;
                cy = y + 12;
              }
              doc.roundedRect(MARGIN + 8, cy, CONTENT_W - 16, boxH, 4).fill("#f0f4f8");
              doc
                .fillColor(MUTED)
                .font("Helvetica-Bold")
                .fontSize(8)
                .text("FRAMEWORK ALIGNMENT", MARGIN + 16, cy + 6);
              let ay = cy + 20;
              rows.forEach(([label, value]) => {
                doc.fillColor(TEAL).font("Helvetica-Bold").fontSize(8).text(label, MARGIN + 16, ay);
                doc
                  .fillColor(BODY)
                  .font("Helvetica")
                  .fontSize(8)
                  .text(value, MARGIN + 130, ay, { width: CONTENT_W - 160 });
                ay += 14;
              });
              cy += boxH + 8;
            }

            doc
              .strokeColor("#e2e8f0")
              .lineWidth(1)
              .roundedRect(MARGIN, cardTop, CONTENT_W, cy - cardTop + 6, 6)
              .stroke();
            y = cy + 16;
          }
        }

        // Footer
        doc
          .fillColor(MUTED)
          .font("Helvetica")
          .fontSize(7)
          .text(
            `Generated by GRAICE Platform · ${generated} · Confidential · Auditor: ${auditor.name || auditor.email}`,
            MARGIN,
            PAGE_H - 30,
            { width: CONTENT_W }
          );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
