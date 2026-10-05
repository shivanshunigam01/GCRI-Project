import rateLimit from "express-rate-limit";
import { Request, Response } from "express";
import { sendError } from "../utils/response.js";

/**
 * Strict rate limiter for sensitive authentication endpoints
 * Max 10 requests per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || "10", 10),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.headers["x-test-suite"] === "graice-internal-test",
  handler: (req: Request, res: Response) => {
    return sendError(
      res,
      "Too many authentication attempts from this IP. Please try again after 15 minutes.",
      429,
      "RATE_LIMIT_EXCEEDED"
    );
  },
});

/**
 * General rate limiter for standard API endpoints
 * Max 100 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_API_MAX || "500", 10),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.headers["x-test-suite"] === "graice-internal-test",
  handler: (req: Request, res: Response) => {
    return sendError(
      res,
      "API rate limit exceeded. Please try again later.",
      429,
      "API_RATE_LIMIT_EXCEEDED"
    );
  },
});
