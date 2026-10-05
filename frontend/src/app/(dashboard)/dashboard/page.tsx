"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { companyService } from "@/services/company.service";
import { userService } from "@/services/user.service";
import { Company } from "@/types/company.types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import {
  Building2,
  CheckCircle2,
  Clock,
  Users,
  ShieldCheck,
  Plus,
  ArrowRight,
  RefreshCw,
  Globe,
  Activity,
  FileCheck,
  Lock,
  ChevronRight,
  Sparkles,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { OnboardCompanyModal } from "@/components/features/companies/OnboardCompanyModal";

export default function DashboardPage() {
  const { user, isAdmin, isCompanyLead, isAssessor, companyName } = useAuth();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [totalUsers, setTotalUsers] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [showOnboardModal, setShowOnboardModal] = useState(false);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [compRes, userRes] = await Promise.all([
        companyService.getAll({ limit: 10 }),
        isAdmin ? userService.getUsers({ limit: 1 }) : Promise.resolve({ success: false, data: null }),
      ]);

      if (compRes.success && compRes.data) {
        const list = Array.isArray(compRes.data)
          ? compRes.data
          : Array.isArray((compRes.data as any).companies)
          ? (compRes.data as any).companies
          : [];
        setCompanies(list);
      }

      if (userRes.success && userRes.data) {
        const total =
          (userRes.data as any).total ??
          userRes.pagination?.total ??
          (Array.isArray(userRes.data) ? userRes.data.length : 1);
        setTotalUsers(total);
      }
    } catch {
      // Fallback gracefully
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleVerifyDns = async (id: string) => {
    setVerifyingId(id);
    try {
      await companyService.verifyDns(id);
      await loadDashboardData();
    } finally {
      setVerifyingId(null);
    }
  };

  const totalCompanies = companies.length;
  const verifiedCompanies = companies.filter((c) => c.verificationStatus === "Verified").length;
  const pendingCompanies = companies.filter((c) => c.verificationStatus === "Pending").length;

  // 7 Official GRAICE Governance Pillars with refined status indicators & gradient styling
  const pillars = [
    {
      name: "Ethical Leadership & Accountability",
      score: 88,
      status: "Compliant",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200/80",
      barGradient: "from-blue-600 to-indigo-600",
    },
    {
      name: "Data Governance & Integrity",
      score: 92,
      status: "Exemplary",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
      barGradient: "from-emerald-500 to-teal-500",
    },
    {
      name: "Purpose-Driven Innovation & Fairness",
      score: 76,
      status: "Compliant",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200/80",
      barGradient: "from-blue-600 to-indigo-600",
    },
    {
      name: "Human-Centric Use & Safety",
      score: 84,
      status: "Compliant",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200/80",
      barGradient: "from-blue-600 to-indigo-600",
    },
    {
      name: "Responsible Implementation & Robustness",
      score: 68,
      status: "In Review",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200/80",
      barGradient: "from-amber-400 to-amber-500",
    },
    {
      name: "AI Literacy & Workforce Readiness",
      score: 58,
      status: "Action Needed",
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200/80",
      barGradient: "from-rose-500 to-orange-500",
    },
    {
      name: "Transparency & Auditability",
      score: 90,
      status: "Exemplary",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
      barGradient: "from-emerald-500 to-teal-500",
    },
  ];

  const [greeting, setGreeting] = useState("Good day");
  const [formattedDate, setFormattedDate] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    setFormattedDate(
      new Date().toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    );
  }, []);

  const isPlatformAdmin = !user || isAdmin;

  return (
    <div className="space-y-6">
      {/* Executive Welcome Hero Header */}
      <div className="relative overflow-hidden bg-white border border-zinc-200/80 rounded-2xl p-6 sm:p-7 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)]">
        {/* Subtle ambient gradient mesh in background */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-gradient-to-br from-indigo-50/40 via-emerald-50/20 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span
                suppressHydrationWarning
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-900 text-white text-[10px] font-mono tracking-wider uppercase font-semibold"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {isPlatformAdmin ? "Enterprise Admin Console" : isCompanyLead ? "Company Workspace" : "Assessor Workspace"}
              </span>
              {formattedDate && (
                <span suppressHydrationWarning className="text-[11px] font-mono text-zinc-400 hidden sm:inline">
                  {formattedDate}
                </span>
              )}
            </div>

            <h1
              suppressHydrationWarning
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950"
            >
              {greeting}, {user?.name?.split(" ")[0] || "Administrator"}
            </h1>

            <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed">
              {isPlatformAdmin
                ? "Active institutional supervision across onboarded organizations, DNS legitimacy verifications, and regulatory benchmarks."
                : isCompanyLead
                ? `Governing AI compliance posture, membership approvals, and security policies for ${companyName || "your organization"}.`
                : "Your personal assessment worklist and regulatory review controls."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-1 lg:pt-0">
            {isAdmin && (
              <>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setShowOnboardModal(true)}
                  className="gap-2 shadow-xs font-semibold h-10 px-4 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Onboard Organization</span>
                </Button>
                <Link href="/users">
                  <Button variant="outline" size="md" className="gap-2 font-medium h-10 px-4">
                    <Users className="w-4 h-4" />
                    <span>Manage Team</span>
                  </Button>
                </Link>
              </>
            )}

            {!isAdmin && (
              <Link href="/settings/mfa">
                <Button variant="outline" size="md" className="gap-2 font-medium h-10 px-4">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Account Security</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 5 KPI Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Total Entities */}
        <div className="group bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] hover:border-zinc-300 transition-all duration-200">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              {isAdmin ? "Total Entities" : "My Organization"}
            </span>
            <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-700 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1">
            <div className="text-3xl font-extrabold text-zinc-950 tracking-tight font-sans">
              {loading ? "—" : totalCompanies}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1.5 flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              <span>Active onboarded profiles</span>
            </p>
          </div>
        </div>

        {/* KPI 2: DNS Verified */}
        <div className="group bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] hover:border-zinc-300 transition-all duration-200">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              DNS Verified
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1">
            <div className="text-3xl font-extrabold text-zinc-950 tracking-tight font-sans">
              {loading ? "—" : verifiedCompanies}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1.5 font-mono">
              {totalCompanies > 0
                ? `${Math.round((verifiedCompanies / totalCompanies) * 100)}% validated`
                : "No entities"}
            </p>
          </div>
        </div>

        {/* KPI 3: Pending Review */}
        <div className="group bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] hover:border-zinc-300 transition-all duration-200">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Pending Review
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1">
            <div className="text-3xl font-extrabold text-zinc-950 tracking-tight font-sans">
              {loading ? "—" : pendingCompanies}
            </div>
            <p className="text-[11px] text-amber-700 font-medium mt-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
              <span>Awaiting confirmation</span>
            </p>
          </div>
        </div>

        {/* KPI 4: Active Team */}
        <div className="group bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] hover:border-zinc-300 transition-all duration-200">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Active Team
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1">
            <div className="text-3xl font-extrabold text-zinc-950 tracking-tight font-sans">
              {loading ? "—" : totalUsers}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1.5">
              Assessors & Governance Leads
            </p>
          </div>
        </div>

        {/* KPI 5: 2FA Security */}
        <div className="group bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] hover:border-zinc-300 transition-all duration-200">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              2FA Security
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1">
            <div className="text-3xl font-extrabold text-zinc-950 tracking-tight font-sans">
              {user?.mfaEnabled || user?.mfa?.enabled ? "Enforced" : "Optional"}
            </div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block shadow-[0_0_4px_rgba(5,150,105,0.4)]" />
              <span>TOTP active</span>
            </p>
          </div>
        </div>
      </div>

      {/* Middle Row (3-Column Layout: Progress Donut | 7 Pillars | Recent Activity) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Col 1: Assessment Progress Donut Chart (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <div>
              <h3 className="text-sm font-bold text-zinc-950">Governance Progress</h3>
              <p className="text-[11px] text-zinc-500">Overall institutional audit clearance</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 font-semibold">
              Q4 / 2026
            </span>
          </div>

          {/* SVG Donut Ring with sleek gradient stroke */}
          <div className="relative flex items-center justify-center py-5">
            <svg className="w-40 h-40 transform -rotate-90 drop-shadow-xs" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="governanceDonut" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4f46e5" />
                  <stop offset="50%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
              {/* Background Circle */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke="#f4f4f5"
                strokeWidth="10"
              />
              {/* Progress Circle (64%) */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke="url(#governanceDonut)"
                strokeWidth="10"
                strokeDasharray="251.2"
                strokeDashoffset="90.4"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-extrabold text-zinc-950 tracking-tight font-sans">64%</span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Maturity</span>
              <span className="mt-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[9px] font-semibold border border-indigo-100">
                In Progress
              </span>
            </div>
          </div>

          {/* Status Breakdown Legend */}
          <div className="space-y-2.5 pt-3 border-t border-zinc-100 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                <span className="text-zinc-600">Verified Organizations</span>
              </div>
              <span className="font-semibold font-mono text-zinc-950">{verifiedCompanies}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-zinc-600">Pending DNS Verification</span>
              </div>
              <span className="font-semibold font-mono text-zinc-950">{pendingCompanies}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-zinc-300" />
                <span className="text-zinc-600">Governance Framework Target</span>
              </div>
              <span className="font-semibold font-mono text-zinc-950">85% SLA</span>
            </div>

            {/* Target Progress Bar */}
            <div className="pt-1">
              <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                <span>Current: 64%</span>
                <span className="font-semibold text-zinc-700">Target: 85%</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full"
                  style={{ width: "64%" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Col 2: The 7 GRAICE Pillars (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <div>
              <h3 className="text-sm font-bold text-zinc-950">The 7 GRAICE Pillars</h3>
              <p className="text-[11px] text-zinc-500">Institutional AI governance benchmarks</p>
            </div>
            <Link
              href="/companies"
              className="text-xs font-semibold text-zinc-700 hover:text-zinc-950 inline-flex items-center gap-1 transition-colors"
            >
              <span>Audit details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3.5 pt-1">
            {pillars.map((pillar, idx) => (
              <div key={pillar.name} className="group space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-zinc-800 truncate pr-2 group-hover:text-zinc-950 transition-colors">
                    <span className="font-mono text-zinc-400 mr-2 text-[11px]">{idx + 1}.</span>
                    {pillar.name}
                  </span>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${pillar.badgeClass}`}
                    >
                      {pillar.status}
                    </span>
                    <span className="font-mono font-bold text-zinc-900 w-9 text-right text-xs">
                      {pillar.score}%
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${pillar.barGradient} transition-all duration-500`}
                    style={{ width: `${pillar.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Col 3: Recent Activity (3 cols) */}
        <div className="lg:col-span-3 bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <div>
              <h3 className="text-sm font-bold text-zinc-950">Recent Activity</h3>
              <p className="text-[11px] text-zinc-500">Live platform event stream</p>
            </div>
            <Activity className="w-4 h-4 text-zinc-400" />
          </div>

          <div className="relative pl-5 space-y-4 pt-1 text-xs before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-zinc-200">
            {/* Event 1 */}
            <div className="relative">
              <span className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white" />
              <div>
                <p className="font-semibold text-zinc-900 leading-snug">Admin Portal Initialized</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">Role-based governance security enforced</p>
                <span className="text-[10px] font-mono text-zinc-400 mt-1 inline-block">Just now</span>
              </div>
            </div>

            {/* Event 2 */}
            <div className="relative">
              <span className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-zinc-800 ring-4 ring-white" />
              <div>
                <p className="font-semibold text-zinc-900 leading-snug">Automated DNS Engine</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">A & MX lookup verification routine active</p>
                <span className="text-[10px] font-mono text-zinc-400 mt-1 inline-block">10m ago</span>
              </div>
            </div>

            {/* Event 3 */}
            <div className="relative">
              <span className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-white" />
              <div>
                <p className="font-semibold text-zinc-900 leading-snug">MFA Security Policy</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">Hardware TOTP & emergency keys enabled</p>
                <span className="text-[10px] font-mono text-zinc-400 mt-1 inline-block">25m ago</span>
              </div>
            </div>

            {/* Event 4 */}
            <div className="relative">
              <span className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-zinc-400 ring-4 ring-white" />
              <div>
                <p className="font-semibold text-zinc-900 leading-snug">Database Connected</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">REST backend connected to Atlas</p>
                <span className="text-[10px] font-mono text-zinc-400 mt-1 inline-block">1h ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Live Organizations Directory Table & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Organizations Directory Widget (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-zinc-200/80 rounded-2xl overflow-hidden shadow-[0_1px_3px_0_rgba(0,0,0,0.03)]">
          <div className="p-5 flex items-center justify-between border-b border-zinc-100">
            <div>
              <h3 className="text-sm font-bold text-zinc-950">
                {isAdmin ? "Supervised Organizations" : "Organization Directory"}
              </h3>
              <p className="text-[11px] text-zinc-500">
                Live domain ownership and cryptographic verification records
              </p>
            </div>
            <Link href="/companies">
              <Button variant="outline" size="sm" className="gap-1 text-xs h-8">
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center items-center">
              <Spinner size="md" />
            </div>
          ) : companies.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-500 flex items-center justify-center mx-auto">
                <Building2 className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-zinc-800">No organizations onboarded yet</p>
              <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                Add your first enterprise company to begin tracking algorithmic risk posture.
              </p>
              {isAdmin && (
                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowOnboardModal(true)}
                    className="gap-1.5 text-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Onboard Organization</span>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/70 text-zinc-500 uppercase tracking-wider text-[10px] font-semibold">
                    <th className="py-3 px-4">Organization</th>
                    <th className="py-3 px-4">Domain</th>
                    <th className="py-3 px-4">Industry</th>
                    <th className="py-3 px-4">DNS Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {companies.slice(0, 5).map((comp) => (
                    <tr key={comp._id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <Link href={`/companies/${comp._id}`} className="group flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white font-bold flex items-center justify-center text-[10px] group-hover:bg-indigo-600 transition-colors">
                            {comp.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-semibold text-zinc-900 group-hover:text-indigo-600 transition-colors">
                            {comp.name}
                          </span>
                        </Link>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-zinc-600">
                        {comp.domain}
                      </td>
                      <td className="py-3 px-4 text-zinc-600">
                        {comp.industry || "General AI"}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={comp.verificationStatus === "Verified" ? "verified" : "pending"}>
                          {comp.verificationStatus}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={verifyingId === comp._id}
                          onClick={() => handleVerifyDns(comp._id)}
                          className="h-7 text-[11px] px-2.5"
                        >
                          {verifyingId === comp._id ? (
                            <Spinner size="sm" />
                          ) : (
                            <span className="flex items-center gap-1">
                              <RefreshCw className="w-3 h-3" />
                              <span>Verify</span>
                            </span>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Quick Action & Compliance Mandate (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] space-y-4">
          <div className="pb-3 border-b border-zinc-100">
            <h3 className="text-sm font-bold text-zinc-950">Quick Governance Actions</h3>
            <p className="text-[11px] text-zinc-500">Institutional shortcuts for regulatory tasks</p>
          </div>

          <div className="space-y-2.5">
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => setShowOnboardModal(true)}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-zinc-200/80 hover:border-zinc-950 hover:bg-zinc-50 transition-all text-xs font-semibold text-zinc-900 group cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-700 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                      <Plus className="w-4 h-4" />
                    </div>
                    <span>Onboard Enterprise Company</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 transition-colors" />
                </button>

                <Link
                  href="/users"
                  className="flex items-center justify-between p-3 rounded-xl border border-zinc-200/80 hover:border-zinc-950 hover:bg-zinc-50 transition-all text-xs font-semibold text-zinc-900 group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-700 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                      <Users className="w-4 h-4" />
                    </div>
                    <span>Invite Team Assessor</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 transition-colors" />
                </Link>
              </>
            )}

            <Link
              href="/settings/mfa"
              className="flex items-center justify-between p-3 rounded-xl border border-zinc-200/80 hover:border-zinc-950 hover:bg-zinc-50 transition-all text-xs font-semibold text-zinc-900 group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-700 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                  <Lock className="w-4 h-4" />
                </div>
                <span>Manage Two-Factor Security</span>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 transition-colors" />
            </Link>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-50/80 border border-zinc-200/80 text-[11px] text-zinc-600 space-y-1.5">
            <p className="font-semibold text-zinc-900 flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-zinc-800" />
              GRAICE Governance Protocol
            </p>
            <p className="leading-relaxed text-[11px] text-zinc-500">
              Responsible AI framework active. All assessment inputs timestamped with cryptographic SHA-256 audit trails.
            </p>
          </div>
        </div>
      </div>

      {/* Compact Onboard Organization Dialog */}
      <OnboardCompanyModal
        isOpen={showOnboardModal}
        onClose={() => setShowOnboardModal(false)}
        onSuccess={loadDashboardData}
      />
    </div>
  );
}
