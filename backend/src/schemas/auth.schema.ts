import { z } from "zod";

export const RegisterSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    name: z.string().min(2, "Name must be at least 2 characters"),
    companyName: z.string().optional(),
    domain: z.string().optional(),
  }),
});

export const LoginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
    mfaToken: z.string().optional(),
  }),
});

export const MfaVerifySchema = z.object({
  body: z.object({
    token: z.string().length(6, "Verification token must be exactly 6 digits"),
  }),
});

export const MfaDisableSchema = z.object({
  body: z.object({
    password: z.string().min(1, "Current password is required to disable MFA"),
    token: z.string().length(6, "Current 6-digit MFA code is required"),
  }),
});

export const ForgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
  }),
});

export const ResetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, "Reset token is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
  }),
});

export const ChangePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
  }),
});
