"use client";

import React from "react";
import { useApiLoading } from "@/context/ApiLoadingContext";
import { cn } from "@/lib/utils";

/**
 * Fixed top progress bar — visible whenever apiClient has in-flight requests.
 */
export function ApiLoadingBar() {
  const { isLoading } = useApiLoading();

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[9999] h-0.5 overflow-hidden transition-opacity duration-200",
        isLoading ? "opacity-100" : "opacity-0"
      )}
      role="progressbar"
      aria-hidden={!isLoading}
      aria-busy={isLoading}
    >
      <div
        className={cn(
          "h-full w-[40%] bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.45)]",
          isLoading ? "animate-api-loading-bar" : ""
        )}
      />
    </div>
  );
}
