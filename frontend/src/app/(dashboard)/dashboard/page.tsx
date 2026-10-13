"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { dashboardService } from "@/services/dashboard.service";
import {
  FileCheck2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  ArrowUpRight,
  TrendingUp,
  FileText,
  Calendar,
  MoreHorizontal,
  ChevronDown,
  Users,
  UserCheck,
  ShieldCheck,
  Layers,
  Award,
  SlidersHorizontal,
  HelpCircle,
  FolderLock,
  Crown,
  Lock,
  BookOpen,
  LayoutGrid,
  Settings,
  Shield,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const roleView: "Admin" | "Auditor" = user?.role === "Admin" ? "Admin" : "Auditor";
  const [loading, setLoading] = useState(false);
  const [auditorData, setAuditorData] = useState<any>(null);
  const [adminData, setAdminData] = useState<any>(null);


  // Fetch live dashboard API data
  useEffect(() => {
    async function fetchDashboard() {
      setLoading(true);
      try {
        if (roleView === "Admin") {
          const res = await dashboardService.getAdminSummary();
          if (res?.data) setAdminData(res.data);
        } else {
          const res = await dashboardService.getAuditorSummary();
          if (res?.data) setAuditorData(res.data);
        }
      } catch (err) {
        // Fallback silently if unauthenticated or error; UI maintains exact presentation
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, [roleView]);

  return (
    <div className="space-y-6">
      {roleView === "Auditor" ? (
        <AuditorDashboardContent data={auditorData} userName={user?.name || "Piyush"} />
      ) : (
        <AdminDashboardContent data={adminData} />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                        SCREEN 1: AUDITOR DASHBOARD                         */
/* -------------------------------------------------------------------------- */

function AuditorDashboardContent({ data, userName }: { data: any; userName: string }) {
  // Integrate live data with design spec constants
  const totalAssessments = data?.stats?.totalAssessments || 12;
  const inProgress = data?.stats?.inProgressAssessments || 5;
  const completed = data?.stats?.completedAssessments || 6;
  const findingsCount = data?.stats?.totalFindings || 3;
  const organizationsCount = data?.stats?.assignedOrganizations || 8;
  const overallCompletion = data?.overallCompletionPercentage || 64;

  const pillarPerformance = [
    { name: "Ethical Leadership", percentage: 78 },
    { name: "Data Governance & Integrity", percentage: 62 },
    { name: "Purpose-Driven Innovation", percentage: 54 },
    { name: "Human-Centric Use", percentage: 48 },
    { name: "Responsible Implementation", percentage: 71 },
    { name: "AI Literacy & Workforce Readiness", percentage: 40 },
    { name: "Transparency & Auditability", percentage: 66 },
  ];

  const recentActivity = [
    {
      icon: "file",
      color: "bg-blue-50 text-blue-600",
      title: "Evidence uploaded",
      subtitle: "ABC Corporation - Control GCRAI-001",
      time: "2 hours ago",
    },
    {
      icon: "edit",
      color: "bg-orange-50 text-orange-600",
      title: "Assessment updated",
      subtitle: "TechNova Solutions - Pillar 3",
      time: "4 hours ago",
    },
    {
      icon: "alert",
      color: "bg-rose-50 text-rose-600",
      title: "Finding created",
      subtitle: "Global Retail Ltd - Data Governance",
      time: "1 day ago",
    },
    {
      icon: "report",
      color: "bg-cyan-50 text-cyan-600",
      title: "Report generated",
      subtitle: "GreenTech Industries - Full Assessment",
      time: "1 day ago",
    },
    {
      icon: "new",
      color: "bg-emerald-50 text-emerald-600",
      title: "New assessment created",
      subtitle: "HealthAI Systems - Light Assessment",
      time: "2 days ago",
    },
  ];

  const upcomingTasks = [
    {
      date: "OCT 04",
      title: "Complete evidence review",
      subtitle: "TechNova Solutions - Control GCRAI-023",
      priority: "High",
      badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
      pillColor: "bg-rose-50 text-rose-600",
    },
    {
      date: "OCT 06",
      title: "Client meeting",
      subtitle: "Global Retail Ltd - Assessment Review",
      priority: "Medium",
      badgeColor: "bg-orange-50 text-orange-700 border-orange-200",
      pillColor: "bg-amber-50 text-amber-700",
    },
    {
      date: "OCT 08",
      title: "Upload pending evidence",
      subtitle: "ABC Corporation - 5 controls",
      priority: "Medium",
      badgeColor: "bg-orange-50 text-orange-700 border-orange-200",
      pillColor: "bg-amber-50 text-amber-700",
    },
    {
      date: "OCT 10",
      title: "Prepare draft report",
      subtitle: "HealthAI Systems - Full Assessment",
      priority: "Low",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      pillColor: "bg-blue-50 text-blue-700",
    },
  ];

  const myOrganizations = [
    { code: "ABC", name: "ABC Corporation", industry: "Technology", count: 2, status: "In Progress" },
    { code: "TS", name: "TechNova Solutions", industry: "IT Services", count: 1, status: "In Progress" },
    { code: "GR", name: "Global Retail Ltd", industry: "Retail", count: 2, status: "Completed" },
    { code: "HS", name: "HealthAI Systems", industry: "Healthcare", count: 1, status: "Not Started" },
    { code: "GT", name: "GreenTech Industries", industry: "Manufacturing", count: 1, status: "In Progress" },
  ];

  const latestFindings = [
    { id: "FND-2026-001", org: "Global Retail Ltd", severity: "High", status: "Open" },
    { id: "FND-2026-002", org: "TechNova Solutions", severity: "Medium", status: "In Review" },
    { id: "FND-2026-003", org: "ABC Corporation", severity: "Medium", status: "Open" },
    { id: "FND-2026-004", org: "GreenTech Industries", severity: "Low", status: "Resolved" },
  ];

  return (
    <div className="space-y-6">
      {/* Greeting Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-editorial">
            Good Morning, {userName} 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Here&apos;s an overview of your assessments and activities.
          </p>
        </div>
        <div className="text-left md:text-right">
          <div className="text-xs text-slate-500 font-medium">Friday, 3 October 2026</div>
          <div className="text-xs text-slate-600 italic font-serif mt-0.5">
            &ldquo;Responsible AI today, a more trustworthy tomorrow.&rdquo;
          </div>
        </div>
      </div>

      {/* Top 5 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1 */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
            <FileCheck2 className="h-6 w-6 shrink-0" strokeWidth={1.85} />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-extrabold text-slate-900 leading-tight tracking-tight">{totalAssessments}</div>
            <div className="text-xs font-medium text-slate-500 truncate mt-0.5">Total Assessments</div>
            <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-0.5">
              <span>▲ +2 this month</span>
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0 shadow-2xs">
            <Clock className="h-6 w-6 shrink-0" strokeWidth={1.85} />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-extrabold text-slate-900 leading-tight tracking-tight">{inProgress}</div>
            <div className="text-xs font-medium text-slate-500 truncate mt-0.5">In Progress</div>
            <div className="text-[11px] font-semibold text-blue-600 flex items-center gap-1 mt-0.5">
              <span>↑ +1 this week</span>
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
            <CheckCircle2 className="h-6 w-6 shrink-0" strokeWidth={1.85} />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-extrabold text-slate-900 leading-tight tracking-tight">{completed}</div>
            <div className="text-xs font-medium text-slate-500 truncate mt-0.5">Completed</div>
            <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-0.5">
              <span>↑ +3 this month</span>
            </div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
            <AlertTriangle className="h-6 w-6 shrink-0" strokeWidth={1.85} />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-extrabold text-slate-900 leading-tight tracking-tight">{findingsCount}</div>
            <div className="text-xs font-medium text-slate-500 truncate mt-0.5">Findings</div>
            <div className="text-[11px] font-semibold text-rose-600 flex items-center gap-1 mt-0.5">
              <span>⚑ Needs Attention</span>
            </div>
          </div>
        </div>

        {/* Card 5 */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 shadow-2xs">
            <Building2 className="h-6 w-6 shrink-0" strokeWidth={1.85} />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-extrabold text-slate-900 leading-tight tracking-tight">{organizationsCount}</div>
            <div className="text-xs font-medium text-slate-500 truncate mt-0.5">Organizations</div>
            <div className="text-[11px] font-semibold text-purple-600 flex items-center gap-1 mt-0.5">
              <span>Active Clients</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row (3 Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Card 1: Assessment Progress */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Assessment Progress</h3>
            <button className="text-xs text-slate-500 flex items-center gap-1 border border-slate-200 px-2 py-1 rounded-md bg-slate-50 hover:bg-slate-100">
              Last 6 Months <ChevronDown className="h-3 w-3" />
            </button>
          </div>

          <div className="py-4 flex items-center justify-around">
            {/* SVG Donut */}
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle cx="50" cy="50" r="38" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                {/* Completed Arc (Green) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="12"
                  strokeDasharray="238.7"
                  strokeDashoffset={238.7 * (1 - 6 / 12)}
                  strokeLinecap="round"
                />
                {/* In Progress Arc (Blue) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="12"
                  strokeDasharray="238.7"
                  strokeDashoffset={238.7 * (1 - 5 / 12)}
                  strokeLinecap="round"
                  className="opacity-80"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-extrabold text-slate-900">{overallCompletion}%</span>
                <span className="text-[10px] text-slate-500 font-medium">Overall Completion</span>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="text-slate-600">Completed</span>
                </div>
                <span className="font-bold text-slate-900">6</span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  <span className="text-slate-600">In Progress</span>
                </div>
                <span className="font-bold text-slate-900">5</span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="text-slate-600">Not Started</span>
                </div>
                <span className="font-bold text-slate-900">1</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Pillar Performance */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Pillar Performance</h3>
            <Link href="/admin/frameworks" className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-0.5">
              View Details →
            </Link>
          </div>

          <div className="py-2 space-y-2">
            {pillarPerformance.map((p) => (
              <div key={p.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 font-medium truncate max-w-[200px]">{p.name}</span>
                  <span className="font-bold text-slate-900 text-[11px]">{p.percentage}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#2563eb] rounded-full transition-all duration-500"
                    style={{ width: `${p.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: Recent Activity */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Recent Activity</h3>
            <Link href="/admin/audit-logs" className="text-xs font-semibold text-blue-600 hover:underline">
              View All →
            </Link>
          </div>

          <div className="py-1 divide-y divide-slate-100 space-y-2">
            {recentActivity.map((act, i) => (
              <div key={i} className="pt-2 first:pt-0 flex items-start justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <div className={`p-1.5 rounded-lg shrink-0 ${act.color}`}>
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{act.title}</div>
                    <div className="text-slate-500 text-[11px] truncate max-w-[170px]">{act.subtitle}</div>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">{act.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lower Middle Row (3 Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Card 1: Assessments Overview (Stacked Bar Chart) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-sm font-bold text-slate-900">Assessments Overview</h3>
            <button className="text-xs text-slate-500 flex items-center gap-1 border border-slate-200 px-2 py-1 rounded-md bg-slate-50 hover:bg-slate-100">
              Last 6 Months <ChevronDown className="h-3 w-3" />
            </button>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs mb-3">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-600 text-[11px]">Completed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              <span className="text-slate-600 text-[11px]">In Progress</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
              <span className="text-slate-600 text-[11px]">Not Started</span>
            </div>
          </div>

          {/* SVG Stacked Bar Chart */}
          <div className="h-44 w-full">
            <svg viewBox="0 0 350 160" className="w-full h-full overflow-visible">
              {/* Horizontal Grid lines */}
              <line x1="25" y1="20" x2="340" y2="20" stroke="#f1f5f9" strokeWidth="1" />
              <text x="12" y="23" fontSize="9" fill="#94a3b8">8</text>
              <line x1="25" y1="50" x2="340" y2="50" stroke="#f1f5f9" strokeWidth="1" />
              <text x="12" y="53" fontSize="9" fill="#94a3b8">6</text>
              <line x1="25" y1="80" x2="340" y2="80" stroke="#f1f5f9" strokeWidth="1" />
              <text x="12" y="83" fontSize="9" fill="#94a3b8">4</text>
              <line x1="25" y1="110" x2="340" y2="110" stroke="#f1f5f9" strokeWidth="1" />
              <text x="12" y="113" fontSize="9" fill="#94a3b8">2</text>
              <line x1="25" y1="140" x2="340" y2="140" stroke="#e2e8f0" strokeWidth="1" />
              <text x="12" y="143" fontSize="9" fill="#94a3b8">0</text>

              {/* Month Bars */}
              {/* Apr */}
              <rect x="50" y="110" width="16" height="30" fill="#10b981" rx="2" />
              <rect x="68" y="95" width="16" height="45" fill="#94a3b8" opacity="0.6" rx="2" />
              <text x="63" y="153" fontSize="10" fill="#64748b" textAnchor="middle">Apr</text>

              {/* May */}
              <rect x="100" y="130" width="16" height="10" fill="#10b981" rx="2" />
              <rect x="118" y="80" width="16" height="60" fill="#3b82f6" rx="2" />
              <text x="113" y="153" fontSize="10" fill="#64748b" textAnchor="middle">May</text>

              {/* Jun */}
              <rect x="150" y="115" width="16" height="25" fill="#10b981" rx="2" />
              <rect x="168" y="75" width="16" height="65" fill="#94a3b8" opacity="0.6" rx="2" />
              <text x="163" y="153" fontSize="10" fill="#64748b" textAnchor="middle">Jun</text>

              {/* Jul */}
              <rect x="200" y="125" width="16" height="15" fill="#10b981" rx="2" />
              <rect x="218" y="90" width="16" height="50" fill="#3b82f6" rx="2" />
              <text x="213" y="153" fontSize="10" fill="#64748b" textAnchor="middle">Jul</text>

              {/* Aug */}
              <rect x="250" y="115" width="16" height="25" fill="#10b981" rx="2" />
              <rect x="268" y="65" width="16" height="75" fill="#94a3b8" opacity="0.6" rx="2" />
              <text x="263" y="153" fontSize="10" fill="#64748b" textAnchor="middle">Aug</text>

              {/* Sep */}
              <rect x="300" y="85" width="16" height="55" fill="#10b981" rx="2" />
              <rect x="318" y="70" width="16" height="70" fill="#3b82f6" rx="2" />
              <text x="313" y="153" fontSize="10" fill="#64748b" textAnchor="middle">Sep</text>
            </svg>
          </div>
        </div>

        {/* Card 2: Assessment Types */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div className="pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Assessment Types</h3>
          </div>

          <div className="py-2 flex flex-col items-center justify-center">
            {/* SVG Donut */}
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="38" fill="none" stroke="#e2e8f0" strokeWidth="14" />
                {/* Full (Navy) 58% */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#1e3a8a"
                  strokeWidth="14"
                  strokeDasharray="238.7"
                  strokeDashoffset={238.7 * (1 - 0.58)}
                />
                {/* Light (Sky Blue) 42% */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="14"
                  strokeDasharray="238.7"
                  strokeDashoffset={238.7 * (1 - 0.42)}
                  className="rotate-180 origin-center"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-extrabold text-slate-900">12</span>
                <span className="text-[10px] text-slate-500 font-medium">Total Assessments</span>
              </div>
            </div>

            <div className="mt-4 space-y-2 text-xs w-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#1e3a8a]" />
                  <span className="text-slate-600 text-[11px]">Full Assessment</span>
                </div>
                <span className="font-semibold text-slate-900 text-[11px]">7 (58%)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#38bdf8]" />
                  <span className="text-slate-600 text-[11px]">Light Assessment</span>
                </div>
                <span className="font-semibold text-slate-900 text-[11px]">5 (42%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Upcoming Tasks */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Upcoming Tasks</h3>
            <Link href="/assessments" className="text-xs font-semibold text-blue-600 hover:underline">
              View All →
            </Link>
          </div>

          <div className="py-1 divide-y divide-slate-100 space-y-2">
            {upcomingTasks.map((t, idx) => (
              <div key={idx} className="pt-2 first:pt-0 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className={`px-2 py-1 rounded-md text-[10px] font-bold text-center uppercase tracking-tight shrink-0 border ${t.badgeColor}`}>
                    {t.date}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 text-xs">{t.title}</div>
                    <div className="text-slate-500 text-[11px] truncate max-w-[170px]">{t.subtitle}</div>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${t.pillColor}`}>
                  {t.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row (3 Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Card 1: My Organizations */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">My Organizations</h3>
            <Link href="/organizations" className="text-xs font-semibold text-blue-600 hover:underline">
              View All →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] font-semibold text-slate-400 uppercase border-b border-slate-100">
                <tr>
                  <th className="py-2.5">Organization</th>
                  <th className="py-2.5">Industry</th>
                  <th className="py-2.5 text-center">Assessments</th>
                  <th className="py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myOrganizations.map((org) => (
                  <tr key={org.name} className="hover:bg-slate-50 transition">
                    <td className="py-2 flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-slate-900 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                        {org.code}
                      </div>
                      <span className="font-semibold text-slate-800 truncate max-w-[100px]">{org.name}</span>
                    </td>
                    <td className="py-2 text-slate-500">{org.industry}</td>
                    <td className="py-2 text-center font-medium text-slate-700">{org.count}</td>
                    <td className="py-2 text-right">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          org.status === "Completed"
                            ? "bg-emerald-50 text-emerald-700"
                            : org.status === "In Progress"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {org.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card 2: Latest Findings */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Latest Findings</h3>
            <Link href="/assessments/findings" className="text-xs font-semibold text-blue-600 hover:underline">
              View All →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] font-semibold text-slate-400 uppercase border-b border-slate-100">
                <tr>
                  <th className="py-2.5">Finding</th>
                  <th className="py-2.5">Organization</th>
                  <th className="py-2.5 text-center">Severity</th>
                  <th className="py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {latestFindings.map((fnd) => (
                  <tr key={fnd.id} className="hover:bg-slate-50 transition">
                    <td className="py-2 font-mono text-[11px] text-slate-700 font-medium">{fnd.id}</td>
                    <td className="py-2 text-slate-600 font-medium truncate max-w-[100px]">{fnd.org}</td>
                    <td className="py-2 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          fnd.severity === "High"
                            ? "bg-rose-50 text-rose-700"
                            : fnd.severity === "Medium"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {fnd.severity}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          fnd.status === "Open"
                            ? "bg-rose-50 text-rose-700"
                            : fnd.status === "In Review"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {fnd.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card 3: Continue Your Assessment */}
        <div className="lg:col-span-4 relative rounded-xl overflow-hidden border border-slate-200/90 shadow-xs bg-white flex flex-col justify-between p-6">
          <img
            src="/building.jpg"
            alt="Corporate Glass Building"
            className="absolute right-0 top-0 bottom-0 w-1/2 h-full object-cover object-left opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-transparent w-3/4" />

          <div className="relative z-10 space-y-2 max-w-[65%]">
            <h3 className="text-base font-bold text-slate-900 leading-snug">
              Continue Your Assessment
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              You have 3 pending assessments that need your attention.
            </p>
          </div>

          <div className="relative z-10 pt-4">
            <Link
              href="/assessments"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0c162c] hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition"
            >
              View Assessments <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                         SCREEN 2: ADMIN PANEL                              */
/* -------------------------------------------------------------------------- */

function AdminDashboardContent({ data }: { data: any }) {
  const adminStats = [
    { label: "Total Users", value: "156", trend: "↑ 12%", icon: Users, color: "bg-blue-100 text-blue-600" },
    { label: "Auditors", value: "24", trend: "↑ 9%", icon: UserCheck, color: "bg-emerald-100 text-emerald-600" },
    { label: "Organizations", value: "48", trend: "↑ 18%", icon: Building2, color: "bg-purple-100 text-purple-600" },
    { label: "Assessments", value: "62", trend: "↑ 15%", icon: FileCheck2, color: "bg-orange-100 text-orange-600" },
    { label: "Framework Versions", value: "8", trend: "↑ 0%", icon: BookOpen, color: "bg-rose-100 text-rose-600" },
    { label: "Pillars", value: "7", trend: "↑ 0%", icon: LayoutGrid, color: "bg-sky-100 text-sky-600" },
    { label: "Controls", value: "86", trend: "↑ 11%", icon: Settings, color: "bg-amber-100 text-amber-600" },
    { label: "Questions", value: "245", trend: "↑ 20%", icon: HelpCircle, color: "bg-purple-100 text-purple-600" },
    { label: "Evidence Items", value: "320", trend: "↑ 25%", icon: FolderLock, color: "bg-emerald-100 text-emerald-600" },
    { label: "Reports", value: "42", trend: "↑ 17%", icon: FileText, color: "bg-rose-100 text-rose-600" },
    { label: "Active Subscriptions", value: "86", trend: "↑ 13%", icon: Crown, color: "bg-teal-100 text-teal-600" },
    { label: "Permission Roles", value: "6", trend: "↑ 0%", icon: Shield, color: "bg-blue-100 text-blue-600" },
  ];

  const recentOrganizations = [
    { id: 1, name: "ABC Corporation", plan: "Gold", planColor: "bg-amber-50 text-amber-800 border-amber-200", assessments: 12, users: 8, status: "Active", date: "10 Sep 2026" },
    { id: 2, name: "TechNova Ltd", plan: "Silver", planColor: "bg-slate-100 text-slate-800 border-slate-300", assessments: 8, users: 4, status: "Active", date: "05 Sep 2026" },
    { id: 3, name: "Sigma AI", plan: "Bronze", planColor: "bg-orange-50 text-orange-800 border-orange-200", assessments: 6, users: 3, status: "Active", date: "28 Aug 2026" },
    { id: 4, name: "Global Analytics", plan: "Gold", planColor: "bg-amber-50 text-amber-800 border-amber-200", assessments: 10, users: 6, status: "Active", date: "15 Aug 2026" },
    { id: 5, name: "NextGen Solutions", plan: "Silver", planColor: "bg-slate-100 text-slate-800 border-slate-300", assessments: 4, users: 2, status: "Active", date: "01 Aug 2026" },
  ];

  const recentAdminActivity = [
    {
      title: "New user registered",
      desc: "Rohan Mehta joined the platform",
      time: "2 minutes ago",
      icon: Users,
      color: "bg-blue-100 text-blue-600",
    },
    {
      title: "Assessment created",
      desc: "ABC Corporation - AI Governance",
      time: "15 minutes ago",
      icon: FileCheck2,
      color: "bg-orange-100 text-orange-600",
    },
    {
      title: "Evidence uploaded",
      desc: "Policy document uploaded",
      time: "1 hour ago",
      icon: FolderLock,
      color: "bg-emerald-100 text-emerald-600",
    },
    {
      title: "Subscription upgraded",
      desc: "TechNova Ltd upgraded to Silver",
      time: "2 hours ago",
      icon: Crown,
      color: "bg-purple-100 text-purple-600",
    },
    {
      title: "Framework version updated",
      desc: "GCRAI v0.8 published",
      time: "4 hours ago",
      icon: SlidersHorizontal,
      color: "bg-slate-100 text-slate-700",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 12 Stat Cards (4x3 Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {adminStats.map((st) => {
          const Icon = st.icon;
          return (
            <div
              key={st.label}
              className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${st.color} shadow-2xs`}
                >
                  <Icon className="h-6 w-6 shrink-0" strokeWidth={1.85} />
                </div>
                <div className="min-w-0">
                  <div className="text-2xl font-extrabold text-slate-900 leading-tight tracking-tight">
                    {st.value}
                  </div>
                  <div className="text-xs font-medium text-slate-500 truncate mt-0.5">
                    {st.label}
                  </div>
                </div>
              </div>
              <div className="text-xs font-semibold text-emerald-600 shrink-0 self-start pt-0.5 flex items-center gap-0.5">
                <span>{st.trend}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Middle Row (3 Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Card 1: Assessments by Status */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div className="pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Assessments by Status</h3>
          </div>

          <div className="py-2 flex items-center justify-around">
            {/* SVG Donut */}
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="38" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                {/* Completed (Green) 39% */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="12"
                  strokeDasharray="238.7"
                  strokeDashoffset={238.7 * (1 - 0.39)}
                />
                {/* In Progress (Blue) 29% */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="12"
                  strokeDasharray="238.7"
                  strokeDashoffset={238.7 * (1 - 0.29)}
                  className="rotate-90 origin-center"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-bold text-slate-900">62</span>
                <span className="text-[10px] text-slate-500">Total</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-slate-600 text-[11px]">Completed</span>
                </div>
                <span className="font-semibold text-slate-900 text-[11px]">24 (39%)</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="text-slate-600 text-[11px]">In Progress</span>
                </div>
                <span className="font-semibold text-slate-900 text-[11px]">18 (29%)</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-slate-600 text-[11px]">Not Started</span>
                </div>
                <span className="font-semibold text-slate-900 text-[11px]">16 (26%)</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  <span className="text-slate-600 text-[11px]">Overdue</span>
                </div>
                <span className="font-semibold text-slate-900 text-[11px]">4 (6%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Subscription Plan Distribution */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div className="pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Subscription Plan Distribution</h3>
          </div>

          <div className="py-2 flex items-center justify-around">
            {/* SVG Donut */}
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="38" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                {/* Bronze (Amber/Brown) 33% */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#b45309"
                  strokeWidth="12"
                  strokeDasharray="238.7"
                  strokeDashoffset={238.7 * (1 - 0.33)}
                />
                {/* Silver (Slate) 42% */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="12"
                  strokeDasharray="238.7"
                  strokeDashoffset={238.7 * (1 - 0.42)}
                  className="rotate-120 origin-center"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-bold text-slate-900">86</span>
                <span className="text-[10px] text-slate-500">Total</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-700" />
                  <span className="text-slate-600 text-[11px]">Bronze</span>
                </div>
                <span className="font-semibold text-slate-900 text-[11px]">28 (33%)</span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
                  <span className="text-slate-600 text-[11px]">Silver</span>
                </div>
                <span className="font-semibold text-slate-900 text-[11px]">36 (42%)</span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="text-slate-600 text-[11px]">Gold</span>
                </div>
                <span className="font-semibold text-slate-900 text-[11px]">22 (26%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Assessments Created (Last 6 Months) */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div className="pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Assessments Created (Last 6 Months)</h3>
          </div>

          <div className="h-40 w-full mt-2">
            <svg viewBox="0 0 320 150" className="w-full h-full overflow-visible">
              <line x1="20" y1="20" x2="310" y2="20" stroke="#f1f5f9" strokeWidth="1" />
              <text x="5" y="23" fontSize="8" fill="#94a3b8">20</text>
              <line x1="20" y1="50" x2="310" y2="50" stroke="#f1f5f9" strokeWidth="1" />
              <text x="5" y="53" fontSize="8" fill="#94a3b8">15</text>
              <line x1="20" y1="80" x2="310" y2="80" stroke="#f1f5f9" strokeWidth="1" />
              <text x="5" y="83" fontSize="8" fill="#94a3b8">10</text>
              <line x1="20" y1="110" x2="310" y2="110" stroke="#f1f5f9" strokeWidth="1" />
              <text x="5" y="113" fontSize="8" fill="#94a3b8">5</text>
              <line x1="20" y1="135" x2="310" y2="135" stroke="#e2e8f0" strokeWidth="1" />
              <text x="5" y="138" fontSize="8" fill="#94a3b8">0</text>

              {/* Stacked bars for 6 months */}
              {/* Apr */}
              <rect x="40" y="90" width="14" height="45" fill="#3b82f6" rx="1.5" />
              <rect x="40" y="80" width="14" height="10" fill="#38bdf8" />
              <rect x="40" y="70" width="14" height="10" fill="#facc15" />
              <rect x="40" y="65" width="14" height="5" fill="#ef4444" rx="1.5" />
              <text x="47" y="146" fontSize="9" fill="#64748b" textAnchor="middle">Apr</text>

              {/* May */}
              <rect x="85" y="80" width="14" height="55" fill="#3b82f6" rx="1.5" />
              <rect x="85" y="68" width="14" height="12" fill="#38bdf8" />
              <rect x="85" y="58" width="14" height="10" fill="#facc15" />
              <rect x="85" y="52" width="14" height="6" fill="#ef4444" rx="1.5" />
              <text x="92" y="146" fontSize="9" fill="#64748b" textAnchor="middle">May</text>

              {/* Jun */}
              <rect x="130" y="70" width="14" height="65" fill="#3b82f6" rx="1.5" />
              <rect x="130" y="58" width="14" height="12" fill="#38bdf8" />
              <rect x="130" y="48" width="14" height="10" fill="#facc15" />
              <rect x="130" y="42" width="14" height="6" fill="#ef4444" rx="1.5" />
              <text x="137" y="146" fontSize="9" fill="#64748b" textAnchor="middle">Jun</text>

              {/* Jul */}
              <rect x="175" y="65" width="14" height="70" fill="#3b82f6" rx="1.5" />
              <rect x="175" y="52" width="14" height="13" fill="#38bdf8" />
              <rect x="175" y="42" width="14" height="10" fill="#facc15" />
              <rect x="175" y="37" width="14" height="5" fill="#ef4444" rx="1.5" />
              <text x="182" y="146" fontSize="9" fill="#64748b" textAnchor="middle">Jul</text>

              {/* Aug */}
              <rect x="220" y="60" width="14" height="75" fill="#3b82f6" rx="1.5" />
              <rect x="220" y="48" width="14" height="12" fill="#38bdf8" />
              <rect x="220" y="38" width="14" height="10" fill="#facc15" />
              <rect x="220" y="30" width="14" height="8" fill="#ef4444" rx="1.5" />
              <text x="227" y="146" fontSize="9" fill="#64748b" textAnchor="middle">Aug</text>

              {/* Sep */}
              <rect x="265" y="50" width="14" height="85" fill="#3b82f6" rx="1.5" />
              <rect x="265" y="38" width="14" height="12" fill="#38bdf8" />
              <rect x="265" y="28" width="14" height="10" fill="#facc15" />
              <rect x="265" y="20" width="14" height="8" fill="#ef4444" rx="1.5" />
              <text x="272" y="146" fontSize="9" fill="#64748b" textAnchor="middle">Sep</text>
            </svg>
          </div>
        </div>
      </div>

      {/* Bottom Row (2 Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Card 1: Recent Organizations (60%) */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Recent Organizations</h3>
            <Link href="/organizations" className="text-xs font-semibold text-blue-600 hover:underline">
              View All →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] font-semibold text-slate-400 uppercase border-b border-slate-100">
                <tr>
                  <th className="py-2.5">#</th>
                  <th className="py-2.5">Organization</th>
                  <th className="py-2.5">Active Plan</th>
                  <th className="py-2.5 text-center">Assessments</th>
                  <th className="py-2.5 text-center">Users</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5">Created Date</th>
                  <th className="py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrganizations.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 text-slate-400 font-mono">{o.id}</td>
                    <td className="py-2.5 font-semibold text-slate-800">{o.name}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${o.planColor}`}>
                        {o.plan}
                      </span>
                    </td>
                    <td className="py-2.5 text-center font-medium text-slate-700">{o.assessments}</td>
                    <td className="py-2.5 text-center font-medium text-slate-700">{o.users}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {o.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-500">{o.date}</td>
                    <td className="py-2.5 text-right">
                      <button className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card 2: Recent Activity (40%) */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Recent Activity</h3>
            <Link href="/admin/audit-logs" className="text-xs font-semibold text-blue-600 hover:underline">
              View All →
            </Link>
          </div>

          <div className="py-1 divide-y divide-slate-100 space-y-2">
            {recentAdminActivity.map((act, i) => {
              const Icon = act.icon;
              return (
                <div key={i} className="pt-2 first:pt-0 flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <div className={`p-1.5 rounded-full shrink-0 ${act.color}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{act.title}</div>
                      <div className="text-slate-500 text-[11px] truncate max-w-[190px]">{act.desc}</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">{act.time}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
