import React from "react";
import { cn } from "@/lib/utils";

type BrandLogoVariant = "auth" | "sidebar";

const variantClass: Record<BrandLogoVariant, string> = {
  auth: "h-16 w-auto max-w-[min(100%,340px)] sm:h-[4.75rem] sm:max-w-[360px]",
  sidebar: "h-12 w-auto max-w-[calc(100%-0.5rem)] sm:h-[3.25rem] lg:h-14 lg:max-w-[228px]",
};

export function BrandLogo({
  variant = "auth",
  className,
}: {
  variant?: BrandLogoVariant;
  className?: string;
}) {
  return (
    <img
      src="/logo.png"
      alt="Global Council for Responsible AI"
      className={cn("object-contain bg-transparent", variantClass[variant], className)}
    />
  );
}
