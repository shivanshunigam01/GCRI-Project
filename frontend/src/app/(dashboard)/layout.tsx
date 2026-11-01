"use client";

import React, { useState, useEffect, useRef } from "react";
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
  RefreshCw,
  Check,
} from "lucide-react";
import {
  DashboardScopeProvider,
  useDashboardScope,
} from "@/context/DashboardScopeContext";
import { DashboardShellContentSkeleton } from "@/components/shared/PageSkeletons";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { useApiLoading } from "@/context/ApiLoadingContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardScopeProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </DashboardScopeProvider>
  );
}

function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout, isSuperAdmin, isOrgAdmin, isAdmin } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Strict Security: Role is determined strictly by the verified JWT session user
  const activeRoleView: "Admin" | "Auditor" = isAdmin ? "Admin" : "Auditor";

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
    { label: "Organizations", href: "/organizations", icon: Building2 },
    { label: "Assessments", href: "/assessments", icon: FileCheck2 },
    { label: "Subscriptions", href: "/subscriptions", icon: CreditCard },
  ];

  const auditorSettingsNavItems = [
    { label: "Profile", href: "/settings/profile", icon: Settings },
    { label: "Security & MFA", href: "/settings/security", icon: Shield },
  ];

  // SuperAdmin sees global governance; Org Admin sees tenant-isolated items
  const adminNavItems = isSuperAdmin
    ? [
        { label: "Dashboard", href: "/dashboard", icon: Home, active: pathname === "/dashboard" },
        { label: "Organizations", href: "/organizations", icon: Building2 },
        { label: "Users & Admins", href: "/admin/users", icon: Users },
        { label: "Assessments", href: "/assessments", icon: FileCheck2 },
        { label: "Framework Versions", href: "/admin/frameworks", icon: Layers },
        { label: "Auditor Mappings", href: "/admin/auditor-mappings", icon: UserCheck },
        { label: "API Keys", href: "/admin/api-keys", icon: Lock },
        { label: "Subscriptions", href: "/subscriptions", icon: CreditCard },
        { label: "Audit Logs", href: "/admin/audit-logs", icon: History },
      ]
    : [
        { label: "Dashboard", href: "/dashboard", icon: Home, active: pathname === "/dashboard" },
        { label: "Organization", href: "/organizations", icon: Building2 },
        { label: "Assessors / Team", href: "/admin/users", icon: Users },
        { label: "Assessments", href: "/assessments", icon: FileCheck2 },
        { label: "Auditor Mappings", href: "/admin/auditor-mappings", icon: UserCheck },
        { label: "Subscriptions", href: "/subscriptions", icon: CreditCard },
        { label: "Audit Logs", href: "/admin/audit-logs", icon: History },
      ];

  const adminSettingsNavItems = [
    { label: "Profile", href: "/settings/profile", icon: Settings },
    { label: "Security & MFA", href: "/settings/security", icon: Shield },
    { label: "Webhooks", href: "/settings/webhooks", icon: SlidersHorizontal },
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
        <div className="px-4 py-5 border-b border-[#18274a]/60 shrink-0 flex items-center justify-between gap-2">
          <Link
            href="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="flex min-w-0 flex-1 items-center"
          >
            <BrandLogo variant="sidebar" />
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
                  const isActive = item.active || pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
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
                    </Link>
                  );
                })}
              </nav>

              <div className="pt-2">
                <div className="px-3 mb-1.5 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                  Settings
                </div>
                <nav className="space-y-0.5">
                  {auditorSettingsNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
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
            <>
              <nav className="space-y-0.5">
                {adminNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.active ||
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href)) ||
                    (item.href === "/admin/users" && (pathname.startsWith("/admin/users") || pathname.startsWith("/admin/assessors")));
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

              <div className="pt-2">
                <div className="px-3 mb-1.5 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                  Administration
                </div>
                <nav className="space-y-0.5">
                  {adminSettingsNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
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
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        {/* Top Navbar - Fixed at top, never scrolls */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 z-30">
          <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
            {/* Hamburger Button for Mobile */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition shrink-0"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Scope Selection with Search (Visible strictly on Dashboard) */}
            {pathname === "/dashboard" && (
              <SearchableScopeSelector activeRoleView={activeRoleView} />
            )}
          </div>

          {/* Right Action Icons & User Profile */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {/* Notification Bell */}
            <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition">
              <Bell className="h-5 w-5" />
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
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-gradient-to-tr from-slate-700 to-slate-900 text-white font-semibold flex items-center justify-center text-xs sm:text-sm border border-slate-200 shrink-0">
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : "U"}
                </div>
                <div className="hidden md:block">
                  <div className="text-sm font-semibold text-slate-900 leading-tight">
                    {user?.name || "User"}
                  </div>
                  <div className="text-xs text-slate-500 leading-tight">
                    {isSuperAdmin ? "Super Admin" : isOrgAdmin ? "Org Admin" : "Auditor"}
                  </div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-medium text-slate-500">Signed in as</p>
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {user?.email || "user@graice.io"}
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
          {loading && !user ? <DashboardShellContentSkeleton /> : children}
        </main>
      </div>
    </div>
  );
}

function SearchableScopeSelector({ activeRoleView }: { activeRoleView: "Admin" | "Auditor" }) {
  const { selectedOrgFilter, setSelectedOrgFilter, organizations, triggerRefresh } =
    useDashboardScope();
  const { isLoading: apiBusy } = useApiLoading();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Find currently selected organization
  const selectedOrg = organizations.find((o) => o._id === selectedOrgFilter);

  // Filter organizations by search term (both name and domain/industry)
  const filteredOrgs = organizations.filter((org) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const nameMatch = (org.name || "").toLowerCase().includes(q);
    const domainMatch = (org.domain || "").toLowerCase().includes(q);
    const industryMatch = (org.industry || "").toLowerCase().includes(q);
    return nameMatch || domainMatch || industryMatch;
  });

  return (
    <div ref={containerRef} className="relative flex items-center gap-2">
      {/* Combobox Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-xs font-semibold shadow-2xs select-none ${
          isOpen
            ? "bg-white border-blue-500 ring-2 ring-blue-100 text-slate-900"
            : selectedOrgFilter !== "all"
            ? "bg-blue-50/80 border-blue-200 text-blue-900 hover:bg-blue-100/70"
            : "bg-slate-50 border-slate-200/90 text-slate-800 hover:bg-slate-100/80"
        }`}
      >
        <Building2
          className={`h-4 w-4 shrink-0 ${
            selectedOrgFilter !== "all" ? "text-blue-600" : "text-slate-500"
          }`}
        />
        <span className="text-slate-500 font-normal hidden sm:inline">Scope:</span>
        <span className="truncate max-w-[150px] sm:max-w-[220px]">
          {selectedOrg ? selectedOrg.name : `All Organizations (${organizations.length})`}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Clear Scope Button if specific org is selected */}
      {selectedOrgFilter !== "all" && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedOrgFilter("all");
          }}
          title="Reset to All Organizations"
          className="p-1 rounded-lg hover:bg-slate-200/80 text-slate-400 hover:text-slate-600 transition"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Refresh Trigger Button */}
      <button
        type="button"
        onClick={triggerRefresh}
        title="Refresh Telemetry Data"
        className="p-1.5 sm:p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition shadow-2xs shrink-0"
      >
        <RefreshCw
          className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${apiBusy ? "animate-spin text-blue-600" : ""}`}
        />
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 md:w-96 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2.5 z-50 animate-in fade-in zoom-in-95">
          {/* Search Box Header */}
          <div className="px-3 pb-2 border-b border-slate-100">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search organizations by name or domain..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setIsOpen(false);
                }}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 p-0.5 text-slate-400 hover:text-slate-600 rounded"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Organizations List */}
          <div className="max-h-64 overflow-y-auto px-1.5 pt-1.5 space-y-0.5">
            {/* Option: All Organizations */}
            <div
              onClick={() => {
                setSelectedOrgFilter("all");
                setIsOpen(false);
                setSearchTerm("");
              }}
              className={`flex items-center justify-between px-2.5 py-2 rounded-xl cursor-pointer text-xs transition ${
                selectedOrgFilter === "all"
                  ? "bg-blue-50 text-blue-900 font-bold"
                  : "hover:bg-slate-50 text-slate-700"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-6 w-6 rounded-lg bg-slate-900 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                  ALL
                </div>
                <div>
                  <div className="font-semibold text-slate-900">All Organizations</div>
                  <div className="text-[10px] text-slate-400">Global tenant assurance view</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                  {organizations.length}
                </span>
                {selectedOrgFilter === "all" && <Check className="h-4 w-4 text-blue-600" />}
              </div>
            </div>

            {/* List of Individual Organizations */}
            {filteredOrgs.length > 0 ? (
              filteredOrgs.map((org) => {
                const isSelected = selectedOrgFilter === org._id;
                return (
                  <div
                    key={org._id}
                    onClick={() => {
                      setSelectedOrgFilter(org._id);
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-xl cursor-pointer text-xs transition ${
                      isSelected
                        ? "bg-blue-50 text-blue-900 font-bold"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-6 w-6 rounded-lg bg-slate-800 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                        {org.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate max-w-[160px] sm:max-w-[210px]">
                          {org.name}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[160px] sm:max-w-[210px]">
                          {org.domain || org.industry || "Enterprise Client"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {org.activePlan && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          {org.activePlan}
                        </span>
                      )}
                      {isSelected && <Check className="h-4 w-4 text-blue-600" />}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                No organizations found matching &ldquo;{searchTerm}&rdquo;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
