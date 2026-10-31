import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const AssignAuditorSchema = z.object({
  body: z.object({
    organizationId: z.string().regex(objectIdRegex, "Invalid Organization ID format"),
    auditorId: z.string().regex(objectIdRegex, "Invalid Auditor ID format"),
  }),
});

export const AuditorParamSchema = z.object({
  params: z.object({
    auditorId: z.string().regex(objectIdRegex, "Invalid Auditor ID format"),
  }),
});

export const OrganizationParamSchema = z.object({
  params: z.object({
    organizationId: z.string().regex(objectIdRegex, "Invalid Organization ID format"),
  }),
});

export const MappingIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid Mapping ID format"),
  }),
});
