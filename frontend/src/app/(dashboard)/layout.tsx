"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  ShieldCheck,
  LayoutDashboard,
  Building2,
  PlusCircle,
  Users,
  KeyRound,
  LogOut,
  Menu,
  X,
  Search,
  Bell,
  ChevronRight,
  Info,
  Sparkles,
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAdmin, isCompanyLead, isAssessor, companyName } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showFrameworkModal, setShowFrameworkModal] = useState(false);

  const getNavDetails = () => {
    if (pathname === "/companies") {
      return {
        section: "Governance",
        category: "Corporate Entities",
        title: "Organizations Directory",
      };
    }
    if (pathname.startsWith("/companies/")) {
      return {
        section: "Organizations",
        category: "Compliance Posture",
        title: "Organization Profile",
      };
    }
    if (pathname === "/users") {
      return {
        section: "Administration",
        category: "Access & Roles",
        title: "Team & Users Directory",
      };
    }
    if (pathname === "/settings/profile") {
      return {
        section: "Settings",
        category: "Identity",
        title: "Account Profile",
      };
    }
    if (pathname === "/settings/security") {
      return {
        section: "Settings",
        category: "Credentials",
        title: "Password & Security",
      };
    }
    if (pathname === "/settings/mfa") {
      return {
        section: "Settings",
        category: "Authentication",
        title: "Two-Factor Auth (MFA)",
      };
    }
    return {
      section: "Platform",
      category: "Supervision",
      title: "Executive Dashboard",
    };
  };

  const navDetails = getNavDetails();

  // During SSR or when role is Admin, default to Platform Admin views
  const isPlatformAdmin = !user || isAdmin;

  // STRICT RULE: Only render navigation links for which backend APIs are completed!
  const navigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    ...(isPlatformAdmin
      ? [
          {
            name: "Organizations",
            href: "/companies",
            icon: Building2,
          },
        ]
      : [
          {
            name: "My Organization",
            href: "/companies",
            icon: Building2,
          },
        ]),
    {
      name: "Account Settings",
      href: "/settings/profile",
      icon: KeyRound,
    },
  ];

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="h-screen bg-[#fafafa] flex overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-zinc-950/60 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Deep Obsidian Sidebar (Stitch Design Specification #09090b) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#09090b] border-r border-zinc-800/80 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Brand Header */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-zinc-800/70">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-zinc-950 shadow-sm">
                <ShieldCheck className="w-4 h-4 text-zinc-950" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-tight text-white leading-none">
                  GRAICE
                </span>
                <span className="text-[10px] text-zinc-400 font-medium tracking-wide mt-1">
                  Responsible AI Platform
                </span>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-zinc-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links (Strictly completed backend routes only) */}
          <div className="px-3 py-4 flex-1">
            <div
              suppressHydrationWarning
              className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500"
            >
              {isPlatformAdmin ? "Platform Governance" : isCompanyLead ? "Company Workspace" : "Assessor Workspace"}
            </div>
            <nav className="space-y-1">
              {navigation.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                      isActive
                        ? "bg-zinc-800/90 text-white font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
                        : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {isActive && (
                        <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                      )}
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          isActive ? "text-emerald-400" : "text-zinc-400 group-hover:text-zinc-200"
                        }`}
                      />
                      <span>{item.name}</span>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* User Profile Bar */}
        <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/80">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700/80 transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative">
                <div
                  suppressHydrationWarning
                  className="w-8 h-8 rounded-full bg-gradient-to-tr from-zinc-800 to-zinc-700 text-white font-bold flex items-center justify-center text-xs shadow-xs border border-zinc-700"
                >
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : "AD"}
                </div>
                <span
                  suppressHydrationWarning
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-zinc-950 ${
                    isPlatformAdmin ? "bg-emerald-400 ring-2 ring-emerald-500/20" : isCompanyLead ? "bg-blue-400" : "bg-zinc-400"
                  }`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p suppressHydrationWarning className="text-xs font-semibold text-white truncate">
                  {user?.name || "System Administrator"}
                </p>
                <p suppressHydrationWarning className="text-[10px] font-mono text-zinc-400 truncate">
                  {isPlatformAdmin ? "Admin Role" : isCompanyLead ? "Company Lead" : "Assessor"}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800/80 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="lg:pl-64 flex flex-col flex-1 w-full min-w-0 h-screen overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 shrink-0 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-6 sm:px-8">
          {/* Left: Mobile trigger & Active Navigation Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-400 font-mono tracking-wider uppercase">
                <span>{navDetails.section}</span>
                <span className="text-zinc-300">/</span>
                <span className="text-zinc-600 font-semibold">{navDetails.category}</span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-zinc-950 tracking-tight leading-none mt-0.5">
                {navDetails.title}
              </h1>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-4">
            {/* Notification Bell with Badge */}
            <button
              type="button"
              className="relative p-2 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-600" />
            </button>

            {/* User Quick Info */}
            <div className="flex items-center gap-2 pl-2 border-l border-zinc-200">
              <div
                suppressHydrationWarning
                className="w-7 h-7 rounded-full bg-zinc-900 text-white font-bold flex items-center justify-center text-[10px]"
              >
                {user?.name ? user.name.slice(0, 2).toUpperCase() : "AD"}
              </div>
              <div className="hidden sm:block text-left">
                <p suppressHydrationWarning className="text-xs font-semibold text-zinc-900 leading-none">
                  {user?.name || "Administrator"}
                </p>
                <p suppressHydrationWarning className="text-[10px] text-zinc-500 font-mono mt-0.5">
                  {isPlatformAdmin ? "Admin Role" : isCompanyLead ? "Company Lead" : "Assessor"}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Route Body */}
        <main className="flex-1 flex flex-col min-h-0 w-full px-4 py-3 sm:px-6 sm:py-3.5 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* 7 Pillars Framework Modal */}
      {showFrameworkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
          <div className="bg-white border border-zinc-200 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-950">The 7 GRAICE Governance Pillars</h3>
                  <p className="text-[11px] text-zinc-500">Framework specification version 0.8.4</p>
                </div>
              </div>
              <button
                onClick={() => setShowFrameworkModal(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-zinc-700">
              <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-zinc-900 text-white font-mono text-[10px] flex items-center justify-center shrink-0">1</span>
                <div>
                  <p className="font-semibold text-zinc-950">Ethical Leadership & Accountability</p>
                  <p className="text-[11px] text-zinc-500">C-suite oversight, designated algorithmic risk committees, and liability allocation.</p>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-zinc-900 text-white font-mono text-[10px] flex items-center justify-center shrink-0">2</span>
                <div>
                  <p className="font-semibold text-zinc-950">Data Governance & Integrity</p>
                  <p className="text-[11px] text-zinc-500">Training dataset provenance, bias mitigation, consent enforcement, and quality gates.</p>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-zinc-900 text-white font-mono text-[10px] flex items-center justify-center shrink-0">3</span>
                <div>
                  <p className="font-semibold text-zinc-950">Purpose-Driven Innovation & Fairness</p>
                  <p className="text-[11px] text-zinc-500">Disparate impact analysis, protected attribute auditing, and demographic parity.</p>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-zinc-900 text-white font-mono text-[10px] flex items-center justify-center shrink-0">4</span>
                <div>
                  <p className="font-semibold text-zinc-950">Human-Centric Use & Safety</p>
                  <p className="text-[11px] text-zinc-500">Human-in-the-loop fallback controls, override procedures, and harm thresholds.</p>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-zinc-900 text-white font-mono text-[10px] flex items-center justify-center shrink-0">5</span>
                <div>
                  <p className="font-semibold text-zinc-950">Responsible Implementation & Robustness</p>
                  <p className="text-[11px] text-zinc-500">Adversarial testing, model degradation monitoring, and hallucination containment.</p>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-zinc-900 text-white font-mono text-[10px] flex items-center justify-center shrink-0">6</span>
                <div>
                  <p className="font-semibold text-zinc-950">AI Literacy & Workforce Readiness</p>
                  <p className="text-[11px] text-zinc-500">Staff competency certifications, prompt security guidelines, and user education.</p>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-zinc-900 text-white font-mono text-[10px] flex items-center justify-center shrink-0">7</span>
                <div>
                  <p className="font-semibold text-zinc-950">Transparency & Auditability</p>
                  <p className="text-[11px] text-zinc-500">Cryptographic audit trails, decision explainability, and regulatory compliance logs.</p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowFrameworkModal(false)}
                className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
