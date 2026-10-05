"use client";

import React, { useState } from "react";
import Link from "next/link";
import { authService } from "@/services/auth.service";
import { SettingsTabs } from "@/components/features/settings/SettingsTabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import {
  Lock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
  Eye,
  EyeOff,
} from "lucide-react";

export default function SecuritySettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Real-time strength checks
  const hasMinLength = newPassword.length >= 8;
  const hasNumber = /\d/.test(newPassword);
  const hasSpecialOrUpper = /[A-Z!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!hasMinLength) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation password do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await authService.changePassword({
        currentPassword,
        newPassword,
      });

      if (res.success) {
        setSuccess("Account password has been successfully changed.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setError(res.error?.message || "Failed to update password. Verify current password.");
      }
    } catch {
      setError("An unexpected error occurred while communicating with the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950">Account Settings</h1>
        <p className="text-xs text-zinc-500 mt-1">
          Manage your personal details, credentials, and cryptographic security settings.
        </p>
      </div>

      {/* Tabs */}
      <SettingsTabs />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Change Password Form (7 cols) */}
        <div className="lg:col-span-7">
          <Card className="border border-zinc-200/80 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)]">
            <CardHeader className="pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-800">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-zinc-950">Change Password</CardTitle>
                  <CardDescription className="text-xs text-zinc-500">
                    Rotate your account credentials with 12-round bcrypt protection
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                {error && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{success}</span>
                  </div>
                )}

                {/* Current Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700">Current Password</label>
                  <div className="relative">
                    <Input
                      type={showCurrent ? "text" : "password"}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      disabled={loading}
                      className="h-10 text-xs pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                    >
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700">New Password</label>
                  <div className="relative">
                    <Input
                      type={showNew ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new strong password"
                      disabled={loading}
                      className="h-10 text-xs pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Real-time Requirements Checklist */}
                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/60 space-y-1.5 text-[11px]">
                  <div className={`flex items-center gap-2 ${hasMinLength ? "text-emerald-700 font-medium" : "text-zinc-500"}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${hasMinLength ? "text-emerald-600" : "text-zinc-300"}`} />
                    <span>Minimum 8 characters</span>
                  </div>
                  <div className={`flex items-center gap-2 ${hasNumber ? "text-emerald-700 font-medium" : "text-zinc-500"}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${hasNumber ? "text-emerald-600" : "text-zinc-300"}`} />
                    <span>Includes at least one numeric digit</span>
                  </div>
                  <div className={`flex items-center gap-2 ${hasSpecialOrUpper ? "text-emerald-700 font-medium" : "text-zinc-500"}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${hasSpecialOrUpper ? "text-emerald-600" : "text-zinc-300"}`} />
                    <span>Includes uppercase letter or special character</span>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700">Confirm New Password</label>
                  <Input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    disabled={loading}
                    className="h-10 text-xs"
                  />
                  {confirmPassword && !passwordsMatch && (
                    <p className="text-[11px] text-rose-600 font-medium">Passwords do not match.</p>
                  )}
                </div>

                {/* Submit Button */}
                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={loading || !passwordsMatch || !hasMinLength}
                    className="gap-2 font-semibold h-10 px-5"
                  >
                    {loading ? (
                      <Spinner size="sm" />
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Update Password</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right: MFA Defense-in-Depth Promotion Card (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border border-zinc-200/80 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] bg-gradient-to-br from-white to-zinc-50">
            <CardHeader className="pb-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-1">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <CardTitle className="text-sm font-bold text-zinc-950">Multi-Factor Authentication</CardTitle>
              <CardDescription className="text-xs text-zinc-500 leading-relaxed">
                Add an extra cryptographic barrier to your account using Google Authenticator, Microsoft Authenticator, or 1Password.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 pt-0">
              <div className="p-3 rounded-xl bg-white border border-zinc-200/80 text-xs space-y-1">
                <span className="font-semibold text-zinc-900 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-zinc-700" />
                  Time-based One-Time Passwords
                </span>
                <p className="text-[11px] text-zinc-500 leading-normal">
                  Required for Administrators. Includes 8 single-use emergency backup recovery codes.
                </p>
              </div>

              <Link href="/settings/mfa" className="block pt-1">
                <Button variant="outline" size="md" className="w-full justify-between text-xs h-10 font-semibold">
                  <span>Configure 2FA Security</span>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
