"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { assessmentService } from "@/services/assessment.service";
import {
  AssessmentSession,
} from "@/types/assessment.types";
import { AssessmentReviewSkeleton } from "@/components/shared/PageSkeletons";
import {
  ArrowLeft,
  Shield,
  FileCheck2,
  Lock,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Info,
  Building2,
  FileText,
  Clock,
} from "lucide-react";

export default function AssessmentReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user, isAdmin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const [session, setSession] = useState<AssessmentSession | null>(null);
  const [gaps, setGaps] = useState<any[]>([]);
  const [totalGaps, setTotalGaps] = useState<number>(0);

  // Submit modal & processing state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReviewData() {
      setLoading(true);
      setError(null);
      setAccessDenied(false);

      if (isAdmin) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      try {
        const [sessRes, gapsRes] = await Promise.all([
          assessmentService.getAssessmentById(id),
          assessmentService.getGaps(id),
        ]);

        if (sessRes?.data?.session) {
          setSession(sessRes.data.session);
        }

        const gapsData = gapsRes?.data as any;
        if (gapsData?.gaps) {
          setGaps(gapsData.gaps);
          setTotalGaps(gapsData.totalGapsIdentified || gapsData.gaps.length);
        } else if (Array.isArray(gapsData)) {
          setGaps(gapsData);
          setTotalGaps(gapsData.length);
        }
      } catch (err: any) {
        if (
          err?.response?.status === 403 &&
          err?.response?.data?.error?.code === "ADMIN_CONTENT_ACCESS_RESTRICTED"
        ) {
          setAccessDenied(true);
        } else {
          setError(
            err?.response?.data?.error?.message ||
              err?.message ||
              "Failed to load pre-submission review data."
          );
        }
      } finally {
        setLoading(false);
      }
    }

    loadReviewData();
  }, [id, isAdmin]);

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await assessmentService.submitAssessment(id);
      if (res?.data?.session) {
        router.push(`/assessments/${id}/results`);
      } else {
        router.push(`/assessments/${id}/results`);
      }
    } catch (err: any) {
      setSubmitError(
        err?.response?.data?.error?.message ||
          err?.message ||
          "Failed to finalize and submit assessment."
      );
      setSubmitting(false);
    }
  };

  if (accessDenied) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm">
        <div className="p-3 bg-amber-50 text-amber-600 rounded-full inline-flex">
          <Shield className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 font-editorial">
            Admin Confidentiality Boundary
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            By architectural design (Zero-Knowledge Regulatory Assurance), Platform Administrators are restricted from viewing or modifying confidential client evaluation answers, gap analyses, or scores.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/assessments"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Assessments Directory
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return <AssessmentReviewSkeleton />;
  }

  if (error || !session) {
    return (
      <div className="p-8 bg-white rounded-xl border border-red-200 text-center space-y-3">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Pre-Submission Error</h2>
        <p className="text-xs text-slate-500">{error || "Could not retrieve assessment review."}</p>
        <Link
          href="/assessments"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Return to Assessments
        </Link>
      </div>
    );
  }

  const isAlreadySubmitted = session.status === "Submitted" || session.status === "Archived";
  const orgName = (session.companyId as any)?.name || "Client Organization";
  const totalAnswers = Array.isArray(session.answers) ? session.answers.length : 0;
  const answeredCount = Array.isArray(session.answers)
    ? session.answers.filter((a: any) => !!a.selectedOptionCode || a.testStatus === "Complete").length
    : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/assessments/${id}`}
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition shadow-2xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-editorial">
                Pre-Submission Inspection &amp; Lock
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                {session.assessmentType}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Target Organization: <strong className="text-slate-800">{orgName}</strong>
            </p>
          </div>
        </div>

        <div>
          {isAlreadySubmitted ? (
            <Link
              href={`/assessments/${id}/results`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-sm transition"
            >
              <CheckCircle2 className="h-4 w-4" />
              View Score Radar &amp; Reports
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-sm transition"
            >
              <Lock className="h-4 w-4" />
              Finalize &amp; Lock Submission
            </button>
          )}
        </div>
      </div>

      {/* Already Submitted Banner */}
      {isAlreadySubmitted && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>
              <strong>Assessment Finalized:</strong> This session was submitted on{" "}
              {session.submittedAt ? new Date(session.submittedAt).toLocaleDateString() : "date"}. The scoring snapshot is permanently locked against modifications.
            </span>
          </div>
          <Link
            href={`/assessments/${id}/results`}
            className="font-bold underline hover:text-emerald-950 shrink-0 ml-4"
          >
            Go to Results →
          </Link>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Controls Evaluated
          </span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {answeredCount} <span className="text-sm font-normal text-slate-400">/ {totalAnswers}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {answeredCount >= totalAnswers
              ? "All framework controls have been addressed."
              : `${totalAnswers - answeredCount} control(s) pending answer.`}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Identified Gaps &amp; Exceptions
          </span>
          <div className="text-2xl font-extrabold text-rose-600 mt-1">
            {totalGaps}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {totalGaps === 0
              ? "No non-compliance exceptions noted."
              : "Remediation plan will be generated."}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Submission Integrity
          </span>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                isAlreadySubmitted
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-blue-50 text-blue-700 border-blue-200"
              }`}
            >
              {isAlreadySubmitted ? "Locked & Certified" : "Ready for Final Lock"}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Deterministic evaluation engine based on 7 GRAICE Pillars.
          </p>
        </div>
      </div>

      {/* Identified Gaps Summary Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Identified Non-Compliance Exceptions ({totalGaps})
            </h3>
            <p className="text-[11px] text-slate-500">
              Controls flagged with exceptions or failing evaluations that require remediation.
            </p>
          </div>
          <Link
            href={`/assessments/${id}`}
            className="text-xs font-semibold text-blue-600 hover:underline"
          >
            Edit in Workspace →
          </Link>
        </div>

        {gaps.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] font-semibold text-slate-400 uppercase bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-5">Control ID</th>
                  <th className="py-3 px-4">Pillar</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-center">Finding Status</th>
                  <th className="py-3 px-4">Work Paper</th>
                  <th className="py-3 px-4">Remediation Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {gaps.map((gap, i) => (
                  <tr key={i} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-5 font-mono font-bold text-slate-800">
                      {gap.questionId}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700 truncate max-w-[140px]">
                      {gap.pillarName || gap.pillarId}
                    </td>
                    <td className="py-3 px-4 text-slate-600 truncate max-w-xs">
                      {gap.controlText || gap.title}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        {gap.selectedOptionCode || gap.testStatus || "Exception"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {gap.workPaperReference || "—"}
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-[11px] truncate max-w-xs">
                      {gap.recommendedAction || "Remediate control gap before re-assessment."}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center space-y-2">
            <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">Zero Compliance Gaps Noted</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              All evaluated controls satisfy the GRAICE Framework baseline criteria. No non-compliance findings or exceptions were flagged.
            </p>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-amber-50 text-amber-600 shrink-0">
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Confirm Permanent Submission
                </h3>
                <p className="text-xs text-slate-500">
                  This action is permanent and cannot be undone.
                </p>
              </div>
            </div>

            {submitError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-2 text-slate-600">
              <p>
                By finalizing this assessment session:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-700">
                <li>
                  The backend scoring engine calculates deterministic score values and maturity levels.
                </li>
                <li>
                  All answers, auditor notes, and evidence keys become <strong>read-only and locked</strong>.
                </li>
                <li>
                  Formal audit findings and executive report exports (PDF / Excel) will become accessible.
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg transition"
              >
                Go Back
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleFinalSubmit}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow-sm transition"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Locking Session...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Confirm &amp; Finalize
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
