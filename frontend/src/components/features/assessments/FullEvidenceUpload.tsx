"use client";

import React, { useCallback, useRef, useState } from "react";
import { assessmentService } from "@/services/assessment.service";
import { getApiErrorMessage } from "@/lib/authUser";
import { cn } from "@/lib/utils";
import { Loader2, Paperclip, Upload, AlertCircle, ExternalLink } from "lucide-react";

const MAX_BYTES = 25 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const ALLOWED_EXT = /\.(pdf|png|jpe?g|webp|gif|txt|csv|doc|docx|xls|xlsx)$/i;

export interface EvidenceUploadResult {
  fileUrl: string;
  s3Key: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
}

interface FullEvidenceUploadProps {
  assessmentId: string;
  questionId: string;
  disabled?: boolean;
  existingUrl?: string;
  onUploaded: (result: EvidenceUploadResult) => Promise<void> | void;
}

function isAllowedFile(file: File): string | null {
  if (file.size > MAX_BYTES) {
    return "File exceeds the 25 MB limit.";
  }
  const mimeOk = !file.type || ALLOWED_MIME.has(file.type);
  const extOk = ALLOWED_EXT.test(file.name);
  if (!mimeOk && !extOk) {
    return "Unsupported file type. Use PDF, images, Office docs, CSV, or TXT.";
  }
  return null;
}

export function FullEvidenceUpload({
  assessmentId,
  questionId,
  disabled,
  existingUrl,
  onUploaded,
}: FullEvidenceUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFileName, setLastFileName] = useState<string | null>(null);

  const runUpload = useCallback(
    async (file: File) => {
      if (disabled || uploading) return;
      const validation = isAllowedFile(file);
      if (validation) {
        setError(validation);
        return;
      }
      setUploading(true);
      setError(null);
      setLastFileName(file.name);
      try {
        const res = await assessmentService.uploadEvidence(
          assessmentId,
          questionId,
          file
        );
        const upload = res?.data?.upload;
        if (!upload?.fileUrl) {
          throw new Error("Upload succeeded but no file URL was returned.");
        }
        await onUploaded({
          fileUrl: upload.fileUrl,
          s3Key: upload.s3Key,
          fileName: upload.fileName || file.name,
          fileSizeBytes: upload.fileSizeBytes ?? file.size,
          mimeType: upload.mimeType || file.type,
        });
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, "Evidence upload failed."));
      } finally {
        setUploading(false);
      }
    },
    [assessmentId, questionId, disabled, uploading, onUploaded]
  );

  const onFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) void runUpload(file);
  };

  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-3.5 space-y-2">
      <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
        <Paperclip className="h-3.5 w-3.5" /> Evidence attachment
      </p>
      <p className="text-[11px] text-slate-500">
        PDF, images, Word/Excel, CSV, TXT · max 25 MB · attached to this control only
      </p>

      {!disabled && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            onFiles(e.dataTransfer.files);
          }}
          className={cn(
            "rounded-lg border-2 border-dashed px-3 py-4 text-center transition",
            dragging
              ? "border-indigo-500 bg-indigo-50/60"
              : "border-slate-200 bg-white hover:border-indigo-300"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.csv,.doc,.docx,.xls,.xlsx,application/pdf,image/*"
            onChange={(e) => {
              onFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-700 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5" /> Choose file or drop here
              </>
            )}
          </button>
          {lastFileName && !uploading && (
            <p className="text-[10px] text-slate-500 mt-1.5 truncate">{lastFileName}</p>
          )}
        </div>
      )}

      {error && (
        <p className="text-[11px] text-rose-700 flex items-start gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          {error}
        </p>
      )}

      {existingUrl && (
        <a
          href={existingUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:underline"
        >
          View attached evidence <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}
