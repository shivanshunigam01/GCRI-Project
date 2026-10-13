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

export interface Company {
  _id: string;
  name: string;
  domain: string;
  registrationNumber?: string;
  country?: string;
  industry?: string;
  size?: string;
  status: CompanyStatus;
  verificationStatus?: VerificationStatus;
  dnsVerificationStatus?: VerificationStatus;
  activePlan?: SubscriptionTier;
  subscriptionTier?: SubscriptionTier;
  clientUser?: ClientUserSummary | null;
  verificationAuditTrail?: {
    verifiedAt?: string;
    verifiedBy?: string;
    notes?: string;
    dnsCheckResult?: boolean;
  };
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
  subscriptionTier?: SubscriptionTier;
}
