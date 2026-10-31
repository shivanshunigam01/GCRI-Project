"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";

export default function ProfileSettingsPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Profile Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage personal contact and identity details.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-8 space-y-4 shadow-sm">
        <div>
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider">Full Name</label>
          <p className="text-base font-semibold text-slate-900 mt-1">{user?.name || "--"}</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider">Email Address</label>
          <p className="text-base font-semibold text-slate-900 mt-1">{user?.email || "--"}</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider">Platform Role</label>
          <span className="inline-block mt-1 px-2.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
            {user?.role || "--"}
          </span>
        </div>

        <div className="pt-4 border-t border-slate-100 text-xs text-slate-400">
          Profile Editor Shell — Ready for UI Design System Integration
        </div>
      </div>
    </div>
  );
}
