import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User, UserRole } from "../models/User.js";
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

/** Yash tenant RBAC aliases — Admin ≡ TenantAdmin, Assessor ≡ Auditor (JWT uses Admin/Assessor). */
export function isTenantAdminRole(role?: UserRole): boolean {
  return role === "Admin" || role === "TenantAdmin";
}

export function isAuditorRole(role?: UserRole): boolean {
  return role === "Assessor" || role === "Auditor";
}

export function normalizeUserRole(role: string): UserRole {
  if (role === "Admin" || role === "TenantAdmin") return role === "TenantAdmin" ? "TenantAdmin" : "Admin";
  if (role === "Assessor" || role === "Auditor") return role === "Auditor" ? "Auditor" : "Assessor";
  return role as UserRole;
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

    if (req.user.userId) {
      const u = await User.findById(req.user.userId).select("companyId tenantId");
      if (u?.companyId) {
        req.user.companyId = u.companyId.toString();
      }
      if (u?.tenantId) {
        req.user.tenantId = u.tenantId.toString();
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

    const allowed = allowedRoles.some((r) => {
      if (req.user!.role === r) return true;
      if (r === "TenantAdmin" && isTenantAdminRole(req.user!.role)) return true;
      if (r === "Admin" && isTenantAdminRole(req.user!.role)) return true;
      if (r === "Auditor" && isAuditorRole(req.user!.role)) return true;
      if (r === "Assessor" && isAuditorRole(req.user!.role)) return true;
      return false;
    });

    if (!allowed) {
      return sendError(
        res,
        `Access denied. Role ${req.user.role} does not have required permissions.`,
        403,
        "FORBIDDEN"
      );
    }

    next();
  };
}
