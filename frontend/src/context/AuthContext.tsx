"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User } from "@/types/auth.types";
import { storage } from "@/lib/storage";
import { userService } from "@/services/user.service";

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
      if (res && res.data) {
        setUser(res.data);
        storage.setUser(res.data);
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
