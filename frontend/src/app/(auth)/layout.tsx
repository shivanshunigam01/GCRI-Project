import React from "react";
import { BrandLogo } from "@/components/shared/BrandLogo";

/** Unsplash — business audit / compliance review (document & analytics desk) */
const AUTH_BACKGROUND_IMAGE =
  "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=2400&q=80";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative h-dvh max-h-dvh overflow-hidden flex flex-col justify-center py-4 sm:py-6 sm:px-6 lg:px-8">
      {/* Background photo */}
      <div
        className="absolute inset-0 bg-slate-900 bg-cover bg-center bg-no-repeat scale-105"
        style={{ backgroundImage: `url(${AUTH_BACKGROUND_IMAGE})` }}
        aria-hidden
      />
      {/* Readability overlays — keeps form text crisp */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-slate-950/88 via-slate-900/82 to-cyan-950/85"
        aria-hidden
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(20,184,166,0.12),_transparent_55%)]" aria-hidden />

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-lg px-4 shrink-0">
        <div className="flex justify-center bg-transparent py-0.5">
          <BrandLogo variant="auth" />
        </div>
        <h2 className="font-editorial auth-display-title mt-3 text-center text-xl sm:text-2xl text-white">
          GCRAI Assessment Platform
        </h2>
        <p className="mt-1.5 text-center text-xs sm:text-sm font-medium leading-relaxed text-slate-200/95 max-w-sm mx-auto">
          Enterprise AI governance, GRAICE assurance audits &amp; institutional verification
        </p>
      </div>

      <div className="relative z-10 mt-5 sm:mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 shrink-0">
        <div className="surface-panel sm:rounded-2xl py-6 px-5 shadow-2xl sm:px-8 ring-1 ring-white/50 backdrop-blur-md">
          {children}
        </div>
      </div>
    </div>
  );
}
