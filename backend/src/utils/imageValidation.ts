import sharp from "sharp";

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
export const ALLOWED_IMAGE_FORMATS = new Set(["jpeg", "png", "webp"]);

const MAGIC = {
  jpeg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47],
  webpRiff: [0x52, 0x49, 0x46, 0x46],
  webpWebp: [0x57, 0x45, 0x42, 0x50],
} as const;

function startsWith(buf: Buffer, sig: readonly number[], offset = 0): boolean {
  if (buf.length < offset + sig.length) return false;
  return sig.every((b, i) => buf[offset + i] === b);
}

export function detectImageKindFromMagic(buf: Buffer): "jpeg" | "png" | "webp" | null {
  if (startsWith(buf, MAGIC.jpeg)) return "jpeg";
  if (startsWith(buf, MAGIC.png)) return "png";
  if (startsWith(buf, MAGIC.webpRiff) && startsWith(buf, MAGIC.webpWebp, 8)) return "webp";
  return null;
}

export type NormalizedImage = {
  buffer: Buffer;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  format: "jpeg" | "png" | "webp";
  width: number;
  height: number;
  bytes: number;
};

/**
 * Validates magic bytes + sharp metadata, then re-encodes to a safe normalized format.
 * Rejects SVG and non-image payloads.
 */
export async function validateAndNormalizeImage(
  input: Buffer,
  opts?: { maxDimension?: number }
): Promise<NormalizedImage> {
  if (!input?.length) {
    throw Object.assign(new Error("Empty image file"), { code: "EMPTY_IMAGE" });
  }
  if (input.length > IMAGE_MAX_BYTES) {
    throw Object.assign(new Error("Image exceeds maximum size of 5 MB"), {
      code: "IMAGE_TOO_LARGE",
    });
  }

  const magicKind = detectImageKindFromMagic(input);
  if (!magicKind) {
    throw Object.assign(new Error("Unsupported or invalid image content. Use JPEG, PNG, or WebP."), {
      code: "INVALID_IMAGE_CONTENT",
    });
  }

  let pipeline = sharp(input, { failOn: "error", animated: false });
  const meta = await pipeline.metadata();

  const rawFormat = String(meta.format || "");
  const normalizedFormat = rawFormat === "jpg" ? "jpeg" : rawFormat;
  if (!ALLOWED_IMAGE_FORMATS.has(normalizedFormat)) {
    throw Object.assign(new Error("Unsupported image format. Use JPEG, PNG, or WebP."), {
      code: "INVALID_IMAGE_FORMAT",
    });
  }

  const format = normalizedFormat as "jpeg" | "png" | "webp";

  const maxDimension = opts?.maxDimension ?? 2048;
  pipeline = sharp(input, { failOn: "error", animated: false }).rotate();

  if ((meta.width && meta.width > maxDimension) || (meta.height && meta.height > maxDimension)) {
    pipeline = pipeline.resize({
      width: maxDimension,
      height: maxDimension,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  let out: Buffer;
  let mimeType: NormalizedImage["mimeType"];
  let outFormat: NormalizedImage["format"];

  if (format === "png") {
    out = await pipeline.png({ compressionLevel: 8 }).toBuffer();
    mimeType = "image/png";
    outFormat = "png";
  } else if (format === "webp") {
    out = await pipeline.webp({ quality: 85 }).toBuffer();
    mimeType = "image/webp";
    outFormat = "webp";
  } else {
    out = await pipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
    mimeType = "image/jpeg";
    outFormat = "jpeg";
  }

  if (out.length > IMAGE_MAX_BYTES) {
    throw Object.assign(new Error("Normalized image still exceeds 5 MB"), {
      code: "IMAGE_TOO_LARGE",
    });
  }

  const outMeta = await sharp(out).metadata();

  return {
    buffer: out,
    mimeType,
    format: outFormat,
    width: outMeta.width || 0,
    height: outMeta.height || 0,
    bytes: out.length,
  };
}
