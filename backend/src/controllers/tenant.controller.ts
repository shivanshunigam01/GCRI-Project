import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { Types } from "mongoose";
import { Tenant } from "../models/Tenant.js";
import { TenantMembership } from "../models/TenantMembership.js";
import { User } from "../models/User.js";
import { Company } from "../models/Company.js";
import { AssessmentSession } from "../models/AssessmentSession.js";
import { AuditLog } from "../models/AuditLog.js";
import { NotificationService } from "../services/notification.service.js";
import { sendSuccess, sendError } from "../utils/response.js";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Helper to invite and assign a TenantAdmin to a tenant.
 */
async function provisionTenantAdminInvite(
  tenantId: Types.ObjectId,
  name: string,
  email: string,
  actorId: string,
  actorEmail: string,
  ipAddress?: string,
  userAgent?: string
) {
  const cleanEmail = email.toLowerCase().trim();

  const existingUser = await User.findOne({ email: cleanEmail });
  if (existingUser) {
    throw {
      statusCode: 409,
      code: "USER_EXISTS",
      message: `An account with email '${cleanEmail}' already exists. Tenant Admins are scoped to a single tenant.`,
    };
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expires = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

  const user = await User.create({
    email: cleanEmail,
    name: name.trim(),
    role: "TenantAdmin",
    tenantId,
    status: "Active",
    invitationToken: hashedToken,
    invitationExpires: expires,
    invitedBy: new Types.ObjectId(actorId),
  });

  await TenantMembership.create({
    tenantId,
    userId: user._id,
    role: "TenantAdmin",
    status: "Invited",
    invitedBy: new Types.ObjectId(actorId),
    invitationToken: hashedToken,
    invitationExpires: expires,
  });

  await AuditLog.create({
    tenantId,
    actorId: new Types.ObjectId(actorId),
    actorEmail,
    action: "TENANT_ADMIN_INVITED",
    entity: "User",
    entityId: user._id.toString(),
    after: { email: user.email, role: "TenantAdmin", tenantId: tenantId.toString() },
    ipAddress,
    userAgent,
  });

  await NotificationService.onUserInvited(
    user,
    { id: actorId, email: actorEmail },
    rawToken
  );

  return { user, rawToken, expires };
}

/**
 * 1. Tenant Onboarding (SuperAdmin only)
 * Creates the tenant record (status: Pending) and optionally invites the first TenantAdmin.
 * Tenant becomes Active once the TenantAdmin accepts the invitation.
 */
export async function createTenant(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, slug: rawSlug, tenantAdmin } = req.body;
    const actorId = req.user!.userId;
    const actorEmail = req.user!.email;

    const slug = rawSlug ? slugify(rawSlug) : slugify(name);
    if (!slug) {
      return sendError(res, "Unable to derive a valid slug from tenant name", 400, "INVALID_SLUG");
    }

    const existingTenant = await Tenant.findOne({ slug });
    if (existingTenant) {
      return sendError(
        res,
        `A tenant with slug '${slug}' already exists.`,
        409,
        "TENANT_EXISTS"
      );
    }

    if (tenantAdmin?.email) {
      const existingAdminUser = await User.findOne({
        email: tenantAdmin.email.toLowerCase().trim(),
      });
      if (existingAdminUser) {
        return sendError(
          res,
          `An account with email '${tenantAdmin.email}' already exists.`,
          409,
          "USER_EXISTS"
        );
      }
    }

    const tenant = await Tenant.create({
      name: name.trim(),
      slug,
      status: "Pending",
      createdBy: new Types.ObjectId(actorId),
    });

    let invitedAdminInfo: Record<string, unknown> | null = null;

    if (tenantAdmin?.email && tenantAdmin?.name) {
      const { user, rawToken, expires } = await provisionTenantAdminInvite(
        tenant._id as Types.ObjectId,
        tenantAdmin.name,
        tenantAdmin.email,
        actorId,
        actorEmail,
        req.ip,
        req.headers["user-agent"]
      );

      tenant.firstTenantAdminId = user._id as Types.ObjectId;
      await tenant.save();

      invitedAdminInfo = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        invitationExpires: expires,
        invitationToken: rawToken,
      };
    }

    await AuditLog.create({
      tenantId: tenant._id as Types.ObjectId,
      actorId: new Types.ObjectId(actorId),
      actorEmail,
      action: "TENANT_CREATED",
      entity: "Tenant",
      entityId: tenant._id.toString(),
      after: {
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
        firstTenantAdminId: tenant.firstTenantAdminId,
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return sendSuccess(
      res,
      {
        message: invitedAdminInfo
          ? "Tenant created in Pending status and first TenantAdmin invited. Tenant will become Active once accepted."
          : "Tenant created in Pending status. Invite the first TenantAdmin to activate it.",
        tenant,
        tenantAdmin: invitedAdminInfo,
      },
      201
    );
  } catch (err) {
    next(err);
  }
}

/**
 * Invite / assign a TenantAdmin to an existing Tenant (SuperAdmin only)
 */
export async function assignTenantAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { name, email } = req.body;
    const actorId = req.user!.userId;
    const actorEmail = req.user!.email;

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      return sendError(res, "Tenant not found", 404, "TENANT_NOT_FOUND");
    }

    if (tenant.status === "Retired") {
      return sendError(
        res,
        "Cannot assign a TenantAdmin to a retired tenant.",
        400,
        "TENANT_RETIRED"
      );
    }

    try {
      const { user, rawToken, expires } = await provisionTenantAdminInvite(
        tenant._id as Types.ObjectId,
        name,
        email,
        actorId,
        actorEmail,
        req.ip,
        req.headers["user-agent"]
      );

      if (!tenant.firstTenantAdminId) {
        tenant.firstTenantAdminId = user._id as Types.ObjectId;
        await tenant.save();
      }

      return sendSuccess(
        res,
        {
          message: "TenantAdmin invited successfully.",
          tenant,
          tenantAdmin: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            invitationExpires: expires,
            invitationToken: rawToken,
          },
        },
        201
      );
    } catch (customErr: unknown) {
      const e = customErr as { statusCode?: number; code?: string; message?: string };
      if (e.statusCode && e.code && e.message) {
        return sendError(res, e.message, e.statusCode, e.code);
      }
      throw customErr;
    }
  } catch (err) {
    next(err);
  }
}

