import React from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <Link href="/login" className="inline-flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-zinc-950 flex items-center justify-center text-white shadow-xs ring-1 ring-zinc-900/10 group-hover:bg-zinc-900 transition-colors">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-zinc-950">
            GRAICE
          </span>
        </Link>
        <p className="mt-1 text-xs text-zinc-500 font-medium">
          Responsible AI Governance & Compliance Platform
        </p>
      </div>

      {/* Centered Auth Card Container */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {children}
      </div>

      {/* Minimal Footer */}
      <div className="mt-8 text-center text-xs text-zinc-400">
        &copy; {new Date().getFullYear()} GRAICE Platform. All rights reserved.
      </div>
    </div>
  );
}
