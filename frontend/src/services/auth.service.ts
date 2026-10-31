import { apiClient } from "./apiClient";
import { LoginResponse, MfaVerifyResponse } from "@/types/auth.types";

export const authService = {
  login: (credentials: { email: string; password: string; mfaToken?: string }) =>
    apiClient.post<LoginResponse>("/auth/login", credentials),

  verifyMfa: (payload: { mfaToken: string; code: string }) =>
    apiClient.post<MfaVerifyResponse>("/auth/mfa/verify", payload),

  forgotPassword: (email: string) =>
    apiClient.post("/auth/forgot-password", { email }),

  resetPassword: (payload: { token: string; newPassword: string }) =>
    apiClient.post("/auth/reset-password", payload),

  setupMfa: () =>
    apiClient.post<{ secret: string; qrCode: string; backupCodes: string[] }>("/auth/mfa/setup"),

  disableMfa: (code: string) =>
    apiClient.post("/auth/mfa/disable", { code }),
};
