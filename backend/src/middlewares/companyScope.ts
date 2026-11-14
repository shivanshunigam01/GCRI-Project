import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { sendError } from "../utils/response.js";
import { User } from "../models/User.js";
import { Company } from "../models/Company.js";
import { TenantMembership } from "../models/TenantMembership.js";
import { AuditorOrganization } from "../models/AuditorOrganization.js";
import { IAssessmentSession } from "../models/AssessmentSession.js";
import { isTenantAdminRole } from "./auth.js";

/**
 * Returns all active tenant IDs that a user (TenantAdmin or Auditor) belongs to.
 */
export async function getUserTenantIds(userId: string): Promise<Types.ObjectId[]> {
  if (!userId) return [];

  const [memberships, user] = await Promise.all([
    TenantMembership.find({
      userId: new Types.ObjectId(userId),
      status: "Active",
    }).select("tenantId"),
    User.findById(userId).select("tenantId"),
  ]);

  const tenantIds: Types.ObjectId[] = memberships.map((m) => m.tenantId);
  if (
    user?.tenantId &&
    !tenantIds.some((id) => id.toString() === user.tenantId?.toString())
  ) {
    tenantIds.push(user.tenantId);
  }

  return tenantIds;
}

/**
 * Checks whether an Auditor or TenantAdmin can access a Client Organization (Company).
 * Under the GCRAI Organizational Model:
 * - Client Organizations belong to one tenant.
 * - Any Auditor or TenantAdmin belonging to that tenant can access/assess any Client Organization in the tenant.
 * - Falls back to legacy AuditorOrganization mapping or user.companyId only for legacy un-tenanted records.
 */
export async function isAuditorAssignedToOrg(
  userId: string,
  organizationId: string,
  activeTenantId?: string
): Promise<boolean> {
  if (!userId || !organizationId) return false;

  const company = await Company.findById(organizationId).select("tenantId");
  if (!company) return false;

  if (company.tenantId) {
    if (activeTenantId && company.tenantId.toString() !== activeTenantId.toString()) {
      return false;
    }
    const tenantIds = await getUserTenantIds(userId);
    return tenantIds.some((id) => id.toString() === company.tenantId?.toString());
  }

  // Legacy fallback for un-tenanted companies
  const mapping = await AuditorOrganization.findOne({
    auditorId: new Types.ObjectId(userId),
    organizationId: new Types.ObjectId(organizationId),
    status: "Active",
  });
  if (mapping) return true;

  const user = await User.findById(userId).select("companyId");
  if (user?.companyId && user.companyId.toString() === organizationId.toString()) {
    return true;
  }

  return false;
}

/**
 * Returns all Client Organization (Company) IDs accessible to the user in their active tenant(s).
 */
export async function getAssignedOrganizationIds(
  userId: string,
  activeTenantId?: string
): Promise<Types.ObjectId[]> {
  if (!userId) return [];

  let tenantIds: Types.ObjectId[] = [];
  if (activeTenantId && Types.ObjectId.isValid(activeTenantId)) {
    tenantIds = [new Types.ObjectId(activeTenantId)];
  } else {
    tenantIds = await getUserTenantIds(userId);
  }

  const orgIds: Types.ObjectId[] = [];

  if (tenantIds.length > 0) {
    const tenantCompanies = await Company.find({
      tenantId: { $in: tenantIds },
    }).select("_id");
    for (const c of tenantCompanies) {
      orgIds.push(c._id as Types.ObjectId);
    }
  }

  // Legacy fallback: include explicitly mapped or companyId-bound companies if not already present
  const [mappings, user] = await Promise.all([
    AuditorOrganization.find({
      auditorId: new Types.ObjectId(userId),
      status: "Active",
    }).select("organizationId"),
    User.findById(userId).select("companyId"),
  ]);

  for (const m of mappings) {
    if (!orgIds.some((id) => id.toString() === m.organizationId.toString())) {
      orgIds.push(m.organizationId);
    }
  }

  if (
    user?.companyId &&
    !orgIds.some((id) => id.toString() === user.companyId?.toString())
  ) {
    orgIds.push(user.companyId);
  }

  return orgIds;
}

/**
 * Checks whether an Auditor is authorized to view, edit, or co-sign a specific AssessmentSession.
 * Per GCRAI Organizational Model & confirmed visibility rules:
 * 1. The session must belong to the auditor's active tenant (hard tenant isolation boundary).
 * 2. The auditor must either be the creator/conductor of the session OR explicitly listed in `session.sharedWith`.
 */
