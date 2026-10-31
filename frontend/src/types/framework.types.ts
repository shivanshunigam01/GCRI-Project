export type AssessmentType = "Light" | "Full";
export type FrameworkStatus = "Draft" | "Published" | "Archived";

export interface ResponseOption {
  code: string;
  label: string;
  scoreValue: number;
  order: number;
}

export interface RegulatoryAlignments {
  euAiAct?: string;
  nistAiRmf?: string;
  iso42001?: string;
  oecdAi?: string;
}

export interface FrameworkQuestion {
  questionId: string;
  pillarId: string;
  pillarNumber: number;
  pillarName: string;
  section?: string;
  text: string;
  controlDescription?: string;
  testProcedure?: string;
  organizationScope?: string;
  linkedDocumentRequests?: string[];
  assuranceTier?: string;
  regulatoryAlignments?: RegulatoryAlignments;
  helpText?: string;
  remediationGuidance?: string;
  mandatory: boolean;
  isActive?: boolean;
  order: number;
  responseOptions: ResponseOption[];
}

export type Question = FrameworkQuestion;

export interface FrameworkPillar {
  pillarId: string;
  pillarNumber?: number;
  name: string;
  description: string;
  weight: number;
  order: number;
}

export interface MaturityThresholds {
  initialMax: number;
  emergingMax: number;
  establishedMax: number;
  advancedMax: number;
}

export interface AssessmentFramework {
  _id?: string;
  version: string;
  status: FrameworkStatus;
  assessmentType: AssessmentType;
  title?: string;
  description?: string;
  totalQuestions: number;
  pillars: FrameworkPillar[];
  questions: FrameworkQuestion[];
  maturityThresholds: MaturityThresholds;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateFrameworkDraftPayload {
  version: string;
  assessmentType: AssessmentType;
  title?: string;
  description?: string;
  baseVersion?: string;
}

export interface UpdateFrameworkMetadataPayload {
  title?: string;
  description?: string;
  maturityThresholds?: MaturityThresholds;
}

export interface AddPillarPayload {
  pillarId: string;
  name: string;
  description: string;
  weight?: number;
  pillarNumber?: number;
  order?: number;
}

export interface AddQuestionPayload {
  questionId: string;
  pillarId: string;
  pillarNumber: number;
  pillarName: string;
  section?: string;
  text: string;
  controlDescription?: string;
  testProcedure?: string;
  remediationGuidance?: string;
  organizationScope?: string;
  regulatoryAlignments?: RegulatoryAlignments;
  mandatory?: boolean;
  order?: number;
  responseOptions?: ResponseOption[];
}
