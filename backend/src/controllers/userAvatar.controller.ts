import { Request, Response, NextFunction } from "express";
import { User } from "../models/User.js";
import { AuditLog } from "../models/AuditLog.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { validateAndNormalizeImage } from "../utils/imageValidation.js";
import {
  uploadImageBuffer,
  deleteCloudinaryAsset,
  CloudinaryNotConfiguredError,
} from "../services/cloudinary.service.js";

function mapImageError(err: unknown, res: Response) {
  const e = err as { code?: string; message?: string };
  if (err instanceof CloudinaryNotConfiguredError || e.code === "CLOUDINARY_NOT_CONFIGURED") {
    return sendError(res, e.message || "Cloudinary is not configured", 503, "CLOUDINARY_NOT_CONFIGURED");
  }
  if (
    e.code === "EMPTY_IMAGE" ||
    e.code === "IMAGE_TOO_LARGE" ||
    e.code === "INVALID_IMAGE_CONTENT" ||
    e.code === "INVALID_IMAGE_FORMAT"
  ) {
    return sendError(res, e.message || "Invalid image", 400, e.code);
  }
  if (e.code === "CLOUDINARY_DELETE_SCOPE") {
    return sendError(res, e.message || "Invalid asset scope", 400, e.code);
  }
  return null;
}

/**
 * Ensures actor may manage the target user's avatar.
 * Self: always. SuperAdmin: any. Admin: same organization only.
 */
function canManageAvatar(req: Request, target: { _id: { toString(): string }; companyId?: { toString(): string } | null }) {
  const actorId = req.user?.userId;
  const role = req.user?.role;

  if (actorId && actorId.toString() === target._id.toString()) {
    return true;
  }
  if (role === "SuperAdmin") {
    return true;
  }
  if (role === "Admin") {
    const actorCompany = req.user?.companyId?.toString();
    const targetCompany = target.companyId?.toString();
    return Boolean(actorCompany && targetCompany && actorCompany === targetCompany);
  }
  return false;
}

