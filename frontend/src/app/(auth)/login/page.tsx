"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AlertCircle, KeyRound, ArrowLeft, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaToken, setMfaToken] = useState("");
  const [showMfaChallenge, setShowMfaChallenge] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await authService.login({
        email,
        password,
        ...(showMfaChallenge ? { mfaToken } : {}),
      });

      if (res.success && res.data) {
        login(res.data);
        router.push("/dashboard");
      } else if (res.error?.code === "MFA_REQUIRED") {
        setShowMfaChallenge(true);
      } else if (res.error?.code === "ADMIN_MFA_ENFORCEMENT_REQUIRED") {
        setError(
          "Multi-factor authentication (MFA) is mandatory for Administrator accounts. Please contact system security or complete enrollment."
        );
      } else {
        setError(res.error?.message || "Invalid email or password.");
      }
    } catch {
      setError("Unable to connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white py-8 px-6 sm:px-8 rounded-2xl border border-zinc-200/80 shadow-[0_1px_3px_0_rgba(0,0,0,0.03),0_1px_2px_-1px_rgba(0,0,0,0.03)]">
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-800 text-[11px] font-semibold mb-2.5">
          <ShieldCheck className="w-3.5 h-3.5 text-zinc-900" />
          <span>Admin Portal</span>
        </div>
        <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
          {showMfaChallenge ? "Two-Factor Authentication" : "Sign In to Admin Portal"}
        </h1>
        <p className="mt-1 text-xs text-zinc-500">
          {showMfaChallenge
            ? "Enter the 6-digit verification code from your authenticator app."
            : "Enter your administrator credentials to access the governance platform."}
        </p>
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!showMfaChallenge ? (
          <>
            <Input
              label="Email address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              autoComplete="email"
            />

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-zinc-700">
                  Password <span className="text-rose-500">*</span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-zinc-600 hover:text-zinc-950 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center gap-2.5 text-xs text-zinc-800">
              <KeyRound className="w-4 h-4 text-zinc-700 shrink-0" />
              <span>Multi-factor authentication is active on your account</span>
            </div>

            <Input
              label="Authentication code"
              type="text"
              maxLength={8}
              required
              value={mfaToken}
              onChange={(e) => setMfaToken(e.target.value.trim())}
              placeholder="Enter 6-digit code or recovery key"
              autoFocus
            />
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full mt-2 font-medium"
          isLoading={loading}
        >
          {showMfaChallenge ? "Verify and continue" : "Sign in"}
        </Button>

        {showMfaChallenge && (
          <button
            type="button"
            onClick={() => {
              setShowMfaChallenge(false);
              setMfaToken("");
              setError(null);
            }}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 pt-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to email & password
          </button>
        )}
      </form>

      <div className="mt-6 pt-5 border-t border-zinc-100 text-center text-[11px] text-zinc-400">
        GRAICE Responsible AI Governance System · Authorized Personnel Only
      </div>
    </div>
  );
}
