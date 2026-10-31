import { apiClient } from "./apiClient";
import { AuditLogEntry, AuditLogStats } from "@/types/auditLog.types";

export const auditLogService = {
  getAuditLogs: (params?: { page?: number; limit?: number; action?: string; resource?: string }) =>
    apiClient.get<AuditLogEntry[]>("/admin/audit-logs", { params }),

  getAuditLogStats: () =>
    apiClient.get<AuditLogStats>("/admin/audit-logs/stats"),
};
