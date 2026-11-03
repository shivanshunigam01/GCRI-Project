"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User } from "@/types/auth.types";
import { storage } from "@/lib/storage";
import { userService } from "@/services/user.service";
import { normalizeLoginUser } from "@/lib/authUser";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isOrgAdmin: boolean;
  isAssessor: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    const token = storage.getToken();
    if (!token) {
      storage.clear();
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await userService.getCurrentUser();
      const normalized = normalizeLoginUser(
        res?.data as unknown as Record<string, unknown>
      );
      if (normalized) {
        // Preserve richer MFA flags from /users/me beyond login shape
        const mfaRaw = (res.data as User)?.mfa;
        const enriched: User = {
          ...normalized,
          mfa: {
            enabled: Boolean(mfaRaw?.enabled ?? normalized.mfa.enabled),
            authenticatorConfigured: Boolean(mfaRaw?.authenticatorConfigured),
            recoveryCodesRemaining: mfaRaw?.recoveryCodesRemaining,
          },
          mfaEnabled: Boolean(mfaRaw?.enabled ?? normalized.mfaEnabled),
          avatar: (res.data as User)?.avatar ?? normalized.avatar,
          phone: (res.data as User)?.phone ?? normalized.phone,
          companyId: (res.data as User)?.companyId ?? normalized.companyId,
        };
        setUser(enriched);
        storage.setUser(enriched);
      } else {
        storage.clear();
        setUser(null);
      }
    } catch {
      storage.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = (token: string, newUser: User) => {
    storage.setToken(token);
    storage.setUser(newUser);
    setUser(newUser);
  };

  const logout = () => {
    storage.clear();
    setUser(null);
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  const isSuperAdmin = Boolean(user && user.role === "SuperAdmin" && user.status === "Active");
  const isOrgAdmin = Boolean(user && user.role === "Admin" && user.status === "Active");
  const isAdmin = Boolean(user && (user.role === "SuperAdmin" || user.role === "Admin") && user.status === "Active");
  const isAssessor = Boolean(user && user.role === "Assessor" && user.status === "Active");

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshUser,
        isSuperAdmin,
        isAdmin,
        isOrgAdmin,
        isAssessor,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
