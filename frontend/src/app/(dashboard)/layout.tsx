"use client";

import React, { useState } from "react";
import { AppSidebar } from "@/components/shared/AppSidebar";
import { AppHeader } from "@/components/shared/AppHeader";
import { Modal } from "@/components/ui/Modal";
import { GRAICE_PILLARS } from "@/lib/constants";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showFrameworkModal, setShowFrameworkModal] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg-app)] flex overflow-x-hidden">
      {/* Reusable Multi-Role Sidebar */}
      <AppSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenFrameworkModal={() => setShowFrameworkModal(true)}
      />

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0 h-screen overflow-hidden">
        {/* Reusable Header */}
        <AppHeader onToggleSidebar={() => setSidebarOpen(true)} />

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Framework Version Details Modal */}
      <Modal
        isOpen={showFrameworkModal}
        onClose={() => setShowFrameworkModal(false)}
        title="GRAICE Framework Version 0.8"
        description="Global Confidential Responsible AI Audit Control Specification"
      >
        <div className="space-y-4 text-xs text-slate-600">
          <p>
            The <strong>GRAICE Framework (v0.8)</strong> provides a comprehensive governance baseline across the 7 institutional pillars, operationalizing controls mapped to the EU AI Act, NIST AI RMF, ISO/IEC 42001, and OECD AI Principles.
          </p>

          <div className="space-y-3 pt-2">
            <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider">The 7 Pillars</h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {GRAICE_PILLARS.map((p) => (
                <div key={p.id} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                      {p.id}
                    </span>
                    <span className="font-semibold text-slate-900 text-xs">{p.name}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed pl-7">{p.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
