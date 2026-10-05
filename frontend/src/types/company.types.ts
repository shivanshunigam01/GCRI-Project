export type CompanyStatus = "Active" | "Suspended";
export type VerificationStatus = "Verified" | "Pending" | "Rejected";

export interface CompanyClientUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

export interface Company {
  _id: string;
  name: string;
  domain: string;
  registrationNumber?: string;
  country?: string;
  industry?: string;
  verificationStatus: VerificationStatus;
  status: CompanyStatus;
  clientUser?: CompanyClientUser | null;
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
  industry?: string;
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
