import { Company } from "./company.types";
import { User } from "./auth.types";

export type AssessmentType = "Light" | "Full";
export type AssessmentStatus = "InProgress" | "Submitted" | "Archived";
export type MaturityLevel = "Initial" | "Emerging" | "Established" | "Advanced";
export type TestStatus = "NotStarted" | "InProgress" | "Complete";
export type ExceptionStatus = "NoExceptionNoted" | "ExceptionNoted" | "NotAssessed";

export interface ClientContact {
  name: string;
  email: string;
  phone?: string;
  title?: string;
}

export interface ReportMetadata {
  fileName: string;
  filePath?: string;
  fileUrl: string;
  fileSizeBytes: number;
  generatedAt: string;
  generatedByUserId: string;
  checksum: string;
  storageType: "s3" | "local";
}

export interface AnswerItem {
  questionId: string;
  pillarId: string;
  pillarNumber?: number;
  testStatus?: TestStatus;
  exceptionStatus?: ExceptionStatus;
  selectedOptionCode?: string;
  scoreValue?: number;
  workPaperReference?: string;
  evidenceNotes?: string;
  evidenceAttachmentUrl?: string;
  s3Key?: string;
  testedByUserId?: string | User;
  answeredAt?: string;
}

export interface PillarScore {
  pillarId: string;
  pillarName: string;
  pillarNumber?: number;
  scoreEarned: number;
  scoreMax: number;
  percentage: number;
  exceptionsNoted?: number;
  noExceptionsNoted?: number;
  notAssessed?: number;
  totalControls?: number;
  compliancePercentage?: number;
}

export interface ScoreSnapshot {
  overallScore: number;
  maxPossibleScore: number;
  overallPercentage: number;
  totalExceptionsNoted?: number;
  totalNoExceptionsNoted?: number;
  totalNotAssessed?: number;
  totalControlsAssessed?: number;
  compliancePercentage?: number;
  maturityLevel: MaturityLevel;
  pillarScores: PillarScore[];
  calculatedAt: string;
}

export interface AssessmentSession {
  _id: string;
  companyId: string | Company;
  conductedByUserId: string | { _id: string; name: string; email: string; role?: string };
  frameworkVersion: string;
  assessmentType: AssessmentType;
  status: AssessmentStatus;
  clientContact?: ClientContact;
  answers: AnswerItem[];
  scoreSnapshot?: ScoreSnapshot;
  reportMetadata?: ReportMetadata;
  resumptionAid?: {
    currentPillarId?: string;
    currentPillarName?: string;
    currentQuestionIndex?: number;
    currentQuestionId?: string;
  };
  dueDate?: string;
  targetCompletionDate?: string;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssessmentPayload {
  companyId: string;
  assessmentType: AssessmentType;
  frameworkVersion?: string;
  clientContact?: ClientContact;
}

export interface SaveAnswerItemInput {
  questionId: string;
  pillarId?: string;
  testStatus?: TestStatus;
  exceptionStatus?: ExceptionStatus;
  selectedOptionCode?: string;
  scoreValue?: number;
  workPaperReference?: string;
  evidenceNotes?: string;
  evidenceAttachmentUrl?: string;
  s3Key?: string;
}

export interface SaveAnswersPayload {
  answers: SaveAnswerItemInput[];
}

export interface Finding {
  findingId: string;
  title: string;
  pillarId: string;
  pillarName: string;
  controlId: string;
  questionText: string;
  severity: "High" | "Medium" | "Low";
  status: "Open" | "In Progress" | "Resolved";
  organizationName: string;
  evidenceAttachmentUrl?: string;
  evidenceNotes?: string;
  regulatoryAlignments?: {
    euAiAct?: string;
    nistAiRmf?: string;
    iso42001?: string;
    oecdAi?: string;
  };
  recommendedAction: string;
}

export interface AssessmentFindingsResponse {
  assessmentId: string;
  totalFindings: number;
  summary: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
  };
  findings: Finding[];
}

export interface AssessmentRecommendation {
  recommendationId: string;
  questionId: string;
  pillarId: string;
  pillarName: string;
  controlText: string;
  priority: "High" | "Medium";
  regulatoryAlignments?: {
    euAiAct?: string;
    nistAiRmf?: string;
    iso42001?: string;
    oecdAi?: string;
  };
  evidenceNotes?: string;
  recommendedAction: string;
}

export interface AssessmentRecommendationsResponse {
  assessmentId: string;
  totalRecommendations: number;
  recommendations: AssessmentRecommendation[];
}

export interface AssessmentSummaryResponse {
  assessmentId: string;
  organization: Company | { _id: string; name: string; domain: string };
  assessmentType: AssessmentType;
  status: AssessmentStatus;
  frameworkVersion: string;
  clientContact?: ClientContact;
  overallScore: number;
  maxPossibleScore: number;
  overallPercentage: number;
  compliancePercentage?: number;
  maturityLevel: MaturityLevel;
  totalExceptionsNoted: number;
  totalNoExceptionsNoted: number;
  totalNotAssessed: number;
  totalControlsAssessed: number;
  submittedAt?: string;
  calculatedAt: string;
}

export interface AssessmentPillarsResponse {
  assessmentId: string;
  assessmentType: AssessmentType;
  maturityLevel: MaturityLevel;
  pillars: {
    pillarId: string;
    pillarNumber?: number;
    pillarName: string;
    scoreEarned: number;
    scoreMax: number;
    percentage: number;
    compliancePercentage?: number;
    exceptionsNoted: number;
    noExceptionsNoted: number;
    notAssessed: number;
    totalControls: number;
  }[];
}

export interface AssessmentProgressResponse {
  assessmentId: string;
  overallPercentage: number;
  answeredCount: number;
  totalCount: number;
  pillarProgress: {
    pillarId: string;
    pillarNumber?: number;
    pillarName: string;
    totalQuestions: number;
    completedQuestions: number;
    inProgressQuestions: number;
    notStartedQuestions: number;
    exceptionsNoted: number;
    completionPercentage: number;
  }[];
}
