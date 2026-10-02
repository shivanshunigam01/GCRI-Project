import { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/response.js";
import { User } from "../models/User.js";

/**
 * Ensures non-Admin users can only access resources belonging to their assigned company.
 * Defends against Insecure Direct Object References (IDOR).
 *
 * @param paramName The route parameter name holding the company ID (defaults to 'id')
 */
export function requireCompanyScope(paramName = "id") {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, "Authentication required", 401, "UNAUTHORIZED");
    }

    // Admins have platform-wide access
    if (req.user.role === "Admin") {
      return next();
    }

    // If companyId is not in the JWT token (e.g. user just onboarded), resolve from DB
    if (!req.user.companyId && req.user.userId) {
      const user = await User.findById(req.user.userId);
      if (user?.companyId) {
        req.user.companyId = user.companyId.toString();
      }
    }

    const targetCompanyId =
      req.params[paramName] ||
      req.params.id ||
      req.params.companyId ||
      req.body?.companyId;

    if (!req.user.companyId) {
      return sendError(
        res,
        "User is not assigned to any organization",
        403,
        "NO_COMPANY_ASSIGNED"
      );
    }

    if (targetCompanyId && targetCompanyId.toString() !== req.user.companyId.toString()) {
      return sendError(
        res,
        "Access denied. You do not have permission to access resources belonging to another company.",
        403,
        "CROSS_COMPANY_ACCESS_DENIED"
      );
    }

    next();
  };
}

/**
 * Augments a database query filter with company isolation constraints based on user role.
 *
 * @param req Express Request containing decoded user
 * @param baseFilter Existing query filter
 * @param companyField The field name in the collection representing the company (defaults to 'companyId', or '_id' for Company model)
 * @returns Modified query filter scoped by companyId
 */
export function scopeQueryByCompany<T extends Record<string, unknown>>(
  req: Request,
  baseFilter: T = {} as T,
  companyField = "companyId"
): T {
  // Admins can query globally
  if (req.user?.role === "Admin") {
    return baseFilter;
  }

  // Assessors & other roles are scoped strictly to their company
  if (req.user?.companyId) {
    return {
      ...baseFilter,
      [companyField]: req.user.companyId,
    };
  }

  // If user has no company assigned, prevent leaking any records
  return {
    ...baseFilter,
    [companyField]: null,
  };
}
