import { z } from "zod";

export const AdminDashboardAssessmentsQuerySchema = z.object({
  query: z.object({
    status: z.enum(["all", "InProgress", "Submitted", "Archived"]).optional().default("all"),
    search: z.string().trim().optional(),
    assessmentType: z.enum(["all", "Light", "Full"]).optional().default("all"),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
});

export const AuditorDashboardAssessmentsQuerySchema = z.object({
  query: z.object({
    status: z.enum(["all", "InProgress", "Submitted", "Archived"]).optional().default("all"),
    organizationId: z.string().trim().optional(),
    assessmentType: z.enum(["all", "Light", "Full"]).optional().default("all"),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
});