export async function canAuditorAccessSession(
  userId: string,
  session: IAssessmentSession,
  activeTenantId?: string
): Promise<boolean> {
  if (!userId || !session) return false;

  // Enforce hard tenant boundary if session is bound to a tenant
  if (session.tenantId) {
    if (activeTenantId && session.tenantId.toString() !== activeTenantId.toString()) {
      return false;
    }
    const tenantIds = await getUserTenantIds(userId);
    const inSessionTenant = tenantIds.some(
      (tid) => tid.toString() === session.tenantId?.toString()
    );
    if (!inSessionTenant) {
      return false;
    }
  }

  const conductedId =
    (session.conductedByUserId as unknown as { _id?: Types.ObjectId })?._id?.toString() ||
    session.conductedByUserId?.toString();
  const createdId =
    (session.createdByUserId as unknown as { _id?: Types.ObjectId })?._id?.toString() ||
    session.createdByUserId?.toString();

  if (conductedId === userId || createdId === userId) {
    return true;
  }

  if (
    Array.isArray(session.sharedWith) &&
    session.sharedWith.some((s) => {
      const sharedAuditorId =
        (s.auditorId as unknown as { _id?: Types.ObjectId })?._id?.toString() ||
        s.auditorId?.toString();
      return sharedAuditorId === userId;
    })
  ) {
    return true;
  }

  return false;
}

/**
 * Checks whether a TenantAdmin owns the tenant of a given AssessmentSession or Company.
 */
export async function isTenantAdminForSession(
  req: Request,
  session: IAssessmentSession
): Promise<boolean> {
  if (!req.user || !isTenantAdminRole(req.user.role)) return false;

  if (session.tenantId && req.user.tenantId) {
    return session.tenantId.toString() === req.user.tenantId.toString();
  }

  const orgId =
    (session.companyId as unknown as { _id?: Types.ObjectId })?._id?.toString() ||
    session.companyId?.toString();
  if (!orgId) return false;

  if (req.user.companyId && req.user.companyId.toString() === orgId) {
    return true;
  }

  const company = await Company.findById(orgId).select("tenantId");
  if (company?.tenantId && req.user.tenantId) {
    return company.tenantId.toString() === req.user.tenantId.toString();
  }

  return false;
}

/**
 * Ensures callers can only access Client Organization (Company) resources within their own tenant.
 * SuperAdmin is blocked from accessing tenant-scoped Client Organizations.
 */
export function requireCompanyScope(paramName = "id") {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, "Authentication required", 401, "UNAUTHORIZED");
    }

    // SuperAdmin manages tenants as a whole and sees tenant metadata only
    if (req.user.role === "SuperAdmin") {
      return sendError(
        res,
        "Super Admin manages tenants at the platform level and cannot access tenant client organizations.",
        403,
        "SUPER_ADMIN_TENANT_DATA_RESTRICTED"
      );
    }

    const targetCompanyId =
      req.params[paramName] ||
      req.params.id ||
      req.params.companyId ||
      req.body?.companyId;

    if (!targetCompanyId) {
      return next();
    }

    const company = await Company.findById(targetCompanyId).select("tenantId");
    if (!company) {
      return sendError(res, "Company not found", 404, "COMPANY_NOT_FOUND");
    }

    if (company.tenantId) {
      const userTenantIds = req.user.tenantIds || (req.user.tenantId ? [req.user.tenantId] : []);
      const matchesActiveTenant = req.user.tenantId
        ? company.tenantId.toString() === req.user.tenantId.toString()
        : userTenantIds.includes(company.tenantId.toString());

      if (!matchesActiveTenant) {
        return sendError(
          res,
          "Access denied. This client organization belongs to another tenant.",
          403,
          "CROSS_TENANT_ACCESS_DENIED"
        );
      }
      return next();
    }

    // Legacy fallback if company has no tenantId
    if (isTenantAdminRole(req.user.role)) {
      if (req.user.companyId && req.user.companyId.toString() === targetCompanyId.toString()) {
        return next();
      }
      return sendError(
        res,
        "Access denied. You do not have permission to access resources belonging to this organization.",
        403,
        "CROSS_COMPANY_ACCESS_DENIED"
      );
    }

    const isAssigned = await isAuditorAssignedToOrg(
      req.user.userId,
      targetCompanyId,
      req.user.tenantId
    );
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
 * Augments a database query filter with tenant/company isolation constraints.
 */
export async function scopeQueryByCompanyAsync<T extends Record<string, unknown>>(
  req: Request,
  baseFilter: T = {} as T,
  companyField = "companyId"
): Promise<T> {
  if (!req.user) {
    return { ...baseFilter, [companyField]: null };
  }

  // SuperAdmin cannot query tenant-scoped client orgs or assessments
  if (req.user.role === "SuperAdmin") {
    return { ...baseFilter, [companyField]: null };
  }

  if (req.user.userId) {
    const orgIds = await getAssignedOrganizationIds(req.user.userId, req.user.tenantId);
    if (orgIds.length > 0) {
      return {
        ...baseFilter,
        [companyField]: { $in: orgIds },
      };
    }
  }

  return {
    ...baseFilter,
    [companyField]: null,
  };
}

/**
 * Synchronous query scoping helper for Company listings.
 */
export function scopeQueryByCompany<T extends Record<string, unknown>>(
  req: Request,
  baseFilter: T = {} as T,
  companyField = "companyId"
): T {
  if (!req.user || req.user.role === "SuperAdmin") {
    return {
      ...baseFilter,
      [companyField]: null,
    };
  }

  if (req.user.tenantId) {
    return {
      ...baseFilter,
      tenantId: req.user.tenantId,
    };
  }

  if (req.user.companyId) {
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
