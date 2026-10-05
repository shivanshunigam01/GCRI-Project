import React from "react";
import { Loader2 } from "lucide-react";

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Spinner({ size = "md", className = "", ...props }: SpinnerProps) {
  const sizeMap = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div
      role="status"
      className={`inline-flex items-center justify-center text-indigo-700 ${className}`}
      {...props}
    >
      <Loader2 className={`animate-spin ${sizeMap[size]}`} />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export default Spinner;
