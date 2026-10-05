import { apiClient } from "@/services/apiClient";
import {
  LoginResponseData,
  RegisterResponseData,
  MfaSetupData,
  MfaVerifyData,
} from "@/types/auth.types";
import { ApiResponse } from "@/types/api.types";

export const authService = {
  login: async (credentials: {
    email: string;
    password: string;
    mfaToken?: string;
  }): Promise<ApiResponse<LoginResponseData>> => {
    return apiClient<LoginResponseData>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  },

  register: async (payload: {
    email: string;
    password: string;
    name: string;
    companyName?: string;
    domain?: string;
  }): Promise<ApiResponse<RegisterResponseData>> => {
    return apiClient<RegisterResponseData>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  generateMfa: async (): Promise<ApiResponse<MfaSetupData>> => {
    return apiClient<MfaSetupData>("/auth/mfa/generate", {
      method: "POST",
    });
  },

  verifyMfa: async (token: string): Promise<ApiResponse<MfaVerifyData>> => {
    return apiClient<MfaVerifyData>("/auth/mfa/verify", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  },

  disableMfa: async (payload: {
    password: string;
    token: string;
  }): Promise<ApiResponse<{ message: string }>> => {
    return apiClient<{ message: string }>("/auth/mfa/disable", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  forgotPassword: async (email: string): Promise<ApiResponse<{ message: string }>> => {
    return apiClient<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  resetPassword: async (payload: {
    token: string;
    newPassword: string;
  }): Promise<ApiResponse<{ message: string }>> => {
    return apiClient<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  changePassword: async (payload: {
    currentPassword: string;
    newPassword: string;
  }): Promise<ApiResponse<{ message: string }>> => {
    return apiClient<{ message: string }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
