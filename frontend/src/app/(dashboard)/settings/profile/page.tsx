"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { userService } from "@/services/user.service";
import { SettingsTabs } from "@/components/features/settings/SettingsTabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import { User, Mail, Phone, Building2, ShieldCheck, CheckCircle2, AlertCircle, Save } from "lucide-react";

export default function ProfileSettingsPage() {
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLatestProfile() {
      setFetching(true);
      try {
        const res = await userService.getMe();
        if (res.success && res.data) {
          setName(res.data.name || "");
          setPhone(res.data.phone || "");
        } else if (user) {
          setName(user.name || "");
        }
      } catch {
        if (user) setName(user.name || "");
      } finally {
        setFetching(false);
      }
    }

    fetchLatestProfile();
  }, [user]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await userService.updateMe({
        name: name.trim(),
        phone: phone.trim() || undefined,
      });

      if (res.success) {
        setSuccess("Profile information updated successfully.");
      } else {
        setError(res.error?.message || "Failed to update profile.");
      }
    } catch {
      setError("An unexpected error occurred while communicating with the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950">Account Settings</h1>
        <p className="text-xs text-zinc-500 mt-1">
          Manage your personal details, credentials, and cryptographic security settings.
        </p>
      </div>

      {/* Tabs */}
      <SettingsTabs />

      {/* Profile Form Card */}
      <Card className="border border-zinc-200/80 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)]">
        <CardHeader className="pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-800">
              <User className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-zinc-950">Personal Profile</CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Update your contact information visible across governance audits
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {fetching ? (
            <div className="py-12 flex justify-center items-center">
              <Spinner size="md" />
            </div>
          ) : (
            <form onSubmit={handleProfileSubmit} className="space-y-5">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700">Full Name</label>
                  <Input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    disabled={loading}
                    className="h-10 text-xs"
                  />
                  <p className="text-[11px] text-zinc-400">Used for official audit signature seals.</p>
                </div>

                {/* Contact Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700">Phone Number (Optional)</label>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    disabled={loading}
                    className="h-10 text-xs"
                  />
                  <p className="text-[11px] text-zinc-400">For security verifications and compliance notices.</p>
                </div>
              </div>

              {/* Read-Only Account Security Information */}
              <div className="pt-4 border-t border-zinc-100">
                <h4 className="text-xs font-bold text-zinc-900 mb-3">Institutional Identity & Assignment</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Email */}
                  <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Account Email</span>
                    <div className="text-xs font-medium text-zinc-900 truncate flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="truncate">{user?.email || "—"}</span>
                    </div>
                  </div>

                  {/* Role */}
                  <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Assigned Role</span>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="text-xs font-semibold text-zinc-900 font-mono">
                        {user?.role || "Assessor"}
                      </span>
                    </div>
                  </div>

                  {/* Company */}
                  <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Organization Tenant</span>
                    <div className="text-xs font-medium text-zinc-900 truncate flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="truncate">
                        {typeof user?.companyId === "string"
                          ? `Org ID: ${user.companyId.slice(-6)}`
                          : typeof user?.companyId === "object" && user.companyId !== null
                          ? (user.companyId as { name?: string }).name || "Assigned Org"
                          : "Global (All Organizations)"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={loading}
                  className="gap-2 font-semibold h-10 px-5"
                >
                  {loading ? (
                    <Spinner size="sm" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Profile Changes</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
