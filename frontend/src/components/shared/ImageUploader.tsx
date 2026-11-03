"use client";

import React, { useCallback, useId, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { EntityImage } from "@/components/shared/EntityImage";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp";
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export type ImageUploaderVariant = "logo" | "avatar";

export type ImageUploaderProps = {
  variant?: ImageUploaderVariant;
  /** Current remote URL (from backend) */
  currentUrl?: string | null;
  /** Display name for initials fallback */
  name?: string;
  /** Called with selected File when user confirms upload immediately (autoUpload) or via parent */
  onUpload: (file: File) => Promise<void>;
  onRemove?: () => Promise<void>;
  disabled?: boolean;
  /** When true, selecting a file immediately calls onUpload */
  autoUpload?: boolean;
  /** Stage locally without uploading (registration flows) */
  stagedOnly?: boolean;
  onStageChange?: (file: File | null, previewUrl: string | null) => void;
  className?: string;
  label?: string;
  hint?: string;
  cacheKey?: string | number | null;
};

function validateClientFile(file: File): string | null {
  if (!ALLOWED.has(file.type)) {
    return "Only JPEG, PNG, and WebP images are allowed.";
  }
  if (file.size > MAX_BYTES) {
    return "Image must be 5 MB or smaller.";
  }
  return null;
}

/**
 * Reusable image picker: click / drag-drop, preview, replace, remove.
 * Logo = contained square; Avatar = circular crop display.
 */
export function ImageUploader({
  variant = "avatar",
  currentUrl,
  name,
  onUpload,
  onRemove,
  disabled = false,
  autoUpload = true,
  stagedOnly = false,
  onStageChange,
  className,
  label,
  hint,
  cacheKey,
}: ImageUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const clearPreview = useCallback(() => {
    setPreview((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const handleFile = useCallback(
    async (file: File | null | undefined) => {
      if (!file || disabled) return;
      setError(null);
      const validationError = validateClientFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      clearPreview();
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      onStageChange?.(file, objectUrl);

      if (stagedOnly) {
        return;
      }

      if (!autoUpload) {
        return;
      }

      try {
        setBusy(true);
        setProgress(10);
        const tick = window.setInterval(() => {
          setProgress((p) => (p === null || p >= 90 ? p : p + 8));
        }, 120);
        await onUpload(file);
        window.clearInterval(tick);
        setProgress(100);
        clearPreview();
        onStageChange?.(null, null);
      } catch (err: any) {
        setError(err?.message || "Upload failed.");
      } finally {
        setBusy(false);
        setTimeout(() => setProgress(null), 400);
      }
    },
    [autoUpload, clearPreview, disabled, onStageChange, onUpload, stagedOnly]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    void handleFile(file);
  };

  const handleRemove = async () => {
    if (disabled || busy) return;
    setError(null);
    if (preview || stagedOnly) {
      clearPreview();
      onStageChange?.(null, null);
      if (!currentUrl || stagedOnly) return;
    }
    if (!onRemove) return;
    try {
      setBusy(true);
      await onRemove();
    } catch (err: any) {
      setError(err?.message || "Failed to remove image.");
    } finally {
      setBusy(false);
    }
  };

  const displayUrl = preview || currentUrl || null;
  const shapeClass = variant === "avatar" ? "rounded-full" : "rounded-xl";

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700">
          {label}
        </label>
      )}

      <div className="flex items-center gap-4">
        <EntityImage
          src={displayUrl}
          name={name}
          variant={variant}
          size="xl"
          cacheKey={preview ? undefined : cacheKey}
          className={cn(shapeClass, variant === "logo" && "bg-white text-teal-700")}
        />

        <div className="flex-1 min-w-0 space-y-2">
          <div
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-disabled={disabled || busy}
            aria-label={variant === "logo" ? "Upload organization logo" : "Upload profile photo"}
            onKeyDown={(e) => {
              if (disabled || busy) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onClick={() => {
              if (!disabled && !busy) inputRef.current?.click();
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              if (!disabled) setDragOver(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (!disabled) setDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              void handleFile(file);
            }}
            className={cn(
              "border border-dashed rounded-xl px-3 py-3 text-xs transition cursor-pointer",
              dragOver
                ? "border-teal-500 bg-teal-50/80"
                : "border-slate-300 bg-slate-50/60 hover:border-teal-400 hover:bg-teal-50/40",
              (disabled || busy) && "opacity-60 cursor-not-allowed"
            )}
          >
            <div className="flex items-center gap-2 text-slate-700 font-medium">
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
              ) : (
                <Upload className="h-4 w-4 text-teal-600" />
              )}
              <span>
                {busy
                  ? "Uploading…"
                  : displayUrl
                    ? "Click or drop to replace"
                    : "Click or drop to upload"}
              </span>
              <ImagePlus className="h-3.5 w-3.5 text-slate-400 ml-auto" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {hint || "JPEG, PNG, or WebP · max 5 MB"}
            </p>
            {progress !== null && (
              <div className="mt-2 h-1.5 rounded-full bg-slate-200 overflow-hidden" aria-hidden>
                <div
                  className="h-full bg-teal-500 transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={disabled || busy}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-50"
            >
              <Upload className="h-3 w-3" />
              {displayUrl ? "Replace" : "Choose file"}
            </button>
            {(displayUrl || currentUrl) && (onRemove || stagedOnly || preview) && (
              <button
                type="button"
                disabled={disabled || busy}
                onClick={() => void handleRemove()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 disabled:opacity-50"
              >
                {preview && !currentUrl ? (
                  <>
                    <X className="h-3 w-3" /> Clear
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3 w-3" /> Remove
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5" role="alert">
          {error}
        </p>
      )}

      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        disabled={disabled || busy}
        onChange={onInputChange}
      />
    </div>
  );
}
