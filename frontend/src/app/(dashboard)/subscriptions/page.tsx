"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { companyService } from "@/services/company.service";
import { dashboardService } from "@/services/dashboard.service";
import { Company, SubscriptionTier } from "@/types/company.types";
import {
  CreditCard,
  Shield,
  Check,
  Building2,
  Users,
  Search,
  ExternalLink,
  Zap,
  Award,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Clock,
  HardDrive,
  FileSpreadsheet,
} from "lucide-react";

interface TierDefinition {
  id: SubscriptionTier;
  name: string;
  badge: string;
  tagline: string;
  borderClass: string;
  badgeClass: string;
  gradientClass: string;
  maxAssessments: string;
  frameworkScope: string;
  evidenceStorage: string;
  reporting: string;
  highlights: string[];
}

const TIERS: TierDefinition[] = [
  {
    id: "Bronze",
    name: "Bronze Assurance",
    badge: "Foundation Tier",
    tagline: "Essential AI-governance verification for startups and targeted pilots.",
    borderClass: "border-amber-300/80 hover:border-amber-400",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
    gradientClass: "from-amber-500/10 to-orange-500/5",
    maxAssessments: "Up to 3 Active / Year",
    frameworkScope: "Lightweight Baseline (15 Key Controls)",
    evidenceStorage: "Standard Encrypted Storage (50 MB)",
    reporting: "Executive Summary PDF Report",
    highlights: [
      "Rapid 7-Pillar high-level assessment",
      "Executive posture scoring and summary",
      "Standard auditor review & sign-off",
      "Single-assessor engagement mapping",
    ],
  },
  {
    id: "Silver",
    name: "Silver Assurance",
    badge: "Most Popular",
    tagline: "Comprehensive regulatory alignment and assurance for scaling enterprises.",
    borderClass: "border-blue-400 hover:border-blue-500 shadow-md shadow-blue-500/5",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
    gradientClass: "from-blue-500/10 to-cyan-500/5",
    maxAssessments: "Up to 12 Active / Year",
    frameworkScope: "Full Comprehensive (52 Core Controls)",
    evidenceStorage: "Advanced S3 Encrypted Locker (500 MB)",
    reporting: "Full Audit Dossier + Remediation Roadmap",
    highlights: [
      "In-depth 52-control testing procedure",
      "EU AI Act & NIST AI RMF regulatory mapping",
      "Audit finding tracking & remediation guidance",
      "Real-time webhook notification dispatch",
      "Multi-assessor review mapping",
    ],
  },
  {
    id: "Gold",
    name: "Gold Assurance",
    badge: "Enterprise Continuous",
    tagline: "High-assurance, continuous AI risk validation for regulated institutions.",
    borderClass: "border-yellow-400/90 hover:border-yellow-500 shadow-lg shadow-yellow-500/10",
    badgeClass: "bg-yellow-100 text-yellow-900 border-yellow-300",
    gradientClass: "from-yellow-500/15 via-amber-500/10 to-yellow-600/5",
    maxAssessments: "Unlimited Ongoing Assessments",
    frameworkScope: "Complete 52 Controls + Custom Framework Versions",
    evidenceStorage: "Dedicated Tenant S3 Bucket (Unlimited)",
    reporting: "Full PDF Dossier + Excel Workbooks + API Export",
    highlights: [
      "Full Light & Full framework access with custom drafts",
      "Continuous compliance monitoring & reassessment",
      "Machine-to-Machine API key automation",
      "Outbound webhook dispatch for SIEM/SOAR",
      "Dedicated lead auditor & compliance advisor",
    ],
  },
];

