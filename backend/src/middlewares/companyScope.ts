import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { sendError } from "../utils/response.js";
import { User } from "../models/User.js";
import { AuditorOrganization } from "../models/AuditorOrganization.js";

/**
 * Checks whether an Auditor/Assessor is authorized to assess a given organization.
 * An auditor is authorized if:
 * 1. An active record exists in AuditorOrganization mapping, OR
 * 2. The user's primary companyId matches (backward compatibility).
 */
export async function isAuditorAssignedToOrg(
  userId: string,
  organizationId: string
): Promise<boolean> {
  if (!userId || !organizationId) return false;

  const mapping = await AuditorOrganization.findOne({
    auditorId: new Types.ObjectId(userId),
    organizationId: new Types.ObjectId(organizationId),
    status: "Active",
  });

  if (mapping) return true;

  // Fallback: check legacy single companyId on user
  const user = await User.findById(userId);
  if (user?.companyId && user.companyId.toString() === organizationId.toString()) {
    return true;
  }

  return false;
}

/**
 * Returns all organization IDs an Auditor/Assessor has permission to access.
 */
export async function getAssignedOrganizationIds(userId: string): Promise<Types.ObjectId[]> {
  const mappings = await AuditorOrganization.find({
    auditorId: new Types.ObjectId(userId),
    status: "Active",
  }).select("organizationId");

  const orgIds: Types.ObjectId[] = mappings.map((m) => m.organizationId);

  const user = await User.findById(userId);
  if (user?.companyId && !orgIds.some((id) => id.toString() === user.companyId?.toString())) {
    orgIds.push(user.companyId);
  }

  return orgIds;
}

/**
 * Ensures non-Admin users can only access resources belonging to their assigned company or organization.
 * Defends against Insecure Direct Object References (IDOR).
 *
 * @param paramName The route parameter name holding the company ID (defaults to 'id')
 */
export function requireCompanyScope(paramName = "id") {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, "Authentication required", 401, "UNAUTHORIZED");
    }

    // Admins have platform-wide access to company management
    if (req.user.role === "Admin") {
      return next();
    }

    const targetCompanyId =
      req.params[paramName] ||
      req.params.id ||
      req.params.companyId ||
      req.body?.companyId;

    if (!targetCompanyId) {
      return next();
    }

    const isAssigned = await isAuditorAssignedToOrg(req.user.userId, targetCompanyId);
    if (!isAssigned) {
      return sendError(
        res,
        "Access denied. You do not have permission to access resources belonging to this organization.",
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
 * @returns Modified query filter scoped by assigned organization IDs
 */
export async function scopeQueryByCompanyAsync<T extends Record<string, unknown>>(
  req: Request,
  baseFilter: T = {} as T,
  companyField = "companyId"
): Promise<T> {
  // Admins can query globally
  if (req.user?.role === "Admin") {
    return baseFilter;
  }

  if (req.user?.userId) {
    const orgIds = await getAssignedOrganizationIds(req.user.userId);
    if (orgIds.length > 0) {
      return {
        ...baseFilter,
        [companyField]: { $in: orgIds },
      };
    }
  }

  // If user has no company assigned, prevent leaking any records
  return {
    ...baseFilter,
    [companyField]: null,
  };
}

/**
 * Synchronous backward-compatible fallback for scoping queries.
 */
export function scopeQueryByCompany<T extends Record<string, unknown>>(
  req: Request,
  baseFilter: T = {} as T,
  companyField = "companyId"
): T {
  if (req.user?.role === "Admin") {
    return baseFilter;
  }

  if (req.user?.companyId) {
    return {
      ...baseFilter,
      [companyField]: req.user.companyId,
    };
  }

  return {
    ...baseFilter,
    [companyField]: null,
  };
}
