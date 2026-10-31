import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { IAssessmentSession, IReportMetadata } from "../models/AssessmentSession.js";
import { ICompany } from "../models/Company.js";
import { IAssessmentFramework } from "../models/AssessmentFramework.js";
import { IUser } from "../models/User.js";
import { ScoringService } from "./scoring.service.js";
import { s3Service } from "./s3.service.js";

export class ReportService {
  /**
   * Generates a comprehensive, branded PDF audit report for an assessment session
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
          margin: 40,
          size: "A4",
          info: {
            Title: `GRAICE Audit Report - ${company.name}`,
            Author: "GCRAI / grAIce Assessment Platform",
            Subject: `${session.assessmentType} Assessment Governance Report`,
          },
        });

        const buffers: Buffer[] = [];
        doc.on("data", (chunk) => buffers.push(chunk));
        doc.on("end", async () => {
          const pdfBuffer = Buffer.concat(buffers);
          const checksum = crypto.createHash("sha256").update(pdfBuffer).digest("hex");
          const timestamp = Date.now();
          const cleanCompName = company.name.replace(/[^a-zA-Z0-9_-]/g, "_");
          const fileName = `GRAICE_Report_${cleanCompName}_${session._id}_${timestamp}.pdf`;

          // Ensure local reports directory exists
          const reportsDir = path.join(s3Service.getUploadsDir(), "reports");
          if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
          }

          const localFilePath = path.join(reportsDir, fileName);
          await fs.promises.writeFile(localFilePath, pdfBuffer);

          const baseUrl = process.env.API_BASE_URL || "http://localhost:5000";
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
        });

        doc.on("error", (err) => reject(err));

        // ==========================================
        // 1. HEADER & BRANDING
        // ==========================================
        doc.fillColor("#0f172a").fontSize(22).font("Helvetica-Bold").text("GRAICE ASSESSMENT PLATFORM", 40, 40);
        doc.fillColor("#2563eb").fontSize(11).font("Helvetica-Bold").text("GLOBAL FRAMEWORK FOR RESPONSIBLE AI (GCRAI)", 40, 68);
        doc.fillColor("#64748b").fontSize(9).font("Helvetica").text("CONFIDENTIAL GOVERNANCE AUDIT REPORT", 40, 82);

        doc.moveTo(40, 98).lineTo(555, 98).strokeColor("#cbd5e1").lineWidth(1).stroke();

        // ==========================================
        // 2. ENGAGEMENT METADATA BOX
        // ==========================================
        const metaY = 110;
        doc.rect(40, metaY, 515, 80).fillColor("#f8fafc").fillAndStroke("#e2e8f0");

        doc.fillColor("#0f172a").fontSize(10).font("Helvetica-Bold");
        doc.text("Organization:", 55, metaY + 12);
        doc.font("Helvetica").text(company.name, 140, metaY + 12);

        doc.font("Helvetica-Bold").text("Domain:", 55, metaY + 28);
        doc.font("Helvetica").text(company.domain || "N/A", 140, metaY + 28);

        doc.font("Helvetica-Bold").text("Assessment Type:", 55, metaY + 44);
        doc.font("Helvetica").text(`${session.assessmentType} Assessment`, 140, metaY + 44);

        doc.font("Helvetica-Bold").text("Lead Auditor:", 320, metaY + 12);
        doc.font("Helvetica").text(auditor.name || auditor.email, 405, metaY + 12);

        doc.font("Helvetica-Bold").text("Client Contact:", 320, metaY + 28);
        doc.font("Helvetica").text(session.clientContact?.name || "N/A", 405, metaY + 28);

        doc.font("Helvetica-Bold").text("Audit Date:", 320, metaY + 44);
        doc.font("Helvetica").text(
          session.submittedAt ? new Date(session.submittedAt).toLocaleDateString() : new Date().toLocaleDateString(),
          405,
          metaY + 44
        );

        doc.font("Helvetica-Bold").text("Framework Ver:", 55, metaY + 60);
        doc.font("Helvetica").text(session.frameworkVersion || "GCRAI v0.8", 140, metaY + 60);

        doc.font("Helvetica-Bold").text("Session Status:", 320, metaY + 60);
        doc.font("Helvetica").text(session.status, 405, metaY + 60);

        // ==========================================
        // 3. EXECUTIVE MATURITY SCORECARD
        // ==========================================
        const scoreY = 205;
        const snapshot = session.scoreSnapshot || ScoringService.calculateScores(session, framework);

        // Card 1: Overall Compliance %
        doc.rect(40, scoreY, 160, 60).fillColor("#eff6ff").fillAndStroke("#bfdbfe");
        doc.fillColor("#1e40af").fontSize(9).font("Helvetica-Bold").text("COMPLIANCE RATING", 52, scoreY + 10);
        doc.fillColor("#1d4ed8").fontSize(20).font("Helvetica-Bold").text(`${snapshot.overallPercentage}%`, 52, scoreY + 26);

        // Card 2: Maturity Classification Tier
        doc.rect(215, scoreY, 165, 60).fillColor("#f0fdf4").fillAndStroke("#bbf7d0");
        doc.fillColor("#166534").fontSize(9).font("Helvetica-Bold").text("MATURITY LEVEL", 227, scoreY + 10);
        doc.fillColor("#15803d").fontSize(18).font("Helvetica-Bold").text(snapshot.maturityLevel.toUpperCase(), 227, scoreY + 28);

        // Card 3: Controls Assessed
        doc.rect(395, scoreY, 160, 60).fillColor("#fafaf9").fillAndStroke("#e7e5e4");
        doc.fillColor("#44403c").fontSize(9).font("Helvetica-Bold").text("CONTROLS EVALUATED", 407, scoreY + 10);
        doc.fillColor("#1c1917").fontSize(18).font("Helvetica-Bold").text(
          `${snapshot.totalControlsAssessed || snapshot.overallScore} / ${snapshot.maxPossibleScore}`,
          407,
          scoreY + 28
        );

        // ==========================================
        // 4. SEVEN GRAICE PILLARS BREAKDOWN
        // ==========================================
        let tableY = 285;
        doc.fillColor("#0f172a").fontSize(13).font("Helvetica-Bold").text("Seven GRAICE Pillars Performance", 40, tableY);
        tableY += 20;

        // Table Header
        doc.rect(40, tableY, 515, 22).fillColor("#1e293b").fill();
        doc.fillColor("#ffffff").fontSize(8).font("Helvetica-Bold");
        doc.text("PILLAR", 50, tableY + 6);
        doc.text("CONTROLS", 240, tableY + 6);
        doc.text("NO EXCEPTION", 310, tableY + 6);
        doc.text("EXCEPTIONS", 390, tableY + 6);
        doc.text("COMPLIANCE", 470, tableY + 6);
        tableY += 22;

        snapshot.pillarScores.forEach((p, idx) => {
          const rowBg = idx % 2 === 0 ? "#f8fafc" : "#ffffff";
          doc.rect(40, tableY, 515, 20).fillColor(rowBg).fillAndStroke("#f1f5f9");

          doc.fillColor("#334155").fontSize(8).font("Helvetica");
          doc.text(`${p.pillarNumber ? `P${p.pillarNumber}. ` : ""}${p.pillarName}`, 50, tableY + 5, { width: 180, lineBreak: false });
          doc.text(String(p.totalControls || p.scoreMax), 250, tableY + 5);
          doc.text(String(p.noExceptionsNoted ?? p.scoreEarned), 330, tableY + 5);
          doc.text(String(p.exceptionsNoted ?? 0), 410, tableY + 5);
          doc.font("Helvetica-Bold").text(`${p.percentage}%`, 480, tableY + 5);

          tableY += 20;
        });

        // ==========================================
        // 5. GOVERNANCE EXCEPTIONS & FINDINGS (PAGE 2)
        // ==========================================
        doc.addPage();
        let page2Y = 40;

        doc.fillColor("#0f172a").fontSize(16).font("Helvetica-Bold").text("Governance Exceptions & Identified Gaps", 40, page2Y);
        doc.fillColor("#64748b").fontSize(9).font("Helvetica").text("The following controls require management remediation to align with GRAICE standards.", 40, page2Y + 22);
        page2Y += 45;

        const gaps = ScoringService.extractGaps(session, framework);

        if (gaps.length === 0) {
          doc.rect(40, page2Y, 515, 45).fillColor("#f0fdf4").fillAndStroke("#bbf7d0");
          doc.fillColor("#15803d").fontSize(10).font("Helvetica-Bold").text("No Exceptions Noted", 55, page2Y + 16);
          page2Y += 60;
        } else {
          for (let i = 0; i < gaps.length; i++) {
            const gap = gaps[i];

            // If we run close to page bottom, create new page
            if (page2Y > 700) {
              doc.addPage();
              page2Y = 40;
            }

            doc.rect(40, page2Y, 515, 68).fillColor("#fff1f2").fillAndStroke("#fecdd3");

            doc.fillColor("#be123c").fontSize(9).font("Helvetica-Bold");
            doc.text(`[EXCEPTION] ${gap.questionId} — ${gap.pillarName}`, 52, page2Y + 10);

            doc.fillColor("#0f172a").fontSize(8).font("Helvetica");
            doc.text(gap.questionText, 52, page2Y + 24, { width: 490 });

            doc.fillColor("#475569").fontSize(7).font("Helvetica-Oblique");
            const regMap = Object.entries(gap.regulatoryAlignments || {})
              .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
              .join(" | ");
            doc.text(`Regulatory Reference: ${regMap || "GRAICE Baseline Control"}`, 52, page2Y + 48, { width: 490 });

            page2Y += 76;
          }
        }

        // ==========================================
        // 6. ACTIONABLE RECOMMENDATIONS
        // ==========================================
        if (page2Y > 640) {
          doc.addPage();
          page2Y = 40;
        }

        doc.fillColor("#0f172a").fontSize(14).font("Helvetica-Bold").text("Actionable Governance Recommendations", 40, page2Y);
        page2Y += 22;

        const recs = [
          "Establish an executive AI Ethics & Governance Committee reporting directly to Board oversight.",
          "Implement continuous algorithmic bias monitoring across all production high-risk AI models.",
          "Institute formal supplier AI risk assessments and contractual compliance warranties for third-party AI APIs.",
          "Maintain an automated AI inventory registry mapped to EU AI Act risk tiers and NIST AI RMF profiles.",
        ];

        recs.forEach((rec, idx) => {
          doc.fillColor("#2563eb").fontSize(9).font("Helvetica-Bold").text(`${idx + 1}.`, 45, page2Y);
          doc.fillColor("#334155").fontSize(9).font("Helvetica").text(rec, 65, page2Y, { width: 480 });
          page2Y += 22;
        });

        // ==========================================
        // 7. ATTESTATION & SIGN-OFF FOOTER
        // ==========================================
        page2Y = Math.max(page2Y + 20, 680);
        doc.moveTo(40, page2Y).lineTo(555, page2Y).strokeColor("#cbd5e1").lineWidth(1).stroke();
        doc.fillColor("#64748b").fontSize(7).font("Helvetica");
        doc.text(
          `Generated automatically by GRAICE Platform on ${new Date().toISOString()} | Lead Auditor: ${auditor.name} (${auditor.email})`,
          40,
          page2Y + 8
        );
        doc.text(
          `Digital Attestation SHA-256 Checksum: Pending Document Finalization`,
          40,
          page2Y + 20
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
