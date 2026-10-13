"use client";

import React, { useState } from "react";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await authService.login({
        email,
        password,
        mfaToken: mfaToken.trim() || undefined,
      });

      if (res.data?.token && res.data?.user) {
        login(res.data.token, res.data.user);
        router.push("/dashboard");
      } else if (res.data?.mfaRequired) {
        setShowMfa(true);
        setError("MFA required: Enter your authenticator code or recovery backup code (e.g. 12345678).");
      }
    } catch (err: any) {
      if (err?.data?.error?.code === "MFA_REQUIRED") {
        setShowMfa(true);
        setError("MFA required: Enter your authenticator code or recovery code.");
      } else {
        setError(err?.message || "Failed to log in");
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
          />
        </div>

        {showMfa && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              MFA / Recovery Code
            </label>
            <input
              type="text"
              value={mfaToken}
              onChange={(e) => setMfaToken(e.target.value)}
              className="w-full px-3 py-2 border border-blue-300 bg-blue-50/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              placeholder="e.g. 12345678"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              For Super Admin testing, use recovery code <code className="text-blue-600 font-semibold">12345678</code>
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-sm rounded-lg transition shadow-sm"
        >
          {loading ? "Signing in..." : "Sign in"}
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
