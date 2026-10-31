"use client";

import React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, RefreshCw, X } from "lucide-react";

export type ModalVariant = "default" | "danger" | "warning" | "info" | "success";
export type ConfirmationVariant = ModalVariant;

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
  message?: string | React.ReactNode;
  onConfirm?: () => void | Promise<void>;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ModalVariant;
  loading?: boolean;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  message,
  onConfirm,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  loading = false,
  maxWidth = "md",
}: ModalProps) {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          icon: <AlertCircle className="h-5 w-5 text-rose-600" />,
          iconBg: "bg-rose-50 border-rose-100",
          btnColor: "bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500",
        };
      case "warning":
        return {
          icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
          iconBg: "bg-amber-50 border-amber-100",
          btnColor: "bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500",
        };
      case "success":
        return {
          icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
          iconBg: "bg-emerald-50 border-emerald-100",
          btnColor: "bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500",
        };
      case "info":
        return {
          icon: <Info className="h-5 w-5 text-teal-600" />,
          iconBg: "bg-teal-50 border-teal-100",
          btnColor: "bg-teal-600 hover:bg-teal-700 text-white focus:ring-teal-500",
        };
      default:
        return {
          icon: null,
          iconBg: "",
          btnColor: "bg-slate-900 hover:bg-slate-800 text-white focus:ring-slate-900",
        };
    }
  };

  const styles = getVariantStyles();

  const widthClass = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  }[maxWidth];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl border border-slate-200 w-full ${widthClass} overflow-hidden animate-in zoom-in-95 duration-150`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3 min-w-0">
            {styles.icon && (
              <div
                className={`h-9 w-9 rounded-xl flex items-center justify-center border shrink-0 ${styles.iconBg}`}
              >
                {styles.icon}
              </div>
            )}
            {title && (
              <h3 className="font-bold text-slate-900 text-sm truncate">{title}</h3>
            )}
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 text-xs text-slate-600 leading-relaxed">
          {message ? (
            typeof message === "string" ? <p>{message}</p> : message
          ) : (
            children
          )}
        </div>

        {/* Action Buttons / Footer */}
        {onConfirm && (
          <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 ${styles.btnColor}`}
            >
              {loading ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Processing...
                </>
              ) : (
                confirmLabel
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
