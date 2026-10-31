import { apiClient } from "./apiClient";

export interface WebhookSubscriptionItem {
  _id: string;
  companyId: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface RegisterWebhookPayload {
  url: string;
  events?: string[];
  companyId?: string;
}

export interface RegisterWebhookResponse {
  message: string;
  webhook: {
    id: string;
    companyId: string;
    url: string;
    secret: string;
    events: string[];
    isActive: boolean;
    createdAt: string;
  };
}

export interface TestWebhookResult {
  message: string;
  result: {
    success: boolean;
    statusCode?: number;
    responseTimeMs?: number;
    error?: string;
  };
}

export const webhookService = {
  listWebhooks: (companyId?: string) =>
    apiClient.get<{ webhooks: WebhookSubscriptionItem[] }>("/webhooks", {
      params: companyId ? { companyId } : undefined,
    }),

  registerWebhook: (payload: RegisterWebhookPayload) =>
    apiClient.post<RegisterWebhookResponse>("/webhooks", payload),

  deleteWebhook: (id: string) =>
    apiClient.delete<{ message: string }>(`/webhooks/${id}`),

  testWebhook: (id: string) =>
    apiClient.post<TestWebhookResult>(`/webhooks/${id}/test`),
};
