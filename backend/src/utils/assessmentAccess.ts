import { Request, Response } from "express";
import { Types } from "mongoose";
import { IAssessmentSession } from "../models/AssessmentSession.js";
import { AuditLog } from "../models/AuditLog.js";
import { sendError } from "../utils/response.js";
import {
  canAuditorAccessSession,
  isTenantAdminForSession,
} from "../middlewares/companyScope.js";
import { normalizeUserRole } from "../middlewares/auth.js";

export async function logAuthorizationDenied(req: Request, entityId: string, reason: string) {
  try {
    if (req.user?.userId) {
      await AuditLog.create({
        tenantId: req.user.tenantId ? new Types.ObjectId(req.user.tenantId) : undefined,
        actorId: req.user.userId,
        actorEmail: req.user.email || "unknown",
        action: "AUTHORIZATION_DENIED",
        entity: "AssessmentSession",
        entityId,
        before: { reason },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
    }
  } catch (err) {
    console.error("Failed to log authorization denial audit record:", err);
  }
}

export async function verifyReadAccessToSession(
  req: Request,
  res: Response,
  session: IAssessmentSession
): Promise<boolean> {
  if (!req.user?.userId) {
    sendError(res, "Authentication required", 401, "UNAUTHORIZED");
    return false;
  }

  const role = normalizeUserRole(req.user.role);

  if (role === "SuperAdmin") {
    await logAuthorizationDenied(
      req,
      session._id.toString(),
      "SuperAdmin access to confidential assessment content is restricted (metadata only)."
    );
    sendError(
      res,
      "Super Admin sees tenant metadata only and cannot read assessment content.",
      403,
      "SUPER_ADMIN_CONTENT_ACCESS_RESTRICTED"
    );
    return false;
  }

  if (role === "TenantAdmin") {
    const allowed = await isTenantAdminForSession(req, session);
    if (!allowed) {
      sendError(
        res,
        "Access denied. This assessment belongs to another tenant.",
        403,
        "CROSS_TENANT_ACCESS_DENIED"
      );
      return false;
    }
    return true;
  }

  const allowed = await canAuditorAccessSession(req.user.userId, session, req.user.tenantId);
  if (!allowed) {
    sendError(
      res,
      "Access denied. Auditors can only view assessments they created or that were explicitly shared with them in their tenant.",
      403,
      "ASSESSMENT_ACCESS_DENIED"
    );
    return false;
  }

  return true;
}

export async function verifyAuditorEditAccessToSession(
  req: Request,
  res: Response,
  session: IAssessmentSession,
  actionDescription: string
): Promise<boolean> {
  if (!req.user?.userId) {
    sendError(res, "Authentication required", 401, "UNAUTHORIZED");
    return false;
  }

  const role = normalizeUserRole(req.user.role);

  if (role === "SuperAdmin" || role === "TenantAdmin") {
    await logAuthorizationDenied(
      req,
      session._id.toString(),
      `${role} access to ${actionDescription} is restricted to Auditors.`
    );
    sendError(
      res,
      `Role ${role} cannot ${actionDescription}. Only Auditors (creator or shared) can perform this action.`,
      403,
      "AUDITOR_ROLE_REQUIRED"
    );
    return false;
  }

  const allowed = await canAuditorAccessSession(req.user.userId, session, req.user.tenantId);
  if (!allowed) {
    sendError(
      res,
      "Access denied. You can only edit, collect evidence for, or co-sign assessments you created or that were shared with you in your tenant.",
      403,
      "ASSESSMENT_ACCESS_DENIED"
    );
    return false;
  }

  return true;
}