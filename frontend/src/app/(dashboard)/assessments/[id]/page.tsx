import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function AssessmentWorkspacePage({
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
            href="/assessments"
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Assessment Evaluation Workspace
            </h1>
            <p className="text-sm text-slate-500 font-mono">Session ID: {id}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/assessments/${id}/review`}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition"
          >
            Review &amp; Submit
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
        {/* Left Column: 7 Pillars Navigation */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-center items-center text-center text-slate-400 text-xs">
          <p className="font-semibold text-slate-700 text-sm mb-1">Left Column</p>
          <p>7 GRAICE Pillars Accordion Navigation</p>
        </div>

        {/* Center Column: Control Evaluation */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-center items-center text-center text-slate-400 text-xs">
          <p className="font-semibold text-slate-700 text-sm mb-1">Center Column</p>
          <p>Question Card, Guidance &amp; Pass/Fail/Exception Response</p>
        </div>

        {/* Right Column: Progress & Overview */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-center items-center text-center text-slate-400 text-xs">
          <p className="font-semibold text-slate-700 text-sm mb-1">Right Column</p>
          <p>Completion Gauge, Jump Grid &amp; Auto-Save Pulse</p>
        </div>
      </div>
    </div>
  );
}
