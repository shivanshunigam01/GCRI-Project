export interface AuditLogEntry {
  _id: string;
  userId?: string | { _id: string; name: string; email: string };
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export interface AuditLogStats {
  totalEvents24h: number;
  deniedAccess24h: number;
  topActions: { action: string; count: number }[];
}
