import multer from "multer";
import { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/response.js";
import { ALLOWED_IMAGE_MIME, IMAGE_MAX_BYTES } from "../utils/imageValidation.js";

const memory = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: IMAGE_MAX_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_MIME.has(file.mimetype)) {
      cb(
        Object.assign(new Error("Only JPEG, PNG, and WebP images are allowed"), {
          code: "INVALID_IMAGE_MIME",
        })
      );
      return;
    }
    cb(null, true);
  },
});

/** Single-file multipart field name: `file` */
export const uploadImageSingle = memory.single("file");

/**
 * Wraps multer so validation errors become JSON API errors.
 */
export function handleImageUpload(req: Request, res: Response, next: NextFunction) {
  uploadImageSingle(req, res, (err: unknown) => {
    if (!err) return next();

    const e = err as { code?: string; message?: string; name?: string };
    if (e.code === "LIMIT_FILE_SIZE") {
      return sendError(res, "Image exceeds maximum size of 5 MB", 400, "IMAGE_TOO_LARGE");
    }
    if (e.code === "LIMIT_UNEXPECTED_FILE" || e.code === "LIMIT_FILE_COUNT") {
      return sendError(res, "Only one image file is allowed per request", 400, "TOO_MANY_FILES");
    }
    if (e.code === "INVALID_IMAGE_MIME") {
      return sendError(res, e.message || "Invalid image type", 400, "INVALID_IMAGE_MIME");
    }
    if (e.name === "MulterError") {
      return sendError(res, e.message || "Upload failed", 400, "UPLOAD_ERROR");
    }
    return sendError(res, e.message || "Upload failed", 400, "UPLOAD_ERROR");
  });
}
