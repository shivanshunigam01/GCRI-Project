/**
 * Synthetic visual QA helper for the branded GRAICE PDF report.
 * Usage: npx tsx scratch/generate_sample_report_pdf.ts
 */
import fs from "fs";
import path from "path";
import { Types } from "mongoose";
import { buildGraiceReportData } from "../src/services/report/reportData.service.js";
import {
  renderGraiceReportPdf,
  validateReportConsistency,
} from "../src/services/report/reportPdf.renderer.js";
import type { IAssessmentSession } from "../src/models/AssessmentSession.js";
import type { IAssessmentFramework } from "../src/models/AssessmentFramework.js";
import type { ICompany } from "../src/models/Company.js";
import type { IUser } from "../src/models/User.js";

function makeFramework(): IAssessmentFramework {
  const pillars = [
    { pillarId: "p1", pillarNumber: 1, name: "Ethical Leadership", description: "", weight: 1, order: 1 },
    { pillarId: "p2", pillarNumber: 2, name: "Purpose-Driven Innovation", description: "", weight: 1, order: 2 },
    { pillarId: "p3", pillarNumber: 3, name: "Human-Centric Use", description: "", weight: 1, order: 3 },
    { pillarId: "p4", pillarNumber: 4, name: "Responsible Implementation", description: "", weight: 1, order: 4 },
    { pillarId: "p5", pillarNumber: 5, name: "AI Literacy & Workforce Readiness", description: "", weight: 1, order: 5 },
    { pillarId: "p6", pillarNumber: 6, name: "Data Governance & Integrity", description: "", weight: 1, order: 6 },
    { pillarId: "p7", pillarNumber: 7, name: "Transparency & Auditability", description: "", weight: 1, order: 7 },
  ];

  // Landscape profile questions (must NOT inflate pillar KPI totals)
  const landscape = [1, 2, 3, 4].map((i) => ({
    questionId: `L-Q0${i}`,
    pillarId: "ai-landscape",
    pillarNumber: 0,
    pillarName: "Organization & AI Landscape",
    text: `Landscape profile question ${i}`,
    mandatory: true,
    isActive: true,
    order: i,
    responseOptions: [],
  }));

  const questions = [
    ...landscape,
    ...pillars.flatMap((p, pi) =>
      [1, 2].map((ci) => ({
        questionId: `P${p.pillarNumber}-C0${ci}`,
        pillarId: p.pillarId,
        pillarNumber: p.pillarNumber,
        pillarName: p.name,
        text: `Has the organization established control P${p.pillarNumber}-C0${ci} with documented accountability and evidence retention?`,
        controlDescription: `Control description for P${p.pillarNumber}-C0${ci} covering governance evidence expectations for large organizations.`,
        testProcedure: `1. Review policy documentation.\n2. Interview control owner.\n3. Sample evidence artifacts.`,
        organizationScope: "Large & Complex Organizations",
        assuranceTier: "Tier 1",
        remediationGuidance: `Remediate gaps for P${p.pillarNumber}-C0${ci} with documented ownership and evidence retention.`,
        regulatoryAlignments: {
          euAiAct: "Art. 9 — Risk management",
          nistAiRmf: "GOVERN 1.1",
          iso42001: "Clause 5 — Leadership",
          oecdAi: "Accountability principle",
        },
        linkedDocumentRequests: [`DOC-P${p.pillarNumber}`],
        mandatory: true,
        isActive: true,
        order: pi * 10 + ci,
        responseOptions: [],
      }))
    ),
  ];

  return {
    version: "2026_V1",
    status: "Published",
    assessmentType: "Light",
    title: "Research Agent Assessment",
    totalQuestions: questions.length,
    pillars: [
      {
        pillarId: "ai-landscape",
        pillarNumber: 0,
        name: "Organization & AI Landscape",
        description: "",
        weight: 1,
        order: 0,
      },
      ...pillars,
    ],
    questions,
    documentRequests: [
      {
        documentId: "DOC-P1",
        pillarNumber: 1,
        pillarName: "Ethical Leadership",
        title: "AI Governance Charter",
        description: "Board-approved charter",
        linkedControls: ["P1-C01"],
      },
    ],
    meetingRequests: [
      {
        meetingNumber: 1,
        pillarName: "Ethical Leadership",
        topic: "AI Ethics Committee interview",
      },
    ],
    maturityThresholds: {
      initialMax: 30,
      emergingMax: 60,
      establishedMax: 90,
      advancedMax: 120,
    },
  } as unknown as IAssessmentFramework;
}

