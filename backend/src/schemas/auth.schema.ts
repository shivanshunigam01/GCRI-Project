import { z } from "zod";

export const RegisterSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    name: z.string().min(2, "Name must be at least 2 characters"),
    companyName: z.string().optional(),
    domain: z.string().optional(),
  }),
});

export const LoginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1, "Password is required"),
    mfaToken: z.string().optional(),
  }),
});

export const MfaVerifySchema = z.object({
  body: z.object({
    token: z.string().length(6, "Token must be 6 digits"),
  }),
});
