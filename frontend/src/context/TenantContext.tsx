"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { tenantService } from "@/services/tenant.service";
import type { TenantMembershipItem, TenantRecord } from "@/types/tenant.types";

const ACTIVE_TENANT_KEY = "graice_active_tenant_id";

interface TenantContextValue {
  memberships: TenantMembershipItem[];
  /** Super Admin platform view — no tenant filter */
  platformMode: boolean;
  activeTenantId: string | null;
  activeTenant: TenantRecord | null;
  setActiveTenantId: (id: string | null) => void;
  loading: boolean;
  error: string | null;
  refreshTenants: () => Promise<void>;
  canManageTenants: boolean;
  showTenantSwitcher: boolean;
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { user, isSuperAdmin, isTenantAdmin, loading: authLoading } = useAuth();
  const [memberships, setMemberships] = useState<TenantMembershipItem[]>([]);
  const [activeTenantId, setActiveTenantIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setActiveTenantId = useCallback((id: string | null) => {
    setActiveTenantIdState(id);
    if (typeof window !== "undefined") {
      if (id) localStorage.setItem(ACTIVE_TENANT_KEY, id);
      else localStorage.removeItem(ACTIVE_TENANT_KEY);
    }
  }, []);

  const refreshTenants = useCallback(async () => {
    if (!user) {
      setMemberships([]);
      setActiveTenantId(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await tenantService.getMyTenants();
      const data = res.data;
      const list = data?.tenants ?? [];
      setMemberships(list);

      const stored =
        typeof window !== "undefined" ? localStorage.getItem(ACTIVE_TENANT_KEY) : null;
      const serverActive = data?.activeTenantId ?? null;

      let next: string | null = null;
      if (isSuperAdmin) {
        if (stored && list.some((m) => m.tenant._id === stored)) next = stored;
        else if (stored) next = stored;
        else next = null;
      } else {
        const ids = list.map((m) => m.tenant._id);
        if (stored && ids.includes(stored)) next = stored;
        else if (serverActive && ids.includes(serverActive)) next = serverActive;
        else if (ids.length === 1) next = ids[0];
        else next = null;
      }
      setActiveTenantIdState(next);
      if (next) {
        if (typeof window !== "undefined") localStorage.setItem(ACTIVE_TENANT_KEY, next);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load tenant memberships.");
    } finally {
      setLoading(false);
    }
  }, [user, isSuperAdmin, setActiveTenantId]);

  useEffect(() => {
    if (authLoading) return;
    if (user) refreshTenants();
    else {
      setMemberships([]);
      setActiveTenantId(null);
    }
  }, [user, authLoading, refreshTenants, setActiveTenantId]);

  const activeMembership = useMemo(
    () => memberships.find((m) => m.tenant._id === activeTenantId) ?? null,
    [memberships, activeTenantId]
  );

  const activeTenant = activeMembership?.tenant ?? null;
  const platformMode = isSuperAdmin && !activeTenantId;
  const canManageTenants = isSuperAdmin;
  const showTenantSwitcher =
    Boolean(user) && (isSuperAdmin || isTenantAdmin || memberships.length > 0);

  return (
    <TenantContext.Provider
      value={{
        memberships,
        platformMode,
        activeTenantId,
        activeTenant,
        setActiveTenantId,
        loading,
        error,
        refreshTenants,
        canManageTenants,
        showTenantSwitcher,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used within TenantProvider");
  return ctx;
}