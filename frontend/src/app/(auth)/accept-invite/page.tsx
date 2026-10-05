"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { userService } from "@/services/user.service";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import { ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Invitation token is missing or invalid. Please check your invitation link.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await userService.acceptInvite({ token, password });

      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/login");
        }, 2500);
      } else {
        setError(res.error?.message || "Failed to accept invitation. The invitation link may have expired.");
      }
    } catch {
      setError("Unable to connect to the server. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white py-8 px-6 sm:px-8 rounded-2xl border border-zinc-200/80 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Account Activated</h1>
        <p className="text-xs text-zinc-500 leading-relaxed max-w-sm mx-auto">
          Your credentials have been configured successfully. You will be redirected to the sign-in portal momentarily.
        </p>
        <div className="pt-2">
          <Link href="/login">
            <Button variant="primary" size="md" className="w-full font-medium">
              Proceed to Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white py-8 px-6 sm:px-8 rounded-2xl border border-zinc-200/80 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)]">
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-800 text-[11px] font-semibold mb-2.5">
          <ShieldCheck className="w-3.5 h-3.5 text-zinc-900" />
          <span>Account Invitation</span>
        </div>
        <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
          Complete Your Account Setup
        </h1>
        <p className="mt-1 text-xs text-zinc-500">
          You have been invited to join the GRAICE platform. Create a secure password to activate your access.
        </p>
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {!token ? (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-2">
          <p className="font-semibold">Missing Invitation Token</p>
          <p className="text-[11px]">
            This page requires a valid cryptographic invitation token in the URL. Please verify your invitation email or contact your administrator.
          </p>
          <div className="pt-2">
            <Link href="/login" className="font-semibold text-zinc-900 underline">
              Return to Login
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Create password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter new password"
            helperText="Must be at least 8 characters"
            autoComplete="new-password"
          />

          <Input
            label="Confirm password"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full mt-2 font-medium"
            isLoading={loading}
          >
            Activate Account
          </Button>
        </form>
      )}

      <div className="mt-6 pt-5 border-t border-zinc-100 text-center text-[11px] text-zinc-400">
        GRAICE Responsible AI Governance System · Authorized Personnel Only
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[300px] flex items-center justify-center">
          <Spinner size="md" />
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}
