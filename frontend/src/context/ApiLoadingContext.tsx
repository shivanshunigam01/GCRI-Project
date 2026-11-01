"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { subscribeApiLoading } from "@/lib/apiLoadingStore";

interface ApiLoadingContextValue {
  pendingCount: number;
  isLoading: boolean;
}

const ApiLoadingContext = createContext<ApiLoadingContextValue>({
  pendingCount: 0,
  isLoading: false,
});

export function ApiLoadingProvider({ children }: { children: React.ReactNode }) {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => subscribeApiLoading(setPendingCount), []);

  const value = useMemo(
    () => ({
      pendingCount,
      isLoading: pendingCount > 0,
    }),
    [pendingCount]
  );

  return <ApiLoadingContext.Provider value={value}>{children}</ApiLoadingContext.Provider>;
}

export function useApiLoading(): ApiLoadingContextValue {
  return useContext(ApiLoadingContext);
}
