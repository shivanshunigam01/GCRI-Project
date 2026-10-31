import path from "path";
import fs from "fs";
import * as xlsx from "xlsx";
import mongoose from "mongoose";
import dotenv from "dotenv";
import {
  AssessmentFramework,
  IQuestionControl,
  IPillar,
  IResponseOption,
  IDocumentRequestItem,
  IMeetingRequestItem,
} from "../models/AssessmentFramework.js";

dotenv.config();

const PILLARS_CONFIG: IPillar[] = [
  {
    pillarId: "ethical-leadership",
    pillarNumber: 1,
    name: "Ethical Leadership",
    description:
      "Establishing executive accountability, oversight structures, decision governance, and organizational ethics for AI.",
    weight: 1,
    order: 1,
  },
  {
    pillarId: "purpose-driven-innovation",
    pillarNumber: 2,
    name: "Purpose-Driven Innovation",
    description:
      "Defining clear purpose, stakeholder benefits, proportionality, and non-AI alternative evaluations for AI systems.",
    weight: 1,
    order: 2,
  },
  {
    pillarId: "human-centric-use",
    pillarNumber: 3,
    name: "Human-Centric Use",
    description:
      "Ensuring human-in-the-loop oversight, fallback/override capabilities, fairness testing, and user notification.",
    weight: 1,
    order: 3,
  },
  {
    pillarId: "responsible-implementation",
    pillarNumber: 4,
    name: "Responsible Implementation",
    description:
      "Model risk classification, pre-deployment validation, drift monitoring, cybersecurity resilience, and incident response.",
    weight: 1,
    order: 4,
  },
  {
    pillarId: "ai-literacy-workforce-readiness",
    pillarNumber: 5,
    name: "AI Literacy & Workforce Readiness",
    description:
      "Role-based AI governance training, technical competency development, and safe usage workforce policies.",
    weight: 1,
    order: 5,
  },
  {
    pillarId: "data-governance-integrity",
    pillarNumber: 6,
    name: "Data Governance & Integrity",
    description:
      "Data provenance, quality assurance, training data bias detection, IP/copyright compliance, and privacy safeguards.",
    weight: 1,
    order: 6,
  },
  {
    pillarId: "transparency-auditability",
    pillarNumber: 7,
    name: "Transparency & Auditability",
    description:
      "Comprehensive system documentation, explainability mechanisms, change audit trails, and independent assurance.",
    weight: 1,
    order: 7,
  },
];

const FULL_RESPONSE_OPTIONS: IResponseOption[] = [
  { code: "NO_EXCEPTION_NOTED", label: "No Exception Noted", scoreValue: 1, order: 1 },
  { code: "EXCEPTION_NOTED", label: "Exception Noted", scoreValue: 0, order: 2 },
  { code: "NOT_ASSESSED", label: "Not Assessed", scoreValue: 0, order: 3 },
];

