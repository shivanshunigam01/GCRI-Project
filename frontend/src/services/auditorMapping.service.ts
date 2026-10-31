import { apiClient } from "./apiClient";
import {
  AuditorOrganizationMapping,
  CreateAuditorMappingPayload,
  OrgAuditorsResponse,
} from "@/types/auditorMapping.types";

export const auditorMappingService = {
  createMapping: (payload: CreateAuditorMappingPayload) =>
    apiClient.post<AuditorOrganizationMapping>("/admin/auditor-mappings", payload),

  getAllMappings: (params?: { page?: number; limit?: number; status?: string; organizationId?: string; auditorId?: string }) =>
    apiClient.get<{ mappings: AuditorOrganizationMapping[]; pagination: any }>("/admin/auditor-mappings", { params }),

  getMappingsByOrg: (orgId: string) =>
    apiClient.get<OrgAuditorsResponse>(`/admin/auditor-mappings/org/${orgId}`),

  getMappingsByAuditor: (auditorId: string) =>
    apiClient.get<AuditorOrganizationMapping[]>(`/admin/auditor-mappings/auditor/${auditorId}`),

  deleteMapping: (id: string) =>
    apiClient.delete(`/admin/auditor-mappings/${id}`),
};
