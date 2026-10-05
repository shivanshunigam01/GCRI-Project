import React from "react";

export type BadgeVariant =
  | "verified"
  | "pending"
  | "rejected"
  | "active"
  | "suspended"
  | "pass"
  | "fail"
  | "exception"
  | "na"
  | "neutral";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ children, variant = "neutral", className = "", ...props }: BadgeProps) {
  const variantStyles = {
    verified: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
    active: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
    pass: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
    pending: "bg-amber-50 text-amber-800 border-amber-200/80",
    exception: "bg-amber-50 text-amber-800 border-amber-200/80",
    rejected: "bg-rose-50 text-rose-800 border-rose-200/80",
    suspended: "bg-zinc-100 text-zinc-700 border-zinc-200/80",
    fail: "bg-rose-50 text-rose-800 border-rose-200/80",
    na: "bg-zinc-100 text-zinc-600 border-zinc-200/80",
    neutral: "bg-zinc-100 text-zinc-700 border-zinc-200/80",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border tracking-wide uppercase ${variantStyles[variant]} ${className}`}
      {...props}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  );
}