function getPillarId(name: string): string {
  const p = PILLARS_CONFIG.find(
    (cfg) => cfg.name.toLowerCase().trim() === name.toLowerCase().trim()
  );
  if (p) return p.pillarId;
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function getPillarNumber(name: string): number {
  const p = PILLARS_CONFIG.find(
    (cfg) => cfg.name.toLowerCase().trim() === name.toLowerCase().trim()
  );
  if (p) return p.pillarNumber || 1;
  return 1;
}

/**
 * Parses Full Assessment Controls (65 controls) from the Excel Workbook
 */
function parseFullAssessmentControls(workbookPath: string): IQuestionControl[] {
  if (!fs.existsSync(workbookPath)) {
    throw new Error(`Workbook not found at path: ${workbookPath}`);
  }

  const wb = xlsx.readFile(workbookPath);
  const sheetName = "Controls Testing";
  const sheet = wb.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Sheet '${sheetName}' not found in workbook.`);
  }

  const rawRows: Record<string, any>[] = xlsx.utils.sheet_to_json(sheet, {
    header: "A",
    range: 1, // Row 2 is header, row 3 onwards is data
    defval: "",
  });

  const questions: IQuestionControl[] = [];
  const ctrlPattern = /^P\d+-C\d+/;

  let order = 1;
  for (const row of rawRows) {
    const ctrlId = String(row["A"] || "").trim();
    if (!ctrlPattern.test(ctrlId)) {
      continue;
    }

    const pillarName = String(row["B"] || "").trim();
    const pillarId = getPillarId(pillarName);
    const pillarNumber =
      parseInt(String(row["C"] || "").split(".")[0], 10) || getPillarNumber(pillarName);
    const questionText = String(row["D"] || "").trim();
    const controlDesc = String(row["E"] || "").trim();
    const testProc = String(row["F"] || "").trim();
    const scope = String(row["G"] || "").trim();
    const linkedDocsRaw = String(row["H"] || "").trim();
    const linkedDocs = linkedDocsRaw
      ? linkedDocsRaw
          .split(/[,;]+/)
          .map((d) => d.trim())
          .filter(Boolean)
      : [];
    const assuranceTier = String(row["I"] || "").trim();
    const euAiAct = String(row["J"] || "").trim();
    const nistAiRmf = String(row["K"] || "").trim();
    const iso42001 = String(row["L"] || "").trim();
    const oecdAi = String(row["M"] || "").trim();

    questions.push({
      questionId: ctrlId,
      pillarId,
      pillarNumber,
      pillarName,
      section: `Pillar ${pillarNumber}: ${pillarName}`,
      text: questionText,
      controlDescription: controlDesc,
      testProcedure: testProc,
      organizationScope: scope,
      linkedDocumentRequests: linkedDocs,
      assuranceTier,
      regulatoryAlignments: {
        euAiAct,
        nistAiRmf,
        iso42001,
        oecdAi,
      },
      mandatory: true,
      isActive: true,
      order: order++,
      responseOptions: FULL_RESPONSE_OPTIONS,
    });
  }

  return questions;
}

/**
 * Parses Document Request List (73 artifacts) from the Excel Workbook
 */
function parseDocumentRequests(workbookPath: string): IDocumentRequestItem[] {
  const wb = xlsx.readFile(workbookPath);
  const sheet = wb.Sheets["Document Request List"];
  if (!sheet) return [];

  const rawRows: Record<string, any>[] = xlsx.utils.sheet_to_json(sheet, {
    header: "A",
    range: 1,
    defval: "",
  });

  const docPattern = /^DOC-P\d+-\d+/;
  const items: IDocumentRequestItem[] = [];

  for (const row of rawRows) {
    const documentId = String(row["A"] || "").trim();
    if (!docPattern.test(documentId)) continue;

    const pillarNumber = parseInt(String(row["B"] || "").trim(), 10) || 1;
    const pillarName = String(row["C"] || "").trim();
    const title = String(row["D"] || "").trim();
    const description = String(row["E"] || "").trim();
    const exampleContent = String(row["F"] || "").trim();
    const linkedRaw = String(row["G"] || "").trim();
    const linkedControls = linkedRaw
      ? linkedRaw
          .split(/[,;]+/)
          .map((c) => c.trim())
          .filter(Boolean)
      : [];

    items.push({
      documentId,
      pillarNumber,
      pillarName,
      title,
      description,
      exampleContent,
      linkedControls,
    });
  }

  return items;
}

/**
 * Parses Meeting Request List (25 governance meetings) from the Excel Workbook
 */
function parseMeetingRequests(workbookPath: string): IMeetingRequestItem[] {
  const wb = xlsx.readFile(workbookPath);
  const sheet = wb.Sheets["Meeting Request List"];
  if (!sheet) return [];

  const rawRows: Record<string, any>[] = xlsx.utils.sheet_to_json(sheet, {
    header: "A",
    range: 2,
    defval: "",
  });

  const items: IMeetingRequestItem[] = [];

  for (const row of rawRows) {
    const mtgNum = parseInt(String(row["A"] || "").trim(), 10);
    if (isNaN(mtgNum) || mtgNum <= 0) continue;

    items.push({
      meetingNumber: mtgNum,
      pillarName: String(row["B"] || "").trim(),
      topic: String(row["C"] || "").trim(),
      frameworkAlignment: String(row["D"] || "").trim(),
      agendaItems: String(row["E"] || "").trim(),
      leaderTitles: String(row["F"] || "").trim(),
      teamMemberTitles: String(row["G"] || "").trim(),
      duration: String(row["H"] || "").trim(),
      preparationNotes: String(row["I"] || "").trim(),
    });
  }

  return items;
}

/**
 * Constructs the Light Assessment Questionnaire (30 questions, max score 120)
 */
function getLightAssessmentQuestions(): IQuestionControl[] {
  const yesNoUnsureOpts: IResponseOption[] = [
    { code: "YES", label: "Yes", scoreValue: 4, order: 1 },
    { code: "NO", label: "No", scoreValue: 0, order: 2 },
    { code: "UNSURE", label: "Unsure", scoreValue: 0, order: 3 },
  ];

  const yesPlannedNoOpts: IResponseOption[] = [
    { code: "YES", label: "Yes", scoreValue: 4, order: 1 },
    { code: "PLANNED", label: "Planned / In Progress", scoreValue: 2, order: 2 },
    { code: "NO", label: "No", scoreValue: 0, order: 3 },
  ];

  const questions: IQuestionControl[] = [
    // Section 1: Organization & AI Landscape (Q1 - Q4)
    {
      questionId: "LA-01",
      pillarId: "ai-landscape",
      pillarNumber: 0,
      pillarName: "Organization & AI Landscape",
      section: "Section 1: Organization & AI Landscape",
      text: "How would you describe your organization's AI adoption maturity?",
      order: 1,
      mandatory: true,
      isActive: true,
      responseOptions: [
        { code: "EXPLORING", label: "Exploring AI opportunities", scoreValue: 1, order: 1 },
        { code: "PILOT", label: "Pilot projects underway", scoreValue: 2, order: 2 },
        { code: "MULTIPLE_PRODUCTION", label: "Multiple production AI solutions", scoreValue: 3, order: 3 },
        { code: "EMBEDDED", label: "AI embedded across business operations", scoreValue: 4, order: 4 },
      ],
    },
    {
      questionId: "LA-02",
      pillarId: "ai-landscape",
      pillarNumber: 0,
      pillarName: "Organization & AI Landscape",
      section: "Section 1: Organization & AI Landscape",
      text: "Approximately how many AI use cases are currently in production?",
      order: 2,
      mandatory: true,
      isActive: true,
      responseOptions: [
        { code: "NONE", label: "None", scoreValue: 0, order: 1 },
        { code: "1_TO_5", label: "1-5", scoreValue: 1, order: 2 },
        { code: "6_TO_20", label: "6-20", scoreValue: 2, order: 3 },
        { code: "MORE_THAN_20", label: "More than 20", scoreValue: 4, order: 4 },
      ],
    },
    {
      questionId: "LA-03",
      pillarId: "ai-landscape",
      pillarNumber: 0,
      pillarName: "Organization & AI Landscape",
      section: "Section 1: Organization & AI Landscape",
      text: "Does your organization use Generative AI (e.g., ChatGPT, Copilot, Claude, Gemini)?",
      order: 3,
      mandatory: true,
      isActive: true,
      responseOptions: [
        { code: "EXTENSIVE", label: "Extensive use", scoreValue: 4, order: 1 },
        { code: "LIMITED", label: "Limited use", scoreValue: 2, order: 2 },
        { code: "PILOT", label: "Pilot stage", scoreValue: 1, order: 3 },
        { code: "NO_USAGE", label: "No usage", scoreValue: 0, order: 4 },
      ],
    },
    {
      questionId: "LA-04",
      pillarId: "ai-landscape",
      pillarNumber: 0,
      pillarName: "Organization & AI Landscape",
      section: "Section 1: Organization & AI Landscape",
      text: "Are any AI systems involved in decisions impacting customers, employees, financial outcomes, healthcare, safety, or regulatory obligations?",
      order: 4,
      mandatory: true,
      isActive: true,
      responseOptions: yesNoUnsureOpts,
    },

    // Pillar 1: Ethical Leadership (Q5 - Q8)
    {
      questionId: "LA-05",
      pillarId: "ethical-leadership",
      pillarNumber: 1,
      pillarName: "Ethical Leadership",
      section: "Pillar 1: Ethical Leadership",
      text: "Has executive accountability for AI governance been formally assigned?",
      order: 5,
      mandatory: true,
      isActive: true,
      responseOptions: yesNoUnsureOpts,
    },
    {
      questionId: "LA-06",
      pillarId: "ethical-leadership",
      pillarNumber: 1,
      pillarName: "Ethical Leadership",
      section: "Pillar 1: Ethical Leadership",
      text: "Is there an AI governance committee or formal oversight body?",
      order: 6,
      mandatory: true,
      isActive: true,
      responseOptions: yesPlannedNoOpts,
    },
    {
      questionId: "LA-07",
      pillarId: "ethical-leadership",
      pillarNumber: 1,
      pillarName: "Ethical Leadership",
      section: "Pillar 1: Ethical Leadership",
      text: "Does leadership regularly review AI risks, incidents, and performance metrics?",
      order: 7,
      mandatory: true,
      isActive: true,
      responseOptions: yesPlannedNoOpts,
    },
    {
      questionId: "LA-08",
      pillarId: "ethical-leadership",
      pillarNumber: 1,
      pillarName: "Ethical Leadership",
      section: "Pillar 1: Ethical Leadership",
      text: "Are AI concerns, incidents, or ethical issues escalated through a documented process?",
      order: 8,
      mandatory: true,
      isActive: true,
      responseOptions: yesPlannedNoOpts,
    },

    // Pillar 2: Purpose-Driven Innovation (Q9 - Q12)
    {
      questionId: "LA-09",
      pillarId: "purpose-driven-innovation",
      pillarNumber: 2,
      pillarName: "Purpose-Driven Innovation",
      section: "Pillar 2: Purpose-Driven Innovation",
      text: "Do you maintain an inventory of AI systems and use cases?",
      order: 9,
      mandatory: true,
      isActive: true,
      responseOptions: yesPlannedNoOpts,
    },
    {
      questionId: "LA-10",
      pillarId: "purpose-driven-innovation",
      pillarNumber: 2,
      pillarName: "Purpose-Driven Innovation",
      section: "Pillar 2: Purpose-Driven Innovation",
      text: "Does each AI solution have a documented purpose, owner, and expected outcome?",
      order: 10,
      mandatory: true,
      isActive: true,
      responseOptions: yesPlannedNoOpts,
    },
    {
      questionId: "LA-11",
      pillarId: "purpose-driven-innovation",
      pillarNumber: 2,
      pillarName: "Purpose-Driven Innovation",
      section: "Pillar 2: Purpose-Driven Innovation",
      text: "Before deploying AI, do you assess whether AI is the most appropriate solution?",
      order: 11,
      mandatory: true,
      isActive: true,
      responseOptions: yesNoUnsureOpts,
    },
    {
      questionId: "LA-12",
      pillarId: "purpose-driven-innovation",
      pillarNumber: 2,
      pillarName: "Purpose-Driven Innovation",
      section: "Pillar 2: Purpose-Driven Innovation",
      text: "Are risks, benefits, and potential unintended consequences formally assessed?",
      order: 12,
      mandatory: true,
      isActive: true,
      responseOptions: yesPlannedNoOpts,
    },

    // Pillar 3: Human-Centric Use (Q13 - Q16)
    {
      questionId: "LA-13",
      pillarId: "human-centric-use",
      pillarNumber: 3,
      pillarName: "Human-Centric Use",
      section: "Pillar 3: Human-Centric Use",
      text: "Can humans review, override, or challenge important AI-assisted decisions?",
      order: 13,
      mandatory: true,
      isActive: true,
      responseOptions: yesNoUnsureOpts,
    },
    {
      questionId: "LA-14",
      pillarId: "human-centric-use",
      pillarNumber: 3,
      pillarName: "Human-Centric Use",
      section: "Pillar 3: Human-Centric Use",
      text: "Are users informed when AI significantly influences recommendations or outcomes?",
      order: 14,
      mandatory: true,
      isActive: true,
      responseOptions: yesNoUnsureOpts,
    },
    {
      questionId: "LA-15",
      pillarId: "human-centric-use",
      pillarNumber: 3,
      pillarName: "Human-Centric Use",
      section: "Pillar 3: Human-Centric Use",
      text: "Is there a mechanism for individuals to request review of consequential AI-driven decisions?",
      order: 15,
      mandatory: true,
      isActive: true,
      responseOptions: [
        { code: "YES", label: "Yes", scoreValue: 4, order: 1 },
        { code: "PLANNED", label: "Planned / In Progress", scoreValue: 2, order: 2 },
        { code: "NO", label: "No", scoreValue: 0, order: 3 },
        { code: "UNSURE", label: "Unsure", scoreValue: 0, order: 4 },
      ],
    },
    {
      questionId: "LA-16",
      pillarId: "human-centric-use",
      pillarNumber: 3,
      pillarName: "Human-Centric Use",
      section: "Pillar 3: Human-Centric Use",
      text: "Have you assessed potential misuse, harmful outcomes, or unintended consequences from your AI systems?",
      order: 16,
      mandatory: true,
      isActive: true,
      responseOptions: [
        { code: "YES", label: "Yes", scoreValue: 4, order: 1 },
        { code: "PLANNED", label: "Planned / In Progress", scoreValue: 2, order: 2 },
        { code: "NO", label: "No", scoreValue: 0, order: 3 },
        { code: "UNSURE", label: "Unsure", scoreValue: 0, order: 4 },
      ],
    },

    // Pillar 4: Responsible Implementation (Q17 - Q20)
    {
      questionId: "LA-17",
      pillarId: "responsible-implementation",
      pillarNumber: 4,
      pillarName: "Responsible Implementation",
      section: "Pillar 4: Responsible Implementation",
      text: "Are AI systems tested prior to deployment for accuracy, reliability, and performance?",
      order: 17,
      mandatory: true,
      isActive: true,
      responseOptions: [
        { code: "YES", label: "Yes", scoreValue: 4, order: 1 },
        { code: "PLANNED", label: "Planned / In Progress", scoreValue: 2, order: 2 },
        { code: "NO", label: "No", scoreValue: 0, order: 3 },
        { code: "UNSURE", label: "Unsure", scoreValue: 0, order: 4 },
      ],
    },
    {
      questionId: "LA-18",
      pillarId: "responsible-implementation",
      pillarNumber: 4,
      pillarName: "Responsible Implementation",
      section: "Pillar 4: Responsible Implementation",
      text: "Are AI systems monitored for drift, degradation, or unexpected behavior after deployment?",
      order: 18,
      mandatory: true,
      isActive: true,
      responseOptions: [
        { code: "YES", label: "Yes", scoreValue: 4, order: 1 },
        { code: "PLANNED", label: "Planned / In Progress", scoreValue: 2, order: 2 },
        { code: "NO", label: "No", scoreValue: 0, order: 3 },
        { code: "UNSURE", label: "Unsure", scoreValue: 0, order: 4 },
      ],
    },
    {
      questionId: "LA-19",
      pillarId: "responsible-implementation",
      pillarNumber: 4,
      pillarName: "Responsible Implementation",
      section: "Pillar 4: Responsible Implementation",
      text: "Is there a documented process for approving model updates, retraining events, or configuration changes?",
      order: 19,
      mandatory: true,
      isActive: true,
      responseOptions: [
        { code: "YES", label: "Yes", scoreValue: 4, order: 1 },
        { code: "PLANNED", label: "Planned / In Progress", scoreValue: 2, order: 2 },
        { code: "NO", label: "No", scoreValue: 0, order: 3 },
        { code: "UNSURE", label: "Unsure", scoreValue: 0, order: 4 },
      ],
    },
    {
      questionId: "LA-20",
      pillarId: "responsible-implementation",
      pillarNumber: 4,
      pillarName: "Responsible Implementation",
      section: "Pillar 4: Responsible Implementation",
      text: "Is there a dedicated incident response process for AI failures, misuse, or harmful outcomes?",
      order: 20,
      mandatory: true,
      isActive: true,
      responseOptions: [
        { code: "YES", label: "Yes", scoreValue: 4, order: 1 },
        { code: "PLANNED", label: "Planned / In Progress", scoreValue: 2, order: 2 },
        { code: "NO", label: "No", scoreValue: 0, order: 3 },
        { code: "UNSURE", label: "Unsure", scoreValue: 0, order: 4 },
      ],
    },

    // Pillar 5: AI Literacy & Workforce Readiness (Q21 - Q24)
    {
      questionId: "LA-21",
      pillarId: "ai-literacy-workforce-readiness",
      pillarNumber: 5,
      pillarName: "AI Literacy & Workforce Readiness",
      section: "Pillar 5: AI Literacy & Workforce Readiness",
      text: "Have executives received training on AI governance, risk, and regulatory obligations?",
      order: 21,
      mandatory: true,
      isActive: true,
      responseOptions: [
        { code: "YES", label: "Yes", scoreValue: 4, order: 1 },
        { code: "PLANNED", label: "Planned / In Progress", scoreValue: 2, order: 2 },
        { code: "NO", label: "No", scoreValue: 0, order: 3 },
        { code: "UNSURE", label: "Unsure", scoreValue: 0, order: 4 },
      ],
    },
    {
      questionId: "LA-22",
      pillarId: "ai-literacy-workforce-readiness",
      pillarNumber: 5,
      pillarName: "AI Literacy & Workforce Readiness",
      section: "Pillar 5: AI Literacy & Workforce Readiness",
      text: "Have technical teams received training on responsible AI development and governance?",
      order: 22,
      mandatory: true,
      isActive: true,
      responseOptions: [
        { code: "YES", label: "Yes", scoreValue: 4, order: 1 },
        { code: "PLANNED", label: "Planned / In Progress", scoreValue: 2, order: 2 },
        { code: "NO", label: "No", scoreValue: 0, order: 3 },
        { code: "UNSURE", label: "Unsure", scoreValue: 0, order: 4 },
      ],
    },
    {
      questionId: "LA-23",
      pillarId: "ai-literacy-workforce-readiness",
      pillarNumber: 5,
      pillarName: "AI Literacy & Workforce Readiness",
      section: "Pillar 5: AI Literacy & Workforce Readiness",
      text: "Are employees trained on safe AI usage, limitations, and escalation procedures?",
      order: 23,
      mandatory: true,
      isActive: true,
      responseOptions: [
        { code: "YES", label: "Yes", scoreValue: 4, order: 1 },
        { code: "PLANNED", label: "Planned / In Progress", scoreValue: 2, order: 2 },
        { code: "NO", label: "No", scoreValue: 0, order: 3 },
        { code: "UNSURE", label: "Unsure", scoreValue: 0, order: 4 },
      ],
    },
    {
      questionId: "LA-24",
      pillarId: "ai-literacy-workforce-readiness",
      pillarNumber: 5,
      pillarName: "AI Literacy & Workforce Readiness",
      section: "Pillar 5: AI Literacy & Workforce Readiness",
      text: "Are AI-related competencies or skills formally incorporated into workforce development programs?",
      order: 24,
      mandatory: true,
      isActive: true,
      responseOptions: [
        { code: "YES", label: "Yes", scoreValue: 4, order: 1 },
        { code: "PLANNED", label: "Planned / In Progress", scoreValue: 2, order: 2 },
        { code: "NO", label: "No", scoreValue: 0, order: 3 },
        { code: "UNSURE", label: "Unsure", scoreValue: 0, order: 4 },
      ],
    },

    // Pillar 6: Data Governance & Integrity (Q25 - Q28)
    {
      questionId: "LA-25",
      pillarId: "data-governance-integrity",
      pillarNumber: 6,
      pillarName: "Data Governance & Integrity",
      section: "Pillar 6: Data Governance & Integrity",
      text: "Can you identify the sources, ownership, and authorization status of data used by your AI systems?",
      order: 25,
      mandatory: true,
      isActive: true,
      responseOptions: [
        { code: "YES", label: "Yes", scoreValue: 4, order: 1 },
        { code: "PLANNED", label: "Planned / In Progress", scoreValue: 2, order: 2 },
        { code: "NO", label: "No", scoreValue: 0, order: 3 },
        { code: "UNSURE", label: "Unsure", scoreValue: 0, order: 4 },
      ],
    },
    {
      questionId: "LA-26",
      pillarId: "data-governance-integrity",
      pillarNumber: 6,
      pillarName: "Data Governance & Integrity",
      section: "Pillar 6: Data Governance & Integrity",
      text: "Have training datasets been evaluated for quality, completeness, accuracy, and representativeness?",
      order: 26,
      mandatory: true,
      isActive: true,
      responseOptions: [
        { code: "YES", label: "Yes", scoreValue: 4, order: 1 },
        { code: "PLANNED", label: "Planned / In Progress", scoreValue: 2, order: 2 },
        { code: "NO", label: "No", scoreValue: 0, order: 3 },
        { code: "UNSURE", label: "Unsure", scoreValue: 0, order: 4 },
      ],
    },
    {
      questionId: "LA-27",
      pillarId: "data-governance-integrity",
      pillarNumber: 6,
      pillarName: "Data Governance & Integrity",
      section: "Pillar 6: Data Governance & Integrity",
      text: "Is AI data lineage documented from original source through model input?",
      order: 27,
      mandatory: true,
      isActive: true,
      responseOptions: [
        { code: "YES", label: "Yes", scoreValue: 4, order: 1 },
        { code: "PLANNED", label: "Planned / In Progress", scoreValue: 2, order: 2 },
        { code: "NO", label: "No", scoreValue: 0, order: 3 },
        { code: "UNSURE", label: "Unsure", scoreValue: 0, order: 4 },
      ],
    },
    {
      questionId: "LA-28",
      pillarId: "data-governance-integrity",
      pillarNumber: 6,
      pillarName: "Data Governance & Integrity",
      section: "Pillar 6: Data Governance & Integrity",
      text: "Have you assessed AI training or operational data for bias, privacy, or legal/compliance risks?",
      order: 28,
      mandatory: true,
      isActive: true,
      responseOptions: [
        { code: "YES", label: "Yes", scoreValue: 4, order: 1 },
        { code: "PLANNED", label: "Planned / In Progress", scoreValue: 2, order: 2 },
        { code: "NO", label: "No", scoreValue: 0, order: 3 },
        { code: "UNSURE", label: "Unsure", scoreValue: 0, order: 4 },
      ],
    },

    // Pillar 7: Transparency & Auditability (Q29 - Q30)
    {
      questionId: "LA-29",
      pillarId: "transparency-auditability",
      pillarNumber: 7,
      pillarName: "Transparency & Auditability",
      section: "Pillar 7: Transparency & Auditability",
      text: "Could your organization demonstrate how AI systems are governed, approved, monitored, and controlled during an audit or regulatory review?",
      order: 29,
      mandatory: true,
      isActive: true,
      responseOptions: yesNoUnsureOpts,
    },
    {
      questionId: "LA-30",
      pillarId: "transparency-auditability",
      pillarNumber: 7,
      pillarName: "Transparency & Auditability",
      section: "Pillar 7: Transparency & Auditability",
      text: "Are governance decisions, risk assessments, monitoring results, and approvals documented and retrievable?",
      order: 30,
      mandatory: true,
      isActive: true,
      responseOptions: yesNoUnsureOpts,
    },
  ];

  return questions;
}

/**
 * Main seeding execution
 */
export async function seedFrameworks(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not defined in environment variables.");
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
    console.log("[Seed] Connected to MongoDB Atlas");
  }

  // 1. Locate Workbook
  const possiblePaths = [
    path.resolve(process.cwd(), "1784783614262-GRAICE_Framework_Assessment_Workbook_2026.xlsx"),
    path.resolve(process.cwd(), "../1784783614262-GRAICE_Framework_Assessment_Workbook_2026.xlsx"),
    path.resolve(process.cwd(), "backend/1784783614262-GRAICE_Framework_Assessment_Workbook_2026.xlsx"),
  ];

  let workbookPath = "";
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      workbookPath = p;
      break;
    }
  }

  if (!workbookPath) {
    throw new Error(
      `Could not locate '1784783614262-GRAICE_Framework_Assessment_Workbook_2026.xlsx' in searched paths: ${possiblePaths.join(", ")}`
    );
  }

  console.log(`[Seed] Ingesting Full Assessment from: ${workbookPath}`);
  const fullQuestions = parseFullAssessmentControls(workbookPath);
  const documentRequests = parseDocumentRequests(workbookPath);
  const meetingRequests = parseMeetingRequests(workbookPath);
  console.log(
    `[Seed] Successfully parsed ${fullQuestions.length} Full Assessment controls, ${documentRequests.length} Document Requests, and ${meetingRequests.length} Meeting Requests`
  );

  // 2. Upsert Full Assessment Framework
  const fullVersion = "2026.1";
  const fullFramework = await AssessmentFramework.findOneAndUpdate(
    { version: fullVersion, assessmentType: "Full" },
    {
      version: fullVersion,
      assessmentType: "Full",
      status: "Published",
      title: "GRAICE Responsible AI Comprehensive Assessment Framework (2026)",
      description:
        "Complete 65-control audit workbook across the 7 GRAICE Pillars with pre-mapped EU AI Act, NIST AI RMF, ISO 42001, and OECD AI regulatory controls, plus 73 Document Requests and 25 Audit Meetings.",
      totalQuestions: fullQuestions.length,
      pillars: PILLARS_CONFIG,
      questions: fullQuestions,
      documentRequests,
      meetingRequests,
      maturityThresholds: {
        initialMax: 39,      // <= 39%
        emergingMax: 69,     // 40% - 69%
        establishedMax: 89,  // 70% - 89%
        advancedMax: 100,    // > 89% (90% - 100%)
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(
    `[Seed] ✅ Full Assessment Framework seeded successfully (ID: ${fullFramework._id}, Version: ${fullFramework.version}, Controls: ${fullFramework.questions.length}, Docs: ${fullFramework.documentRequests?.length || 0}, Meetings: ${fullFramework.meetingRequests?.length || 0})`
  );

  // 3. Upsert Light Assessment Framework
  const lightQuestions = getLightAssessmentQuestions();
  const lightVersion = "2026.1";
  const lightFramework = await AssessmentFramework.findOneAndUpdate(
    { version: lightVersion, assessmentType: "Light" },
    {
      version: lightVersion,
      assessmentType: "Light",
      status: "Published",
      title: "GRAICE Responsible AI Quick Online Questionnaire (Light Assessment)",
      description:
        "Rapid 30-question self-assessment (~5 minutes) producing a score out of 120 and preliminary maturity rating across the 7 GRAICE Pillars.",
      totalQuestions: lightQuestions.length,
      pillars: PILLARS_CONFIG,
      questions: lightQuestions,
      maturityThresholds: {
        initialMax: 30,     // 0 - 30
        emergingMax: 60,    // 31 - 60
        establishedMax: 90, // 61 - 90
        advancedMax: 120,   // 91 - 120
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(
    `[Seed] ✅ Light Assessment Framework seeded successfully (ID: ${lightFramework._id}, Version: ${lightFramework.version}, Questions: ${lightFramework.questions.length})`
  );
}

// Direct CLI execution
if (process.argv[1]?.endsWith("seedFramework.ts") || process.argv[1]?.endsWith("seedFramework.js")) {
  seedFrameworks()
    .then(() => {
      console.log("[Seed] All frameworks seeded successfully. Exiting.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("[Seed] Error seeding frameworks:", err);
      process.exit(1);
    });
}
