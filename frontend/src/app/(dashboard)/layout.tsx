"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Home,
  Building2,
  FileCheck2,
  Sliders,
  Shield,
  FileText,
  Users,
  CreditCard,
  Settings,
  Bell,
  Search,
  ChevronRight,
  ChevronDown,
  HelpCircle,
  FolderLock,
  Layers,
  Award,
  Lock,
  History,
  SlidersHorizontal,
  LogOut,
  UserCheck,
  Menu,
  X,
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout, isAdmin, isSuperAdmin } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Strict Security: Role is determined strictly by the verified JWT session user
  const activeRoleView: "Admin" | "Auditor" = (user?.role === "SuperAdmin" || user?.role === "Admin") ? "Admin" : "Auditor";

  // Redirect non-authenticated users to login
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Close mobile sidebar on route transition
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);


  const auditorNavItems = [
    { label: "Dashboard", href: "/dashboard", icon: Home, active: pathname === "/dashboard" },
    { label: "Assessments", href: "/assessments", icon: FileCheck2, hasChevron: true },
    { label: "Organizations", href: "/organizations", icon: Building2 },
    { label: "Framework", href: "/admin/frameworks", icon: Sliders, hasChevron: true },
    { label: "Evidence", href: "/evidence", icon: FolderLock },
    { label: "Findings", href: "/assessments/findings", icon: Shield },
    { label: "Reports", href: "/reports", icon: FileText },
  ];

  const auditorAdminNavItems = [
    { label: "Subscriptions", href: "/subscriptions", icon: CreditCard },
    { label: "Audit Logs", href: "/admin/audit-logs", icon: History },
    { label: "Settings", href: "/settings/profile", icon: Settings },
  ];

  // SuperAdmin sees global governance; Org Admin sees tenant items
  const adminNavItems = isSuperAdmin
    ? [
        { label: "Dashboard", href: "/dashboard", icon: Home, active: pathname === "/dashboard" },
        { label: "Organizations", href: "/organizations", icon: Building2 },
        { label: "Users & Admins", href: "/admin/assessors", icon: Users },
        { label: "Assessments", href: "/assessments", icon: FileCheck2 },
        { label: "Framework Versions", href: "/admin/frameworks", icon: Layers },
        { label: "Auditor Mappings", href: "/admin/auditor-mappings", icon: SlidersHorizontal },
        { label: "Evidence", href: "/evidence", icon: FolderLock },
        { label: "Reports", href: "/reports", icon: FileText },
        { label: "Subscriptions", href: "/subscriptions", icon: CreditCard },
        { label: "Audit Logs", href: "/admin/audit-logs", icon: History },
        { label: "System Settings", href: "/settings/security", icon: Settings },
      ]
    : [
        { label: "Dashboard", href: "/dashboard", icon: Home, active: pathname === "/dashboard" },
        { label: "Organization", href: "/organizations", icon: Building2 },
        { label: "Assessors / Team", href: "/admin/assessors", icon: Users },
        { label: "Assessments", href: "/assessments", icon: FileCheck2 },
        { label: "Evidence", href: "/evidence", icon: FolderLock },
        { label: "Reports", href: "/reports", icon: FileText },
        { label: "Audit Logs", href: "/admin/audit-logs", icon: History },
        { label: "Settings", href: "/settings/profile", icon: Settings },
      ];

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#f8fafc] flex">
      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 z-40 backdrop-blur-xs lg:hidden transition-opacity duration-300"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar - Desktop static column + Mobile slide-over drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] h-screen bg-[#0c162c] text-slate-300 flex flex-col shrink-0 border-r border-[#152342] select-none transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="px-5 py-4 border-b border-[#18274a]/60 shrink-0 flex items-center justify-between">
          <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex items-center">
            <img src="/logo.png" alt="GRAICE Logo" className="h-9 w-auto max-w-[190px] object-contain" />
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items - Perfectly sized to fit viewport without scrollbar */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden overscroll-contain">
          {activeRoleView === "Auditor" ? (
            <>
              <nav className="space-y-0.5">
                {auditorNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.active || pathname === item.href;
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`group flex items-center justify-between px-3 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-150 ${
                        isActive
                          ? "bg-gradient-to-r from-teal-500 via-cyan-600 to-blue-600 text-white font-semibold shadow-md shadow-cyan-900/30"
                          : "text-slate-100 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-[18px] w-[18px] shrink-0 text-white" strokeWidth={1.85} />
                        <span className="tracking-wide">{item.label}</span>
                      </div>
                      {item.hasChevron && (
                        <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-white transition-colors" />
                      )}
                    </Link>
                  );
                })}
              </nav>

              <div className="pt-2">
                <div className="px-3 mb-1.5 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                  Administration
                </div>
                <nav className="space-y-0.5">
                  {auditorAdminNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      pathname === item.href ||
                      (item.label === "Users" &&
                        (pathname.startsWith("/admin/assessors") || pathname.startsWith("/admin/users")));
                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-150 ${
                          isActive
                            ? "bg-gradient-to-r from-teal-500 via-cyan-600 to-blue-600 text-white font-semibold shadow-md shadow-cyan-900/30"
                            : "text-slate-100 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        <Icon className="h-[18px] w-[18px] shrink-0 text-white" strokeWidth={1.85} />
                        <span className="tracking-wide">{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

            </>
          ) : (
            <nav className="space-y-0.5">
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.active ||
                  pathname === item.href ||
                  (item.label === "Users" &&
                    (pathname.startsWith("/admin/assessors") || pathname.startsWith("/admin/users")));
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`group flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13.5px] font-medium transition-all duration-150 ${
                      isActive
                        ? "bg-gradient-to-r from-teal-500 via-cyan-600 to-blue-600 text-white font-semibold shadow-md shadow-cyan-900/30"
                        : "text-slate-100 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0 text-white" strokeWidth={1.85} />
                    <span className="tracking-wide">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        {/* Top Navbar - Fixed at top, never scrolls */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 z-30">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Hamburger Button for Mobile */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition shrink-0"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Search Box */}
            <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-md hidden sm:block">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={
                  activeRoleView === "Admin"
                    ? "Search users, organizations, assessments, controls..."
                    : "Search organizations, assessments, controls..."
                }
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Right Action Icons & User Profile */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">

            {/* Notification Bell with Red Badge */}
            <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                3
              </span>
            </button>

            {/* Help Icon - hidden on very small screens */}
            <button className="hidden sm:flex p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition">
              <HelpCircle className="h-5 w-5" />
            </button>

            {/* User Avatar & Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 sm:gap-3 pl-1 sm:pl-2 pr-1 py-1 rounded-lg hover:bg-slate-100 transition text-left"
              >
                <img
                  src="/avatar.jpg"
                  alt="Piyush Napit"
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-full object-cover border border-slate-200"
                />
                <div className="hidden md:block">
                  <div className="text-sm font-semibold text-slate-900 leading-tight">
                    {user?.name || "Piyush Napit"}
                  </div>
                  <div className="text-xs text-slate-500 leading-tight">
                    {activeRoleView === "Admin" ? "Super Admin" : "Auditor"}
                  </div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-medium text-slate-500">Signed in as</p>
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {user?.email || "auditor@graice.io"}
                    </p>
                  </div>
                  <Link
                    href="/settings/profile"
                    onClick={() => setShowProfileMenu(false)}
                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Profile Settings
                  </Link>
                  <Link
                    href="/settings/security"
                    onClick={() => setShowProfileMenu(false)}
                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Security &amp; 2FA
                  </Link>
                  <div className="border-t border-slate-100 my-1" />
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Workspace Canvas */}
        <main
          className={`flex-1 bg-[#f8fafc] ${
            pathname?.includes("/admin/assessors") ||
            pathname?.includes("/admin/users") ||
            pathname?.includes("/admin/auditor-mappings") ||
            pathname?.includes("/organizations")
              ? "p-4 sm:p-5 overflow-hidden flex flex-col"
              : "p-4 sm:p-6 lg:p-8 overflow-y-auto"
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
