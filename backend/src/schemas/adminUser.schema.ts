import { z } from "zod";

export const AdminUserIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid User ObjectId"),
  }),
});

export const AdminUpdateUserSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid User ObjectId"),
  }),
  body: z.object({
    name: z.string().trim().min(1).optional(),
    phone: z.string().trim().optional(),
    companyId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Company ObjectId").nullable().optional(),
    // SuperAdmin cannot be assigned here — sole platform role is seed-only
    role: z.enum(["Admin", "Assessor", "MembershipApprover"]).optional(),
    status: z.enum(["Active", "Deactivated"]).optional(),
  }),
});
