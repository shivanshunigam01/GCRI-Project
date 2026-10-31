"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/auth.service";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaToken, setMfaToken] = useState("");
  const [showMfa, setShowMfa] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mfaInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showMfa && mfaInputRef.current) {
      mfaInputRef.current.focus();
    }
  }, [showMfa]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await authService.login({
        email: email.trim().toLowerCase(),
        password,
        mfaToken: mfaToken.trim() || undefined,
      });

      if (res.data?.token && res.data?.user) {
        login(res.data.token, res.data.user);
        router.push("/dashboard");
      } else if (res.data?.mfaRequired) {
        setShowMfa(true);
        setError("Multi-factor authentication required. Please enter your 6-digit TOTP code or recovery code.");
      }
    } catch (err: any) {
      const errorCode = err?.data?.error?.code;
      if (errorCode === "MFA_REQUIRED") {
        setShowMfa(true);
        setError("Multi-factor authentication required. Please enter your 6-digit TOTP code or recovery code.");
      } else if (errorCode === "ADMIN_MFA_ENFORCEMENT_REQUIRED") {
        setError("MFA enrollment is mandatory for Admin accounts. Please contact system administrator or complete enrollment.");
      } else if (errorCode === "INVALID_MFA_TOKEN") {
        setError("Invalid MFA verification or recovery code. Please try again.");
      } else if (errorCode === "ACCOUNT_LOCKED") {
        setError("Account is temporarily locked due to multiple failed login attempts. Please try again in 15 minutes.");
      } else if (errorCode === "ACCOUNT_DEACTIVATED") {
        setError("Your account has been deactivated. Please contact your platform administrator.");
      } else {
        setError(err?.message || "Invalid email or password.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Sign in to your account</h3>
        <p className="text-sm text-slate-500">Access your organization assessments</p>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="auditor@graice.io"
            suppressHydrationWarning
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline">
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="••••••••"
            suppressHydrationWarning
          />
        </div>

        {showMfa && (
          <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2">
            <label className="block text-sm font-semibold text-slate-800">
              Authenticator 6-Digit Code / Recovery Code
            </label>
            <input
              ref={mfaInputRef}
              type="text"
              required
              value={mfaToken}
              onChange={(e) => setMfaToken(e.target.value)}
              className="w-full px-3 py-2 border border-blue-300 bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-wider"
              placeholder="e.g. 123456 or recovery code"
              suppressHydrationWarning
            />
            <p className="text-[11px] text-slate-500">
              Enter the code from your authenticator app (Google Authenticator, Microsoft Authenticator) or an 8-character recovery backup code.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-sm rounded-lg transition shadow-sm"
        >
          {loading ? "Signing in..." : showMfa ? "Verify & Sign in" : "Sign in"}
        </button>
      </form>

      {/* Quick Fill Testing Credentials */}
      <div className="pt-2 border-t border-slate-100 space-y-2">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center">
          1-Click Quick Fill Credentials
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setEmail("auditor@graice.io");
              setPassword("Auditor@123456");
              setMfaToken("");
              setShowMfa(false);
              setError(null);
            }}
            className="py-2 px-2.5 rounded-lg border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 text-[11px] font-semibold text-emerald-800 transition text-center"
          >
            Direct Login: Auditor (Piyush)
          </button>
          <button
            type="button"
            onClick={() => {
              setEmail("admin@graice.io");
              setPassword("Admin@123456");
              setMfaToken("11223344");
              setShowMfa(true);
              setError(null);
            }}
            className="py-2 px-2.5 rounded-lg border border-purple-200 bg-purple-50/50 hover:bg-purple-100 text-[11px] font-semibold text-purple-800 transition text-center"
          >
            Super Admin (+ MFA)
          </button>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-3 text-center">
        <p className="text-xs text-slate-500">
          Have an invitation link?{" "}
          <Link href="/accept-invite" className="text-blue-600 font-medium hover:underline">
            Accept Invitation
          </Link>
        </p>
      </div>
    </div>
  );
}
