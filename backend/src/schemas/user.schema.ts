import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const UpdateProfileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(100).optional(),
    phone: z.string().trim().max(30).optional(),
  }),
});

export const InviteUserSchema = z.object({
  body: z.object({
    email: z.string().trim().email("Invalid email address").toLowerCase(),
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
    role: z.enum(["SuperAdmin", "Admin", "Assessor", "MembershipApprover"], {
      message: "Role must be SuperAdmin, Admin, Assessor, or MembershipApprover",
    }),
    companyId: z.string().regex(objectIdRegex, "Invalid Company ID format").optional(),
  }),
});

export const AcceptInviteSchema = z.object({
  body: z.object({
    token: z.string().trim().min(10, "Invitation token is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
  }),
});

export const UpdateUserStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid User ID format"),
  }),
  body: z.object({
    status: z.enum(["Active", "Deactivated"], {
      message: "Status must be Active or Deactivated",
    }),
  }),
});

export const UpdateUserRoleSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid User ID format"),
  }),
  body: z.object({
    role: z.enum(["SuperAdmin", "Admin", "Assessor", "MembershipApprover"], {
      message: "Role must be SuperAdmin, Admin, Assessor, or MembershipApprover",
    }),
  }),
});

export const UserParamSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid User ID format"),
  }),
});