/**
 * List all tenants with metadata only (SuperAdmin only)
 * SuperAdmin sees tenant metadata only; cannot read assessment content.
 */
export async function getTenants(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (req.query.status && typeof req.query.status === "string") {
      filter.status = req.query.status;
    }
    if (req.query.search && typeof req.query.search === "string") {
      const regex = new RegExp(req.query.search.trim(), "i");
      filter.$or = [{ name: regex }, { slug: regex }];
    }

    const [tenants, total] = await Promise.all([
      Tenant.find(filter)
        .populate("firstTenantAdminId", "name email status")
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Tenant.countDocuments(filter),
    ]);

    const enriched = await Promise.all(
      tenants.map(async (t) => {
        const [auditorCount, clientOrgCount, assessmentCount] = await Promise.all([
          TenantMembership.countDocuments({
            tenantId: t._id,
            role: "Auditor",
            status: "Active",
          }),
          Company.countDocuments({ tenantId: t._id }),
          AssessmentSession.countDocuments({ tenantId: t._id }),
        ]);

        return {
          ...t.toObject(),
          metadata: {
            auditorCount,
            clientOrgCount,
            assessmentCount,
          },
        };
      })
    );

    return sendSuccess(res, enriched, 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * List tenants the currently authenticated TenantAdmin or Auditor belongs to.
 */
export async function getMyTenants(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.userId) {
      return sendError(res, "Authentication required", 401, "UNAUTHORIZED");
    }

    if (req.user.role === "SuperAdmin") {
      const tenants = await Tenant.find().sort({ name: 1 });
      return sendSuccess(res, {
        activeTenantId: null,
        tenants: tenants.map((t) => ({
          tenant: t,
          role: "SuperAdmin",
          membershipStatus: "Active",
        })),
      });
    }

    const memberships = await TenantMembership.find({
      userId: new Types.ObjectId(req.user.userId),
      status: "Active",
    }).populate("tenantId", "name slug status createdAt");

    const tenantList = memberships
      .filter((m) => m.tenantId)
      .map((m) => ({
        tenant: m.tenantId,
        role: m.role,
        membershipStatus: m.status,
        joinedAt: m.acceptedAt || m.createdAt,
      }));

    return sendSuccess(res, {
      activeTenantId: req.user.tenantId || null,
      tenants: tenantList,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get tenant metadata by ID (SuperAdmin or member of that tenant)
 */
export async function getTenantById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    if (req.user?.role !== "SuperAdmin") {
      const allowedTenants = req.user?.tenantIds || (req.user?.tenantId ? [req.user.tenantId] : []);
      if (!allowedTenants.includes(id)) {
        return sendError(
          res,
          "Access denied. You do not belong to this tenant.",
          403,
          "CROSS_TENANT_ACCESS_DENIED"
        );
      }
    }

    const tenant = await Tenant.findById(id)
      .populate("firstTenantAdminId", "name email status")
      .populate("createdBy", "name email");

    if (!tenant) {
      return sendError(res, "Tenant not found", 404, "TENANT_NOT_FOUND");
    }

    const [auditorCount, clientOrgCount, assessmentCount] = await Promise.all([
      TenantMembership.countDocuments({
        tenantId: tenant._id,
        role: "Auditor",
        status: "Active",
      }),
      Company.countDocuments({ tenantId: tenant._id }),
      AssessmentSession.countDocuments({ tenantId: tenant._id }),
    ]);

    return sendSuccess(res, {
      ...tenant.toObject(),
      metadata: {
        auditorCount,
        clientOrgCount,
        assessmentCount,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Suspend, retire, or reactivate a tenant (SuperAdmin only)
 */
export async function updateTenantStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const actorId = req.user!.userId;
    const actorEmail = req.user!.email;

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      return sendError(res, "Tenant not found", 404, "TENANT_NOT_FOUND");
    }

    const previousStatus = tenant.status;
    tenant.status = status;
    await tenant.save();

    await AuditLog.create({
      tenantId: tenant._id as Types.ObjectId,
      actorId: new Types.ObjectId(actorId),
      actorEmail,
      action: "TENANT_STATUS_UPDATED",
      entity: "Tenant",
      entityId: tenant._id.toString(),
      before: { status: previousStatus },
      after: { status: tenant.status, reason },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return sendSuccess(res, {
      message: `Tenant status updated to '${status}'.`,
      tenant,
    });
  } catch (err) {
    next(err);
  }
}

