"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  showPasswordToggle?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      id,
      className = "",
      type,
      showPasswordToggle = true,
      ...props
    },
    ref
  ) => {
    const inputId = id || props.name;
    const isPassword = type === "password";
    const [showPassword, setShowPassword] = useState(false);

    const effectiveType = isPassword && showPassword ? "text" : type;

    return (
      <div className="flex flex-col gap-1.5 mb-3.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-zinc-700">
            {label}
            {props.required && <span className="text-rose-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            type={effectiveType}
            className={`w-full px-3 py-2 rounded-lg border text-sm transition-all duration-150 outline-none bg-white text-zinc-900 placeholder:text-zinc-400 shadow-2xs ${
              isPassword && showPasswordToggle ? "pr-10" : ""
            } ${
              error
                ? "border-rose-400 focus:border-rose-600 focus:ring-1 focus:ring-rose-600"
                : "border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
            } ${className}`}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />
          {isPassword && showPasswordToggle && (
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-700 focus:outline-none focus:text-zinc-900 transition-colors cursor-pointer rounded"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="text-[11px] text-rose-600 mt-0.5">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${inputId}-helper`} className="text-[11px] text-zinc-500 mt-0.5">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
