import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { User } from "../models/User.js";
import { Tenant } from "../models/Tenant.js";
import { TenantMembership } from "../models/TenantMembership.js";
import { AuditLog } from "../models/AuditLog.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { NotificationService } from "../services/notification.service.js";
import { normalizeUserRole } from "../middlewares/auth.js";

/**
 * Get profile of currently authenticated user
 */
export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId)
      .select("-passwordHash -mfa.secret -mfa.tempSecret -mfa.recoveryCodes")
      .populate("tenantId", "name slug status")
      .populate("companyId", "name domain verificationStatus status");

    if (!user) {
      return sendError(res, "User not found", 404, "USER_NOT_FOUND");
    }

    const memberships = await TenantMembership.find({
      userId: user._id,
      status: "Active",
    }).populate("tenantId", "name slug status");

    return sendSuccess(res, {
      ...user.toObject(),
      activeTenantId: req.user?.tenantId || user.tenantId || null,
      tenantMemberships: memberships,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update personal profile of authenticated user
 */
export async function updateMe(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { name, phone } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return sendError(res, "User not found", 404, "USER_NOT_FOUND");
    }

    const before = { name: user.name, phone: user.phone };

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    await user.save();

    await AuditLog.create({
      tenantId: user.tenantId,
      actorId: user._id,
      actorEmail: user.email,
      action: "USER_PROFILE_UPDATED",
      entity: "User",
      entityId: user._id.toString(),
      before,
      after: { name: user.name, phone: user.phone },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return sendSuccess(res, {
      userId: user._id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * List users with filtering, search, and pagination.
 * - SuperAdmin sees platform-level users (or filters by tenantId).
 * - TenantAdmin sees users belonging to their own tenant (via TenantMembership or user.tenantId).
 * - Auditor sees other active Auditors in their current tenant (for intra-tenant assessment sharing).
 */
export async function getUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    const actorRole = req.user?.role;

    if (actorRole === "TenantAdmin" || actorRole === "Auditor") {
      const activeTenantId = req.user?.tenantId;
      if (!activeTenantId) {
        if (req.user?.companyId) {
          filter.companyId = req.user.companyId;
        } else {
          return sendSuccess(res, [], 200, { page, limit, total: 0, totalPages: 0 });
        }
      } else {
        const memberships = await TenantMembership.find({
          tenantId: new Types.ObjectId(activeTenantId),
          ...(actorRole === "Auditor" ? { role: "Auditor", status: "Active" } : {}),
        }).select("userId");

        const memberUserIds = memberships.map((m) => m.userId);
        filter.$or = [
          { _id: { $in: memberUserIds } },
          { tenantId: new Types.ObjectId(activeTenantId) },
        ];

        if (actorRole === "Auditor") {
          filter.role = "Auditor";
          filter.status = "Active";
        }
      }
    } else if (actorRole === "SuperAdmin") {
      if (req.query.tenantId && typeof req.query.tenantId === "string") {
        const memberships = await TenantMembership.find({
          tenantId: new Types.ObjectId(req.query.tenantId),
        }).select("userId");
        filter.$or = [
          { _id: { $in: memberships.map((m) => m.userId) } },
          { tenantId: new Types.ObjectId(req.query.tenantId) },
        ];
      }
      if (req.query.companyId && typeof req.query.companyId === "string") {
        filter.companyId = req.query.companyId;
      }
    }

    if (actorRole !== "Auditor" && req.query.role && typeof req.query.role === "string") {
      filter.role = normalizeUserRole(req.query.role);
    }

    if (actorRole !== "Auditor" && req.query.status && typeof req.query.status === "string") {
      filter.status = req.query.status;
    }

    if (req.query.search && typeof req.query.search === "string") {
      const regex = new RegExp(req.query.search.trim(), "i");
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or as unknown[] }, { $or: [{ name: regex }, { email: regex }] }];
        delete filter.$or;
      } else {
        filter.$or = [{ name: regex }, { email: regex }];
      }
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-passwordHash -mfa.secret -mfa.tempSecret -mfa.recoveryCodes")
        .populate("tenantId", "name slug status")
        .populate("companyId", "name domain")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return sendSuccess(res, users, 200, {
      page,
      limit,
      total,
      totalPages,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get individual user by ID (SuperAdmin or TenantAdmin of same tenant)
 */
export async function getUserById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const user = await User.findById(id)
      .select("-passwordHash -mfa.secret -mfa.tempSecret -mfa.recoveryCodes")
      .populate("tenantId", "name slug status")
      .populate("companyId", "name domain verificationStatus status");

    if (!user) {
      return sendError(res, "User not found", 404, "USER_NOT_FOUND");
    }

    if (req.user?.role === "TenantAdmin") {
      const activeTenantId = req.user.tenantId;
      let belongsToTenant = false;

      if (activeTenantId) {
        const membership = await TenantMembership.findOne({
          tenantId: new Types.ObjectId(activeTenantId),
          userId: user._id,
        });
        const userTenantId =
          (user.tenantId as unknown as { _id?: Types.ObjectId })?._id?.toString() ||
          user.tenantId?.toString();
        belongsToTenant = Boolean(membership || userTenantId === activeTenantId);
      } else if (req.user.companyId) {
        const userCompId =
          (user.companyId as unknown as { _id?: Types.ObjectId })?._id?.toString() ||
          user.companyId?.toString();
        belongsToTenant = userCompId === req.user.companyId;
      }

      if (!belongsToTenant) {
        return sendError(
          res,
          "Access denied. You cannot view users outside your tenant.",
          403,
          "CROSS_TENANT_ACCESS_DENIED"
        );
      }
    }

    return sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
}

/**
 * Invite a new user according to the strict top-down GCRAI hierarchy:
 * - "Each level can only create the level directly beneath it."
 * - SuperAdmin can ONLY invite TenantAdmin (into a specified tenantId).
 * - TenantAdmin can ONLY invite Auditor (into their own tenantId).
 *   An existing Auditor in another tenant can be invited into this tenant with a separate TenantMembership.
 */
export async function inviteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, name, role: rawRole, tenantId, companyId } = req.body;
    const role = normalizeUserRole(rawRole);
    const actorId = req.user?.userId;
    const actorRole = req.user?.role;
    const actorEmail = req.user?.email || "unknown";

    const cleanEmail = email.toLowerCase().trim();
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expires = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours validity

    if (actorRole === "SuperAdmin") {
      // SuperAdmin can only onboard TenantAdmin (the level directly beneath it)
      if (role !== "TenantAdmin") {
        return sendError(
          res,
          "Each level can only create the level directly beneath it. SuperAdmin can only invite a TenantAdmin.",
          403,
          "HIERARCHY_VIOLATION"
        );
      }

      const targetTenantId = tenantId;
      if (!targetTenantId) {
        return sendError(
          res,
          "Tenant ID (tenantId) is required when inviting a TenantAdmin.",
          400,
          "TENANT_ID_REQUIRED"
        );
      }

      const tenant = await Tenant.findById(targetTenantId);
      if (!tenant) {
        return sendError(res, "Target tenant not found", 404, "TENANT_NOT_FOUND");
      }

      const existing = await User.findOne({ email: cleanEmail });
      if (existing) {
        return sendError(
          res,
          "An account with this email address already exists. A TenantAdmin can only belong to one tenant.",
          409,
          "USER_EXISTS"
        );
      }

      const user = await User.create({
        email: cleanEmail,
        name,
        role: "TenantAdmin",
        tenantId: tenant._id,
        companyId: companyId || undefined,
        status: "Active",
        invitationToken: hashedToken,
        invitationExpires: expires,
        invitedBy: actorId,
      });

      await TenantMembership.create({
        tenantId: tenant._id,
        userId: user._id,
        role: "TenantAdmin",
        status: "Invited",
        invitedBy: new Types.ObjectId(actorId),
        invitationToken: hashedToken,
        invitationExpires: expires,
      });

      if (!tenant.firstTenantAdminId) {
        tenant.firstTenantAdminId = user._id as Types.ObjectId;
        await tenant.save();
      }

      await AuditLog.create({
        tenantId: tenant._id as Types.ObjectId,
        actorId: new Types.ObjectId(actorId),
        actorEmail,
        action: "USER_INVITED",
        entity: "User",
        entityId: user._id.toString(),
        after: { email: user.email, role: user.role, tenantId: tenant._id },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      await NotificationService.onUserInvited(
        user,
        { id: actorId || "", email: actorEmail },
        rawToken
      );

      return sendSuccess(
        res,
        {
          message: "TenantAdmin invitation generated successfully",
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status,
            tenantId: tenant._id,
            invitationExpires: expires,
          },
          invitationToken: rawToken,
        },
        201
      );
    }

    if (actorRole === "TenantAdmin") {
      // TenantAdmin can only onboard Auditor (the level directly beneath it)
      if (role !== "Auditor") {
        return sendError(
          res,
          "Each level can only create the level directly beneath it. TenantAdmin can only invite an Auditor.",
          403,
          "PRIVILEGE_ESCALATION_DENIED"
        );
      }

      const targetTenantId = req.user?.tenantId;
      if (!targetTenantId) {
        return sendError(
          res,
          "Your TenantAdmin account is not linked to an active tenant.",
          400,
          "TENANT_NOT_LINKED"
        );
      }

      // Check if an account with this email already exists
      let user = await User.findOne({ email: cleanEmail });

      if (user) {
        // Multi-tenant Auditor support: "the same auditor can also be invited into other tenants, with a separate membership in each."
        if (normalizeUserRole(user.role) !== "Auditor") {
          return sendError(
            res,
            "An administrative account with this email already exists and cannot be invited as an Auditor.",
            409,
            "USER_EXISTS"
          );
        }

        const existingMembership = await TenantMembership.findOne({
          tenantId: new Types.ObjectId(targetTenantId),
          userId: user._id,
        });

        if (existingMembership && existingMembership.status === "Active") {
          return sendError(
            res,
            "This auditor is already an active member of your tenant.",
            409,
            "AUDITOR_ALREADY_IN_TENANT"
          );
        }

        if (existingMembership) {
          existingMembership.status = "Invited";
          existingMembership.invitationToken = hashedToken;
          existingMembership.invitationExpires = expires;
          existingMembership.invitedBy = new Types.ObjectId(actorId);
          await existingMembership.save();
        } else {
          await TenantMembership.create({
            tenantId: new Types.ObjectId(targetTenantId),
            userId: user._id,
            role: "Auditor",
            status: "Invited",
            invitedBy: new Types.ObjectId(actorId),
            invitationToken: hashedToken,
            invitationExpires: expires,
          });
        }
      } else {
        user = await User.create({
          email: cleanEmail,
          name,
          role: "Auditor",
          tenantId: new Types.ObjectId(targetTenantId),
          companyId: req.user?.companyId ? new Types.ObjectId(req.user.companyId) : undefined,
          status: "Active",
          invitationToken: hashedToken,
          invitationExpires: expires,
          invitedBy: actorId,
        });

        await TenantMembership.create({
          tenantId: new Types.ObjectId(targetTenantId),
          userId: user._id,
          role: "Auditor",
          status: "Invited",
          invitedBy: new Types.ObjectId(actorId),
          invitationToken: hashedToken,
          invitationExpires: expires,
        });
      }

      await AuditLog.create({
        tenantId: new Types.ObjectId(targetTenantId),
        actorId: new Types.ObjectId(actorId),
        actorEmail,
        action: "USER_INVITED",
        entity: "User",
        entityId: user._id.toString(),
        after: { email: user.email, role: "Auditor", tenantId: targetTenantId },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      await NotificationService.onUserInvited(
        user,
        { id: actorId || "", email: actorEmail },
        rawToken
      );

      return sendSuccess(
        res,
        {
          message: "Auditor invitation generated successfully",
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            role: "Auditor",
            status: user.status,
            tenantId: targetTenantId,
            invitationExpires: expires,
          },
          invitationToken: rawToken,
        },
        201
      );
    }

    return sendError(res, "Forbidden", 403, "FORBIDDEN");
  } catch (err) {
    next(err);
  }
}

/**
 * Accept invitation and configure account password (Public endpoint)
 * - Activates TenantMembership.
 * - If accepting user is a TenantAdmin for a Pending tenant, transitions the Tenant to Active!
 */
export async function acceptInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, password } = req.body;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // 1. Check TenantMembership invitation first (supports multi-tenant Auditor invites)
    const membership = await TenantMembership.findOne({
      invitationToken: hashedToken,
      invitationExpires: { $gt: new Date() },
    });

    let user = membership
      ? await User.findById(membership.userId)
      : await User.findOne({
          invitationToken: hashedToken,
          invitationExpires: { $gt: new Date() },
        });

    if (!user) {
      return sendError(
        res,
        "Invitation token is invalid or has expired",
        400,
        "INVALID_OR_EXPIRED_INVITATION"
      );
    }

    if (!user.passwordHash && !password) {
      return sendError(
        res,
        "Password is required to initialize your account.",
        400,
        "PASSWORD_REQUIRED"
      );
    }

    if (password) {
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);
      user.passwordHash = await bcrypt.hash(password, saltRounds);
    }

    user.role = normalizeUserRole(user.role);
    user.invitationToken = undefined;
    user.invitationExpires = undefined;
    user.status = "Active";
    if (membership && !user.tenantId) {
      user.tenantId = membership.tenantId;
    }
    await user.save();

    const activeTenantId = membership?.tenantId || user.tenantId;

    if (membership) {
      membership.status = "Active";
      membership.acceptedAt = new Date();
      membership.invitationToken = undefined;
      membership.invitationExpires = undefined;
      await membership.save();
    } else if (activeTenantId && user.role !== "SuperAdmin") {
      await TenantMembership.findOneAndUpdate(
        { tenantId: activeTenantId, userId: user._id },
        {
          $set: {
            role: user.role,
            status: "Active",
            acceptedAt: new Date(),
          },
        },
        { upsert: true }
      );
    }

    // Onboarding Flow 1c: "Tenant becomes active once the Tenant Admin accepts."
    if (user.role === "TenantAdmin" && activeTenantId) {
      const tenant = await Tenant.findById(activeTenantId);
      if (tenant && tenant.status === "Pending") {
        tenant.status = "Active";
        await tenant.save();

        await AuditLog.create({
          tenantId: tenant._id as Types.ObjectId,
          actorId: user._id,
          actorEmail: user.email,
          action: "TENANT_ACTIVATED",
          entity: "Tenant",
          entityId: tenant._id.toString(),
          before: { status: "Pending" },
          after: { status: "Active" },
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
        });
      }
    }

    await AuditLog.create({
      tenantId: activeTenantId,
      actorId: user._id,
      actorEmail: user.email,
      action: "USER_INVITATION_ACCEPTED",
      entity: "User",
      entityId: user._id.toString(),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    const allMemberships = await TenantMembership.find({
      userId: user._id,
      status: "Active",
    }).select("tenantId");
    const tenantIds = allMemberships.map((m) => m.tenantId.toString());

    const secret = process.env.JWT_SECRET || "default_jwt_secret_dev";
    const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

    const authToken = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        tenantId: activeTenantId?.toString(),
        tenantIds,
        companyId: user.companyId?.toString(),
      },
      secret,
      { expiresIn: expiresIn as jwt.SignOptions["expiresIn"] }
    );

    return sendSuccess(res, {
      message: "Invitation accepted successfully. Your account is now active.",
      token: authToken,
      user: {
        userId: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        tenantId: activeTenantId || null,
        tenantIds,
        companyId: user.companyId || null,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Toggle user active/deactivated status (SuperAdmin or TenantAdmin)
 */
export async function updateUserStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const actorId = req.user?.userId;
    const actorRole = req.user?.role;
    const actorEmail = req.user?.email || "unknown";

    if (actorId === id && status === "Deactivated") {
      return sendError(
        res,
        "You cannot deactivate your own account.",
        400,
        "SELF_DEACTIVATION_PROHIBITED"
      );
    }

    const user = await User.findById(id);
    if (!user) {
      return sendError(res, "User not found", 404, "USER_NOT_FOUND");
    }

    const targetRole = normalizeUserRole(user.role);

    if (actorRole === "TenantAdmin") {
      if (targetRole === "SuperAdmin" || targetRole === "TenantAdmin") {
        return sendError(
          res,
          "Tenant Admins cannot modify TenantAdmin or SuperAdmin accounts.",
          403,
          "FORBIDDEN"
        );
      }

      const activeTenantId = req.user?.tenantId;
      if (!activeTenantId) {
        return sendError(res, "No active tenant associated with your account.", 403, "FORBIDDEN");
      }

      const membership = await TenantMembership.findOne({
        tenantId: new Types.ObjectId(activeTenantId),
        userId: user._id,
      });

      if (!membership && user.tenantId?.toString() !== activeTenantId) {
        return sendError(
          res,
          "Access denied. You cannot modify users outside your tenant.",
          403,
          "CROSS_TENANT_ACCESS_DENIED"
        );
      }

      if (membership) {
        membership.status = status === "Active" ? "Active" : "Deactivated";
        await membership.save();
      }
    } else if (actorRole === "SuperAdmin" && targetRole === "SuperAdmin" && status === "Deactivated") {
      const superAdminCount = await User.countDocuments({ role: "SuperAdmin", status: "Active" });
      if (superAdminCount <= 1) {
        return sendError(
          res,
          "Cannot deactivate the sole active Super Administrator of the platform.",
          400,
          "SOLE_SUPER_ADMIN_ACTION_PROHIBITED"
        );
      }
    }

    const previousStatus = user.status;
    user.status = status;
    await user.save();

    await AuditLog.create({
      tenantId: req.user?.tenantId ? new Types.ObjectId(req.user.tenantId) : user.tenantId,
      actorId,
      actorEmail,
      action: "USER_STATUS_UPDATED",
      entity: "User",
      entityId: user._id.toString(),
      before: { status: previousStatus },
      after: { status: user.status },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    await NotificationService.onUserStatusChanged(user, previousStatus, {
      id: actorId || "",
      email: actorEmail,
    });

    return sendSuccess(res, {
      message: `User status updated to '${status}'`,
      user: {
        id: user._id,
        email: user.email,
        status: user.status,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Reassign user role (SuperAdmin only)
 */
export async function updateUserRole(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const role = normalizeUserRole(req.body.role);
    const actorId = req.user?.userId;
    const actorRole = req.user?.role;
    const actorEmail = req.user?.email || "unknown";

    if (actorRole !== "SuperAdmin") {
      return sendError(
        res,
        "Only Super Administrators can reassign user roles.",
        403,
        "SUPER_ADMIN_REQUIRED"
      );
    }

    const user = await User.findById(id);
    if (!user) {
      return sendError(res, "User not found", 404, "USER_NOT_FOUND");
    }

    const currentRole = normalizeUserRole(user.role);

    if (actorId === id && currentRole === "SuperAdmin" && role !== "SuperAdmin") {
      return sendError(
        res,
        "You cannot demote your own Super Administrator account.",
        400,
        "SELF_DEMOTION_PROHIBITED"
      );
    }

    if (currentRole === "SuperAdmin" && role !== "SuperAdmin") {
      const superAdminCount = await User.countDocuments({ role: "SuperAdmin", status: "Active" });
      if (superAdminCount <= 1) {
        return sendError(
          res,
          "Cannot demote the sole active Super Administrator of the platform.",
          400,
          "SOLE_SUPER_ADMIN_DEMOTION_PROHIBITED"
        );
      }
    }

    if (role === "TenantAdmin" && !user.tenantId && !user.companyId) {
      return sendError(
        res,
        "Cannot promote user to TenantAdmin without an associated tenantId.",
        400,
        "TENANT_ASSOCIATION_REQUIRED"
      );
    }

    const previousRole = user.role;
    user.role = role;
    await user.save();

    await AuditLog.create({
      tenantId: user.tenantId,
      actorId,
      actorEmail,
      action: "USER_ROLE_UPDATED",
      entity: "User",
      entityId: user._id.toString(),
      before: { role: previousRole },
      after: { role: user.role },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return sendSuccess(res, {
      message: `User role updated to '${role}'`,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin-initiated password reset token generation (SuperAdmin or TenantAdmin)
 */
export async function adminResetPassword(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const actorId = req.user?.userId;
    const actorRole = req.user?.role;
    const actorEmail = req.user?.email || "admin";

    const user = await User.findById(id);
    if (!user) {
      return sendError(res, "User not found", 404, "USER_NOT_FOUND");
    }

    const targetRole = normalizeUserRole(user.role);

    if (actorRole === "TenantAdmin") {
      if (targetRole === "SuperAdmin" || targetRole === "TenantAdmin") {
        return sendError(
          res,
          "Tenant Admins cannot reset password for TenantAdmin or SuperAdmin accounts.",
          403,
          "FORBIDDEN"
        );
      }
      const activeTenantId = req.user?.tenantId;
      const membership = activeTenantId
        ? await TenantMembership.findOne({
            tenantId: new Types.ObjectId(activeTenantId),
            userId: user._id,
          })
        : null;

      if (!membership && user.tenantId?.toString() !== activeTenantId) {
        return sendError(
          res,
          "Access denied. You cannot reset password for users outside your tenant.",
          403,
          "CROSS_TENANT_ACCESS_DENIED"
        );
      }
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = expires;
    await user.save();

    await AuditLog.create({
      tenantId: req.user?.tenantId ? new Types.ObjectId(req.user.tenantId) : user.tenantId,
      actorId,
      actorEmail,
      action: "ADMIN_PASSWORD_RESET_INITIATED",
      entity: "User",
      entityId: user._id.toString(),
      after: {
        targetUserEmail: user.email,
        expiresAt: expires,
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    const resetUrl = `${process.env.APP_URL || "http://localhost:3000"}/reset-password?token=${rawToken}`;

    return sendSuccess(res, {
      message: `Password reset token generated for user '${user.email}'.`,
      resetToken: rawToken,
      resetUrl,
      expiresAt: expires,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin update of user profile details (SuperAdmin or TenantAdmin)
 */
export async function adminUpdateUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const actorId = req.user?.userId;
    const actorRole = req.user?.role;
    const actorEmail = req.user?.email || "admin";
    const { name, phone, tenantId, companyId, role, status } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return sendError(res, "User not found", 404, "USER_NOT_FOUND");
    }

    const targetRole = normalizeUserRole(user.role);

    if (actorRole === "TenantAdmin") {
      if (targetRole === "SuperAdmin" || targetRole === "TenantAdmin") {
        return sendError(
          res,
          "Tenant Admins cannot modify TenantAdmin or SuperAdmin accounts.",
          403,
          "FORBIDDEN"
        );
      }

      const activeTenantId = req.user?.tenantId;
      const membership = activeTenantId
        ? await TenantMembership.findOne({
            tenantId: new Types.ObjectId(activeTenantId),
            userId: user._id,
          })
        : null;

      if (!membership && user.tenantId?.toString() !== activeTenantId) {
        return sendError(
          res,
          "Access denied. You cannot modify users outside your tenant.",
          403,
          "CROSS_TENANT_ACCESS_DENIED"
        );
      }

      if (role !== undefined || tenantId !== undefined || companyId !== undefined) {
        return sendError(
          res,
          "Tenant Admins cannot reassign roles or tenant associations.",
          403,
          "PRIVILEGE_ESCALATION_DENIED"
        );
      }
    } else if (actorRole === "SuperAdmin") {
      if (actorId === id && ((role && role !== "SuperAdmin") || (status && status !== "Active"))) {
        const superAdminCount = await User.countDocuments({ role: "SuperAdmin", status: "Active" });
        if (superAdminCount <= 1) {
          return sendError(
            res,
            "Cannot demote or deactivate the sole active Super Administrator of the platform.",
            400,
            "SOLE_SUPER_ADMIN_ACTION_PROHIBITED"
          );
        }
      }
    }

    const before = {
      name: user.name,
      phone: user.phone,
      tenantId: user.tenantId,
      companyId: user.companyId,
      role: user.role,
      status: user.status,
    };

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (actorRole === "SuperAdmin" && tenantId !== undefined) user.tenantId = tenantId;
    if (actorRole === "SuperAdmin" && companyId !== undefined) user.companyId = companyId;
    if (actorRole === "SuperAdmin" && role !== undefined) user.role = normalizeUserRole(role);
    if (status !== undefined) user.status = status;

    await user.save();

    await AuditLog.create({
      tenantId: req.user?.tenantId ? new Types.ObjectId(req.user.tenantId) : user.tenantId,
      actorId,
      actorEmail,
      action: "USER_UPDATED_BY_ADMIN",
      entity: "User",
      entityId: user._id.toString(),
      before,
      after: {
        name: user.name,
        phone: user.phone,
        tenantId: user.tenantId,
        companyId: user.companyId,
        role: user.role,
        status: user.status,
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return sendSuccess(res, {
      message: `User '${user.email}' updated successfully.`,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        status: user.status,
        tenantId: user.tenantId,
        companyId: user.companyId,
      },
    });
  } catch (err) {
    next(err);
  }
}
