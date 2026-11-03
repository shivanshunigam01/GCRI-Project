import { MaturityLevel } from "../../models/AssessmentSession.js";

export interface ReportRegulatoryAlignments {
  euAiAct?: string;
  nistAiRmf?: string;
  iso42001?: string;
  oecdAi?: string;
}

export interface ReportPillarProgress {
  pillarId: string;
  pillarNumber?: number;
  pillarName: string;
  notStarted: number;
  inProgress: number;
  complete: number;
  total: number;
  completionPercentage: number;
  exceptionsNoted: number;
  noExceptions: number;
}

export interface ReportKpis {
  controlsAssessed: number;
  completionPercentage: number;
  exceptionsNoted: number;
  notYetAssessed: number;
  overallScore?: number;
  maxPossibleScore?: number;
  overallPercentage?: number;
  maturityLevel?: MaturityLevel;
  totalControls: number;
}

export interface ReportControlEvaluation {
  questionId: string;
  pillarId: string;
  pillarNumber: number;
  pillarName: string;
  assuranceTier: string;
  testStatus: string;
  exceptionStatus: string;
  isGap: boolean;
  questionText: string;
  controlDescription?: string;
  testProcedure?: string;
  testProcedureSteps: string[];
  linkedDocumentTitles: string[];
  linkedMeetingTopics: string[];
  testerName: string;
  testDate: string;
  workPaperReference?: string;
  evidenceNotes?: string;
  evidenceReference?: string;
  findings: string;
  recommendation: string;
  priority?: "High" | "Medium";
  regulatoryAlignments?: ReportRegulatoryAlignments;
}

export interface ReportRemediationItem {
  controlId: string;
  pillarName: string;
  pillarNumber: number;
  finding: string;
  priority: "High" | "Medium";
  recommendedAction: string;
  regulatoryAlignments?: ReportRegulatoryAlignments;
  responsibleOwner?: string;
  targetDate?: string;
}

export interface GraiceReportData {
  assessmentId: string;
  assessmentReference: string;
  organizationName: string;
  assessmentTitle: string;
  assessmentType: "Light" | "Full";
  statusLabel: string;
  organizationScope: string;
  frameworkVersion: string;
  frameworkTitle?: string;
  generatedAt: string;
  submittedAt?: string;
  auditorName: string;
  executiveNarrative: string;
  whyInvestNarrative: string;
  whyInvestBullets: string[];
  kpis: ReportKpis;
  pillarProgress: ReportPillarProgress[];
  gapCount: number;
  controls: ReportControlEvaluation[];
  remediation: ReportRemediationItem[];
}
