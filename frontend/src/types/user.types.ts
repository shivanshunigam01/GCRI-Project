import { UserRole, UserStatus } from "./auth.types";

export interface CompanySummary {
  _id: string;
  name: string;
  domain: string;
  verificationStatus?: string;
  status?: string;
}

export interface UserItem {
  _id: string;
  id?: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  phone?: string;
  companyId?: string | CompanySummary | null;
  mfa?: {
    enabled: boolean;
  };
  createdAt?: string;
  lastLogin?: string;
}

export interface UserFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  companyId?: string;
}

export interface UserListResponseData {
  users: UserItem[];
  total: number;
  page: number;
  totalPages: number;
}

export interface UserInvitePayload {
  email: string;
  name: string;
  role: UserRole;
  companyId?: string;
}

export interface UserInviteResponseData {
  message: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    companyId?: string;
    invitationExpires: string;
  };
  invitationToken: string;
}

export interface AcceptInvitePayload {
  token: string;
  password: string;
}

export interface UpdateProfilePayload {
  name?: string;
  phone?: string;
}
