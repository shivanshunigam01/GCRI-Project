import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function AssessmentFindingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/assessments/${id}/results`}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Findings &amp; Remediation Hub
            </h1>
            <p className="text-sm text-slate-500 font-mono">Session ID: {id}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-8 min-h-[400px] flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
        <p className="font-medium text-slate-600">Screen 5: Findings &amp; Exceptions Remediation Tracker Shell</p>
        <p className="text-xs text-slate-400">Awaiting UI Reference for Remediation Roadmaps, Severity Filters &amp; Action Items</p>
      </div>
    </div>
  );
}
