"use client";

import React from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "info" | "warning";

export type ToastRecord =
  | {
      id: string;
      kind: "message";
      message: string;
      variant: ToastVariant;
      durationMs: number;
      dedupeKey?: string;
    }
  | {
      id: string;
      kind: "confirm";
      title: string;
      message: string;
      confirmLabel: string;
      cancelLabel: string;
      variant: "warning" | "danger";
      onConfirm: () => void | Promise<void>;
      onCancel: () => void;
    };

const variantStyles: Record<ToastVariant, string> = {
  success: "border-emerald-200 bg-emerald-50/95 text-emerald-950",
  error: "border-rose-200 bg-rose-50/95 text-rose-950",
  info: "border-sky-200 bg-sky-50/95 text-sky-950",
  warning: "border-amber-200 bg-amber-50/95 text-amber-950",
};

function MessageIcon({ variant }: { variant: ToastVariant }) {
  const cls = "h-5 w-5 shrink-0";
  switch (variant) {
    case "success":
      return <CheckCircle2 className={cn(cls, "text-emerald-600")} />;
    case "error":
      return <XCircle className={cn(cls, "text-rose-600")} />;
    case "warning":
      return <AlertTriangle className={cn(cls, "text-amber-600")} />;
    default:
      return <Info className={cn(cls, "text-sky-600")} />;
  }
}

export function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastRecord[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[200] flex flex-col-reverse gap-3 w-[min(100vw-2rem,420px)] max-h-[min(70vh,520px)] overflow-y-auto overflow-x-hidden pointer-events-none pr-0.5"
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.kind === "confirm" ? "alertdialog" : "status"}
          className={cn(
            "pointer-events-auto shrink-0 rounded-2xl border shadow-lg backdrop-blur-md",
            toast.kind === "message" && "animate-[assessment-slide-in_0.28s_ease-out_forwards]",
            toast.kind === "message"
              ? variantStyles[toast.variant]
              : toast.variant === "danger"
                ? "border-rose-300 bg-white/95 text-slate-900"
                : "border-amber-300 bg-white/95 text-slate-900"
          )}
        >
          {toast.kind === "message" ? (
            <div className="flex items-start gap-3 p-4">
              <MessageIcon variant={toast.variant} />
              <p className="text-sm font-medium leading-snug flex-1 pt-0.5">{toast.message}</p>
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="p-1 rounded-lg hover:bg-black/5 text-current opacity-70"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className={cn(
                    "h-5 w-5 shrink-0 mt-0.5",
                    toast.variant === "danger" ? "text-rose-600" : "text-amber-600"
                  )}
                />
                <div>
                  <p className="text-sm font-bold text-slate-900">{toast.title}</p>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">{toast.message}</p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={toast.onCancel}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                >
                  {toast.cancelLabel}
                </button>
                <button
                  type="button"
                  onClick={() => void toast.onConfirm()}
                  className={cn(
                    "px-3.5 py-2 text-xs font-semibold rounded-xl text-white shadow-sm",
                    toast.variant === "danger"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-gradient-to-r from-teal-600 to-blue-600 hover:opacity-95"
                  )}
                >
                  {toast.confirmLabel}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
