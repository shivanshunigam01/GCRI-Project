"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

/** Blocks Org Admin from confidential assessment content (backend also enforces). */
export function useCanViewConfidentialAssessment(): boolean {
  const { isOrgAdmin, loading } = useAuth();
  if (loading) return false;
  return !isOrgAdmin;
}

export function AssessmentConfidentialGate({ children }: { children: React.ReactNode }) {
  const { isOrgAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="max-w-lg mx-auto p-8 text-center text-sm text-slate-500">Loading…</div>
    );
  }

  if (isOrgAdmin) {
    return (
      <div className="max-w-xl mx-auto p-8 bg-white rounded-2xl border border-amber-200 text-center space-y-4">
        <ShieldAlert className="h-10 w-10 text-amber-600 mx-auto" />
        <h1 className="text-lg font-bold text-slate-900">Access restricted</h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          Organization administrators cannot view confidential assessment answers, scores, findings,
          or audit reports. Contact your accredited assessor or platform super administrator if you
          need operational metadata only.
        </p>
        <Link href="/assessments" className="inline-block text-sm font-semibold text-blue-700 hover:underline">
          Back to assessments
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
