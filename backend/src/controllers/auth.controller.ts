import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { AuditLog } from "../models/AuditLog.js";

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, name } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return sendError(res, "An account with this email already exists", 409, "USER_EXISTS");
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      name,
      role: "Assessor",
    });

    await AuditLog.create({
      actorId: user._id,
      actorEmail: user.email,
      action: "USER_REGISTERED",
      entity: "User",
      entityId: user._id.toString(),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return sendSuccess(
      res,
      {
        userId: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      201
    );
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return sendError(res, "Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    if (user.status === "Deactivated") {
      return sendError(res, "Account is deactivated", 403, "ACCOUNT_DEACTIVATED");
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      return sendError(
        res,
        "Account is temporarily locked due to multiple failed login attempts",
        423,
        "ACCOUNT_LOCKED"
      );
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      user.loginAttempts += 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lock
      }
      await user.save();
      return sendError(res, "Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    await user.save();

    const secret = process.env.JWT_SECRET || "default_jwt_secret_dev";
    const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        companyId: user.companyId?.toString(),
      },
      secret,
      { expiresIn: expiresIn as jwt.SignOptions["expiresIn"] }
    );

    await AuditLog.create({
      actorId: user._id,
      actorEmail: user.email,
      action: "USER_LOGIN",
      entity: "User",
      entityId: user._id.toString(),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return sendSuccess(res, {
      token,
      user: {
        userId: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        mfaEnabled: user.mfa.enabled,
      },
    });
  } catch (err) {
    next(err);
  }
}
