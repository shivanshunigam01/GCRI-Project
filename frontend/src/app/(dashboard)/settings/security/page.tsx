"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/auth.service";
import { SetupMfaResponse } from "@/types/auth.types";
import {
  ShieldCheck,
  ShieldAlert,
  Key,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Smartphone,
  QrCode,
  Shield,
} from "lucide-react";

export default function SecuritySettingsPage() {
  const { user, refreshUser } = useAuth();

  // Password Change Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // MFA Setup Modal State
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupData, setSetupData] = useState<SetupMfaResponse | null>(null);
  const [verifyToken, setVerifyToken] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [codesCopied, setCodesCopied] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);

  // MFA Disable Modal State
  const [disableModalOpen, setDisableModalOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [disableToken, setDisableToken] = useState("");
  const [disabling, setDisabling] = useState(false);
  const [disableError, setDisableError] = useState<string | null>(null);

  const isMfaActive = Boolean(user?.mfa?.enabled || user?.mfaEnabled);

  // Handle Password Change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    try {
      setPasswordLoading(true);
      setPasswordError(null);
      setPasswordSuccess(null);

      await authService.changePassword({
        currentPassword,
        newPassword,
      });

      setPasswordSuccess("Your account password has been updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error("Failed to change password:", err);
      setPasswordError(
        err?.response?.data?.message || err?.message || "Failed to update password."
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  // Start MFA Setup Flow
  const handleStartMfaSetup = async () => {
    try {
      setSetupLoading(true);
      setMfaError(null);
      setRecoveryCodes(null);
      setVerifyToken("");
      setSetupModalOpen(true);

      const res = await authService.setupMfa();
      setSetupData(res.data);
    } catch (err: any) {
      console.error("Failed to initiate MFA setup:", err);
      setMfaError(
        err?.response?.data?.message || err?.message || "Failed to generate 2FA secret."
      );
    } finally {
      setSetupLoading(false);
    }
  };

  // Confirm 6-Digit TOTP Token
  const handleVerifyMfaSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyToken.trim() || verifyToken.trim().length !== 6) {
      setMfaError("Please enter a valid 6-digit code from your authenticator app.");
      return;
    }

    try {
      setVerifying(true);
      setMfaError(null);

      const res = await authService.verifyMfa({ token: verifyToken.trim() });
      if (res.data?.recoveryCodes) {
        setRecoveryCodes(res.data.recoveryCodes);
      }
      await refreshUser();
    } catch (err: any) {
      console.error("MFA verification failed:", err);
      setMfaError(
        err?.response?.data?.message || err?.message || "Invalid 6-digit code. Please try again."
      );
    } finally {
      setVerifying(false);
    }
  };

  // Handle Disable MFA Flow
  const handleDisableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disablePassword || !disableToken) {
      setDisableError("Both current password and a 6-digit token are required.");
      return;
    }

    try {
      setDisabling(true);
      setDisableError(null);

      await authService.disableMfa({
        password: disablePassword,
        token: disableToken.trim(),
      });

      setDisableModalOpen(false);
      setDisablePassword("");
      setDisableToken("");
      await refreshUser();
    } catch (err: any) {
      console.error("Failed to disable MFA:", err);
      setDisableError(
        err?.response?.data?.message || err?.message || "Failed to disable MFA."
      );
    } finally {
      setDisabling(false);
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

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
          <ShieldCheck className="h-4 w-4" />
          <span>Security &amp; Credentials</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Security &amp; MFA</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure two-factor TOTP authentication, maintain recovery codes, and update your account password.
        </p>
      </div>

      {/* Two-Factor Authentication Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`p-3 rounded-xl shrink-0 ${
                isMfaActive ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
              }`}
            >
              {isMfaActive ? <ShieldCheck className="h-6 w-6" /> : <Smartphone className="h-6 w-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Two-Factor Authentication (TOTP)
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                    isMfaActive
                      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                      : "bg-amber-100 text-amber-800 border-amber-200"
                  }`}
                >
                  {isMfaActive ? "Enabled & Active" : "Disabled"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-lg">
                {isMfaActive
                  ? "Your account is protected with hardware or software-based time-based one-time passwords (TOTP)."
                  : "Protect your account from credential theft by enforcing a 6-digit code via Google Authenticator, 1Password, or Authy."}
              </p>
            </div>
          </div>

          <div>
            {isMfaActive ? (
              user?.role === "Admin" ? (
                <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 inline-block text-center">
                  Mandatory for Admins
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setDisableModalOpen(true)}
                  className="px-3.5 py-2 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition"
                >
                  Disable 2FA
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={handleStartMfaSetup}
                disabled={setupLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-xs disabled:opacity-50"
              >
                {setupLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                <span>Enable 2FA</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
        <div>
          <h3 className="text-base font-bold text-slate-900">Update Password</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Ensure your account uses a secure password of at least 8 characters.
          </p>
        </div>

        {passwordSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        {passwordError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-lg">
          {/* Current Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Current Password *
            </label>
            <div className="relative">
              <input
                type={showCurrentPw ? "text" : "password"}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 pr-9 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw(!showCurrentPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showCurrentPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              New Password (minimum 8 characters) *
            </label>
            <div className="relative">
              <input
                type={showNewPw ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 pr-9 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
              <button
                type="button"
                onClick={() => setShowNewPw(!showNewPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showNewPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Confirm New Password *
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={passwordLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-xs disabled:opacity-50"
            >
              {passwordLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              <span>{passwordLoading ? "Updating..." : "Change Password"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Modal: MFA Setup (QR Code & Verification) */}
      {setupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Enable Two-Factor Auth</h3>
                  <p className="text-xs text-slate-500">Scan QR code using Google Authenticator</p>
                </div>
              </div>
              <button
                onClick={() => setSetupModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {mfaError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{mfaError}</span>
              </div>
            )}

            {!recoveryCodes ? (
              <div className="space-y-4">
                {setupLoading ? (
                  <div className="p-8 text-center space-y-2">
                    <RefreshCw className="h-6 w-6 text-blue-600 animate-spin mx-auto" />
                    <p className="text-xs text-slate-500">Generating TOTP key...</p>
                  </div>
                ) : setupData ? (
                  <>
                    <div className="flex justify-center bg-white p-3 border border-slate-200 rounded-xl max-w-xs mx-auto">
                      {setupData.qrCodeUrl ? (
                        <img
                          src={setupData.qrCodeUrl}
                          alt="2FA QR Code"
                          className="h-44 w-44 object-contain"
                        />
                      ) : (
                        <div className="h-44 w-44 flex items-center justify-center text-slate-400 text-xs">
                          QR not available
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Manual Entry Secret:</span>
                        <code className="font-mono text-slate-800 font-bold">{setupData.secret}</code>
                      </div>
                      <button
                        onClick={handleCopySecret}
                        className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded text-[11px] font-medium text-slate-700 transition"
                      >
                        {secretCopied ? "Copied" : "Copy"}
                      </button>
                    </div>

                    <form onSubmit={handleVerifyMfaSetup} className="space-y-3 pt-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Enter 6-Digit Code from Authenticator App *
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          value={verifyToken}
                          onChange={(e) => setVerifyToken(e.target.value.replace(/\D/g, ""))}
                          placeholder="123456"
                          className="w-full text-center tracking-widest font-mono text-lg py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={verifying}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {verifying && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                        <span>{verifying ? "Verifying..." : "Confirm & Activate 2FA"}</span>
                      </button>
                    </form>
                  </>
                ) : null}
              </div>
            ) : (
              /* Success & Backup Recovery Codes */
              <div className="space-y-4">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Two-Factor Authentication is Now Active!</span>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    Store these single-use recovery codes in a secure place. If you lose your phone, you can use these to recover access.
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
                  onClick={handleCopyCodes}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5"
                >
                  {codesCopied ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-600" />
                      <span>Copied All Codes</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>Copy All Backup Codes</span>
                    </>
                  )}
                </button>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      setSetupModalOpen(false);
                      setRecoveryCodes(null);
                    }}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition"
                  >
                    I Have Safely Saved My Recovery Codes
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Disable 2FA */}
      {disableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Disable Two-Factor Auth</h3>
                  <p className="text-xs text-slate-500">Requires password &amp; current 6-digit code</p>
                </div>
              </div>
              <button
                onClick={() => setDisableModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {disableError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{disableError}</span>
              </div>
            )}

            <form onSubmit={handleDisableMfa} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Current Account Password *
                </label>
                <input
                  type="password"
                  required
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Current 6-Digit Authenticator Code *
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={disableToken}
                  onChange={(e) => setDisableToken(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="w-full text-center tracking-widest font-mono text-base py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setDisableModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={disabling}
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {disabling && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>{disabling ? "Disabling..." : "Disable 2FA"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
