import { apiClient } from "./apiClient";

export interface ApiKeyItem {
  _id: string;
  name: string;
  prefix: string;
  companyId: string | { _id: string; name: string; domain: string };
  role: string;
  permissions?: string[];
  expiresAt?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateApiKeyPayload {
  name: string;
  companyId: string;
  role?: string;
  expiresInDays?: number;
  permissions?: string[];
}

export interface CreateApiKeyResponse {
  message: string;
  apiKey: {
    id: string;
    name: string;
    prefix: string;
    rawKey: string;
    role: string;
    companyId: string;
    expiresAt?: string;
    createdAt: string;
  };
}

export const apiKeyService = {
  listApiKeys: (companyId?: string) =>
    apiClient.get<{ keys: ApiKeyItem[] }>("/admin/api-keys", {
      params: companyId ? { companyId } : undefined,
    }),

  createApiKey: (payload: CreateApiKeyPayload) =>
    apiClient.post<CreateApiKeyResponse>("/admin/api-keys", payload),

  revokeApiKey: (id: string) =>
    apiClient.delete<{ message: string }>(`/admin/api-keys/${id}`),
};
