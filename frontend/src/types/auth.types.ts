export type UserRole = "SuperAdmin" | "Admin" | "Assessor" | "MembershipApprover";
export type UserStatus = "Active" | "Deactivated";
export type AuthProvider = "credentials" | "google" | "microsoft";

export interface UserCompany {
  _id: string;
  name: string;
  domain?: string;
  verificationStatus?: string;
  status?: string;
}

export interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  isActive?: boolean;
  authProvider?: AuthProvider;
  mfa: {
    enabled: boolean;
  };
  mfaEnabled?: boolean;
  companyId?: string | UserCompany | null;
  invitationExpires?: string;
  lockUntil?: string;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginResponse {
  token?: string;
  user?: User;
  mfaRequired?: boolean;
  mfaSetupRequired?: boolean;
  tempToken?: string;
  mfaToken?: string;
  userId?: string;
}

export interface MfaVerifyResponse {
  token: string;
  user: User;
  recoveryCodes?: string[];
}

export interface SetupMfaResponse {
  secret: string;
  qrCodeUrl: string;
  issuer: string;
  account: string;
}

export interface InviteUserPayload {
  name: string;
  email: string;
  role: UserRole;
  companyId?: string;
}

export interface AdminUpdateUserPayload {
  name?: string;
  phone?: string;
  companyId?: string | null;
  role?: UserRole;
  status?: UserStatus;
}
