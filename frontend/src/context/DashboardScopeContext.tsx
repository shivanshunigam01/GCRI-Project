"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export interface ScopeOrganizationItem {
  _id: string;
  name: string;
  domain?: string;
  industry?: string;
  status?: string;
  activePlan?: string;
  assessmentCount?: number;
}

interface DashboardScopeContextType {
  selectedOrgFilter: string;
  setSelectedOrgFilter: (id: string) => void;
  organizations: ScopeOrganizationItem[];
  setOrganizations: (orgs: ScopeOrganizationItem[]) => void;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const DashboardScopeContext = createContext<DashboardScopeContextType | undefined>(undefined);

export function DashboardScopeProvider({ children }: { children: React.ReactNode }) {
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string>("all");
  const [organizations, setOrganizations] = useState<ScopeOrganizationItem[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return (
    <DashboardScopeContext.Provider
      value={{
        selectedOrgFilter,
        setSelectedOrgFilter,
        organizations,
        setOrganizations,
        refreshTrigger,
        triggerRefresh,
      }}
    >
      {children}
    </DashboardScopeContext.Provider>
  );
}

export function useDashboardScope() {
  const context = useContext(DashboardScopeContext);
  if (!context) {
    throw new Error("useDashboardScope must be used within a DashboardScopeProvider");
  }
  return context;
}
