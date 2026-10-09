import React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "verified"
  | "pending"
  | "rejected"
  | "active"
  | "suspended"
  | "pass"
  | "fail"
  | "exception"
  | "na"
  | "bronze"
  | "silver"
  | "gold";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  showDot?: boolean;
}

export function Badge({
  children,
  variant = "neutral",
  showDot = false,
  className,
  ...props
}: BadgeProps) {
  const variantStyles: Record<BadgeVariant, string> = {
    // Semantic Tokens
    success: "bg-[var(--success-bg)] text-[var(--success-text)] border-[var(--success-border)]",
    warning: "bg-[var(--warning-bg)] text-[var(--warning-text)] border-[var(--warning-border)]",
    danger: "bg-[var(--danger-bg)] text-[var(--danger-text)] border-[var(--danger-border)]",
    info: "bg-[var(--info-bg)] text-[var(--info-text)] border-[var(--info-border)]",
    neutral: "bg-[var(--neutral-bg)] text-[var(--neutral-text)] border-[var(--neutral-border)]",

    // Domain Aliases (backward-compatible)
    verified: "bg-[var(--success-bg)] text-[var(--success-text)] border-[var(--success-border)]",
    active: "bg-[var(--success-bg)] text-[var(--success-text)] border-[var(--success-border)]",
    pass: "bg-[var(--success-bg)] text-[var(--success-text)] border-[var(--success-border)]",
    pending: "bg-[var(--warning-bg)] text-[var(--warning-text)] border-[var(--warning-border)]",
    exception: "bg-[var(--warning-bg)] text-[var(--warning-text)] border-[var(--warning-border)]",
    rejected: "bg-[var(--danger-bg)] text-[var(--danger-text)] border-[var(--danger-border)]",
    fail: "bg-[var(--danger-bg)] text-[var(--danger-text)] border-[var(--danger-border)]",
    suspended: "bg-[var(--neutral-bg)] text-[var(--neutral-text)] border-[var(--neutral-border)]",
    na: "bg-[var(--neutral-bg)] text-[var(--neutral-text)] border-[var(--neutral-border)]",

    // Plan Tiers (Screen 6 & 7)
    bronze: "bg-[#fffbeb] text-[#92400e] border-[#fde68a]",
    silver: "bg-[#f8fafc] text-[#334155] border-[#cbd5e1]",
    gold: "bg-[#fefce8] text-[#854d0e] border-[#fef08a]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border tracking-wide",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {showDot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" aria-hidden="true" />
      )}
      {children}
    </span>
  );
}
