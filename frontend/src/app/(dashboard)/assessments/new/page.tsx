"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { companyService } from "@/services/company.service";
import { assessmentService } from "@/services/assessment.service";
import { Company } from "@/types/company.types";
import { FormFieldsSkeleton } from "@/components/shared/PageSkeletons";
import {
  ArrowLeft,
  Building2,
  FileCheck2,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Loader2,
  User,
  Mail,
  Phone,
  Briefcase,
} from "lucide-react";

export default function NewAssessmentPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [assessmentType, setAssessmentType] = useState<"Light" | "Full">("Light");

  // Client contact (optional per client mandate)
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactTitle, setContactTitle] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCompanies() {
      try {
        const res = await companyService.getCompanies({ limit: 100 });
        const list = Array.isArray(res?.data) ? res.data : [];
        setCompanies(list);
        if (list.length > 0) {
          setSelectedCompanyId(list[0]._id);
        }
      } catch (err: any) {
        setError("Failed to load assigned client organizations.");
      } finally {
        setLoadingCompanies(false);
      }
    }
    loadCompanies();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId) {
      setError("Please select a target client organization.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload: any = {
        companyId: selectedCompanyId,
        assessmentType,
      };

      if (contactName.trim() || contactEmail.trim()) {
        payload.clientContact = {
          name: contactName.trim(),
          email: contactEmail.trim(),
          phone: contactPhone.trim() || undefined,
          title: contactTitle.trim() || undefined,
        };
      }

      const res = await assessmentService.createAssessment(payload);
      const createdSession = (res?.data as any)?.session || res?.data;
      if (createdSession?._id) {
        router.push(`/assessments/${createdSession._id}`);
      } else {
        router.push("/assessments");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message ||
          err?.message ||
          "Failed to initiate assessment session."
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <Link
          href="/assessments"
          className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition shadow-2xs"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-editorial">
            Initiate Assessment
          </h1>
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Select Organization */}
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
                You must onboard an organization or have an Administrator map an organization to your auditor account first.
              </p>
              <div className="pt-2">
                <Link href="/organizations" className="underline font-bold text-amber-900">
                  Go to Organizations →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Select Assessment Type */}
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
                {assessmentType === "Light" && (
                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                30 baseline controls across the 7 GRAICE Pillars. Deterministic scoring out of 120 points with standard maturity ratings.
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
                  ? "border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/20 shadow-xs"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">Full Framework Assessment</span>
                {assessmentType === "Full" && (
                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Comprehensive, deep-dive control matrix across all governance areas with S3 evidence upload, exceptions tracking, and radar benchmarking.
              </p>
              <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-100/60 px-2 py-0.5 rounded">
                Gold Assurance Tier
              </div>
            </button>
          </div>
        </div>

        {/* Step 3: Optional Client Stakeholder Contact */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-bold text-slate-900">3. Client Contact Person</h2>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Optional per client policy</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. Sarah Jenkins"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="email"
                  placeholder="e.g. sarah@client.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Job Title
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. VP of AI Governance"
                  value={contactTitle}
                  onChange={(e) => setContactTitle(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="tel"
                  placeholder="e.g. +1 (555) 019-2834"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/assessments"
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting || companies.length === 0}
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
                Initialize Workspace
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