async function replaceUserAvatar(
  req: Request,
  res: Response,
  userId: string
): Promise<Response | void> {
  let newlyUploadedPublicId: string | null = null;

  try {
    const actorId = req.user?.userId;
    const actorEmail = req.user?.email || "unknown";

    if (!req.file?.buffer) {
      return sendError(res, "Image file is required (multipart field: file)", 400, "FILE_REQUIRED");
    }

    const user = await User.findById(userId);
    if (!user) {
      return sendError(res, "User not found", 404, "USER_NOT_FOUND");
    }

    if (!canManageAvatar(req, user)) {
      return sendError(res, "You are not allowed to update this user's avatar", 403, "FORBIDDEN");
    }

    const previousPublicId = user.avatar?.publicId || null;
    const previousUrl = user.avatar?.url || null;

    const normalized = await validateAndNormalizeImage(req.file.buffer, { maxDimension: 512 });

    const uploaded = await uploadImageBuffer({
      buffer: normalized.buffer,
      kind: "user-avatar",
      entityId: user._id.toString(),
      mimeType: normalized.mimeType,
    });
    newlyUploadedPublicId = uploaded.publicId;

    const filter: Record<string, unknown> = { _id: user._id };
    if (previousPublicId) {
      filter["avatar.publicId"] = previousPublicId;
    } else {
      filter.$or = [
        { avatar: { $exists: false } },
        { avatar: null },
        { "avatar.publicId": { $exists: false } },
        { "avatar.publicId": null },
      ];
    }

    const updated = await User.findOneAndUpdate(
      filter,
      {
        $set: {
          avatar: {
            url: uploaded.url,
            publicId: uploaded.publicId,
          },
        },
      },
      { new: true }
    ).select("-passwordHash -mfa.secret -mfa.tempSecret -mfa.recoveryCodes");

    if (!updated) {
      try {
        await deleteCloudinaryAsset(uploaded.publicId);
      } catch {
        /* best-effort */
      }
      newlyUploadedPublicId = null;
      return sendError(
        res,
        "Avatar was updated by another request. Please retry.",
        409,
        "AVATAR_CONFLICT"
      );
    }

    newlyUploadedPublicId = null;

    if (previousPublicId && previousPublicId !== uploaded.publicId) {
      try {
        await deleteCloudinaryAsset(previousPublicId);
      } catch (cleanupErr) {
        console.warn(
          `[cloudinary] Failed to delete previous avatar publicId=${previousPublicId}:`,
          (cleanupErr as Error)?.message || cleanupErr
        );
      }
    }

    await AuditLog.create({
      actorId,
      actorEmail,
      action: "USER_AVATAR_UPDATED",
      entity: "User",
      entityId: user._id.toString(),
      before: previousPublicId ? { avatar: { url: previousUrl, publicId: previousPublicId } } : { avatar: null },
      after: { avatar: { url: uploaded.url, publicId: uploaded.publicId } },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return sendSuccess(res, {
      avatar: {
        url: uploaded.url,
        publicId: uploaded.publicId,
      },
      user: {
        _id: updated._id,
        name: updated.name,
        email: updated.email,
        avatar: updated.avatar,
      },
    });
  } catch (err) {
    if (newlyUploadedPublicId) {
      try {
        await deleteCloudinaryAsset(newlyUploadedPublicId);
      } catch {
        /* best-effort */
      }
    }
    const handled = mapImageError(err, res);
    if (handled) return handled;
    throw err;
  }
}

async function removeUserAvatar(
  req: Request,
  res: Response,
  userId: string
): Promise<Response | void> {
  try {
    const actorId = req.user?.userId;
    const actorEmail = req.user?.email || "unknown";

    const user = await User.findById(userId);
    if (!user) {
      return sendError(res, "User not found", 404, "USER_NOT_FOUND");
    }

    if (!canManageAvatar(req, user)) {
      return sendError(res, "You are not allowed to remove this user's avatar", 403, "FORBIDDEN");
    }

    const previousPublicId = user.avatar?.publicId || null;
    const previousUrl = user.avatar?.url || null;

    if (!previousPublicId && !previousUrl) {
      return sendSuccess(res, {
        message: "No avatar to remove",
        avatar: null,
      });
    }

    await User.findByIdAndUpdate(user._id, { $unset: { avatar: 1 } });

    if (previousPublicId) {
      try {
        await deleteCloudinaryAsset(previousPublicId);
      } catch (cleanupErr) {
        console.warn(
          `[cloudinary] Failed to delete avatar publicId=${previousPublicId}:`,
          (cleanupErr as Error)?.message || cleanupErr
        );
      }
    }

    await AuditLog.create({
      actorId,
      actorEmail,
      action: "USER_AVATAR_REMOVED",
      entity: "User",
      entityId: user._id.toString(),
      before: { avatar: { url: previousUrl, publicId: previousPublicId } },
      after: { avatar: null },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return sendSuccess(res, {
      message: "Avatar removed",
      avatar: null,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: null,
      },
    });
  } catch (err) {
    const handled = mapImageError(err, res);
    if (handled) return handled;
    throw err;
  }
}

/** POST /users/me/avatar */
export async function uploadMyAvatar(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return sendError(res, "Authentication required", 401, "UNAUTHORIZED");
    }
    return await replaceUserAvatar(req, res, userId);
  } catch (err) {
    next(err);
  }
}

/** DELETE /users/me/avatar */
export async function deleteMyAvatar(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return sendError(res, "Authentication required", 401, "UNAUTHORIZED");
    }
    return await removeUserAvatar(req, res, userId);
  } catch (err) {
    next(err);
  }
}

/** POST /users/:id/avatar — SuperAdmin / Admin (scoped) */
export async function uploadUserAvatar(req: Request, res: Response, next: NextFunction) {
  try {
    return await replaceUserAvatar(req, res, req.params.id);
  } catch (err) {
    next(err);
  }
}

/** DELETE /users/:id/avatar */
export async function deleteUserAvatar(req: Request, res: Response, next: NextFunction) {
  try {
    return await removeUserAvatar(req, res, req.params.id);
  } catch (err) {
    next(err);
  }
}
