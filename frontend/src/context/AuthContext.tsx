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
  isAdmin: boolean;
  isAssessor: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    const token = storage.getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await userService.getCurrentUser();
      if (res && res.data) {
        setUser(res.data);
        storage.setUser(res.data);
      }
    } catch {
      storage.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const cachedUser = storage.getUser<User>();
    if (cachedUser) {
      setUser(cachedUser);
    }
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

  const isAdmin = user?.role === "Admin";
  const isAssessor = user?.role === "Assessor";

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshUser,
        isAdmin,
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
