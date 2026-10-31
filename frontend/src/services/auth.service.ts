import { apiClient } from "./apiClient";
import {
  LoginResponse,
  MfaVerifyResponse,
  SetupMfaResponse,
  User,
} from "@/types/auth.types";

export const authService = {
  login: (credentials: { email: string; password: string; mfaToken?: string }) =>
    apiClient.post<LoginResponse>("/auth/login", credentials),

  verifyMfa: (payload: { token: string }) =>
    apiClient.post<MfaVerifyResponse>("/auth/mfa/verify", payload),

  setupMfa: () =>
    apiClient.post<SetupMfaResponse>("/auth/mfa/generate"),

  disableMfa: (payload: { password: string; token: string }) =>
    apiClient.post<{ message: string }>("/auth/mfa/disable", payload),

  forgotPassword: (email: string) =>
    apiClient.post<{ message: string }>("/auth/forgot-password", { email }),

  resetPassword: (payload: { token: string; newPassword: string }) =>
    apiClient.post<{ message: string }>("/auth/reset-password", payload),

  changePassword: (payload: { currentPassword: string; newPassword: string }) =>
    apiClient.post<{ message: string }>("/auth/change-password", payload),

  oauthGoogle: (payload: { idToken: string; mock?: boolean; email?: string; name?: string }) =>
    apiClient.post<{ token: string; user: User }>("/auth/oauth/google", payload),

  oauthMicrosoft: (payload: { idToken: string; mock?: boolean; email?: string; name?: string }) =>
    apiClient.post<{ token: string; user: User }>("/auth/oauth/microsoft", payload),
};
