"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { User, LoginResponseData } from "@/types/auth.types";
import { storage } from "@/lib/storage";
import { apiClient } from "@/services/apiClient";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isHydrated: boolean;
  isAdmin: boolean;
  isCompanyLead: boolean;
  isAssessor: boolean;
  companyName: string | null;
  companyId: string | null;
  login: (data: LoginResponseData) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  useEffect(() => {
    const savedToken = storage.getToken();
    const savedUser = storage.getUser<User>();
    if (savedToken) {
      setToken(savedToken);
      if (savedUser) {
        setUser(savedUser);
      }
      apiClient<User>("/users/me")
        .then((res) => {
          if (res.success && res.data) {
            setUser(res.data);
            storage.setUser(res.data);
          }
        })
        .finally(() => {
          setLoading(false);
          setIsHydrated(true);
        });
    } else {
      setLoading(false);
      setIsHydrated(true);
    }
  }, []);

  const login = (data: LoginResponseData) => {
    storage.setToken(data.token);
    storage.setUser(data.user);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    storage.clearAuth();
    setToken(null);
    setUser(null);
    if (typeof window !== "undefined") {
      /* eslint-disable-next-line @next/next/no-location-assign-relative-destination */
      window.location.assign("/login");
    }
  };

  const refreshUser = async () => {
    const res = await apiClient<User>("/users/me");
    if (res.success && res.data) {
      setUser(res.data);
      storage.setUser(res.data);
    }
  };

  const isAdmin = useMemo(() => user?.role === "Admin", [user]);
  const isCompanyLead = useMemo(() => user?.role === "MembershipApprover", [user]);
  const isAssessor = useMemo(() => user?.role === "Assessor", [user]);

  const companyName = useMemo(() => {
    if (!user?.companyId) return null;
    if (typeof user.companyId === "object" && "name" in user.companyId) {
      return (user.companyId as { name: string }).name;
    }
    return null;
  }, [user]);

  const companyId = useMemo(() => {
    if (!user?.companyId) return null;
    if (typeof user.companyId === "object" && "_id" in user.companyId) {
      return (user.companyId as { _id: string })._id;
    }
    return typeof user.companyId === "string" ? user.companyId : null;
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isHydrated,
        isAdmin,
        isCompanyLead,
        isAssessor,
        companyName,
        companyId,
        login,
        logout,
        refreshUser,
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
