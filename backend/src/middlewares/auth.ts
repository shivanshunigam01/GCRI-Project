import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User, UserRole } from "../models/User.js";
import { Tenant } from "../models/Tenant.js";
import { TenantMembership } from "../models/TenantMembership.js";
import { sendError } from "../utils/response.js";

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  tenantId?: string;
  tenantIds?: string[];
  companyId?: string;
  scope?: "authenticated" | "mfa_pending";
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Normalizes legacy role strings ("Admin", "Assessor", "Super Admin", etc.)
 * into canonical UserRole values ("SuperAdmin" | "TenantAdmin" | "Auditor").
 */
export function normalizeUserRole(role?: string): UserRole {
  if (!role) return "Auditor";
  const cleaned = role.trim();
  if (cleaned === "SuperAdmin" || cleaned === "Super Admin") return "SuperAdmin";
  if (cleaned === "TenantAdmin" || cleaned === "Tenant Admin" || cleaned === "Admin") {
    return "TenantAdmin";
  }
  return "Auditor";
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

    // If token has mfa_pending scope, only allow MFA enrollment / verification endpoints
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

    // Resolve tenant memberships and active tenantId for non-SuperAdmin users
    if (req.user.userId && req.user.role !== "SuperAdmin") {
      const [u, memberships] = await Promise.all([
        User.findById(req.user.userId).select("tenantId companyId role status"),
        TenantMembership.find({ userId: req.user.userId, status: "Active" }).select("tenantId role"),
      ]);

      if (u && u.status === "Deactivated") {
        return sendError(res, "Account is deactivated", 403, "ACCOUNT_DEACTIVATED");
      }

      const memberTenantIds = memberships.map((m) => m.tenantId.toString());
      if (u?.tenantId && !memberTenantIds.includes(u.tenantId.toString())) {
        memberTenantIds.push(u.tenantId.toString());
      }

      req.user.tenantIds = memberTenantIds;

      if (!req.user.companyId && u?.companyId) {
        req.user.companyId = u.companyId.toString();
      }

      // Check if caller requested a specific tenant context via x-tenant-id header
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
        req.user.tenantId = u?.tenantId?.toString() || memberTenantIds[0];
      }

      // Enforce that the active tenant is not Suspended or Retired
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
    if (!allowedRoles.includes(userRole)) {
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
