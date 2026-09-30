import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";
import { User, IUser } from "../models/User.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { AuditLog } from "../models/AuditLog.js";

/**
 * Register a new Assessor or User
 */
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

/**
 * User login with credentials, account lockout, and MFA TOTP verification
 */
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, mfaToken } = req.body;

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
        "Account is temporarily locked due to multiple failed login attempts. Please try again later.",
        423,
        "ACCOUNT_LOCKED"
      );
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      user.loginAttempts += 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lockout
      }
      await user.save();
      return sendError(res, "Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    // MFA Challenge if MFA is enabled on user account
    if (user.mfa?.enabled) {
      if (!mfaToken) {
        return sendError(
          res,
          "Multi-factor authentication code is required",
          401,
          "MFA_REQUIRED",
          { mfaRequired: true }
        );
      }

      // Check TOTP code against secret
      let isMfaValid = false;
      if (user.mfa.secret) {
        const verifyResult = verifySync({
          token: mfaToken,
          secret: user.mfa.secret,
        });
        isMfaValid = verifyResult.valid;
      }

      // If TOTP check failed, test if token is a valid recovery backup code
      if (!isMfaValid && user.mfa.recoveryCodes && user.mfa.recoveryCodes.length > 0) {
        let matchedIndex = -1;
        for (let i = 0; i < user.mfa.recoveryCodes.length; i++) {
          const isRecoveryMatch = await bcrypt.compare(mfaToken, user.mfa.recoveryCodes[i]);
          if (isRecoveryMatch) {
            matchedIndex = i;
            isMfaValid = true;
            break;
          }
        }

        // Consume used recovery code
        if (matchedIndex !== -1) {
          user.mfa.recoveryCodes.splice(matchedIndex, 1);
          await user.save();
        }
      }

      if (!isMfaValid) {
        user.loginAttempts += 1;
        if (user.loginAttempts >= 5) {
          user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        }
        await user.save();
        return sendError(res, "Invalid MFA verification or recovery code", 401, "INVALID_MFA_TOKEN");
      }
    } else if (user.role === "Admin") {
      // Milestone 1.3: MFA Enforcement for Admin Accounts
      // Admin accounts without MFA enabled must complete enrollment
      return sendError(
        res,
        "Multi-factor authentication is mandatory for Admin accounts. Please enroll in MFA before logging in.",
        403,
        "ADMIN_MFA_ENFORCEMENT_REQUIRED",
        { mfaSetupRequired: true, userId: user._id }
      );
    }

    // Login successful: reset lockout counters
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
        mfaEnabled: user.mfa?.enabled || false,
        companyId: user.companyId || null,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Step 1: Initiate MFA Setup (Generates TOTP secret and QR Code)
 */
export async function setupMfa(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId);
    if (!user) {
      return sendError(res, "User not found", 404, "USER_NOT_FOUND");
    }

    const secret = generateSecret();
    const serviceName = process.env.MFA_SERVICE_NAME || "GRAICE";
    const otpUri = generateURI({
      label: user.email,
      issuer: serviceName,
      secret,
    });

    const qrCodeUrl = await QRCode.toDataURL(otpUri);

    user.mfa.tempSecret = secret;
    await user.save();

    return sendSuccess(res, {
      secret,
      qrCodeUrl,
      issuer: serviceName,
      account: user.email,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Step 2: Confirm MFA Setup with the first 6-digit TOTP code
 */
export async function verifyMfa(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { token } = req.body;

    const user = await User.findById(userId);
    if (!user || !user.mfa.tempSecret) {
      return sendError(
        res,
        "MFA setup has not been initiated. Please call /mfa/generate first.",
        400,
        "MFA_SETUP_NOT_INITIATED"
      );
    }

    const verifyResult = verifySync({
      token,
      secret: user.mfa.tempSecret,
    });

    if (!verifyResult.valid) {
      return sendError(
        res,
        "Invalid 6-digit verification code. Please check your authenticator app and try again.",
        400,
        "INVALID_MFA_TOKEN"
      );
    }

    // Generate 8 single-use recovery backup codes
    const unhashedRecoveryCodes: string[] = [];
    const hashedRecoveryCodes: string[] = [];

    for (let i = 0; i < 8; i++) {
      const code = crypto.randomBytes(4).toString("hex"); // e.g. "a9f8b2c1"
      unhashedRecoveryCodes.push(code);
      const hashed = await bcrypt.hash(code, 10);
      hashedRecoveryCodes.push(hashed);
    }

    user.mfa.enabled = true;
    user.mfa.secret = user.mfa.tempSecret;
    user.mfa.tempSecret = undefined;
    user.mfa.recoveryCodes = hashedRecoveryCodes;
    await user.save();

    await AuditLog.create({
      actorId: user._id,
      actorEmail: user.email,
      action: "MFA_ENABLED",
      entity: "User",
      entityId: user._id.toString(),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return sendSuccess(res, {
      message: "Multi-Factor Authentication enabled successfully",
      recoveryCodes: unhashedRecoveryCodes,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Disable MFA (requires current password and valid TOTP token)
 */
export async function disableMfa(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { password, token } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return sendError(res, "User not found", 404, "USER_NOT_FOUND");
    }

    if (!user.mfa.enabled || !user.mfa.secret) {
      return sendError(res, "MFA is not currently enabled for this account", 400, "MFA_NOT_ENABLED");
    }

    if (user.role === "Admin") {
      return sendError(
        res,
        "MFA is mandatory for Admin accounts and cannot be disabled.",
        403,
        "ADMIN_MFA_MANDATORY"
      );
    }

    const matchPassword = await bcrypt.compare(password, user.passwordHash);
    if (!matchPassword) {
      return sendError(res, "Invalid password", 401, "INVALID_CREDENTIALS");
    }

    const verifyResult = verifySync({
      token,
      secret: user.mfa.secret,
    });

    if (!verifyResult.valid) {
      return sendError(res, "Invalid MFA token", 400, "INVALID_MFA_TOKEN");
    }

    user.mfa.enabled = false;
    user.mfa.secret = undefined;
    user.mfa.tempSecret = undefined;
    user.mfa.recoveryCodes = [];
    await user.save();

    await AuditLog.create({
      actorId: user._id,
      actorEmail: user.email,
      action: "MFA_DISABLED",
      entity: "User",
      entityId: user._id.toString(),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return sendSuccess(res, {
      message: "Multi-Factor Authentication disabled successfully",
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Forgot password: generates a time-limited crypto reset token
 */
export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    // Anti-enumeration: return identical success message whether user exists or not
    if (!user || user.status === "Deactivated") {
      return sendSuccess(res, {
        message: "If an active account with that email exists, password reset instructions have been dispatched.",
      });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry
    await user.save();

    await AuditLog.create({
      actorId: user._id,
      actorEmail: user.email,
      action: "PASSWORD_RESET_REQUESTED",
      entity: "User",
      entityId: user._id.toString(),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    // Until Milestone 6 email delivery service is configured, log token for development reference
    if (process.env.NODE_ENV !== "production") {
      console.log(`[Auth/Dev] Password Reset Token for ${user.email}: ${rawToken}`);
    }

    return sendSuccess(res, {
      message: "If an active account with that email exists, password reset instructions have been dispatched.",
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Reset password using valid cryptographic reset token
 */
export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, newPassword } = req.body;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return sendError(
        res,
        "Password reset token is invalid or has expired",
        400,
        "INVALID_OR_EXPIRED_TOKEN"
      );
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);
    user.passwordHash = await bcrypt.hash(newPassword, saltRounds);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    await AuditLog.create({
      actorId: user._id,
      actorEmail: user.email,
      action: "PASSWORD_RESET_COMPLETED",
      entity: "User",
      entityId: user._id.toString(),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return sendSuccess(res, {
      message: "Password has been successfully reset. You may now log in with your new password.",
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Change password for authenticated users
 */
export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return sendError(res, "User not found", 404, "USER_NOT_FOUND");
    }

    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) {
      return sendError(res, "Current password does not match", 401, "INVALID_CURRENT_PASSWORD");
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);
    user.passwordHash = await bcrypt.hash(newPassword, saltRounds);
    await user.save();

    await AuditLog.create({
      actorId: user._id,
      actorEmail: user.email,
      action: "PASSWORD_CHANGED",
      entity: "User",
      entityId: user._id.toString(),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return sendSuccess(res, {
      message: "Password changed successfully",
    });
  } catch (err) {
    next(err);
  }
}
