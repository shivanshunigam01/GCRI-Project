"use client";

import React, { useEffect, useState } from "react";
import { authService } from "@/services/auth.service";
import { storage } from "@/lib/storage";
import { SetupMfaResponse } from "@/types/auth.types";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  Shield,
  Smartphone,
} from "lucide-react";

interface MfaEnrollmentWizardProps {
  /** Called after MFA is verified and session JWT is stored. */
  onComplete: () => void | Promise<void>;
  /** Shown when enrollment is required for Admin / SuperAdmin. */
  mandatory?: boolean;
  onCancel?: () => void;
}

export function MfaEnrollmentWizard({
  onComplete,
  mandatory = false,
  onCancel,
}: MfaEnrollmentWizardProps) {
  const [setupLoading, setSetupLoading] = useState(true);
  const [setupData, setSetupData] = useState<SetupMfaResponse | null>(null);
  const [verifyToken, setVerifyToken] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [codesCopied, setCodesCopied] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setSetupLoading(true);
      setError(null);
      try {
        const res = await authService.setupMfa();
        if (!cancelled) setSetupData(res.data);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            getMessage(err, "Could not start MFA setup. Your session may have expired — please sign in again.")
          );
        }
      } finally {
        if (!cancelled) setSetupLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = verifyToken.trim();
    if (code.length !== 6) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }

    setVerifying(true);
    setError(null);
    try {
      const res = await authService.verifyMfa({ token: code });
      if (res.data?.recoveryCodes) {
        setRecoveryCodes(res.data.recoveryCodes);
      }
      if (res.data?.token) {
        storage.setToken(res.data.token);
      }
      if (!res.data?.recoveryCodes) {
        await onComplete();
      }
    } catch (err: unknown) {
      setError(getMessage(err, "Invalid verification code. Try again."));
    } finally {
      setVerifying(false);
    }
  };

  const handleCopyCodes = () => {
    if (!recoveryCodes) return;
    navigator.clipboard.writeText(recoveryCodes.join("\n"));
    setCodesCopied(true);
    setTimeout(() => setCodesCopied(false), 2500);
  };

  const handleCopySecret = () => {
    if (!setupData?.secret) return;
    navigator.clipboard.writeText(setupData.secret);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2500);
  };

  if (recoveryCodes) {
    return (
      <div className="space-y-4">
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm space-y-1">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Two-factor authentication is active</span>
          </div>
          <p className="text-xs text-emerald-700">
            Save these one-time recovery codes in a secure location. Each code works only once.
          </p>
        </div>

        <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 grid grid-cols-2 gap-2 text-center font-mono text-emerald-400 text-xs">
          {recoveryCodes.map((c, i) => (
            <div key={i} className="py-1 px-2 bg-slate-800/60 rounded">
              {c}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={handleCopyCodes}
          className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
        >
          {codesCopied ? (
            <>
              <Check className="h-4 w-4 text-emerald-600" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy all recovery codes
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => onComplete()}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold"
        >
          Continue to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">
          {mandatory ? <Shield className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            {mandatory ? "Required: Set up authenticator" : "Set up two-factor authentication"}
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">
            {mandatory
              ? "Administrative accounts must enroll in MFA before accessing the platform."
              : "Scan the QR code with Google Authenticator, Microsoft Authenticator, or similar."}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg flex gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {setupLoading ? (
        <div className="py-10 text-center space-y-2">
          <RefreshCw className="h-6 w-6 text-blue-600 animate-spin mx-auto" />
          <p className="text-sm text-slate-500">Generating secure TOTP key…</p>
        </div>
      ) : setupData ? (
        <>
          <div className="flex justify-center bg-white p-3 border border-slate-200 rounded-xl">
            {setupData.qrCodeUrl ? (
              <img
                src={setupData.qrCodeUrl}
                alt="Authenticator QR code"
                className="h-44 w-44 object-contain"
              />
            ) : (
              <p className="text-sm text-slate-400 py-16">QR code unavailable</p>
            )}
          </div>

          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 block font-medium">Manual entry key</span>
              <code className="font-mono text-slate-800 font-bold break-all">{setupData.secret}</code>
            </div>
            <button
              type="button"
              onClick={handleCopySecret}
              className="shrink-0 px-2 py-1 bg-white border border-slate-200 rounded text-[11px] font-medium"
            >
              {secretCopied ? "Copied" : "Copy"}
            </button>
          </div>

          <form onSubmit={handleVerify} className="space-y-3">
            <label className="block text-sm font-semibold text-slate-700">
              6-digit code from your app
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              value={verifyToken}
              onChange={(e) => setVerifyToken(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className="w-full text-center tracking-widest font-mono text-lg py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={verifying}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            >
              {verifying && <RefreshCw className="h-4 w-4 animate-spin" />}
              {verifying ? "Verifying…" : "Verify & enable MFA"}
            </button>
          </form>
        </>
      ) : null}

      {!mandatory && onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="w-full text-sm text-slate-500 hover:text-slate-800 py-1"
        >
          Cancel
        </button>
      )}
    </div>
  );
}

function getMessage(err: unknown, fallback: string): string {
  if (!err || typeof err !== "object") return fallback;
  const e = err as { message?: string; data?: { error?: { message?: string } } };
  return e.data?.error?.message || e.message || fallback;
}
