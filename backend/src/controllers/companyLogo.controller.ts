import { Request, Response, NextFunction } from "express";
import { Company } from "../models/Company.js";
import { AuditLog } from "../models/AuditLog.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { validateAndNormalizeImage } from "../utils/imageValidation.js";
import {
  uploadImageBuffer,
  deleteCloudinaryAsset,
  CloudinaryNotConfiguredError,
} from "../services/cloudinary.service.js";

function mapImageError(err: unknown, res: Response) {
  const e = err as { code?: string; message?: string; http_code?: number };
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
 * POST /companies/:id/logo — upload or replace organization logo
 */
export async function uploadCompanyLogo(req: Request, res: Response, next: NextFunction) {
  let newlyUploadedPublicId: string | null = null;

  try {
    const { id } = req.params;
    const actorId = req.user?.userId;
    const actorEmail = req.user?.email || "unknown";

    if (!req.file?.buffer) {
      return sendError(res, "Image file is required (multipart field: file)", 400, "FILE_REQUIRED");
    }

    const company = await Company.findById(id);
    if (!company) {
      return sendError(res, "Company not found", 404, "COMPANY_NOT_FOUND");
    }

    const previousPublicId = company.logo?.publicId || null;
    const previousUrl = company.logo?.url || null;

    const normalized = await validateAndNormalizeImage(req.file.buffer, { maxDimension: 1024 });

    const uploaded = await uploadImageBuffer({
      buffer: normalized.buffer,
      kind: "org-logo",
      entityId: company._id.toString(),
      mimeType: normalized.mimeType,
    });
    newlyUploadedPublicId = uploaded.publicId;

    const expectedPrevious = previousPublicId;
    const filter: Record<string, unknown> = { _id: company._id };
    if (expectedPrevious) {
      filter["logo.publicId"] = expectedPrevious;
    } else {
      filter.$or = [{ logo: { $exists: false } }, { logo: null }, { "logo.publicId": { $exists: false } }, { "logo.publicId": null }];
    }

    const updated = await Company.findOneAndUpdate(
      filter,
      {
        $set: {
          logo: {
            url: uploaded.url,
            publicId: uploaded.publicId,
          },
        },
      },
      { new: true }
    );

    if (!updated) {
      // Concurrent replacement race — keep existing DB image; cleanup the orphan we just uploaded
      try {
        await deleteCloudinaryAsset(uploaded.publicId);
      } catch {
        /* best-effort */
      }
      newlyUploadedPublicId = null;
      return sendError(
        res,
        "Logo was updated by another request. Please retry.",
        409,
        "LOGO_CONFLICT"
      );
    }

    newlyUploadedPublicId = null;

    if (previousPublicId && previousPublicId !== uploaded.publicId) {
      try {
        await deleteCloudinaryAsset(previousPublicId);
      } catch (cleanupErr) {
        console.warn(
          `[cloudinary] Failed to delete previous org logo publicId=${previousPublicId}:`,
          (cleanupErr as Error)?.message || cleanupErr
        );
      }
    }

    await AuditLog.create({
      actorId,
      actorEmail,
      action: "COMPANY_LOGO_UPDATED",
      entity: "Company",
      entityId: company._id.toString(),
      before: previousPublicId ? { logo: { url: previousUrl, publicId: previousPublicId } } : { logo: null },
      after: { logo: { url: uploaded.url, publicId: uploaded.publicId } },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return sendSuccess(res, {
      logo: {
        url: uploaded.url,
        publicId: uploaded.publicId,
      },
      company: {
        _id: updated._id,
        name: updated.name,
        logo: updated.logo,
      },
    });
  } catch (err) {
    if (newlyUploadedPublicId) {
      try {
        await deleteCloudinaryAsset(newlyUploadedPublicId);
      } catch {
        /* best-effort orphan cleanup */
      }
    }
    const handled = mapImageError(err, res);
    if (handled) return handled;
    next(err);
  }
}

/**
 * DELETE /companies/:id/logo — remove organization logo
 */
export async function deleteCompanyLogo(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const actorId = req.user?.userId;
    const actorEmail = req.user?.email || "unknown";

    const company = await Company.findById(id);
    if (!company) {
      return sendError(res, "Company not found", 404, "COMPANY_NOT_FOUND");
    }

    const previousPublicId = company.logo?.publicId || null;
    const previousUrl = company.logo?.url || null;

    if (!previousPublicId && !previousUrl) {
      return sendSuccess(res, {
        message: "No logo to remove",
        logo: null,
      });
    }

    await Company.findByIdAndUpdate(company._id, { $unset: { logo: 1 } });

    if (previousPublicId) {
      try {
        await deleteCloudinaryAsset(previousPublicId);
      } catch (cleanupErr) {
        console.warn(
          `[cloudinary] Failed to delete org logo publicId=${previousPublicId}:`,
          (cleanupErr as Error)?.message || cleanupErr
        );
      }
    }

    await AuditLog.create({
      actorId,
      actorEmail,
      action: "COMPANY_LOGO_REMOVED",
      entity: "Company",
      entityId: company._id.toString(),
      before: { logo: { url: previousUrl, publicId: previousPublicId } },
      after: { logo: null },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return sendSuccess(res, {
      message: "Organization logo removed",
      logo: null,
      company: {
        _id: company._id,
        name: company.name,
        logo: null,
      },
    });
  } catch (err) {
    const handled = mapImageError(err, res);
    if (handled) return handled;
    next(err);
  }
}
