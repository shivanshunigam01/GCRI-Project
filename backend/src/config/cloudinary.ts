import { v2 as cloudinary } from "cloudinary";

export type CloudinaryConfigStatus = {
  configured: boolean;
  cloudNameSet: boolean;
  apiKeySet: boolean;
  apiSecretSet: boolean;
  folder: string;
};

let configured = false;

/**
 * Returns whether Cloudinary credentials are present (never logs secrets).
 */
export function getCloudinaryConfigStatus(): CloudinaryConfigStatus {
  const cloudName = Boolean(process.env.CLOUDINARY_CLOUD_NAME?.trim());
  const apiKey = Boolean(process.env.CLOUDINARY_API_KEY?.trim());
  const apiSecret = Boolean(process.env.CLOUDINARY_API_SECRET?.trim());
  const folder = (process.env.CLOUDINARY_FOLDER || "graice").trim() || "graice";

  return {
    configured: cloudName && apiKey && apiSecret,
    cloudNameSet: cloudName,
    apiKeySet: apiKey,
    apiSecretSet: apiSecret,
    folder,
  };
}

/**
 * Configures Cloudinary v2 once. Safe to call repeatedly.
 * Does not throw when credentials are missing — callers must check status.
 */
export function ensureCloudinaryConfigured(): CloudinaryConfigStatus {
  const status = getCloudinaryConfigStatus();
  if (!status.configured) {
    configured = false;
    return status;
  }

  if (!configured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME!.trim(),
      api_key: process.env.CLOUDINARY_API_KEY!.trim(),
      api_secret: process.env.CLOUDINARY_API_SECRET!.trim(),
      secure: true,
      timeout: 60_000,
    });
    configured = true;
    // Safe log — never print keys/secrets
    console.info(
      `[cloudinary] configured (cloud=${process.env.CLOUDINARY_CLOUD_NAME?.trim()}, folder=${status.folder})`
    );
  }

  return status;
}

export { cloudinary };
