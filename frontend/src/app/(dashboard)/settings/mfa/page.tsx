"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/auth.service";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  ShieldCheck,
  KeyRound,
  QrCode,
  Copy,
  Check,
  AlertTriangle,
  Lock,
  CheckCircle2,
} from "lucide-react";
import { MfaSetupData } from "@/types/auth.types";
import { SettingsTabs } from "@/components/features/settings/SettingsTabs";

export default function MfaSettingsPage() {
  const { user } = useAuth();

  const [setupData, setSetupData] = useState<MfaSetupData | null>(null);
  const [token, setToken] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedRecovery, setCopiedRecovery] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Disable form state
  const [disablePassword, setDisablePassword] = useState("");
  const [disableToken, setDisableToken] = useState("");
  const [showDisableForm, setShowDisableForm] = useState(false);

  const handleStartSetup = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await authService.generateMfa();
      if (res.success && res.data) {
        setSetupData(res.data);
      } else {
        setError(res.error?.message || "Failed to initialize MFA secret.");
      }
    } catch {
      setError("Failed to communicate with security server.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await authService.verifyMfa(token);
      if (res.success && res.data) {
        setRecoveryCodes(res.data.recoveryCodes || []);
        setSuccess("Two-Factor Authentication has been successfully activated on your account.");
      } else {
        setError(res.error?.message || "Invalid 6-digit TOTP code. Please try again.");
      }
    } catch {
      setError("Failed to verify MFA code with server.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await authService.disableMfa({
        password: disablePassword,
        token: disableToken,
      });
      if (res.success) {
        setSuccess("Two-Factor Authentication has been disabled.");
        setShowDisableForm(false);
        setSetupData(null);
        setRecoveryCodes([]);
      } else {
        setError(res.error?.message || "Failed to disable MFA. Check password & token.");
      }
    } catch {
      setError("Failed to communicate with server.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: "key" | "recovery") => {
    navigator.clipboard.writeText(text);
    if (type === "key") {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedRecovery(true);
      setTimeout(() => setCopiedRecovery(false), 2000);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Account Settings
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Cryptographic TOTP (Time-based One-Time Password) protection and emergency recovery keys
        </p>
      </div>

      {/* Tabs */}
      <SettingsTabs />

      {error && (
        <div className="flex items-center gap-2 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Recovery Codes Display (Shown upon successful activation) */}
      {recoveryCodes.length > 0 && (
        <Card className="border-indigo-200 bg-indigo-50/30 shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-900">
                <Lock className="w-5 h-5 text-indigo-700" />
                <CardTitle className="text-base font-bold">
                  Emergency Recovery Backup Codes
                </CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(recoveryCodes.join("\n"), "recovery")}
                className="gap-1.5 text-xs"
              >
                {copiedRecovery ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedRecovery ? "Copied All" : "Copy Codes"}</span>
              </Button>
            </div>
            <CardDescription className="text-xs text-indigo-800 mt-1">
              Store these 8 emergency backup codes in a secure credential vault. Each code can be used once if you lose access to your authenticator app.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {recoveryCodes.map((code, index) => (
                <div
                  key={index}
                  className="px-3 py-2 bg-white rounded-lg border border-indigo-100 font-mono text-center text-xs font-semibold text-slate-800 shadow-2xs select-all"
                >
                  {code}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main MFA Status Card */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-slate-900">
                  Authenticator App (TOTP)
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Compatible with Google Authenticator, Microsoft Authenticator, 1Password, and Authy
                </CardDescription>
              </div>
            </div>
            <Badge variant={user?.mfaEnabled || recoveryCodes.length > 0 ? "verified" : "pending"}>
              {user?.mfaEnabled || recoveryCodes.length > 0 ? "Enabled" : "Not Configured"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          {!setupData && recoveryCodes.length === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                Multi-Factor Authentication adds an institutional layer of cryptographic security to your GRAICE account by requiring a 6-digit TOTP code in addition to your password during sign in.
              </p>
              <div className="pt-2">
                <Button
                  variant="primary"
                  onClick={handleStartSetup}
                  isLoading={loading}
                  className="gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Configure Two-Factor Authentication</span>
                </Button>
              </div>
            </div>
          )}

          {/* Setup In Progress: Display QR Code & Verification Form */}
          {setupData && recoveryCodes.length === 0 && (
            <div className="space-y-6 pt-2">
              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
                {/* QR Code Container */}
                <div className="w-44 h-44 bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-center shadow-xs shrink-0">
                  {setupData.qrCodeUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={setupData.qrCodeUrl}
                      alt="Authenticator QR Code"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <QrCode className="w-16 h-16 text-slate-300" />
                  )}
                </div>

                <div className="space-y-3 flex-1 text-center sm:text-left">
                  <h4 className="text-sm font-semibold text-slate-900">
                    1. Scan the QR code or enter secret manually
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Open your authenticator app, tap Add Account (+), and point your camera at this QR code.
                  </p>

                  <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200">
                    <span className="font-mono text-xs text-slate-700 font-semibold truncate flex-1">
                      {setupData.secret}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(setupData.secret, "key")}
                      className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 shrink-0 font-medium"
                    >
                      {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 2: Confirm 6-digit code */}
              <form onSubmit={handleVerifySetup} className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-900">
                  2. Enter 6-digit verification code from your app
                </h4>
                <div className="flex gap-3 items-end max-w-sm">
                  <div className="flex-1">
                    <Input
                      label="6-Digit Verification Code"
                      type="text"
                      maxLength={6}
                      required
                      placeholder="Enter 6-digit code"
                      value={token}
                      onChange={(e) => setToken(e.target.value.trim())}
                      className="text-center font-mono tracking-widest text-lg"
                      autoFocus
                    />
                  </div>
                  <Button type="submit" variant="primary" isLoading={loading}>
                    Verify & Activate
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Option to Disable MFA if enabled */}
          {(user?.mfaEnabled || recoveryCodes.length > 0) && (
            <div className="pt-4 border-t border-slate-100">
              {!showDisableForm ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDisableForm(true)}
                  className="text-xs text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                >
                  Disable Two-Factor Authentication
                </Button>
              ) : (
                <form onSubmit={handleDisableMfa} className="space-y-3 p-4 rounded-lg bg-red-50/50 border border-red-200 max-w-md">
                  <p className="text-xs font-semibold text-red-800">
                    Confirm disabling Two-Factor Authentication
                  </p>
                  <Input
                    label="Current Password"
                    type="password"
                    required
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                  />
                  <Input
                    label="Current 6-Digit TOTP or Recovery Key"
                    type="text"
                    required
                    value={disableToken}
                    onChange={(e) => setDisableToken(e.target.value.trim())}
                  />
                  <div className="flex items-center gap-2 pt-2">
                    <Button type="submit" variant="destructive" size="sm" isLoading={loading}>
                      Confirm Disable
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDisableForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
