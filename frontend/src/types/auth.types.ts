export type UserRole = "Admin" | "Assessor" | "MembershipApprover";
export type UserStatus = "Active" | "Deactivated";

export interface User {
  id: string;
  userId?: string;
  email: string;
  name: string;
  role: UserRole;
  status?: UserStatus;
  phone?: string;
  companyId?: string | {
    _id: string;
    name: string;
    domain: string;
    verificationStatus?: string;
    status?: string;
  };
  mfaEnabled?: boolean;
  mfa?: {
    enabled: boolean;
  };
  createdAt?: string;
  lastLogin?: string;
}

export interface LoginResponseData {
  token: string;
  user: User;
}

export interface RegisterResponseData {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface MfaSetupData {
  secret: string;
  qrCodeUrl: string;
  issuer: string;
  account: string;
}

export interface MfaVerifyData {
  message: string;
  recoveryCodes: string[];
}
