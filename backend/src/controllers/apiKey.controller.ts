import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { ApiKey } from "../models/ApiKey.js";
import { AuditLog } from "../models/AuditLog.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { Company } from "../models/Company.js";

/**
 * Generate a new Machine-to-Machine (M2M) API Key
 */
export async function createApiKey(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, companyId, role = "ReadOnly", expiresInDays, permissions = [] } = req.body;

    if (!name || !companyId) {
      return sendError(res, "Key name and companyId are required", 400, "MISSING_REQUIRED_FIELDS");
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return sendError(res, "Company not found", 404, "COMPANY_NOT_FOUND");
    }

    // Generate cryptographic key: prefix + secret
    const prefix = `grc_${crypto.randomBytes(4).toString("hex")}`;
    const rawSecret = crypto.randomBytes(24).toString("hex");
    const fullKey = `${prefix}_${rawSecret}`;
    const keyHash = crypto.createHash("sha256").update(fullKey).digest("hex");

    let expiresAt: Date | undefined;
    if (expiresInDays && Number(expiresInDays) > 0) {
      expiresAt = new Date(Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000);
    }

    const apiKey = await ApiKey.create({
      name,
      prefix,
      keyHash,
      companyId: company._id,
      role,
      permissions,
      expiresAt,
      isActive: true,
      createdBy: req.user!.userId,
    });

    await AuditLog.create({
      actorId: req.user!.userId,
      actorEmail: req.user!.email,
      action: "API_KEY_CREATED",
      entity: "ApiKey",
      entityId: apiKey._id.toString(),
      after: { name, prefix, role, companyId },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return sendSuccess(
      res,
      {
        message: "API key generated successfully. Store this secret securely; it will NOT be displayed again.",
        apiKey: {
          id: apiKey._id,
          name: apiKey.name,
          prefix: apiKey.prefix,
          rawKey: fullKey, // Secret shown only once
          role: apiKey.role,
          companyId: apiKey.companyId,
          expiresAt: apiKey.expiresAt,
          createdAt: apiKey.createdAt,
        },
      },
      201
    );
  } catch (err) {
    next(err);
  }
}

/**
 * List active API keys (excluding secret hashes)
 */
export async function listApiKeys(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.query;
    const filter: Record<string, unknown> = {};

    if (companyId) {
      filter.companyId = companyId;
    }

    const keys = await ApiKey.find(filter)
      .select("-keyHash")
      .populate("companyId", "name domain")
      .sort({ createdAt: -1 });

    return sendSuccess(res, { keys });
  } catch (err) {
    next(err);
  }
}

/**
 * Revoke/Deactivate an API Key
 */
export async function revokeApiKey(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const key = await ApiKey.findById(id);

    if (!key) {
      return sendError(res, "API key not found", 404, "API_KEY_NOT_FOUND");
    }

    key.isActive = false;
    await key.save();

    await AuditLog.create({
      actorId: req.user!.userId,
      actorEmail: req.user!.email,
      action: "API_KEY_REVOKED",
      entity: "ApiKey",
      entityId: key._id.toString(),
      after: { isActive: false },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return sendSuccess(res, {
      message: `API key "${key.name}" (${key.prefix}) has been revoked.`,
    });
  } catch (err) {
    next(err);
  }
}
