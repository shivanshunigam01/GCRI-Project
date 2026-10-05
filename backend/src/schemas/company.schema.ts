import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const CreateCompanySchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, "Company name must be at least 2 characters").max(120),
    domain: z
      .string()
      .trim()
      .toLowerCase()
      .min(3, "Domain must be at least 3 characters")
      .regex(
        /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/,
        "Please provide a valid domain name"
      ),
    registrationNumber: z.string().trim().max(60).optional(),
    country: z.string().trim().min(2).max(100).optional(),
    industry: z.string().trim().min(2).max(100).optional(),
  }),
});

export const UpdateCompanySchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid Company ID format"),
  }),
  body: z.object({
    name: z.string().trim().min(2).max(120).optional(),
    registrationNumber: z.string().trim().max(60).optional(),
    country: z.string().trim().min(2).max(100).optional(),
    industry: z.string().trim().min(2).max(100).optional(),
  }),
});

export const VerifyCompanySchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid Company ID format"),
  }),
  body: z.object({
    verificationStatus: z.enum(["Verified", "Pending", "Rejected"], {
      message: "Status must be Verified, Pending, or Rejected",
    }),
    notes: z.string().trim().max(500).optional(),
  }),
});

export const UpdateCompanyStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid Company ID format"),
  }),
  body: z.object({
    status: z.enum(["Active", "Suspended"], {
      message: "Status must be Active or Suspended",
    }),
    reason: z.string().trim().max(500).optional(),
  }),
});

export const CompanyParamSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid Company ID format"),
  }),
});
