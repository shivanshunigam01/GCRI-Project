import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { ApiKey } from "../models/ApiKey.js";
import { sendError } from "../utils/response.js";
import { UserRole } from "../models/User.js";

/**
 * Middleware enabling service-to-service Machine-to-Machine (M2M) API Key authentication.
 * Accepts API keys via header 'x-api-key' or 'Authorization: ApiKey <key>'.
 */
export async function authenticateApiKey(req: Request, res: Response, next: NextFunction) {
  let rawKey: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("ApiKey ")) {
    rawKey = authHeader.split(" ")[1];
  } else if (req.headers["x-api-key"]) {
    rawKey = req.headers["x-api-key"] as string;
  }

  if (!rawKey) {
    return sendError(res, "API key missing or malformed", 401, "API_KEY_REQUIRED");
  }

  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  try {
    const apiKey = await ApiKey.findOne({ keyHash, isActive: true });
    if (!apiKey) {
      return sendError(res, "Invalid or inactive API key", 401, "INVALID_API_KEY");
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return sendError(res, "API key has expired", 401, "API_KEY_EXPIRED");
    }

    // Attach synthetic User session for downstream handlers
    req.user = {
      userId: apiKey.createdBy.toString(),
      email: `m2m:${apiKey.name}`,
      role: (apiKey.role === "ReadOnly" ? "Assessor" : apiKey.role) as UserRole,
      companyId: apiKey.companyId.toString(),
      scope: "authenticated",
    };

    // Asynchronously record last usage
    ApiKey.updateOne({ _id: apiKey._id }, { $set: { lastUsedAt: new Date() } }).catch((err) => {
      console.error("[ApiKeyAuth] Error updating lastUsedAt:", err);
    });

    next();
  } catch (err) {
    next(err);
  }
}