export default function SubscriptionsPage() {
  const { user, isAdmin } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("All");

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await companyService.getCompanies();
      setCompanies(res.data || []);
    } catch (err: any) {
      console.error("Failed to load companies for subscription overview:", err);
      setError(err?.response?.data?.message || err?.message || "Failed to load subscription tier data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute live client counts per tier from real company records
  const tierCounts = useMemo(() => {
    const counts = { Bronze: 0, Silver: 0, Gold: 0, Total: companies.length };
    companies.forEach((c) => {
      if (c.activePlan === "Bronze") counts.Bronze++;
      else if (c.activePlan === "Silver") counts.Silver++;
      else if (c.activePlan === "Gold") counts.Gold++;
    });
    return counts;
  }, [companies]);

  // Filter organizations
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.domain.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTier = tierFilter === "All" || c.activePlan === tierFilter;
      return matchesSearch && matchesTier;
    });
  }, [companies, searchQuery, tierFilter]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
            <CreditCard className="h-4 w-4" />
            <span>Platform Assurance Capacity &amp; Tiers</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Subscription Tiers &amp; Assurance Limits
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Overview of Bronze, Silver, and Gold AI-governance assurance quotas, feature access, and active client coverage.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-xs disabled:opacity-50 self-start sm:self-center"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-blue-600" : "text-slate-500"}`} />
          <span>Refresh Quotas</span>
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadData}
            className="text-xs font-semibold text-red-700 hover:text-red-900 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Assurance Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {TIERS.map((tier) => {
          const clientCount = tierCounts[tier.id];
          const pct = tierCounts.Total > 0 ? Math.round((clientCount / tierCounts.Total) * 100) : 0;

          return (
            <div
              key={tier.id}
              className={`bg-white rounded-2xl border ${tier.borderClass} p-6 flex flex-col justify-between transition-all duration-200 relative overflow-hidden group`}
            >
              {/* Background Ambient Glow */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${tier.gradientClass} pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity`}
              />

              <div className="relative z-10 space-y-4">
                {/* Top Badge & Title */}
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${tier.badgeClass}`}>
                    {tier.badge}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      {clientCount} {clientCount === 1 ? "org" : "orgs"} ({pct}%)
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-900">{tier.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{tier.tagline}</p>
                </div>

                {/* Quota Gauge */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Assurance Capacity</span>
                    <span className="font-semibold text-slate-900">{tier.maxAssessments}</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        tier.id === "Gold"
                          ? "bg-amber-500"
                          : tier.id === "Silver"
                          ? "bg-blue-600"
                          : "bg-amber-400"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(15, pct))}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
                    <span>{tier.frameworkScope}</span>
                  </div>
                </div>

                {/* Feature Highlights */}
                <div className="space-y-2 pt-2">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Included Capabilities
                  </p>
                  <ul className="space-y-2">
                    {tier.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-700 leading-tight">
                        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Bottom Card Footer */}
              <div className="relative z-10 pt-5 mt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <HardDrive className="h-3.5 w-3.5 text-slate-400" />
                  <span>{tier.evidenceStorage}</span>
                </span>
                <span className="font-medium text-slate-700">{tier.reporting}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature Comparison Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Assurance Capabilities Comparison Matrix</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Detailed breakdown of governance testing depths, evidence controls, and enterprise integrations.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5 w-1/3">Capability / Service</th>
                <th className="px-4 py-3.5 text-center text-amber-900">Bronze</th>
                <th className="px-4 py-3.5 text-center text-blue-900 bg-blue-50/40">Silver (Standard)</th>
                <th className="px-4 py-3.5 text-center text-yellow-900">Gold (Enterprise)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="px-6 py-3.5 font-medium text-slate-900">
                  Governance Assessment Framework
                  <span className="block text-[11px] text-slate-400 font-normal">
                    Pillars &amp; verification control coverage
                  </span>
                </td>
                <td className="px-4 py-3.5 text-center">Lightweight (15 Controls)</td>
                <td className="px-4 py-3.5 text-center bg-blue-50/20 font-semibold text-blue-700">
                  Full In-Depth (52 Controls)
                </td>
                <td className="px-4 py-3.5 text-center font-semibold text-amber-700">
                  Full + Custom Versions
                </td>
              </tr>

              <tr>
                <td className="px-6 py-3.5 font-medium text-slate-900">
                  Evidence Locker &amp; Attachments
                  <span className="block text-[11px] text-slate-400 font-normal">
                    Cryptographic hash validation on S3
                  </span>
                </td>
                <td className="px-4 py-3.5 text-center">Standard (50 MB)</td>
                <td className="px-4 py-3.5 text-center bg-blue-50/20">Advanced (500 MB)</td>
                <td className="px-4 py-3.5 text-center font-medium">Dedicated Bucket (Unlimited)</td>
              </tr>

              <tr>
                <td className="px-6 py-3.5 font-medium text-slate-900">
                  Regulatory Framework Mapping
                  <span className="block text-[11px] text-slate-400 font-normal">
                    EU AI Act, NIST AI RMF, ISO/IEC 42001
                  </span>
                </td>
                <td className="px-4 py-3.5 text-center text-slate-400">High-level summary</td>
                <td className="px-4 py-3.5 text-center bg-blue-50/20 text-emerald-600 font-medium">
                  Detailed Article Citations
                </td>
                <td className="px-4 py-3.5 text-center text-emerald-600 font-medium">
                  Detailed + Custom Mapping
                </td>
              </tr>

              <tr>
                <td className="px-6 py-3.5 font-medium text-slate-900">
                  Exportable Deliverables
                  <span className="block text-[11px] text-slate-400 font-normal">
                    Formal audit outputs &amp; working papers
                  </span>
                </td>
                <td className="px-4 py-3.5 text-center">Executive Summary PDF</td>
                <td className="px-4 py-3.5 text-center bg-blue-50/20 font-medium">
                  Executive PDF + Gaps Matrix
                </td>
                <td className="px-4 py-3.5 text-center font-medium">
                  PDF Dossier + Excel Workbook
                </td>
              </tr>

              <tr>
                <td className="px-6 py-3.5 font-medium text-slate-900">
                  Machine-to-Machine API Keys
                  <span className="block text-[11px] text-slate-400 font-normal">
                    Headless integration for CI/CD &amp; telemetry
                  </span>
                </td>
                <td className="px-4 py-3.5 text-center text-slate-400">—</td>
                <td className="px-4 py-3.5 text-center bg-blue-50/20 text-slate-500">Read-Only Scope</td>
                <td className="px-4 py-3.5 text-center text-emerald-600 font-medium">
                  Full M2M Scopes Active
                </td>
              </tr>

              <tr>
                <td className="px-6 py-3.5 font-medium text-slate-900">
                  Outbound Webhook Dispatch
                  <span className="block text-[11px] text-slate-400 font-normal">
                    Real-time HMAC-signed notification hooks
                  </span>
                </td>
                <td className="px-4 py-3.5 text-center text-slate-400">—</td>
                <td className="px-4 py-3.5 text-center bg-blue-50/20 text-emerald-600 font-medium">
                  1 Endpoint Subscription
                </td>
                <td className="px-4 py-3.5 text-center text-emerald-600 font-medium">
                  Multi-Endpoint SIEM Dispatch
                </td>
              </tr>

              <tr>
                <td className="px-6 py-3.5 font-medium text-slate-900">
                  Dedicated Auditor Assignment
                  <span className="block text-[11px] text-slate-400 font-normal">
                    Direct auditor engagement &amp; consultation
                  </span>
                </td>
                <td className="px-4 py-3.5 text-center">Pooled Auditor</td>
                <td className="px-4 py-3.5 text-center bg-blue-50/20">Assigned Assessor</td>
                <td className="px-4 py-3.5 text-center font-medium text-amber-700">
                  Senior Governance Lead
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Client Organizations by Assurance Tier */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Client Organization Assurance Coverage</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live directory of organizations enrolled across active assurance tiers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by organization or domain..."
                className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition w-56 sm:w-64"
              />
            </div>

            {/* Tier Filter Pills */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs">
              {["All", "Bronze", "Silver", "Gold"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTierFilter(t)}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    tierFilter === t
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Organizations Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center space-y-3">
              <RefreshCw className="h-6 w-6 text-blue-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-500">Loading live client allocations...</p>
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <Building2 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="font-medium text-slate-600">No organizations found matching criteria.</p>
              <p className="text-slate-400 mt-0.5">
                {searchQuery || tierFilter !== "All"
                  ? "Try resetting your search query or tier filter."
                  : "Onboard organizations to assign assurance tiers."}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/60 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Client Organization</th>
                  <th className="px-4 py-3">Domain</th>
                  <th className="px-4 py-3">Active Assurance Plan</th>
                  <th className="px-4 py-3">Verification Status</th>
                  <th className="px-4 py-3">Account Status</th>
                  <th className="px-6 py-3 text-right">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredCompanies.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/70 transition">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0 border border-blue-100">
                          {c.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900">{c.name}</span>
                          {c.industry && (
                            <span className="block text-[10px] text-slate-400">{c.industry}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-slate-600 font-mono text-[11px]">{c.domain}</td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                          c.activePlan === "Gold"
                            ? "bg-yellow-100 text-yellow-900 border-yellow-300"
                            : c.activePlan === "Silver"
                            ? "bg-blue-100 text-blue-800 border-blue-200"
                            : "bg-amber-100 text-amber-800 border-amber-200"
                        }`}
                      >
                        {c.activePlan || "Bronze"}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                          c.verificationStatus === "Verified"
                            ? "bg-emerald-100 text-emerald-800"
                            : c.verificationStatus === "Pending"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {c.verificationStatus}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium ${
                          c.status === "Active"
                            ? "text-emerald-700 bg-emerald-50"
                            : "text-slate-500 bg-slate-100"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            c.status === "Active" ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                        {c.status}
                      </span>
                    </td>

                    <td className="px-6 py-3.5 text-right text-slate-400 text-[11px]">
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "--"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
