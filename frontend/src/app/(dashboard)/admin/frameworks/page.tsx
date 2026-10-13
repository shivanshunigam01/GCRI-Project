"use client";

import React from "react";
import { Sliders } from "lucide-react";

export default function AdminFrameworksPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Framework Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Author GRAICE Framework versions, manage controls across 7 pillars, and promote drafts to published status.
          </p>
        </div>

        <div>
          <button className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition">
            <Sliders className="h-4 w-4" />
            + New Framework Draft
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-8 min-h-[400px] flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
        <p className="font-medium text-slate-600">Screen 7: Framework Version Management Shell</p>
        <p className="text-xs text-slate-400">Awaiting UI Reference for Framework Version Cards &amp; Control Editors</p>
      </div>
    </div>
  );
}
