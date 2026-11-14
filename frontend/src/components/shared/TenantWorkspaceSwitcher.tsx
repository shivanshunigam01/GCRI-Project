"use client";

import React from "react";
import { Building, Layers } from "lucide-react";
import { useTenant } from "@/context/TenantContext";
import { useAuth } from "@/context/AuthContext";

export function TenantWorkspaceSwitcher() {
  const { isSuperAdmin } = useAuth();
  const {
    memberships,
    activeTenantId,
    setActiveTenantId,
    loading,
    showTenantSwitcher,
    platformMode,
  } = useTenant();

  if (!showTenantSwitcher) return null;

  return (
    <div className="hidden sm:flex items-center gap-2 min-w-0 max-w-[280px]">
      <Layers className="h-4 w-4 text-teal-600 shrink-0" />
      <select
        value={activeTenantId ?? ""}
        onChange={(e) => setActiveTenantId(e.target.value || null)}
        disabled={loading}
        className="text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-2 truncate max-w-[240px] focus:outline-none focus:ring-2 focus:ring-teal-500/30"
        aria-label="Active tenant workspace"
      >
        {isSuperAdmin && (
          <option value="">Platform (all tenants)</option>
        )}
        {memberships.map((m) => (
          <option key={m.tenant._id} value={m.tenant._id}>
            {m.tenant.name} ({m.tenant.status})
          </option>
        ))}
      </select>
      {platformMode && isSuperAdmin && (
        <span className="text-[10px] font-bold uppercase tracking-wide text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
          Global
        </span>
      )}
      {activeTenantId && (
        <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden />
      )}
    </div>
  );
}