"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { MfaEnrollmentWizard } from "@/components/auth/MfaEnrollmentWizard";
import { storage } from "@/lib/storage";

function MfaEnrollContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mandatory = searchParams.get("mandatory") === "1";
  const { refreshUser } = useAuth();
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    setHasSession(Boolean(storage.getToken()));
  }, []);

  const handleComplete = useCallback(async () => {
    await refreshUser();
    router.push("/dashboard");
  }, [refreshUser, router]);

  const handleCancel = () => {
    storage.clear();
    router.push("/login");
  };

  if (hasSession === null) {
    return <div className="py-8 text-center text-sm text-slate-500">Loading MFA enrollment…</div>;
  }

  if (!hasSession) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-slate-600">Your MFA setup session expired. Please sign in again.</p>
        <Link
          href="/login"
          className="inline-block text-sm font-semibold text-blue-600 hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <MfaEnrollmentWizard
      mandatory={mandatory}
      onComplete={handleComplete}
      onCancel={mandatory ? undefined : handleCancel}
    />
  );
}

export default function MfaEnrollPage() {
  return (
    <Suspense
      fallback={
        <div className="py-8 text-center text-sm text-slate-500">Loading MFA enrollment…</div>
      }
    >
      <MfaEnrollContent />
    </Suspense>
  );
}
