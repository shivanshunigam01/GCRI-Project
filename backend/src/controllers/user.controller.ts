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
 * List all users with filtering, search, and pagination (Admin only)
 */
export async function getUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (req.query.role && typeof req.query.role === "string") {
      filter.role = req.query.role;
    }

    if (req.query.status && typeof req.query.status === "string") {
      filter.status = req.query.status;
    }

    if (req.query.companyId && typeof req.query.companyId === "string") {
      filter.companyId = req.query.companyId;
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
 * Get individual user by ID (Admin only)
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

    return sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
}

/**
 * Invite a new user or assessor (Admin only)
 */
export async function inviteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, name, role, companyId } = req.body;
    const actorId = req.user?.userId;
    const actorEmail = req.user?.email || "unknown";

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
      companyId: companyId || undefined,
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
 * Toggle user active/deactivated status (Admin only)
 */
export async function updateUserStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const actorId = req.user?.userId;
    const actorEmail = req.user?.email || "unknown";

    // Safety Guard: Prevent Admin from deactivating own account
    if (actorId === id && status === "Deactivated") {
      return sendError(
        res,
        "You cannot deactivate your own administrative account.",
        400,
        "SELF_DEACTIVATION_PROHIBITED"
      );
    }

    const user = await User.findById(id);
    if (!user) {
      return sendError(res, "User not found", 404, "USER_NOT_FOUND");
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
 * Reassign user role (Admin only)
 */
export async function updateUserRole(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const actorId = req.user?.userId;
    const actorEmail = req.user?.email || "unknown";

    const user = await User.findById(id);
    if (!user) {
      return sendError(res, "User not found", 404, "USER_NOT_FOUND");
    }

    // Safety Guard: Prevent last Admin from demoting themselves
    if (actorId === id && role !== "Admin") {
      const adminCount = await User.countDocuments({ role: "Admin", status: "Active" });
      if (adminCount <= 1) {
        return sendError(
          res,
          "Cannot demote the sole active administrator of the platform.",
          400,
          "SOLE_ADMIN_DEMOTION_PROHIBITED"
        );
      }
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
