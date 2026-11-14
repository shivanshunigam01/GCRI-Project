import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { User, UserRole } from "../models/User.js";
import { Tenant } from "../models/Tenant.js";
import { TenantMembership } from "../models/TenantMembership.js";
import { sendError } from "../utils/response.js";

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  companyId?: string;
  tenantId?: string;
  tenantIds?: string[];
  scope?: "authenticated" | "mfa_pending";
}

/**
 * Maps legacy JWT/UI roles into GCRAI canonical roles for authorization.
 */
export function normalizeUserRole(role?: string): UserRole {
  if (!role) return "Auditor";
  const cleaned = role.trim();
  if (cleaned === "SuperAdmin" || cleaned === "Super Admin") return "SuperAdmin";
  if (cleaned === "TenantAdmin" || cleaned === "Tenant Admin" || cleaned === "Admin") {
    return "TenantAdmin";
  }
  if (cleaned === "Auditor" || cleaned === "Assessor") return "Auditor";
  if (cleaned === "MembershipApprover") return "MembershipApprover";
  return role as UserRole;
}

export function isTenantAdminRole(role?: UserRole | string): boolean {
  return normalizeUserRole(role) === "TenantAdmin";
}

export function isAuditorRole(role?: UserRole | string): boolean {
  return normalizeUserRole(role) === "Auditor";
}

export async function resolveUserTenantClaims(userId: string, userTenantId?: Types.ObjectId | null) {
  const memberships = await TenantMembership.find({
    userId: new Types.ObjectId(userId),
    status: "Active",
  }).select("tenantId");
  const tenantIds = memberships.map((m) => m.tenantId.toString());
  if (userTenantId && !tenantIds.includes(userTenantId.toString())) {
    tenantIds.push(userTenantId.toString());
  }
  const tenantId = userTenantId?.toString() || tenantIds[0];
  return { tenantId, tenantIds };
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(res, "Authorization token missing or malformed", 401, "UNAUTHORIZED");
  }

  const token = authHeader.split(" ")[1];
  const secret = process.env.JWT_SECRET || "default_jwt_secret_dev";

  try {
    const decoded = jwt.verify(token, secret) as TokenPayload;
    decoded.role = normalizeUserRole(decoded.role);

    if (decoded.scope === "mfa_pending") {
      const allowedEndpoints = ["/mfa/generate", "/mfa/verify"];
      const isMfaEndpoint = allowedEndpoints.some(
        (endpoint) => req.path.endsWith(endpoint) || req.originalUrl.endsWith(endpoint)
      );
      if (!isMfaEndpoint) {
        return sendError(
          res,
          "MFA verification required before accessing this endpoint",
          403,
          "MFA_VERIFICATION_REQUIRED"
        );
      }
    }

    req.user = decoded;

    if (req.user.userId) {
      const u = await User.findById(req.user.userId).select("companyId tenantId role status");
      if (!u) {
        return sendError(res, "User not found", 401, "UNAUTHORIZED");
      }
      if (u.status === "Deactivated") {
        return sendError(res, "Account is deactivated", 403, "ACCOUNT_DEACTIVATED");
      }

      if (u.companyId) {
        req.user.companyId = u.companyId.toString();
      }

      if (req.user.role !== "SuperAdmin") {
        const memberships = await TenantMembership.find({
          userId: u._id,
          status: "Active",
        }).select("tenantId");

        const memberTenantIds = memberships.map((m) => m.tenantId.toString());
        if (u.tenantId && !memberTenantIds.includes(u.tenantId.toString())) {
          memberTenantIds.push(u.tenantId.toString());
        }
        req.user.tenantIds = memberTenantIds;

        const requestedTenantId = req.headers["x-tenant-id"] as string | undefined;
        if (requestedTenantId) {
          if (!memberTenantIds.includes(requestedTenantId)) {
            return sendError(
              res,
              "Access denied. You are not an active member of the requested tenant.",
              403,
              "CROSS_TENANT_ACCESS_DENIED"
            );
          }
          req.user.tenantId = requestedTenantId;
        } else if (!req.user.tenantId) {
          req.user.tenantId = u.tenantId?.toString() || memberTenantIds[0];
        }

        if (req.user.tenantId) {
          const activeTenant = await Tenant.findById(req.user.tenantId).select("status");
          if (
            activeTenant &&
            (activeTenant.status === "Suspended" || activeTenant.status === "Retired")
          ) {
            return sendError(
              res,
              `Access denied. Tenant workspace is currently ${activeTenant.status.toLowerCase()}.`,
              403,
              "TENANT_INACTIVE"
            );
          }
        }
      }
    }

    next();
  } catch {
    return sendError(res, "Invalid or expired token", 401, "INVALID_TOKEN");
  }
}

export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, "Unauthorized", 401, "UNAUTHORIZED");
    }

    const userRole = normalizeUserRole(req.user.role);
    const allowed = allowedRoles.some((r) => {
      const canonical = normalizeUserRole(r);
      if (userRole === canonical) return true;
      if (canonical === "TenantAdmin" && isTenantAdminRole(userRole)) return true;
      if (canonical === "Auditor" && isAuditorRole(userRole)) return true;
      return false;
    });

    if (!allowed) {
      return sendError(
        res,
        `Access denied. Role ${userRole} does not have required permissions.`,
        403,
        "FORBIDDEN"
      );
    }

    next();
  };
}