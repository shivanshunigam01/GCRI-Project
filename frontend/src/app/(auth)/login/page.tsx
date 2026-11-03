"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/auth.service";
import {
  getApiErrorCode,
  getApiErrorDetails,
  getApiErrorMessage,
  normalizeLoginUser,
} from "@/lib/authUser";
import { storage } from "@/lib/storage";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaToken, setMfaToken] = useState("");
  const [showMfa, setShowMfa] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mfaInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showMfa && mfaInputRef.current) {
      mfaInputRef.current.focus();
    }
  }, [showMfa]);

  const completeLogin = (token: string, rawUser: Record<string, unknown>) => {
    const user = normalizeLoginUser(rawUser);
    if (!user) {
      setError("Login succeeded but user profile was incomplete. Please try again.");
      return;
    }
    login(token, user);
    router.push("/dashboard");
  };

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
        completeLogin(res.data.token, res.data.user as unknown as Record<string, unknown>);
      } else if (res.data?.mfaRequired) {
        setShowMfa(true);
        setError("Enter your 6-digit authenticator code or a recovery code.");
      }
    } catch (err: unknown) {
      const errorCode = getApiErrorCode(err);
      const details = getApiErrorDetails(err);

      if (errorCode === "MFA_REQUIRED") {
        setShowMfa(true);
        setError("Enter your 6-digit authenticator code or a recovery code.");
      } else if (errorCode === "ADMIN_MFA_ENFORCEMENT_REQUIRED") {
        const tempToken = details?.tempToken;
        if (typeof tempToken === "string" && tempToken.length > 0) {
          storage.setToken(tempToken);
          router.push("/mfa-enroll?mandatory=1");
          return;
        }
        setError(
          "MFA enrollment is mandatory for administrative accounts. Sign in again or contact your platform administrator."
        );
      } else if (errorCode === "INVALID_MFA_TOKEN") {
        setError("Invalid MFA or recovery code. Please try again.");
      } else if (errorCode === "ACCOUNT_LOCKED") {
        setError(
          "Account is temporarily locked due to multiple failed login attempts. Please try again in 15 minutes."
        );
      } else if (errorCode === "ACCOUNT_DEACTIVATED") {
        setError("Your account has been deactivated. Please contact your platform administrator.");
      } else {
        setError(getApiErrorMessage(err, "Invalid email or password."));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-editorial text-xl font-normal text-slate-900">Sign in to your account</h3>
        <p className="mt-1 text-sm font-medium text-slate-500">Access your organization assessments</p>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/80 focus:border-blue-400"
            placeholder="Enter your email"
            suppressHydrationWarning
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-semibold text-slate-700">Password</label>
            <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/80 focus:border-blue-400 bg-white"
              placeholder="••••••••"
              autoComplete="current-password"
              suppressHydrationWarning
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {showMfa && (
          <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2">
            <label className="block text-sm font-semibold text-slate-800">
              Authenticator 6-digit code / recovery code
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
              Use Google Authenticator, Microsoft Authenticator, or a single-use 8-character recovery code.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm tracking-wide rounded-xl transition shadow-sm"
        >
          {loading ? "Signing in..." : showMfa ? "Verify & sign in" : "Sign in"}
        </button>
      </form>

      <div className="border-t border-slate-200 pt-3 text-center">
        <p className="text-xs text-slate-500">
          Have an invitation link?{" "}
          <Link href="/accept-invite" className="text-blue-600 font-medium hover:underline">
            Accept invitation
          </Link>
        </p>
      </div>
    </div>
  );
}