async function main() {
  const framework = makeFramework();
  const company = {
    _id: new Types.ObjectId(),
    name: "Acme Governance Labs",
    domain: "acme.example",
    size: "Large & Complex Organizations",
  } as unknown as ICompany;

  const auditor = {
    _id: new Types.ObjectId(),
    name: "Alex Auditor",
    email: "alex@example.com",
  } as unknown as IUser;

  const answers = framework.questions.map((q, idx) => {
    const isGap = q.questionId === "P1-C02" || q.questionId === "P3-C01" || q.questionId === "P5-C02";
    return {
      questionId: q.questionId,
      pillarId: q.pillarId,
      pillarNumber: q.pillarNumber,
      testStatus: "Complete" as const,
      exceptionStatus: isGap ? ("ExceptionNoted" as const) : ("NoExceptionNoted" as const),
      selectedOptionCode: isGap ? "EXCEPTION_NOTED" : "NO_EXCEPTION_NOTED",
      scoreValue: isGap ? 0 : 4,
      evidenceNotes: isGap
        ? `Exception noted during sampling for ${q.questionId}: incomplete formal authority records and informal escalation paths.`
        : `Evidence reviewed for ${q.questionId}; control operating as designed based on sampled artifacts.`,
      workPaperReference: `WP-${q.questionId}`,
      answeredAt: new Date("2026-06-10T12:00:00Z"),
    };
  });

  // Simulate Light scoreSnapshot that used to poison KPIs (overallScore mistaken for controlsAssessed)
  const session = {
    _id: new Types.ObjectId(),
    companyId: company._id,
    conductedByUserId: auditor._id,
    frameworkVersion: framework.version,
    assessmentType: "Light",
    status: "Submitted",
    clientContact: { name: "Jordan Client", email: "jordan@acme.example", title: "Research Agent" },
    answers,
    scoreSnapshot: {
      overallScore: 61,
      maxPossibleScore: 120,
      overallPercentage: 50.8,
      maturityLevel: "Emerging",
      pillarScores: [],
      calculatedAt: new Date("2026-06-15T10:00:00Z"),
      // intentionally omit totalExceptionsNoted / totalControlsAssessed (Light shape)
    },
    submittedAt: new Date("2026-06-15T10:00:00Z"),
    createdAt: new Date("2026-06-01T10:00:00Z"),
    updatedAt: new Date("2026-06-15T10:00:00Z"),
  } as unknown as IAssessmentSession;

  const data = buildGraiceReportData({
    session,
    company,
    framework,
    auditor,
    conductedBy: auditor,
  });

  const issues = validateReportConsistency(data);
  if (issues.length) {
    console.error("DATA CONSISTENCY FAILURES:");
    issues.forEach((i) => console.error(" -", i));
    process.exit(2);
  }

  // Guard against the historical Globex bug
  if (data.kpis.controlsAssessed === 61) {
    console.error("FAIL: controlsAssessed incorrectly equals Light overallScore (61)");
    process.exit(2);
  }
  if (data.kpis.totalControls !== 14) {
    console.error("FAIL: expected 14 in-scope controls, got", data.kpis.totalControls);
    process.exit(2);
  }
  if (data.kpis.exceptionsNoted !== 3) {
    console.error("FAIL: expected 3 exceptions, got", data.kpis.exceptionsNoted);
    process.exit(2);
  }

  const outDir = path.resolve(process.cwd(), "uploads/reports");
  const previewDir = path.resolve(process.cwd(), "uploads/report-previews");
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(previewDir, { recursive: true });
  const outPath = path.join(outDir, `SAMPLE_GRAICE_Report_REDESIGN_${Date.now()}.pdf`);

  await new Promise<void>((resolve, reject) => {
    const doc = renderGraiceReportPdf(data);
    const stream = fs.createWriteStream(outPath);
    doc.pipe(stream);
    doc.on("error", reject);
    stream.on("finish", () => resolve());
    stream.on("error", reject);
    doc.end();
  });

  console.log("Sample PDF written:", outPath);
  console.log("KPIs:", data.kpis);
  console.log("Pillars:", data.pillarProgress.length, "totals", data.pillarProgress.map((p) => p.total));
  console.log("Controls:", data.controls.length);
  console.log("Gaps:", data.gapCount);
  console.log("Consistency checks: PASS");
  console.log("Preview dir:", previewDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
