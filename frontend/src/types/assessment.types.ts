import { Company } from "./company.types";
import { User } from "./auth.types";

export type AssessmentType = "Light" | "Full";
export type AssessmentStatus = "Draft" | "InProgress" | "Submitted" | "Completed";
export type AnswerResponse = "Pass" | "Fail" | "Exception" | "N/A";

export interface AnswerItem {
  questionId: string;
  response: AnswerResponse;
  notes?: string;
  failureReason?: string;
  evidenceUrls?: string[];
  answeredAt?: string;
}

export interface PillarScore {
  pillarId: string;
  score: number;
  maxScore: number;
  percentage: number;
}

export interface ScoreSnapshot {
  totalScore: number;
  maxScore: number;
  overallPercentage: number;
  maturityTier: string;
  pillarScores: PillarScore[];
  calculatedAt: string;
}

export interface AssessmentSession {
  _id: string;
  companyId: string | Company;
  auditorId?: string | User;
  conductedByUserId?: { _id: string; name: string; email: string } | User | string;
  frameworkVersionId?: string;
  assessmentType: AssessmentType;
  status: AssessmentStatus;
  answers: AnswerItem[];
  scoreSnapshot?: ScoreSnapshot;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Finding {
  _id?: string;
  questionId: string;
  pillarId: string;
  title: string;
  severity: "High" | "Medium" | "Low";
  status: "Open" | "In_Remediation" | "Resolved";
  recommendation: string;
  notes?: string;
}
