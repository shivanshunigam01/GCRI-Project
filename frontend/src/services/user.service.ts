import { apiClient } from "./apiClient";
import {
  User,
  UserRole,
  UserStatus,
  InviteUserPayload,
  AdminUpdateUserPayload,
} from "@/types/auth.types";

export interface InviteUserResponse {
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

export interface AdminResetPasswordResponse {
  message: string;
  resetToken: string;
  resetUrl: string;
  expiresAt: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export const userService = {
  getCurrentUser: () =>
    apiClient.get<User>("/users/me"),

  getUsers: (params?: {
    page?: number;
    limit?: number;
    role?: string;
    status?: string;
    search?: string;
    companyId?: string;
  }) =>
    apiClient.get<User[]>("/users", { params }),

  getUserById: (id: string) =>
    apiClient.get<User>(`/users/${id}`),

  inviteUser: (payload: InviteUserPayload) =>
    apiClient.post<InviteUserResponse>("/users/invite", payload),

  acceptInvite: (payload: { token: string; password: string }) =>
    apiClient.post("/users/accept-invite", payload),

  registerDirectUser: (payload: {
    name: string;
    email: string;
    password: string;
    role: string;
  }) =>
    apiClient.post("/auth/register", payload),

  updateUserStatus: (id: string, status: UserStatus) =>
    apiClient.patch<{ message: string; user: { id: string; email: string; status: UserStatus } }>(
      `/users/${id}/status`,
      { status }
    ),

  updateUserRole: (id: string, role: UserRole) =>
    apiClient.patch<{ message: string; user: { id: string; email: string; role: UserRole } }>(
      `/users/${id}/role`,
      { role }
    ),

  adminUpdateUser: (id: string, payload: AdminUpdateUserPayload) =>
    apiClient.patch<{ message: string; user: User }>(`/users/${id}`, payload),

  adminResetPassword: (id: string) =>
    apiClient.post<AdminResetPasswordResponse>(`/users/${id}/reset-password`),
};

