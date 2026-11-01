"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { DashboardShellContentSkeleton } from "@/components/shared/PageSkeletons";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push("/dashboard");
    }
  }, [loading, user, isAdmin, router]);

  if (loading || !user) {
    return <DashboardShellContentSkeleton />;
  }

  if (!isAdmin) {
    return null;
  }

  return <>{children}</>;
}
