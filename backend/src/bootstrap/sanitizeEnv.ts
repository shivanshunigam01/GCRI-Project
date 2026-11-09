/**
 * Run immediately after dotenv. The Cloudinary SDK reads CLOUDINARY_URL at import time
 * and throws if the value is not `cloudinary://...`, which crash-loops the API (looks like CORS in the browser).
 */
function sanitizeCloudinaryUrl(): void {
  const raw = process.env.CLOUDINARY_URL;
  if (raw == null || raw === "") return;

  const url = raw.trim();

  if (url.includes("CLOUDINARY_URL=") || !url.startsWith("cloudinary://")) {
    console.warn(
      "[env] Ignoring invalid CLOUDINARY_URL (expected cloudinary://api_key:secret@cloud_name). " +
        "Use CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET instead."
    );
    delete process.env.CLOUDINARY_URL;
  }
}

sanitizeCloudinaryUrl();
