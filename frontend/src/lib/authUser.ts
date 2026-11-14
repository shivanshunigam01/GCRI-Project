import { User } from "@/types/auth.types";

/** Maps login/OAuth API user payloads to the frontend User shape. */
export function normalizeLoginUser(raw: Record<string, unknown> | null | undefined): User | null {
  if (!raw || typeof raw !== "object") return null;

  const id = raw._id ?? raw.userId ?? raw.id;
  if (id == null || id === "") return null;

  const mfaRaw = raw.mfa as
    | {
        enabled?: boolean;
        authenticatorConfigured?: boolean;
        recoveryCodesRemaining?: number;
      }
    | undefined;
  const mfaEnabled = Boolean(mfaRaw?.enabled ?? raw.mfaEnabled);

  return {
    _id: String(id),
    id: String(id),
    name: String(raw.name ?? ""),
    email: String(raw.email ?? ""),
    role: raw.role as User["role"],
    status: (raw.status as User["status"]) ?? "Active",
    mfa: {
      enabled: mfaEnabled,
      authenticatorConfigured: Boolean(mfaRaw?.authenticatorConfigured),
      recoveryCodesRemaining:
        typeof mfaRaw?.recoveryCodesRemaining === "number"
          ? mfaRaw.recoveryCodesRemaining
          : undefined,
    },
    mfaEnabled,
    companyId: (raw.companyId as User["companyId"]) ?? null,
    tenantId: (raw.tenantId as User["tenantId"]) ?? null,
    authProvider: raw.authProvider as User["authProvider"],
  };
}

export function getApiErrorCode(err: unknown): string | undefined {
  if (!err || typeof err !== "object") return undefined;
  const data = (err as { data?: { error?: { code?: string } } }).data;
  return data?.error?.code;
}

export function getApiErrorDetails(err: unknown): Record<string, unknown> | undefined {
  if (!err || typeof err !== "object") return undefined;
  const details = (err as { data?: { error?: { details?: Record<string, unknown> } } }).data?.error
    ?.details;
  return details && typeof details === "object" ? details : undefined;
}

export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (!err || typeof err !== "object") return fallback;
  const e = err as { message?: string; data?: { error?: { message?: string } } };
  return e.data?.error?.message || e.message || fallback;
}

export function getHttpStatus(err: unknown): number | undefined {
  if (!err || typeof err !== "object") return undefined;
  return (err as { status?: number }).status;
}

/** Maps API/network errors to safe user-facing copy (no stack traces or internal details). */
export function getUserFacingApiError(err: unknown, contextLabel: string): string {
  const status = getHttpStatus(err);
  const code = getApiErrorCode(err);

  if (status === 401 || code === "UNAUTHORIZED" || code === "INVALID_TOKEN") {
    return "Your session has expired or is invalid. Please sign in again.";
  }
  if (
    status === 403 ||
    code === "FORBIDDEN" ||
    (code && (code.includes("ACCESS_DENIED") || code.includes("CROSS_")))
  ) {
    return `You do not have permission to access ${contextLabel}.`;
  }
  if (status === 404) {
    return `${contextLabel} could not be found. It may have been removed or you may not have access.`;
  }
  if (status && status >= 500) {
    return "The server encountered an error. Please try again in a few moments.";
  }
  if (
    err instanceof TypeError ||
    (err as { message?: string })?.message?.includes("Failed to fetch") ||
    (err as { message?: string })?.message?.includes("NetworkError")
  ) {
    return "Network error. Check your connection and try again.";
  }

  const raw = getApiErrorMessage(err, "");
  if (raw && !raw.startsWith("HTTP error")) {
    return raw.length > 160 ? `${contextLabel} failed. Please try again.` : raw;
  }

  return `Failed to load ${contextLabel}. Please try again.`;
}

/** SuperAdmin and Org Admin — MFA cannot be disabled per product policy. */
export function isMfaMandatoryRole(role: string | undefined): boolean {
  return role === "SuperAdmin" || role === "Admin" || role === "TenantAdmin";
}
