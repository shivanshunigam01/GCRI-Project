import { z } from "zod";

export const AuditLogQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    actorId: z.string().optional(),
    actorEmail: z.string().optional(),
    action: z.string().optional(),
    entity: z.string().optional(),
    entityId: z.string().optional(),
    startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
    endDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
    search: z.string().optional(),
  }),
});
