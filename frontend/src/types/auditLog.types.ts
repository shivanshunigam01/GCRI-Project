export interface AuditLogActor {
  _id: string;
  name: string;
  email: string;
  role?: string;
}

export interface AuditLogEntry {
  _id: string;
  actorId?: string | AuditLogActor;
  actorEmail?: string;
  action: string;
  entity: string;
  entityId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export interface AuditLogStats {
  totalEvents: number;
  eventsLast24Hours: number;
  authorizationDenialsCount: number;
  topActions: { action: string; count: number }[];
  topEntities: { entity: string; count: number }[];
}

export interface AuditLogQueryParams {
  [key: string]: string | number | boolean | undefined;
  page?: number;
  limit?: number;
  actorId?: string;
  actorEmail?: string;
  action?: string;
  entity?: string;
  entityId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}
