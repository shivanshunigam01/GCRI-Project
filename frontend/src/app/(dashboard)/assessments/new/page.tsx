"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewAssessmentPage() {
  const [assessmentType, setAssessmentType] = useState<"Light" | "Full">("Light");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <Link
          href="/assessments"
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Initiate Assessment</h1>
          <p className="text-sm text-slate-500">Select an onboarded organization and evaluation tier.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-8 space-y-6 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Assessment Type</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setAssessmentType("Light")}
              className={`p-4 rounded-xl border text-left transition ${
                assessmentType === "Light"
                  ? "border-blue-600 bg-blue-50/50 ring-1 ring-blue-600"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="font-semibold text-slate-900 text-sm">Lightweight Assessment</div>
              <div className="text-xs text-slate-500 mt-1">30 baseline controls across 7 pillars (Max 120 pts)</div>
            </button>

            <button
              type="button"
              onClick={() => setAssessmentType("Full")}
              className={`p-4 rounded-xl border text-left transition ${
                assessmentType === "Full"
                  ? "border-blue-600 bg-blue-50/50 ring-1 ring-blue-600"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="font-semibold text-slate-900 text-sm">Full Framework Assessment</div>
              <div className="text-xs text-slate-500 mt-1">Exhaustive control set with continuous evidence validation</div>
            </button>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg text-center text-sm text-slate-500">
          Organization Selector Shell — Ready for UI Design System Integration
        </div>
      </div>
    </div>
  );
}
