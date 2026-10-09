import React from "react";
import { cn } from "@/lib/utils";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  imageSrc?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  statusDot?: "online" | "offline" | "busy" | "verified";
  className?: string;
}

// Generate deterministic background color based on name string
function getMonogramColor(name: string): string {
  const palettes = [
    "bg-slate-900 text-white",
    "bg-indigo-600 text-white",
    "bg-blue-600 text-white",
    "bg-teal-600 text-white",
    "bg-emerald-600 text-white",
    "bg-amber-600 text-white",
    "bg-violet-600 text-white",
    "bg-rose-600 text-white",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % palettes.length;
  return palettes[index];
}

function getInitials(name: string): string {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  imageSrc,
  size = "md",
  statusDot,
  className,
  ...props
}: AvatarProps) {
  const sizeStyles = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-8 h-8 text-xs",
    md: "w-9 h-9 text-xs",
    lg: "w-11 h-11 text-sm",
    xl: "w-14 h-14 text-base font-bold",
  };

  const dotSizeStyles = {
    xs: "w-1.5 h-1.5",
    sm: "w-2 h-2",
    md: "w-2.5 h-2.5",
    lg: "w-3 h-3",
    xl: "w-3.5 h-3.5",
  };

  const statusColors = {
    online: "bg-emerald-500",
    offline: "bg-slate-400",
    busy: "bg-amber-500",
    verified: "bg-blue-500",
  };

  const colorClass = getMonogramColor(name);
  const initials = getInitials(name);

  return (
    <div className={cn("relative inline-flex shrink-0 select-none", className)} {...props}>
      {imageSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageSrc}
          alt={name}
          className={cn("rounded-full object-cover shadow-2xs", sizeStyles[size])}
        />
      ) : (
        <div
          className={cn(
            "rounded-full font-bold flex items-center justify-center tracking-tight shadow-2xs",
            sizeStyles[size],
            colorClass
          )}
        >
          {initials}
        </div>
      )}

      {statusDot && (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-white",
            dotSizeStyles[size],
            statusColors[statusDot]
          )}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
