import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const CreateTenantSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, "Tenant name must be at least 2 characters").max(120),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens")
      .optional(),
    tenantAdmin: z
      .object({
        name: z.string().trim().min(2, "Tenant Admin name must be at least 2 characters"),
        email: z.string().trim().toLowerCase().email("Valid Tenant Admin email is required"),
      })
      .optional(),
  }),
});

export const AssignTenantAdminSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid Tenant ID format"),
  }),
  body: z.object({
    name: z.string().trim().min(2, "Tenant Admin name must be at least 2 characters").max(100),
    email: z.string().trim().toLowerCase().email("Valid Tenant Admin email is required"),
  }),
});

export const UpdateTenantStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid Tenant ID format"),
  }),
  body: z.object({
    status: z.enum(["Active", "Suspended", "Retired"], {
      message: "Status must be Active, Suspended, or Retired",
    }),
    reason: z.string().trim().max(500).optional(),
  }),
});

export const TenantParamSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid Tenant ID format"),
  }),
});

