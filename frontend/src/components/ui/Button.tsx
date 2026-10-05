import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
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
      className = "",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

    const variantStyles = {
      primary: "bg-zinc-900 text-white hover:bg-zinc-800 border border-zinc-900/90 focus:ring-zinc-500 shadow-xs active:scale-[0.99]",
      secondary: "bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 focus:ring-zinc-300 shadow-2xs",
      outline: "bg-transparent text-zinc-800 border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 focus:ring-zinc-300",
      ghost: "bg-transparent text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 focus:ring-zinc-300",
      destructive: "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 shadow-xs",
    };

    const sizeStyles = {
      sm: "px-3 py-1.5 text-xs h-8",
      md: "px-4 py-2 text-xs font-semibold h-9",
      lg: "px-5 py-2.5 text-sm font-semibold h-10",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading && (
          <span className="mr-2 animate-spin text-current" aria-hidden="true">
            ⏳
          </span>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
