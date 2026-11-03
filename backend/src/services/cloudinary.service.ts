import { Readable } from "stream";
import {
  cloudinary,
  ensureCloudinaryConfigured,
  getCloudinaryConfigStatus,
} from "../config/cloudinary.js";

export type CloudinaryAssetKind = "org-logo" | "user-avatar";

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  bytes: number;
  format?: string;
  width?: number;
  height?: number;
}

export class CloudinaryNotConfiguredError extends Error {
  code = "CLOUDINARY_NOT_CONFIGURED";
  constructor() {
    super(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
    );
    this.name = "CloudinaryNotConfiguredError";
  }
}

function assertConfigured() {
  const status = ensureCloudinaryConfigured();
  if (!status.configured) {
    throw new CloudinaryNotConfiguredError();
  }
  return status;
}

function safeEntitySlug(entityId: string): string {
  return entityId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "unknown";
}

function folderFor(kind: CloudinaryAssetKind): string {
  const root = getCloudinaryConfigStatus().folder;
  const sub = kind === "org-logo" ? "organizations" : "users";
  return `${root}/${sub}`;
}

/**
 * Uploads a normalized image buffer to Cloudinary under a server-generated public ID.
 */
export async function uploadImageBuffer(params: {
  buffer: Buffer;
  kind: CloudinaryAssetKind;
  entityId: string;
  mimeType: string;
}): Promise<CloudinaryUploadResult> {
  assertConfigured();
  const folder = folderFor(params.kind);
  const publicIdLeaf = `${safeEntitySlug(params.entityId)}_${Date.now().toString(36)}`;

  const result = await new Promise<{
    secure_url: string;
    public_id: string;
    bytes: number;
    format?: string;
    width?: number;
    height?: number;
  }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicIdLeaf,
        resource_type: "image",
        overwrite: false,
        unique_filename: false,
        use_filename: false,
        type: "upload",
        timeout: 60_000,
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
      },
      (err, uploaded) => {
        if (err || !uploaded?.secure_url || !uploaded.public_id) {
          reject(err || new Error("Cloudinary upload returned an incomplete result"));
          return;
        }
        resolve({
          secure_url: uploaded.secure_url,
          public_id: uploaded.public_id,
          bytes: uploaded.bytes || params.buffer.length,
          format: uploaded.format,
          width: uploaded.width,
          height: uploaded.height,
        });
      }
    );

    Readable.from(params.buffer).pipe(stream);
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    bytes: result.bytes,
    format: result.format,
    width: result.width,
    height: result.height,
  };
}

/**
 * Deletes a Cloudinary asset by server-stored public ID only.
 * Never accept client-provided public IDs without verifying ownership in DB first.
 */
export async function deleteCloudinaryAsset(publicId: string): Promise<{ result: string }> {
  assertConfigured();
  if (!publicId || typeof publicId !== "string") {
    throw new Error("Missing Cloudinary public ID");
  }

  // Only allow deletes under our configured folder prefix
  const folder = getCloudinaryConfigStatus().folder;
  if (!publicId.startsWith(`${folder}/`) && !publicId.includes("/")) {
    // Cloudinary may return public_id with folder prefix already
  }
  if (folder && !publicId.startsWith(`${folder}/`)) {
    throw Object.assign(
      new Error("Refusing to delete Cloudinary asset outside configured folder"),
      { code: "CLOUDINARY_DELETE_SCOPE" }
    );
  }

  const res = await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    invalidate: true,
  });

  return { result: String(res?.result || "unknown") };
}

export function isCloudinaryConfigured(): boolean {
  return getCloudinaryConfigStatus().configured;
}
