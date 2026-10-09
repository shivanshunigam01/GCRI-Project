export type CompanyStatus = "Active" | "Suspended";
export type VerificationStatus = "Verified" | "Pending" | "Rejected";
export type AssessmentStatusType = "InProgress" | "Completed" | "NotStarted" | "Submitted";

export interface CompanyClientUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

export interface OrganizationAssessmentSummary {
  total: number;
  inProgress: number;
  completed: number;
  notStarted: number;
}

export interface OrganizationLatestAssessment {
  _id: string;
  assessmentType: "Full" | "Light" | "Full Assessment" | "Light Assessment";
  status: "InProgress" | "Submitted" | "Archived" | "NotStarted" | "Completed";
  createdAt: string;
  completionPercentage?: number;
  auditorName?: string;
}

export interface Company {
  _id: string;
  name: string;
  domain: string;
  registrationNumber?: string;
  country?: string;
  city?: string;
  industry?: string;
  size?: string;
  website?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  activePlan?: "Bronze" | "Silver" | "Gold";
  verificationStatus: VerificationStatus;
  status: CompanyStatus;
  clientUser?: CompanyClientUser | null;
  assessmentsSummary?: OrganizationAssessmentSummary;
  latestAssessment?: OrganizationLatestAssessment | null;
  verificationAuditTrail?: {
    verifiedAt?: string;
    verifiedBy?: string;
    notes?: string;
    dnsCheckResult?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CompanyCreatePayload {
  name: string;
  domain: string;
  registrationNumber?: string;
  country?: string;
  city?: string;
  industry?: string;
  size?: string;
  website?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  user?: {
    name: string;
    email: string;
    password?: string;
  };
}

export interface CompanyCreateResponseData {
  company: Company;
  user?: CompanyClientUser | null;
  verification: {
    dnsResolved: boolean;
    recordsFound: {
      aRecords?: string[];
      mxRecords?: string[];
    };
    notes: string;
  };
}
