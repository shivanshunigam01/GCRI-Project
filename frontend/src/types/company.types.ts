export type CompanyStatus = "Active" | "Suspended";
export type VerificationStatus = "Verified" | "Pending" | "Rejected";
export type SubscriptionTier = "Bronze" | "Silver" | "Gold";

export interface ClientUserSummary {
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: string;
}

export interface VerificationAuditTrail {
  verifiedAt?: string;
  verifiedBy?: string;
  notes?: string;
  dnsCheckResult?: boolean;
}

export interface Company {
  _id: string;
  name: string;
  domain: string;
  registrationNumber?: string;
  country?: string;
  industry?: string;
  size?: string;
  status: CompanyStatus;
  verificationStatus: VerificationStatus;
  activePlan: SubscriptionTier;
  clientUser?: ClientUserSummary | null;
  verificationAuditTrail?: VerificationAuditTrail;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCompanyPayload {
  name: string;
  domain: string;
  registrationNumber?: string;
  country?: string;
  industry?: string;
  size?: string;
  activePlan?: SubscriptionTier;
  user?: {
    name?: string;
    email: string;
    password?: string;
  };
}

export interface UpdateCompanyPayload {
  name?: string;
  registrationNumber?: string;
  country?: string;
  industry?: string;
}

export interface VerifyCompanyPayload {
  verificationStatus: VerificationStatus;
  notes?: string;
}

export interface UpdateCompanyStatusPayload {
  status: CompanyStatus;
  reason?: string;
}

export interface CompanyPillarTrend {
  pillarId: string;
  pillarName: string;
  percentage: number;
}

export interface CompanyTrendHistoryItem {
  assessmentId: string;
  assessmentType: "Light" | "Full";
  frameworkVersion: string;
  submittedAt?: string;
  overallPercentage: number;
  maturityLevel: string;
  controlsAssessed: number;
  exceptionsNoted: number;
  pillarScores: CompanyPillarTrend[];
}

export interface CompanyTrendsResponse {
  company: {
    _id: string;
    name: string;
    domain: string;
    activePlan: SubscriptionTier;
  };
  totalCompletedAssessments: number;
  progressionDeltaPercentage: number;
  history: CompanyTrendHistoryItem[];
}
