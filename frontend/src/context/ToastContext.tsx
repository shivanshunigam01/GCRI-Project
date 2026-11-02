"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { ToastViewport, ToastRecord, ToastVariant } from "@/components/ui/ToastViewport";

const MAX_MESSAGE_TOASTS = 3;

export interface ToastOptions {
  durationMs?: number;
  /** Reuse one slot — replaces the previous toast with the same key (no stack pile-up). */
  dedupeKey?: string;
}

interface ConfirmToastOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "warning" | "danger";
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant, options?: ToastOptions) => void;
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
  confirm: (options: ConfirmToastOptions) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;
function nextId() {
  toastId += 1;
  return `toast-${toastId}`;
}

function resolveOptions(options?: ToastOptions | number): ToastOptions {
  if (typeof options === "number") return { durationMs: options };
  return options ?? {};
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const dismissTimers = useRef<Map<string, number>>(new Map());

  const clearTimer = useCallback((key: string) => {
    const t = dismissTimers.current.get(key);
    if (t) {
      clearTimeout(t);
      dismissTimers.current.delete(key);
    }
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      clearTimer(id);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    },
    [clearTimer]
  );

  const scheduleDismiss = useCallback(
    (id: string, durationMs: number) => {
      clearTimer(id);
      if (durationMs <= 0) return;
      const handle = window.setTimeout(() => dismiss(id), durationMs);
      dismissTimers.current.set(id, handle);
    },
    [clearTimer, dismiss]
  );

  const show = useCallback(
    (message: string, variant: ToastVariant = "info", options?: ToastOptions) => {
      const { durationMs = 4500, dedupeKey } = resolveOptions(options);
      const id = dedupeKey ? `dedupe:${dedupeKey}` : nextId();

      if (dedupeKey) {
        clearTimer(id);
      }

      setToasts((prev) => {
        let next = prev.filter((t) => {
          if (t.kind === "confirm") return true;
          if (dedupeKey && t.dedupeKey === dedupeKey) return false;
          if (t.id === id) return false;
          return true;
        });

        if (!dedupeKey) {
          const messageToasts = next.filter((t) => t.kind === "message");
          while (messageToasts.length >= MAX_MESSAGE_TOASTS) {
            const oldest = messageToasts.shift();
            if (oldest) {
              clearTimer(oldest.id);
              next = next.filter((t) => t.id !== oldest.id);
            }
          }
        }

        const record: ToastRecord = {
          id,
          kind: "message",
          message,
          variant,
          durationMs,
          dedupeKey,
        };
        return [...next, record];
      });

      scheduleDismiss(id, durationMs);
    },
    [clearTimer, scheduleDismiss]
  );

  const success = useCallback(
    (message: string, options?: ToastOptions) => show(message, "success", options),
    [show]
  );

  const error = useCallback(
    (message: string, options?: ToastOptions) =>
      show(message, "error", { durationMs: 6000, ...resolveOptions(options) }),
    [show]
  );

  const info = useCallback(
    (message: string, options?: ToastOptions) => show(message, "info", options),
    [show]
  );

  const confirm = useCallback(
    (options: ConfirmToastOptions) => {
      const id = nextId();
      setToasts((prev) => [
        ...prev,
        {
          id,
          kind: "confirm",
          title: options.title,
          message: options.message,
          confirmLabel: options.confirmLabel ?? "Confirm",
          cancelLabel: options.cancelLabel ?? "Cancel",
          variant: options.variant ?? "warning",
          onConfirm: async () => {
            dismiss(id);
            await options.onConfirm();
          },
          onCancel: () => {
            dismiss(id);
            options.onCancel?.();
          },
        },
      ]);
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({ show, success, error, info, confirm, dismiss }),
    [show, success, error, info, confirm, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
