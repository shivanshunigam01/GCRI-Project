"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/auth.service";
import { Eye, EyeOff, Loader2 } from "lucide-react";

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

  const [ssoLoading, setSsoLoading] = useState<"google" | "microsoft" | null>(null);

  const handleGoogleSignIn = async () => {
    setError(null);
    setSsoLoading("google");
    try {
      const res = await authService.oauthGoogle({ idToken: "dummy_client_id_token" });
      if (res.data?.token && res.data?.user) {
        login(res.data.token, res.data.user);
        router.push("/dashboard");
      }
    } catch (err: any) {
      const code = err?.data?.error?.code;
      if (code === "OIDC_PROVIDER_NOT_CONFIGURED") {
        setError("Google Enterprise SSO is not yet configured for this deployment. Please sign in with email & password.");
      } else {
        setError(err?.data?.error?.message || err?.message || "Google Single Sign-On failed.");
      }
    } finally {
      setSsoLoading(null);
    }
  };

  const handleMicrosoftSignIn = async () => {
    setError(null);
    setSsoLoading("microsoft");
    try {
      const res = await authService.oauthMicrosoft({ idToken: "dummy_client_id_token" });
      if (res.data?.token && res.data?.user) {
        login(res.data.token, res.data.user);
        router.push("/dashboard");
      }
    } catch (err: any) {
      const code = err?.data?.error?.code;
      if (code === "OIDC_PROVIDER_NOT_CONFIGURED") {
        setError("Microsoft Entra ID SSO is not yet configured for this deployment. Please sign in with email & password.");
      } else {
        setError(err?.data?.error?.message || err?.message || "Microsoft Single Sign-On failed.");
      }
    } finally {
      setSsoLoading(null);
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
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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

      {/* Enterprise Single Sign-On (SSO) */}
      <div className="space-y-3">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white/95 px-2 text-slate-400 font-semibold tracking-wider text-[11px]">
              Or single sign-on with
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={loading || !!ssoLoading}
            onClick={handleGoogleSignIn}
            className="flex items-center justify-center gap-2 py-2 px-3 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition"
          >
            {ssoLoading === "google" ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Google</span>
          </button>

          <button
            type="button"
            disabled={loading || !!ssoLoading}
            onClick={handleMicrosoftSignIn}
            className="flex items-center justify-center gap-2 py-2 px-3 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition"
          >
            {ssoLoading === "microsoft" ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 23 23">
                <path fill="#f35325" d="M1 1h10v10H1z" />
                <path fill="#81bc06" d="M12 1h10v10H12z" />
                <path fill="#05a6f0" d="M1 12h10v10H1z" />
                <path fill="#ffba08" d="M12 12h10v10H12z" />
              </svg>
            )}
            <span>Microsoft</span>
          </button>
        </div>
      </div>

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
