"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { ShieldCheck } from "lucide-react";

export default function SecuritySettingsPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Security &amp; MFA</h1>
        <p className="text-sm text-slate-500 mt-1">Configure Two-Factor Authentication and update password.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-8 space-y-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Two-Factor Authentication (TOTP)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {user?.mfaEnabled
                  ? "MFA is active and safeguarding your session."
                  : "Add an extra layer of security using Google Authenticator or 1Password."}
              </p>
            </div>
          </div>
          <div>
            <span
              className={`px-2.5 py-0.5 rounded text-xs font-medium ${
                user?.mfaEnabled
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {user?.mfaEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 text-xs text-slate-400">
          Security Configuration Shell — Ready for UI Design System Integration
        </div>
      </div>
    </div>
  );
}
