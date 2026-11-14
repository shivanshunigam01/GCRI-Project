import { apiClient } from "./apiClient";
import type {
  AssignTenantAdminPayload,
  CreateTenantPayload,
  CreateTenantResponse,
  MyTenantsResponse,
  TenantRecord,
  UpdateTenantStatusPayload,
} from "@/types/tenant.types";

export const tenantService = {
  getMyTenants: () => apiClient.get<MyTenantsResponse>("/tenants/my"),

  listTenants: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) => apiClient.get<TenantRecord[]>("/tenants", { params }),

  getTenantById: (id: string) => apiClient.get<TenantRecord>(`/tenants/${id}`),

  createTenant: (payload: CreateTenantPayload) =>
    apiClient.post<CreateTenantResponse>("/tenants", payload),

  assignTenantAdmin: (tenantId: string, payload: AssignTenantAdminPayload) =>
    apiClient.post<{ message: string; user: Record<string, unknown> }>(
      `/tenants/${tenantId}/assign-admin`,
      payload
    ),

  updateTenantStatus: (tenantId: string, payload: UpdateTenantStatusPayload) =>
    apiClient.patch<TenantRecord>(`/tenants/${tenantId}/status`, payload),
};