"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

function initialsFrom(name?: string | null, fallback = "?"): string {
  const cleaned = (name || "").trim();
  if (!cleaned) return fallback;
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
}

/** Cache-bust Cloudinary/delivery URLs after replace */
export function withImageCacheBust(url?: string | null, version?: string | number | null): string | undefined {
  if (!url) return undefined;
  if (version === undefined || version === null || version === "") return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${encodeURIComponent(String(version))}`;
}

type EntityImageProps = {
  src?: string | null;
  name?: string | null;
  alt?: string;
  variant?: "avatar" | "logo";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  cacheKey?: string | number | null;
};

const sizeClass: Record<NonNullable<EntityImageProps["size"]>, string> = {
  sm: "h-7 w-7 text-[10px]",
  md: "h-9 w-9 text-xs",
  lg: "h-12 w-12 text-sm",
  xl: "h-16 w-16 text-xl",
};

/**
 * Displays a remote logo/avatar with initials fallback and broken-image handling.
 */
export function EntityImage({
  src,
  name,
  alt,
  variant = "avatar",
  size = "md",
  className,
  cacheKey,
}: EntityImageProps) {
  const [failed, setFailed] = useState(false);
  const url = withImageCacheBust(src, cacheKey);
  const showImage = Boolean(url) && !failed;
  const rounded = variant === "avatar" ? "rounded-full" : "rounded-xl";
  const objectFit = variant === "logo" ? "object-contain" : "object-cover";

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden border border-slate-200/80 bg-gradient-to-br from-teal-500 via-cyan-600 to-blue-600 text-white font-bold flex items-center justify-center shadow-2xs",
        rounded,
        sizeClass[size],
        className
      )}
      aria-label={alt || name || (variant === "logo" ? "Organization" : "User")}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote Cloudinary URLs; sizing via parent
        <img
          src={url!}
          alt={alt || name || ""}
          className={cn("h-full w-full bg-white", objectFit, rounded)}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="select-none">{initialsFrom(name, variant === "logo" ? "OR" : "U")}</span>
      )}
    </div>
  );
}
