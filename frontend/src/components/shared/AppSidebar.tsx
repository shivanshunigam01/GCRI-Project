"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  ShieldCheck,
  LayoutDashboard,
  Building2,
  FileText,
  FolderArchive,
  AlertTriangle,
  FileBarChart,
  Users,
  Award,
  History,
  Settings,
  ChevronDown,
  ChevronRight,
  X,
  Layers,
  HelpCircle,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFrameworkModal?: () => void;
}

export function AppSidebar({ isOpen, onClose, onOpenFrameworkModal }: AppSidebarProps) {
  const pathname = usePathname();
  const { user, isAdmin } = useAuth();

  const [assessmentsExpanded, setAssessmentsExpanded] = useState(
    pathname.startsWith("/assessments")
  );

  const isAssessorView = !isAdmin;

  // Assessor navigation matching Screens 1 to 6
  const assessorNavigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    {
      name: "Assessments",
      href: "/assessments",
      icon: FileText,
      expandable: true,
      isExpanded: assessmentsExpanded,
      onToggle: () => setAssessmentsExpanded((prev) => !prev),
      subItems: [
        { name: "All Assessments", href: "/assessments" },
        { name: "In Progress", href: "/assessments?status=InProgress" },
        { name: "Completed", href: "/assessments?status=Submitted" },
      ],
    },
    { name: "Organizations", href: "/companies", icon: Building2 },
    { name: "Framework", href: "/framework", icon: ShieldCheck },
    { name: "Evidence", href: "/evidence", icon: FolderArchive },
    { name: "Findings", href: "/findings", icon: AlertTriangle },
    { name: "Reports", href: "/reports", icon: FileBarChart },
  ];

  const assessorAdminNavigation = [
    { name: "Users", href: "/users", icon: Users },
    { name: "Subscriptions", href: "/assurance", icon: Award },
    { name: "Audit Logs", href: "/admin/audit-logs", icon: History },
    { name: "Settings", href: "/settings/profile", icon: Settings },
  ];

  // Super Admin Navigation matching Screen 7
  const adminNavigation = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Users", href: "/users", icon: Users },
    { name: "Auditors", href: "/admin/auditors", icon: ShieldCheck },
    { name: "Organizations", href: "/companies", icon: Building2 },
    { name: "Assessments", href: "/admin/assessments", icon: FileText },
    { name: "Framework Versions", href: "/admin/frameworks", icon: Layers },
    { name: "Controls", href: "/admin/controls", icon: ShieldAlert },
    { name: "Evidence", href: "/evidence", icon: FolderArchive },
    { name: "Reports", href: "/reports", icon: FileBarChart },
    { name: "Subscriptions", href: "/assurance", icon: Award },
    { name: "Audit Logs", href: "/admin/audit-logs", icon: History },
    { name: "System Settings", href: "/settings/profile", icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-[#0f172a] text-slate-300 border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 shadow-2xl lg:shadow-none select-none",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Logo & Header */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800/80">
            <Link href={isAdmin ? "/admin" : "/dashboard"} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-slate-950 shadow-sm">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-base tracking-tight text-white leading-none">
                  GRAICE
                </span>
                <span className="text-[9px] text-slate-400 font-medium tracking-wide mt-1">
                  Global Framework for Responsible AI
                </span>
              </div>
            </Link>
            <button
              onClick={onClose}
              className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="px-3 py-4 space-y-6">
            {isAssessorView ? (
              <>
                {/* Assessor Main Menu */}
                <div className="space-y-1">
                  {assessorNavigation.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/dashboard" && pathname.startsWith(item.href));
                    const Icon = item.icon;

                    if (item.expandable) {
                      return (
                        <div key={item.name} className="space-y-1">
                          <button
                            type="button"
                            onClick={item.onToggle}
                            className={cn(
                              "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer",
                              isActive
                                ? "bg-slate-800/90 text-white font-bold"
                                : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100"
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              <Icon
                                className={cn("w-4 h-4", isActive ? "text-blue-400" : "text-slate-400")}
                              />
                              <span>{item.name}</span>
                            </div>
                            {item.isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </button>

                          {/* Sub-items */}
                          {item.isExpanded && item.subItems && (
                            <div className="pl-9 pr-2 space-y-1">
                              {item.subItems.map((sub) => {
                                const isSubActive = pathname === sub.href;
                                return (
                                  <Link
                                    key={sub.name}
                                    href={sub.href}
                                    onClick={onClose}
                                    className={cn(
                                      "block px-2.5 py-1.5 rounded-lg text-xs transition-colors",
                                      isSubActive
                                        ? "text-blue-400 font-semibold bg-slate-800/40"
                                        : "text-slate-400 hover:text-slate-200"
                                    )}
                                  >
                                    {sub.name}
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150",
                          isActive
                            ? "bg-slate-800/90 text-white shadow-xs"
                            : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100"
                        )}
                      >
                        <Icon className={cn("w-4 h-4", isActive ? "text-blue-400" : "text-slate-400")} />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>

                {/* Administration Group */}
                <div className="space-y-1 pt-2">
                  <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Administration
                  </div>
                  {assessorAdminNavigation.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150",
                          isActive
                            ? "bg-slate-800/90 text-white shadow-xs"
                            : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100"
                        )}
                      >
                        <Icon className={cn("w-4 h-4", isActive ? "text-blue-400" : "text-slate-400")} />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </>
            ) : (
              // Platform Super Admin Menu (Screen 7)
              <div className="space-y-1">
                <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Platform Oversight
                </div>
                {adminNavigation.map((item) => {
                  const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150",
                        isActive
                          ? "bg-slate-800/90 text-white shadow-xs font-bold"
                          : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100"
                      )}
                    >
                      <Icon className={cn("w-4 h-4", isActive ? "text-blue-400" : "text-slate-400")} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Framework Version Banner Card */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/60">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700/60 p-3.5 shadow-md">
            {/* Mountain / Geometric decorative lines */}
            <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-400 via-transparent to-transparent" />

            <div className="relative z-10 flex flex-col gap-2">
              <div>
                <p className="text-xs font-bold text-white tracking-tight">GRAICE Framework</p>
                <p className="text-[10px] font-mono text-slate-400 mt-0.5">Version 0.8</p>
              </div>

              <button
                type="button"
                onClick={onOpenFrameworkModal}
                className="w-full mt-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold border border-white/10 transition-colors cursor-pointer"
              >
                <span>View Framework</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
