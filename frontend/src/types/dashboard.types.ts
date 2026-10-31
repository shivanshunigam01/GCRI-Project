import { Company } from "./company.types";
import { User } from "./auth.types";
import { ScoreSnapshot } from "./assessment.types";

// ==========================================
// Auditor Dashboard Types
// ==========================================

export interface AuditorDashboardStats {
  totalAssessments: number;
  inProgressAssessments: number;
  completedAssessments: number;
  totalFindings: number;
  assignedOrganizations: number;
}

export interface AuditorPillarPerformance {
  pillarId: string;
  pillarNumber: number;
  name: string;
  completionPercentage: number;
}

export interface AuditorAssessmentTypes {
  total: number;
  fullCount: number;
  fullPercentage: number;
  lightCount: number;
  lightPercentage: number;
}

export interface AuditorOrganizationSummary {
  _id: string;
  name: string;
  industry: string;
  status: string;
  assessmentCount: number;
}

export interface AuditorLatestFinding {
  findingId: string;
  controlId: string;
  title: string;
  organizationName: string;
  severity: "High" | "Medium" | "Low";
  status: string;
}

export interface AuditorActiveAssessment {
  _id: string;
  organizationName: string;
  assessmentType: "Light" | "Full";
  completionPercentage: number;
  resumptionAid: {
    currentPillarId: string;
    currentPillarName: string;
    currentQuestionIndex: number;
  };
}

export interface AuditorDashboardSummary {
  stats: AuditorDashboardStats;
  overallCompletionPercentage: number;
  pillarPerformance: AuditorPillarPerformance[];
  assessmentTypes: AuditorAssessmentTypes;
  myOrganizations: AuditorOrganizationSummary[];
  latestFindings: AuditorLatestFinding[];
  activeAssessments: AuditorActiveAssessment[];
}

export interface AuditorAssessmentsItem {
  _id: string;
  organization: Company;
  assessmentType: "Light" | "Full";
  status: "InProgress" | "Submitted" | "Archived";
  completionPercentage: number;
  clientContact?: {
    name: string;
    email: string;
    phone?: string;
    title?: string;
  };
  scoreSnapshot?: ScoreSnapshot;
  resumptionAid: {
    currentQuestionIndex: number;
    currentPillarId: string;
  };
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
}

export interface AuditorOrgDrawerAssessment {
  _id: string;
  assessmentType: "Light" | "Full";
  status: "InProgress" | "Submitted" | "Archived";
  createdAt: string;
  completionPercentage: number;
}

export interface AuditorOrganizationItem {
  _id: string;
  name: string;
  domain: string;
  industry: string;
  country?: string;
  status: "Active" | "Suspended";
  activePlan: "Bronze" | "Silver" | "Gold";
  size?: string;
  assessmentsSummary: {
    total: number;
    inProgress: number;
    completed: number;
    notStarted: number;
  };
  latestAssessment?: AuditorOrgDrawerAssessment | null;
}

// ==========================================
// Admin Dashboard Types
// ==========================================

export interface AdminDashboardStats {
  totalUsers: number;
  totalAuditors: number;
  totalOrganizations: number;
  totalAssessments: number;
  frameworkVersions: number;
  pillarsCount: number;
  controlsCount: number;
  questionsCount: number;
  evidenceItemsCount: number;
  reportsCount: number;
  activeSubscriptions: number;
  permissionRolesCount: number;
}

export interface AdminAssessmentsByStatus {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  overdue: number;
}

export interface AdminSubscriptionDistribution {
  total: number;
  bronze: number;
  silver: number;
  gold: number;
}

export interface AdminRecentOrganization {
  _id: string;
  name: string;
  activePlan: string;
  assessmentCount: number;
  userCount: number;
  status: string;
  createdAt: string;
}

export interface AdminRecentActivity {
  id: string;
  title: string;
  description: string;
  type: string;
  timestamp: string;
}

export interface AdminDashboardSummary {
  stats: AdminDashboardStats;
  assessmentsByStatus: AdminAssessmentsByStatus;
  subscriptionDistribution: AdminSubscriptionDistribution;
  recentOrganizations: AdminRecentOrganization[];
  recentActivity: AdminRecentActivity[];
}

export interface AdminAssessmentItem {
  _id: string;
  organization: Company;
  auditor: User;
  assessmentType: "Light" | "Full";
  status: "InProgress" | "Submitted" | "Archived";
  clientContact?: {
    name: string;
    email: string;
    phone?: string;
    title?: string;
  };
  frameworkVersion: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
}
