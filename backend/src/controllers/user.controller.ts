import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User, IUser } from "../models/User.js";
import { AuditLog } from "../models/AuditLog.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { NotificationService } from "../services/notification.service.js";

/**
 * Get profile of currently authenticated user
 */
export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId)
      .select("-passwordHash -mfa.secret -mfa.tempSecret -mfa.recoveryCodes")
      .populate("companyId", "name domain verificationStatus status");

    if (!user) {
      return sendError(res, "User not found", 404, "USER_NOT_FOUND");
    }

    return sendSuccess(res, user);
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
 * List all users with filtering, search, and pagination (SuperAdmin or Admin)
 * SuperAdmins see all users across all organizations.
 * Admins are strictly scoped to users in their own organization.
 */
export async function getUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    // Organization Admins are strictly scoped to their own company
    if (req.user?.role === "Admin") {
      if (!req.user.companyId) {
        return sendSuccess(res, [], 200, { page, limit, total: 0, totalPages: 0 });
      }
      filter.companyId = req.user.companyId;
    } else if (req.query.companyId && typeof req.query.companyId === "string") {
      // SuperAdmin can filter by specific organization
      filter.companyId = req.query.companyId;
    }

    if (req.query.role && typeof req.query.role === "string") {
      filter.role = req.query.role;
    }

    if (req.query.status && typeof req.query.status === "string") {
      filter.status = req.query.status;
    }

    if (req.query.search && typeof req.query.search === "string") {
      const regex = new RegExp(req.query.search.trim(), "i");
      filter.$or = [{ name: regex }, { email: regex }];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-passwordHash -mfa.secret -mfa.tempSecret -mfa.recoveryCodes")
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
 * Get individual user by ID (SuperAdmin or Admin)
 */
export async function getUserById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const user = await User.findById(id)
      .select("-passwordHash -mfa.secret -mfa.tempSecret -mfa.recoveryCodes")
      .populate("companyId", "name domain verificationStatus status");

    if (!user) {
      return sendError(res, "User not found", 404, "USER_NOT_FOUND");
    }

    // Tenant isolation: Org Admins cannot inspect users belonging to other organizations
    if (req.user?.role === "Admin") {
      if (!user.companyId || user.companyId.toString() !== req.user.companyId) {
        return sendError(
          res,
          "Access denied. You cannot view users outside your organization.",
          403,
          "CROSS_COMPANY_ACCESS_DENIED"
        );
      }
    }

    return sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
}

/**
 * Invite a new user, assessor, or admin (SuperAdmin or Admin)
 * SuperAdmins can invite Admins for a specific company, Assessors, or other SuperAdmins.
 * Org Admins can only invite Assessors or MembershipApprovers for their own company.
 */
export async function inviteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, name, role, companyId } = req.body;
    const actorId = req.user?.userId;
    const actorRole = req.user?.role;
    const actorEmail = req.user?.email || "unknown";

    let targetCompanyId = companyId;

    // RBAC Guardrails
    if (actorRole === "Admin") {
      // Organization Admins cannot invite SuperAdmins or other Admins
      if (role === "SuperAdmin" || role === "Admin") {
        return sendError(
          res,
          "Organization Admins cannot invite Admin or SuperAdmin accounts.",
          403,
          "PRIVILEGE_ESCALATION_DENIED"
        );
      }
      // Force companyId to actor's organization to prevent cross-tenant user creation
      targetCompanyId = req.user?.companyId;
      if (!targetCompanyId) {
        return sendError(
          res,
          "Your administrative account is not linked to an organization.",
          400,
          "COMPANY_NOT_LINKED"
        );
      }
    } else if (actorRole === "SuperAdmin") {
      // When SuperAdmin creates an Admin, an organization MUST be specified
      if (role === "Admin" && !companyId) {
        return sendError(
          res,
          "Organization ID (companyId) is required when inviting an Admin for an organization.",
          400,
          "COMPANY_ID_REQUIRED"
        );
      }
    }

    const cleanEmail = email.toLowerCase().trim();

    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return sendError(
        res,
        "An account with this email address already exists",
        409,
        "USER_EXISTS"
      );
    }

    // Generate cryptographic invitation token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expires = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours validity

    const user = await User.create({
      email: cleanEmail,
      name,
      role,
      companyId: targetCompanyId || undefined,
      status: "Active",
      invitationToken: hashedToken,
      invitationExpires: expires,
      invitedBy: actorId,
    });

    await AuditLog.create({
      actorId,
      actorEmail,
      action: "USER_INVITED",
      entity: "User",
      entityId: user._id.toString(),
      after: { email: user.email, role: user.role, companyId: user.companyId },
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
        message: "User invitation generated successfully",
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          companyId: user.companyId,
          invitationExpires: expires,
        },
        invitationToken: rawToken, // Provided for direct testing & outbound delivery
      },
      201
    );
  } catch (err) {
    next(err);
  }
}

/**
 * Accept invitation and configure account password (Public endpoint)
 */
