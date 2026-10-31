import { apiClient } from "./apiClient";
import { AuditLogEntry, AuditLogStats, AuditLogQueryParams } from "@/types/auditLog.types";

export const auditLogService = {
  getAuditLogs: (params?: AuditLogQueryParams) =>
    apiClient.get<AuditLogEntry[]>("/admin/audit-logs", { params }),

  getAuditLogStats: () =>
    apiClient.get<AuditLogStats>("/admin/audit-logs/stats"),
};
