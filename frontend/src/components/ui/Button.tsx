import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "accent" | "secondary" | "outline" | "ghost" | "danger" | "destructive";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none";

    const variantStyles = {
      primary:
        "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] border border-[var(--primary)]/90 shadow-xs focus-visible:ring-[var(--primary)]",
      accent:
        "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] border border-[var(--accent)]/90 shadow-xs focus-visible:ring-[var(--accent)]",
      secondary:
        "bg-white text-[var(--text-main)] border border-[var(--border-subtle)] hover:bg-slate-50 hover:border-slate-300 shadow-2xs focus-visible:ring-slate-400",
      outline:
        "bg-transparent text-[var(--text-main)] border border-[var(--border-subtle)] hover:bg-slate-50 hover:border-slate-300 focus-visible:ring-slate-400",
      ghost:
        "bg-transparent text-[var(--text-muted)] hover:bg-slate-100 hover:text-[var(--text-main)] focus-visible:ring-slate-300",
      danger:
        "bg-[var(--danger)] text-white hover:bg-rose-700 shadow-xs focus-visible:ring-rose-500",
      destructive:
        "bg-[var(--danger)] text-white hover:bg-rose-700 shadow-xs focus-visible:ring-rose-500",
    };

    const sizeStyles = {
      sm: "px-3 py-1.5 text-xs h-8 gap-1.5",
      md: "px-4 py-2 text-xs font-semibold h-9 gap-2",
      lg: "px-5 py-2.5 text-sm font-semibold h-11 gap-2.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-0.5 h-3.5 w-3.5 text-current shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
