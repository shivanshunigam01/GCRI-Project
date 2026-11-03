"use client";

import React, { Suspense, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { companyService } from "@/services/company.service";
import { assessmentService } from "@/services/assessment.service";
import { frameworkService } from "@/services/framework.service";
import { fetchAssessorAccessibleCompanies } from "@/lib/auditorOrganizations";
import { getApiErrorMessage } from "@/lib/authUser";
import { Company } from "@/types/company.types";
import { CreateAssessmentPayload } from "@/types/assessment.types";
import { AssessmentFramework } from "@/types/framework.types";
import { FormFieldsSkeleton } from "@/components/shared/PageSkeletons";
import {
  ArrowLeft,
  Building2,
  FileCheck2,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Loader2,
  Layers,
} from "lucide-react";

function NewAssessmentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyIdParam = searchParams.get("companyId");
  const { user, isAssessor } = useAuth();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [assessmentType, setAssessmentType] = useState<"Light" | "Full">("Light");
  const [companyIdNotice, setCompanyIdNotice] = useState<string | null>(null);

  const [fullFramework, setFullFramework] = useState<AssessmentFramework | null>(null);
  const [fullFrameworkLoading, setFullFrameworkLoading] = useState(false);
  const [fullFrameworkError, setFullFrameworkError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const auditorId = useMemo(() => {
    if (!user) return "";
    return String(user._id || (user as { id?: string }).id || "");
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    async function loadCompanies() {
      setLoadingCompanies(true);
      setError(null);
      setCompanyIdNotice(null);

      try {
        let list: Company[] = [];
        if (isAssessor && auditorId) {
          list = await fetchAssessorAccessibleCompanies(auditorId);
        } else {
          const res = await companyService.getCompanies({ limit: 100 });
          list = Array.isArray(res?.data) ? res.data : [];
        }

        if (cancelled) return;
        setCompanies(list);

        const paramId = companyIdParam?.trim();
        if (paramId) {
          const match = list.find((c) => String(c._id) === paramId);
          if (match) {
            setSelectedCompanyId(paramId);
          } else {
            setCompanyIdNotice(
              "The organization from this link is not available to your account. Choose another from the list."
            );
            setSelectedCompanyId(list[0]?._id ?? "");
          }
        } else {
          setSelectedCompanyId((prev) => {
            if (prev && list.some((c) => c._id === prev)) return prev;
            return list[0]?._id ?? "";
          });
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load assigned client organizations.");
          setCompanies([]);
          setSelectedCompanyId("");
        }
      } finally {
        if (!cancelled) setLoadingCompanies(false);
      }
    }

    loadCompanies();
    return () => {
      cancelled = true;
    };
  }, [isAssessor, auditorId, companyIdParam]);

  // Discover published Full framework when Full is selected (actual version + control count).
  useEffect(() => {
    if (assessmentType !== "Full") {
      return;
    }
    let cancelled = false;
    async function loadFullFramework() {
      setFullFrameworkLoading(true);
      setFullFrameworkError(null);
      try {
        const res = await frameworkService.getActiveFramework({ type: "Full" });
        if (cancelled) return;
        if (res?.data) {
          setFullFramework(res.data);
        } else {
          setFullFramework(null);
          setFullFrameworkError("No published Full framework was returned.");
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setFullFramework(null);
          setFullFrameworkError(
            getApiErrorMessage(err, "Failed to load the active Full assessment framework.")
          );
        }
      } finally {
        if (!cancelled) setFullFrameworkLoading(false);
      }
    }
    loadFullFramework();
    return () => {
      cancelled = true;
    };
  }, [assessmentType]);

  const fullControlCount = useMemo(() => {
    if (!fullFramework) return null;
    if (typeof fullFramework.totalQuestions === "number" && fullFramework.totalQuestions > 0) {
      return fullFramework.totalQuestions;
    }
    return Array.isArray(fullFramework.questions) ? fullFramework.questions.length : null;
  }, [fullFramework]);

  const fullPillars = useMemo(() => {
    if (!fullFramework?.pillars?.length) return [];
    return [...fullFramework.pillars].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [fullFramework]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!selectedCompanyId) {
      setError("Please select a target client organization.");
      return;
    }
    if (!companies.some((c) => c._id === selectedCompanyId)) {
      setError("Please select a valid organization you have access to.");
      return;
    }
    if (assessmentType === "Full" && (fullFrameworkError || !fullFramework)) {
      setError(
        fullFrameworkError ||
          "Cannot start a Full assessment until a published Full framework is available."
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload: CreateAssessmentPayload = {
        companyId: selectedCompanyId,
        assessmentType: assessmentType as CreateAssessmentPayload["assessmentType"],
      };

      const res = await assessmentService.createAssessment(payload);
      const createdSession = (res?.data as { session?: { _id?: string } })?.session || res?.data;
      if (createdSession && typeof createdSession === "object" && "_id" in createdSession) {
        router.push(`/assessments/${(createdSession as { _id: string })._id}`);
      } else {
        router.push("/assessments");
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to initiate assessment session."));
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <Link
          href="/assessments"
          className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition shadow-2xs"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="page-title font-editorial">Initiate Assessment</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Select an assigned client organization and evaluation framework tier.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {companyIdNotice && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3 text-sm text-amber-800">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
          <span>{companyIdNotice}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Building2 className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900">1. Select Target Organization</h2>
          </div>

          {loadingCompanies ? (
            <FormFieldsSkeleton fields={2} />
          ) : companies.length > 0 ? (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Organization Directory
              </label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              >
                {companies.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.domain}) — {c.activePlan || "Bronze"} Tier
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
              <p className="font-semibold">No assigned client organizations found.</p>
              <p>
                You must onboard an organization or have an Administrator map an organization to
                your auditor account first.
              </p>
              <div className="pt-2">
                <Link href="/organizations" className="underline font-bold text-amber-900">
                  Go to Organizations →
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Sparkles className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900">2. Evaluation Tier</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setAssessmentType("Light")}
              className={`p-5 rounded-xl border text-left transition-all ${
                assessmentType === "Light"
                  ? "border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/20 shadow-xs"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">Lightweight Assessment</span>
                {assessmentType === "Light" && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
              </div>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                30 baseline controls across the 7 GRAICE Pillars. Deterministic scoring out of 120
                points with standard maturity ratings.
              </p>
              <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded">
                Bronze &amp; Silver Baseline
              </div>
            </button>

            <button
              type="button"
              onClick={() => setAssessmentType("Full")}
              className={`p-5 rounded-xl border text-left transition-all ${
                assessmentType === "Full"
                  ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20 shadow-xs"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">Full Framework Assessment</span>
                {assessmentType === "Full" && <CheckCircle2 className="h-4 w-4 text-indigo-600" />}
              </div>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Comprehensive control evaluation with exception tracking, workpapers, evidence, and
                seven-pillar compliance scoring against the published Full framework.
              </p>
              <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-100/60 px-2 py-0.5 rounded">
                Gold Assurance Tier
              </div>
            </button>
          </div>

          {assessmentType === "Full" && (
            <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/40 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Active Full framework
                </h3>
              </div>
              {fullFrameworkLoading ? (
                <p className="text-xs text-slate-500 inline-flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading published Full framework…
                </p>
              ) : fullFrameworkError ? (
                <p className="text-xs text-rose-700">{fullFrameworkError}</p>
              ) : fullFramework ? (
                <>
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <span className="px-2 py-1 rounded-md bg-white border border-indigo-200 font-semibold text-indigo-900">
                      Version {fullFramework.version}
                    </span>
                    <span className="px-2 py-1 rounded-md bg-white border border-indigo-200 font-semibold text-slate-800">
                      {fullControlCount ?? "—"} controls
                    </span>
                    <span className="px-2 py-1 rounded-md bg-white border border-indigo-200 font-semibold text-slate-800">
                      {fullPillars.length || 7} pillars
                    </span>
                  </div>
                  {fullFramework.title && (
                    <p className="text-xs text-slate-600">{fullFramework.title}</p>
                  )}
                  {fullPillars.length > 0 && (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {fullPillars.map((p) => (
                        <li
                          key={p.pillarId}
                          className="text-[11px] text-slate-700 px-2 py-1.5 rounded-lg bg-white border border-slate-200"
                        >
                          <span className="font-semibold">
                            P{p.pillarNumber ?? p.order}. {p.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/assessments"
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={
              submitting ||
              companies.length === 0 ||
              (assessmentType === "Full" && (fullFrameworkLoading || !!fullFrameworkError || !fullFramework))
            }
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0c162c] hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow-sm transition"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating Session...
              </>
            ) : (
              <>
                <FileCheck2 className="h-4 w-4" />
                Start Assessment
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewAssessmentPage() {
  return (
    <Suspense fallback={<FormFieldsSkeleton fields={4} />}>
      <NewAssessmentPageContent />
    </Suspense>
  );
}
