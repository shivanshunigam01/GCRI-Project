"use client";

import React from "react";

export default function SubscriptionsPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Subscription Tiers &amp; Assurance Limits
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Review Bronze, Silver, and Gold assurance quotas, feature matrices, and client coverage.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-8 min-h-[400px] flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
        <p className="font-medium text-slate-600">Screen 6: Assurance / Subscription Tier Dashboard Shell</p>
        <p className="text-xs text-slate-400">Awaiting UI Reference for Tier Cards, Quota Gauges &amp; Comparison Table</p>
      </div>
    </div>
  );
}
