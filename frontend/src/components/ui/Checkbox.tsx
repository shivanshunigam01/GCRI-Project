"use client";

import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: string;
}

export function Checkbox({
  checked,
  onChange,
  label,
  description,
  id,
  className,
  disabled,
  ...props
}: CheckboxProps) {
  const checkboxId = id || (typeof label === "string" ? label.replace(/\s+/g, "-").toLowerCase() : undefined);

  return (
    <label
      htmlFor={checkboxId}
      className={cn(
        "inline-flex items-start gap-2.5 cursor-pointer select-none group",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <div className="relative flex items-center justify-center mt-0.5">
        <input
          id={checkboxId}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
          {...props}
        />
        <div
          className={cn(
            "w-4 h-4 rounded-md border transition-all duration-150 flex items-center justify-center",
            checked
              ? "bg-[var(--accent)] border-[var(--accent)] text-white shadow-2xs"
              : "border-slate-300 bg-white hover:border-slate-400 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500/30"
          )}
        >
          {checked && <Check className="w-3 h-3 stroke-[3]" />}
        </div>
      </div>
      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <span className="text-xs font-medium text-[var(--text-main)] group-hover:text-slate-900 transition-colors leading-tight">
              {label}
            </span>
          )}
          {description && (
            <span className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">
              {description}
            </span>
          )}
        </div>
      )}
    </label>
  );
}
