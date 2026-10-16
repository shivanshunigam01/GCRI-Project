"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { dashboardService } from "@/services/dashboard.service";
import { StatCard } from "@/components/shared/StatCard";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setIsMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  // Integrate live data with design spec constants
  const totalAssessments = data?.stats?.totalAssessments || 12;
  const inProgress = data?.stats?.inProgressAssessments || 5;
  const completed = data?.stats?.completedAssessments || 6;
  const findingsCount = data?.stats?.totalFindings || 3;
  const organizationsCount = data?.stats?.assignedOrganizations || 8;
  const overallCompletion = data?.overallCompletionPercentage || 64;

  const overviewBars = [
    {
      month: "Apr",
      x1: 50,
      x2: 68,
      centerX: 67,
      compHeight: 30,
      compY: 110,
      progHeight: 45,
      progY: 95,
      progFill: "#94a3b8",
      progOpacity: 0.6,
      lineY: 88,
    },
    {
      month: "May",
      x1: 100,
      x2: 118,
      centerX: 117,
      compHeight: 10,
      compY: 130,
      progHeight: 60,
      progY: 80,
      progFill: "#3b82f6",
      progOpacity: 1,
      lineY: 74,
    },
    {
      month: "Jun",
      x1: 150,
      x2: 168,
      centerX: 167,
      compHeight: 25,
      compY: 115,
      progHeight: 65,
      progY: 75,
      progFill: "#94a3b8",
      progOpacity: 0.6,
      lineY: 68,
    },
    {
      month: "Jul",
      x1: 200,
      x2: 218,
      centerX: 217,
      compHeight: 15,
      compY: 125,
      progHeight: 50,
      progY: 90,
      progFill: "#3b82f6",
      progOpacity: 1,
      lineY: 84,
    },
    {
      month: "Aug",
      x1: 250,
      x2: 268,
      centerX: 267,
      compHeight: 25,
      compY: 115,
      progHeight: 75,
      progY: 65,
      progFill: "#94a3b8",
      progOpacity: 0.6,
      lineY: 58,
    },
    {
      month: "Sep",
      x1: 300,
      x2: 318,
      centerX: 317,
      compHeight: 55,
      compY: 85,
      progHeight: 70,
      progY: 70,
      progFill: "#3b82f6",
      progOpacity: 1,
      lineY: 62,
    },
  ];

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
        <StatCard
          label="Total Assessments"
          value={totalAssessments}
          trend="▲ +2 this month"
          trendType="up"
          icon={FileCheck2}
          theme="blue"
          delay={0}
        />
        <StatCard
          label="In Progress"
          value={inProgress}
          trend="↑ +1 this week"
          trendType="neutral"
          icon={Clock}
          theme="sky"
          delay={70}
        />
        <StatCard
          label="Completed"
          value={completed}
          trend="↑ +3 this month"
          trendType="up"
          icon={CheckCircle2}
          theme="emerald"
          delay={140}
        />
        <StatCard
          label="Findings"
          value={findingsCount}
          trend="⚑ Needs Attention"
          trendType="down"
          icon={AlertTriangle}
          theme="rose"
          delay={210}
        />
        <StatCard
          label="Organizations"
          value={organizationsCount}
          trend="Active Clients"
          icon={Building2}
          theme="purple"
          delay={280}
        />
      </div>

      {/* Middle Row (3 Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Card 1: Assessment Progress */}
        <div className="lg:col-span-4 group relative overflow-hidden bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 flex flex-col justify-between">
          <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Assessment Progress</h3>
            <button className="text-xs text-slate-500 flex items-center gap-1 border border-slate-200 px-2 py-1 rounded-md bg-slate-50 hover:bg-slate-100 transition-colors">
              Last 6 Months <ChevronDown className="h-3 w-3" />
            </button>
          </div>

          <div className="py-4 flex items-center justify-around">
            {/* SVG Donut with Circle Sweep Animation */}
            <div className="relative w-36 h-36 flex items-center justify-center group/donut">
              <svg className="w-full h-full -rotate-90 transition-transform duration-500 group-hover/donut:scale-105" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle cx="50" cy="50" r="38" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                {/* Completed Arc (Green) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="12"
                  strokeDasharray="238.7"
                  strokeDashoffset={isMounted ? 238.7 * (1 - 6 / 12) : 238.7}
                  strokeLinecap="round"
                  style={{
                    transition: "stroke-dashoffset 1.3s cubic-bezier(0.16, 1, 0.3, 1) 0.15s",
                  }}
                  className="hover:stroke-[#059669] transition-colors"
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
                  strokeDashoffset={isMounted ? 238.7 * (1 - 5 / 12) : 238.7}
                  strokeLinecap="round"
                  className="opacity-80 hover:opacity-100 hover:stroke-[#2563eb] transition-all"
                  style={{
                    transition: "stroke-dashoffset 1.3s cubic-bezier(0.16, 1, 0.3, 1) 0.3s",
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center transition-transform duration-300 group-hover/donut:scale-105">
                <span className="text-2xl font-extrabold text-slate-900">
                  <AnimatedNumber value={overallCompletion} suffix="%" delay={150} />
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Overall Completion</span>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-6 group/legend cursor-default">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 group-hover/legend:scale-125 transition-transform" />
                  <span className="text-slate-600 group-hover/legend:text-slate-900 transition-colors">Completed</span>
                </div>
                <span className="font-bold text-slate-900 tabular-nums">
                  <AnimatedNumber value={6} delay={200} />
                </span>
              </div>
              <div className="flex items-center justify-between gap-6 group/legend cursor-default">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500 group-hover/legend:scale-125 transition-transform" />
                  <span className="text-slate-600 group-hover/legend:text-slate-900 transition-colors">In Progress</span>
                </div>
                <span className="font-bold text-slate-900 tabular-nums">
                  <AnimatedNumber value={5} delay={250} />
                </span>
              </div>
              <div className="flex items-center justify-between gap-6 group/legend cursor-default">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300 group-hover/legend:scale-125 transition-transform" />
                  <span className="text-slate-600 group-hover/legend:text-slate-900 transition-colors">Not Started</span>
                </div>
                <span className="font-bold text-slate-900 tabular-nums">
                  <AnimatedNumber value={1} delay={300} />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Pillar Performance */}
        <div className="lg:col-span-4 group relative overflow-hidden bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 flex flex-col justify-between">
          <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Pillar Performance</h3>
            <Link href="/admin/frameworks" className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              View Details →
            </Link>
          </div>

          <div className="py-2 space-y-2.5">
            {pillarPerformance.map((p, idx) => (
              <div key={p.name} className="space-y-1 group/pillar cursor-default">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 font-medium truncate max-w-[200px] group-hover/pillar:text-slate-950 transition-colors">{p.name}</span>
                  <span className="font-bold text-slate-900 text-[11px] tabular-nums">
                    <AnimatedNumber value={p.percentage} suffix="%" delay={100 + idx * 40} />
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden p-0.25">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-1000 ease-out group-hover/pillar:brightness-110"
                    style={{
                      width: isMounted ? `${p.percentage}%` : "0%",
                      transitionDelay: `${120 + idx * 60}ms`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: Recent Activity */}
        <div className="lg:col-span-4 group relative overflow-hidden bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 flex flex-col justify-between">
          <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Recent Activity</h3>
            <Link href="/admin/audit-logs" className="text-xs font-semibold text-blue-600 hover:underline">
              View All →
            </Link>
          </div>

          <div className="py-1 divide-y divide-slate-100 space-y-1.5">
            {recentActivity.map((act, i) => (
              <div key={i} className="pt-2 first:pt-0 flex items-start justify-between gap-3 text-xs -mx-1.5 px-1.5 py-1 rounded-lg hover:bg-slate-50/90 transition-colors cursor-pointer">
                <div className="flex items-start gap-2.5">
                  <div className={`p-1.5 rounded-lg shrink-0 ${act.color}`}>
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{act.title}</div>
                    <div className="text-slate-500 text-[11px] truncate max-w-[170px]">{act.subtitle}</div>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap pt-0.5">{act.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lower Middle Row (3 Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Card 1: Assessments Overview (Stacked Bar Chart + Animated Trend Line) */}
        <div className="lg:col-span-5 group relative overflow-hidden bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 flex flex-col justify-between">
          <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-sm font-bold text-slate-900">Assessments Overview</h3>
            <button className="text-xs text-slate-500 flex items-center gap-1 border border-slate-200 px-2 py-1 rounded-md bg-slate-50 hover:bg-slate-100 transition-colors">
              Last 6 Months <ChevronDown className="h-3 w-3" />
            </button>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3.5 text-xs mb-3 flex-wrap">
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
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="h-0.75 w-3.5 rounded-full bg-blue-600" />
              <span className="text-slate-600 text-[11px] font-medium">Trend</span>
            </div>
          </div>

          {/* SVG Stacked Bar Chart with Animated Bars & Line */}
          <div className="h-44 w-full relative">
            <svg viewBox="0 0 350 160" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="trendAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                </linearGradient>
              </defs>

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

              {/* Area fill under trend line */}
              <path
                d="M 67 88 C 92 88, 92 74, 117 74 C 142 74, 142 68, 167 68 C 192 68, 192 84, 217 84 C 242 84, 242 58, 267 58 C 292 58, 292 62, 317 62 L 317 140 L 67 140 Z"
                fill="url(#trendAreaGrad)"
                style={{
                  opacity: isMounted ? 1 : 0,
                  transition: "opacity 1.5s ease-out 0.4s",
                }}
              />

              {/* Month Bars with growth animation from baseline */}
              {overviewBars.map((b, idx) => (
                <g key={b.month} className="group/bar cursor-pointer">
                  {/* Completed Green Bar */}
                  <rect
                    x={b.x1}
                    y={isMounted ? b.compY : 140}
                    width="16"
                    height={isMounted ? b.compHeight : 0}
                    fill="#10b981"
                    rx="2"
                    className="transition-all duration-300 group-hover/bar:brightness-110"
                    style={{
                      transition: "height 0.85s cubic-bezier(0.16, 1, 0.3, 1), y 0.85s cubic-bezier(0.16, 1, 0.3, 1)",
                      transitionDelay: `${idx * 80}ms`,
                    }}
                  />
                  {/* Secondary Bar (Blue / Grey) */}
                  <rect
                    x={b.x2}
                    y={isMounted ? b.progY : 140}
                    width="16"
                    height={isMounted ? b.progHeight : 0}
                    fill={b.progFill}
                    opacity={b.progOpacity}
                    rx="2"
                    className="transition-all duration-300 group-hover/bar:brightness-110"
                    style={{
                      transition: "height 0.85s cubic-bezier(0.16, 1, 0.3, 1), y 0.85s cubic-bezier(0.16, 1, 0.3, 1)",
                      transitionDelay: `${idx * 80 + 40}ms`,
                    }}
                  />
                  {/* Month Label */}
                  <text
                    x={b.centerX}
                    y="153"
                    fontSize="10"
                    fill="#64748b"
                    textAnchor="middle"
                    className="group-hover/bar:fill-slate-900 group-hover/bar:font-semibold transition-colors"
                  >
                    {b.month}
                  </text>
                </g>
              ))}

              {/* Animated Trend Line */}
              <path
                d="M 67 88 C 92 88, 92 74, 117 74 C 142 74, 142 68, 167 68 C 192 68, 192 84, 217 84 C 242 84, 242 58, 267 58 C 292 58, 292 62, 317 62"
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="400"
                strokeDashoffset={isMounted ? 0 : 400}
                style={{
                  transition: "stroke-dashoffset 1.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s",
                }}
              />

              {/* Interactive Trend Dots */}
              {overviewBars.map((b, idx) => (
                <circle
                  key={`dot-${b.month}`}
                  cx={b.centerX}
                  cy={b.lineY}
                  r={isMounted ? 3.5 : 0}
                  fill="#ffffff"
                  stroke="#2563eb"
                  strokeWidth="2.5"
                  className="transition-all duration-300 hover:scale-150 cursor-pointer drop-shadow-xs hover:fill-blue-600"
                  style={{
                    transition: "r 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s ease-out",
                    transitionDelay: `${700 + idx * 80}ms`,
                  }}
                />
              ))}
            </svg>
          </div>
        </div>

        {/* Card 2: Assessment Types (Donut with Circle Sweep) */}
        <div className="lg:col-span-3 group relative overflow-hidden bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 flex flex-col justify-between">
          <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-sky-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <div className="pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Assessment Types</h3>
          </div>

          <div className="py-2 flex flex-col items-center justify-center">
            {/* SVG Donut */}
            <div className="relative w-32 h-32 flex items-center justify-center group/donut">
              <svg className="w-full h-full -rotate-90 transition-transform duration-500 group-hover/donut:scale-105" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="38" fill="none" stroke="#f1f5f9" strokeWidth="14" />
                {/* Full (Navy) 58% */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#1e3a8a"
                  strokeWidth="14"
                  strokeDasharray="238.7"
                  strokeDashoffset={isMounted ? 238.7 * (1 - 0.58) : 238.7}
                  strokeLinecap="round"
                  style={{
                    transition: "stroke-dashoffset 1.3s cubic-bezier(0.16, 1, 0.3, 1) 0.2s",
                  }}
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
                  strokeDashoffset={isMounted ? 238.7 * (1 - 0.42) : 238.7}
                  strokeLinecap="round"
                  className="rotate-180 origin-center"
                  style={{
                    transition: "stroke-dashoffset 1.3s cubic-bezier(0.16, 1, 0.3, 1) 0.35s",
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center transition-transform duration-300 group-hover/donut:scale-105">
                <span className="text-2xl font-extrabold text-slate-900">
                  <AnimatedNumber value={12} delay={250} />
                </span>
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
        <div className="lg:col-span-4 group relative overflow-hidden bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 flex flex-col justify-between">
          <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-rose-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Upcoming Tasks</h3>
            <Link href="/assessments" className="text-xs font-semibold text-blue-600 hover:underline">
              View All →
            </Link>
          </div>

          <div className="py-1 divide-y divide-slate-100 space-y-1.5">
            {upcomingTasks.map((t, idx) => (
              <div key={idx} className="pt-2 first:pt-0 flex items-center justify-between gap-3 text-xs -mx-1.5 px-1.5 py-1 rounded-lg hover:bg-slate-50/90 transition-colors cursor-pointer">
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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setIsMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const adminMonthlyBars = [
    {
      month: "Apr",
      x: 40,
      centerX: 47,
      lineY: 65,
      bars: [
        { y: 90, h: 45, fill: "#3b82f6", rx: 1.5 },
        { y: 80, h: 10, fill: "#38bdf8", rx: 0 },
        { y: 70, h: 10, fill: "#facc15", rx: 0 },
        { y: 65, h: 5, fill: "#ef4444", rx: 1.5 },
      ],
    },
    {
      month: "May",
      x: 85,
      centerX: 92,
      lineY: 52,
      bars: [
        { y: 80, h: 55, fill: "#3b82f6", rx: 1.5 },
        { y: 68, h: 12, fill: "#38bdf8", rx: 0 },
        { y: 58, h: 10, fill: "#facc15", rx: 0 },
        { y: 52, h: 6, fill: "#ef4444", rx: 1.5 },
      ],
    },
    {
      month: "Jun",
      x: 130,
      centerX: 137,
      lineY: 42,
      bars: [
        { y: 70, h: 65, fill: "#3b82f6", rx: 1.5 },
        { y: 58, h: 12, fill: "#38bdf8", rx: 0 },
        { y: 48, h: 10, fill: "#facc15", rx: 0 },
        { y: 42, h: 6, fill: "#ef4444", rx: 1.5 },
      ],
    },
    {
      month: "Jul",
      x: 175,
      centerX: 182,
      lineY: 37,
      bars: [
        { y: 65, h: 70, fill: "#3b82f6", rx: 1.5 },
        { y: 52, h: 13, fill: "#38bdf8", rx: 0 },
        { y: 42, h: 10, fill: "#facc15", rx: 0 },
        { y: 37, h: 5, fill: "#ef4444", rx: 1.5 },
      ],
    },
    {
      month: "Aug",
      x: 220,
      centerX: 227,
      lineY: 30,
      bars: [
        { y: 60, h: 75, fill: "#3b82f6", rx: 1.5 },
        { y: 48, h: 12, fill: "#38bdf8", rx: 0 },
        { y: 38, h: 10, fill: "#facc15", rx: 0 },
        { y: 30, h: 8, fill: "#ef4444", rx: 1.5 },
      ],
    },
    {
      month: "Sep",
      x: 265,
      centerX: 272,
      lineY: 20,
      bars: [
        { y: 50, h: 85, fill: "#3b82f6", rx: 1.5 },
        { y: 38, h: 12, fill: "#38bdf8", rx: 0 },
        { y: 28, h: 10, fill: "#facc15", rx: 0 },
        { y: 20, h: 8, fill: "#ef4444", rx: 1.5 },
      ],
    },
  ];

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
        {adminStats.map((st, idx) => {
          const Icon = st.icon;
          return (
            <div
              key={st.label}
              className="group relative overflow-hidden bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_12px_24px_-6px_rgba(15,23,42,0.08),0_4px_8px_-2px_rgba(15,23,42,0.03)] hover:border-slate-300 select-none flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${st.color} shadow-2xs transition-all duration-300 ease-out group-hover:scale-105 group-hover:ring-4 group-hover:ring-slate-100`}
                >
                  <Icon className="h-6 w-6 shrink-0 transition-transform duration-300 ease-out" strokeWidth={1.85} />
                </div>
                <div className="min-w-0">
                  <div className="text-2xl font-extrabold text-slate-900 leading-tight tracking-tight group-hover:text-slate-950 transition-colors">
                    <AnimatedNumber value={st.value} delay={idx * 35} />
                  </div>
                  <div className="text-xs font-medium text-slate-500 truncate mt-0.5 group-hover:text-slate-600 transition-colors">
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
        <div className="lg:col-span-4 group relative overflow-hidden bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 flex flex-col justify-between">
          <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <div className="pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Assessments by Status</h3>
          </div>

          <div className="py-2 flex items-center justify-around">
            {/* SVG Donut with Circle Sweep */}
            <div className="relative w-32 h-32 flex items-center justify-center group/donut">
              <svg className="w-full h-full -rotate-90 transition-transform duration-500 group-hover/donut:scale-105" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="38" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                {/* Completed (Green) 39% */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="12"
                  strokeDasharray="238.7"
                  strokeDashoffset={isMounted ? 238.7 * (1 - 0.39) : 238.7}
                  strokeLinecap="round"
                  style={{
                    transition: "stroke-dashoffset 1.3s cubic-bezier(0.16, 1, 0.3, 1) 0.15s",
                  }}
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
                  strokeDashoffset={isMounted ? 238.7 * (1 - 0.29) : 238.7}
                  strokeLinecap="round"
                  className="rotate-90 origin-center"
                  style={{
                    transition: "stroke-dashoffset 1.3s cubic-bezier(0.16, 1, 0.3, 1) 0.3s",
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center transition-transform duration-300 group-hover/donut:scale-105">
                <span className="text-xl font-bold text-slate-900 tabular-nums">
                  <AnimatedNumber value={62} delay={200} />
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Total</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-4 group/item cursor-default">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 group-hover/item:scale-125 transition-transform" />
                  <span className="text-slate-600 group-hover/item:text-slate-900 transition-colors text-[11px]">Completed</span>
                </div>
                <span className="font-semibold text-slate-900 text-[11px]">24 (39%)</span>
              </div>
              <div className="flex items-center justify-between gap-4 group/item cursor-default">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500 group-hover/item:scale-125 transition-transform" />
                  <span className="text-slate-600 group-hover/item:text-slate-900 transition-colors text-[11px]">In Progress</span>
                </div>
                <span className="font-semibold text-slate-900 text-[11px]">18 (29%)</span>
              </div>
              <div className="flex items-center justify-between gap-4 group/item cursor-default">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500 group-hover/item:scale-125 transition-transform" />
                  <span className="text-slate-600 group-hover/item:text-slate-900 transition-colors text-[11px]">Not Started</span>
                </div>
                <span className="font-semibold text-slate-900 text-[11px]">16 (26%)</span>
              </div>
              <div className="flex items-center justify-between gap-4 group/item cursor-default">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-500 group-hover/item:scale-125 transition-transform" />
                  <span className="text-slate-600 group-hover/item:text-slate-900 transition-colors text-[11px]">Overdue</span>
                </div>
                <span className="font-semibold text-slate-900 text-[11px]">4 (6%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Subscription Plan Distribution */}
        <div className="lg:col-span-4 group relative overflow-hidden bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 flex flex-col justify-between">
          <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-amber-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <div className="pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Subscription Plan Distribution</h3>
          </div>

          <div className="py-2 flex items-center justify-around">
            {/* SVG Donut with Circle Sweep */}
            <div className="relative w-32 h-32 flex items-center justify-center group/donut">
              <svg className="w-full h-full -rotate-90 transition-transform duration-500 group-hover/donut:scale-105" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="38" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                {/* Bronze (Amber/Brown) 33% */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#b45309"
                  strokeWidth="12"
                  strokeDasharray="238.7"
                  strokeDashoffset={isMounted ? 238.7 * (1 - 0.33) : 238.7}
                  strokeLinecap="round"
                  style={{
                    transition: "stroke-dashoffset 1.3s cubic-bezier(0.16, 1, 0.3, 1) 0.15s",
                  }}
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
                  strokeDashoffset={isMounted ? 238.7 * (1 - 0.42) : 238.7}
                  strokeLinecap="round"
                  className="rotate-120 origin-center"
                  style={{
                    transition: "stroke-dashoffset 1.3s cubic-bezier(0.16, 1, 0.3, 1) 0.3s",
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center transition-transform duration-300 group-hover/donut:scale-105">
                <span className="text-xl font-bold text-slate-900 tabular-nums">
                  <AnimatedNumber value={86} delay={200} />
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Total</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between gap-6 group/item cursor-default">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-700 group-hover/item:scale-125 transition-transform" />
                  <span className="text-slate-600 group-hover/item:text-slate-900 transition-colors text-[11px]">Bronze</span>
                </div>
                <span className="font-semibold text-slate-900 text-[11px]">28 (33%)</span>
              </div>
              <div className="flex items-center justify-between gap-6 group/item cursor-default">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-500 group-hover/item:scale-125 transition-transform" />
                  <span className="text-slate-600 group-hover/item:text-slate-900 transition-colors text-[11px]">Silver</span>
                </div>
                <span className="font-semibold text-slate-900 text-[11px]">36 (42%)</span>
              </div>
              <div className="flex items-center justify-between gap-6 group/item cursor-default">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400 group-hover/item:scale-125 transition-transform" />
                  <span className="text-slate-600 group-hover/item:text-slate-900 transition-colors text-[11px]">Gold</span>
                </div>
                <span className="font-semibold text-slate-900 text-[11px]">22 (26%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Assessments Created (Last 6 Months) with Animated Stacked Bars & Trend Line */}
        <div className="lg:col-span-4 group relative overflow-hidden bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 flex flex-col justify-between">
          <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <div className="pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Assessments Created (Last 6 Months)</h3>
          </div>

          <div className="h-40 w-full mt-2 relative">
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

              {/* Stacked bars for 6 months with animated growth */}
              {adminMonthlyBars.map((m, idx) => (
                <g key={m.month} className="group/adminbar cursor-pointer">
                  {m.bars.map((b, bIdx) => (
                    <rect
                      key={bIdx}
                      x={m.x}
                      y={isMounted ? b.y : 135}
                      width={14}
                      height={isMounted ? b.h : 0}
                      fill={b.fill}
                      rx={b.rx}
                      className="transition-all duration-300 group-hover/adminbar:brightness-110"
                      style={{
                        transition: "height 0.85s cubic-bezier(0.16, 1, 0.3, 1), y 0.85s cubic-bezier(0.16, 1, 0.3, 1)",
                        transitionDelay: `${idx * 75 + bIdx * 20}ms`,
                      }}
                    />
                  ))}
                  <text
                    x={m.centerX}
                    y="146"
                    fontSize="9"
                    fill="#64748b"
                    textAnchor="middle"
                    className="group-hover/adminbar:fill-slate-900 group-hover/adminbar:font-semibold transition-colors"
                  >
                    {m.month}
                  </text>
                </g>
              ))}

              {/* Animated Trend Line across peak points */}
              <path
                d="M 47 65 C 69 65, 69 52, 92 52 C 114 52, 114 42, 137 42 C 159 42, 159 37, 182 37 C 204 37, 204 30, 227 30 C 249 30, 249 20, 272 20"
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="350"
                strokeDashoffset={isMounted ? 0 : 350}
                style={{
                  transition: "stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1) 0.3s",
                }}
              />

              {/* Interactive Trend Dots */}
              {adminMonthlyBars.map((m, idx) => (
                <circle
                  key={`adot-${m.month}`}
                  cx={m.centerX}
                  cy={m.lineY}
                  r={isMounted ? 3 : 0}
                  fill="#ffffff"
                  stroke="#2563eb"
                  strokeWidth="2"
                  className="transition-all duration-300 hover:scale-150 cursor-pointer drop-shadow-xs"
                  style={{
                    transition: "r 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s ease-out",
                    transitionDelay: `${650 + idx * 75}ms`,
                  }}
                />
              ))}
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
