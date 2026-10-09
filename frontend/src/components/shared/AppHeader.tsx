"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Menu,
  Search,
  Bell,
  HelpCircle,
  ChevronDown,
  User,
  Shield,
  KeyRound,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { Modal } from "@/components/ui/Modal";
import { GRAICE_PILLARS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface AppHeaderProps {
  onToggleSidebar: () => void;
  className?: string;
}

export function AppHeader({ onToggleSidebar, className }: AppHeaderProps) {
  const router = useRouter();
  const { user, logout, isAdmin, isCompanyLead } = useAuth();

  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const profileMenuItems = [
    {
      label: (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900">{user?.name || "Piyush Napit"}</span>
          <span className="text-[10px] text-slate-500 font-mono">{user?.email || "auditor@gcrai.org"}</span>
        </div>
      ),
      disabled: true,
    },
    { divider: true, label: "" },
    {
      label: "Account Profile",
      icon: User,
      onClick: () => router.push("/settings/profile"),
    },
    {
      label: "Password & Security",
      icon: KeyRound,
      onClick: () => router.push("/settings/security"),
    },
    {
      label: "Two-Factor Auth (MFA)",
      icon: Shield,
      onClick: () => router.push("/settings/mfa"),
    },
    { divider: true, label: "" },
    {
      label: "Sign Out",
      icon: LogOut,
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <>
      <header
        className={cn(
          "h-16 shrink-0 border-b border-[var(--border-subtle)] bg-white/95 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8",
          className
        )}
      >
        {/* Left: Mobile Sidebar Trigger & Global Search */}
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search Bar matching Screens 1 to 7 */}
          <div className="relative w-full max-w-md hidden sm:block">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search organizations, assessments, controls..."
              className="w-full pl-9 pr-14 py-2 rounded-xl border border-[var(--border-subtle)] bg-slate-50/70 hover:bg-white text-xs text-[var(--text-main)] placeholder:text-slate-400 outline-none focus:border-[var(--accent)] focus:bg-white focus:ring-1 focus:ring-[var(--accent)] transition-all"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs pointer-events-none">
              <span>⌘</span>
              <span>K</span>
            </div>
          </div>
        </div>

        {/* Right: Actions, Notifications, Help & Profile */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Notification Bell with Badge */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications((prev) => !prev)}
              className="relative p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center font-mono">
                3
              </span>
            </button>

            {/* Notification Dropdown Popover */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-[var(--border-subtle)] p-4 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h4 className="text-xs font-bold text-slate-900">Notifications</h4>
                  <span className="text-[10px] font-mono text-blue-600 font-semibold cursor-pointer hover:underline">
                    Mark all read
                  </span>
                </div>
                <div className="space-y-3 pt-3 text-xs">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="font-semibold text-slate-800 text-[11px]">Evidence Uploaded</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">ABC Corporation - Control GCRAI-001</p>
                    <span className="text-[9px] text-slate-400 font-mono mt-1 block">2 hours ago</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="font-semibold text-slate-800 text-[11px]">Finding Created</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Global Retail Ltd - Data Governance</p>
                    <span className="text-[9px] text-slate-400 font-mono mt-1 block">1 day ago</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="font-semibold text-slate-800 text-[11px]">Report Generated</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">GreenTech Industries - Full Assessment</p>
                    <span className="text-[9px] text-slate-400 font-mono mt-1 block">1 day ago</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Help Circular Button */}
          <button
            type="button"
            onClick={() => setShowHelpModal(true)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Help & Framework Documentation"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* User Profile Chip with Dropdown */}
          <div className="pl-2 border-l border-slate-200">
            <DropdownMenu
              trigger={
                <div className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-100 transition-colors">
                  <Avatar
                    name={user?.name || "Piyush Napit"}
                    size="sm"
                    statusDot="online"
                  />
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-900 leading-tight">
                      {user?.name || "Piyush Napit"}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 leading-tight mt-0.5">
                      {isAdmin ? "Super Admin" : isCompanyLead ? "Company Lead" : "Auditor"}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
                </div>
              }
              items={profileMenuItems}
            />
          </div>
        </div>
      </header>

      {/* Help Modal */}
      <Modal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        title="GRAICE Assessment Platform Help"
        description="Responsible AI Assessment Methodology and Navigation Guidance"
      >
        <div className="space-y-4 text-xs text-slate-600">
          <p>
            The <strong>GRAICE Platform</strong> enables persistent, auditable maturity evaluations across the 7 Responsible AI pillars.
          </p>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <h5 className="font-bold text-slate-900 text-xs">Keyboard Shortcuts</h5>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-500">
              <div><kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">⌘ + K</kbd> Global Search</div>
              <div><kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">Esc</kbd> Close Drawer / Modal</div>
              <div><kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">→</kbd> Next Question</div>
              <div><kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">←</kbd> Previous Question</div>
            </div>
          </div>

          <div className="space-y-1.5">
            <h5 className="font-bold text-slate-900 text-xs">The 7 Pillars Overview</h5>
            <ul className="list-disc pl-4 space-y-1 text-[11px]">
              {GRAICE_PILLARS.map((p) => (
                <li key={p.id}>
                  <strong>{p.name}:</strong> {p.description}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Modal>
    </>
  );
}