export async function acceptInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, password } = req.body;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
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

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);
    user.passwordHash = await bcrypt.hash(password, saltRounds);
    user.invitationToken = undefined;
    user.invitationExpires = undefined;
    user.status = "Active";
    await user.save();

    await AuditLog.create({
      actorId: user._id,
      actorEmail: user.email,
      action: "USER_INVITATION_ACCEPTED",
      entity: "User",
      entityId: user._id.toString(),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    const secret = process.env.JWT_SECRET || "default_jwt_secret_dev";
    const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

    const authToken = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
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
        companyId: user.companyId || null,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Toggle user active/deactivated status (SuperAdmin or Admin)
 * SuperAdmins can toggle any Admin or user.
 * Org Admins can only toggle Assessors/users within their own organization.
 */
export async function updateUserStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const actorId = req.user?.userId;
    const actorRole = req.user?.role;
    const actorEmail = req.user?.email || "unknown";

    // Safety Guard: Prevent user from deactivating own account
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

    // Role-based boundary enforcement
    if (actorRole === "Admin") {
      // Organization Admin cannot touch SuperAdmin or other Admins
      if (user.role === "SuperAdmin" || user.role === "Admin") {
        return sendError(
          res,
          "Organization Admins cannot modify Admin or SuperAdmin accounts.",
          403,
          "FORBIDDEN"
        );
      }
      // Must be within own organization
      if (!user.companyId || user.companyId.toString() !== req.user?.companyId) {
        return sendError(
          res,
          "Access denied. You cannot modify users outside your organization.",
          403,
          "CROSS_COMPANY_ACCESS_DENIED"
        );
      }
    } else if (actorRole === "SuperAdmin" && user.role === "SuperAdmin" && status === "Deactivated") {
      // Prevent deactivating sole active SuperAdmin
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
 * Only SuperAdmins have authority to elevate or demote roles.
 */
export async function updateUserRole(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { role } = req.body;
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

    // Safety Guard: Prevent user from demoting their own SuperAdmin account
    if (actorId === id && user.role === "SuperAdmin" && role !== "SuperAdmin") {
      return sendError(
        res,
        "You cannot demote your own Super Administrator account.",
        400,
        "SELF_DEMOTION_PROHIBITED"
      );
    }

    // Safety Guard: Prevent last SuperAdmin from demoting themselves or others
    if (user.role === "SuperAdmin" && role !== "SuperAdmin") {
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

    // Guard: An Admin must belong to an organization
    if (role === "Admin" && !user.companyId) {
      return sendError(
        res,
        "Cannot promote user to Organization Admin without an associated organization (companyId).",
        400,
        "COMPANY_ASSOCIATION_REQUIRED"
      );
    }

    const previousRole = user.role;
    user.role = role;
    await user.save();

    await AuditLog.create({
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
 * Admin-initiated password reset token generation (SuperAdmin or Admin)
 * SuperAdmin can reset for anyone.
 * Org Admin can only reset for users in their own organization.
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

    // Org Admin boundary check
    if (actorRole === "Admin") {
      if (user.role === "SuperAdmin" || user.role === "Admin") {
        return sendError(
          res,
          "Organization Admins cannot reset password for Admin or SuperAdmin accounts.",
          403,
          "FORBIDDEN"
        );
      }
      if (!user.companyId || user.companyId.toString() !== req.user?.companyId) {
        return sendError(
          res,
          "Access denied. You cannot reset password for users outside your organization.",
          403,
          "CROSS_COMPANY_ACCESS_DENIED"
        );
      }
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = expires;
    await user.save();

    await AuditLog.create({
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
 * Admin update of user profile details (SuperAdmin or Admin)
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
    const { name, phone, companyId, role, status } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return sendError(res, "User not found", 404, "USER_NOT_FOUND");
    }

    // Role-based isolation
    if (actorRole === "Admin") {
      if (user.role === "SuperAdmin" || user.role === "Admin") {
        return sendError(
          res,
          "Organization Admins cannot modify Admin or SuperAdmin accounts.",
          403,
          "FORBIDDEN"
        );
      }
      if (!user.companyId || user.companyId.toString() !== req.user?.companyId) {
        return sendError(
          res,
          "Access denied. You cannot modify users outside your organization.",
          403,
          "CROSS_COMPANY_ACCESS_DENIED"
        );
      }
      // Org Admins cannot alter roles or company associations
      if (role !== undefined || companyId !== undefined) {
        return sendError(
          res,
          "Organization Admins cannot reassign roles or company associations.",
          403,
          "PRIVILEGE_ESCALATION_DENIED"
        );
      }
    } else if (actorRole === "SuperAdmin") {
      // Protection: Prevent last SuperAdmin from demoting or deactivating themselves
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
      companyId: user.companyId,
      role: user.role,
      status: user.status,
    };

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (actorRole === "SuperAdmin" && companyId !== undefined) user.companyId = companyId;
    if (actorRole === "SuperAdmin" && role !== undefined) user.role = role;
    if (status !== undefined) user.status = status;

    await user.save();

    await AuditLog.create({
      actorId,
      actorEmail,
      action: "USER_UPDATED_BY_ADMIN",
      entity: "User",
      entityId: user._id.toString(),
      before,
      after: {
        name: user.name,
        phone: user.phone,
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
        companyId: user.companyId,
      },
    });
  } catch (err) {
    next(err);
  }
}
