"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  Edit3,
  FileText,
  Users,
  FolderArchive,
  ArrowRight,
  MoreVertical,
  Calendar,
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  CheckCircle2,
  RefreshCw,
  Plus,
} from "lucide-react";
import { SlideOver } from "@/components/ui/SlideOver";
import { Tabs } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { Company } from "@/types/company.types";
import { cn } from "@/lib/utils";

export interface OrganizationDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  organization: Company | null;
  onEdit?: (org: Company) => void;
  onVerifyDns?: (id: string) => Promise<void>;
  isVerifying?: boolean;
}

export function OrganizationDetailDrawer({
  isOpen,
  onClose,
  organization,
  onEdit,
  onVerifyDns,
  isVerifying = false,
}: OrganizationDetailDrawerProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");

  if (!organization) return null;

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "assessments", label: "Assessments", count: organization.assessmentsSummary?.total ?? 2 },
    { id: "people", label: "People" },
    { id: "documents", label: "Documents" },
  ];

  const summary = organization.assessmentsSummary || {
    total: 2,
    completed: 1,
    inProgress: 1,
    notStarted: 0,
  };

  const latest = organization.latestAssessment || {
    _id: "demo-assess-1",
    assessmentType: "Full Assessment",
    status: "InProgress",
    createdAt: "15 Sep 2026",
    completionPercentage: 68,
    auditorName: "Piyush Napit",
  };

  const menuItems = [
    {
      label: "Edit Details",
      icon: Edit3,
      onClick: () => onEdit && onEdit(organization),
    },
    {
      label: isVerifying ? "Verifying..." : "Verify DNS",
      icon: RefreshCw,
      disabled: isVerifying,
      onClick: () => onVerifyDns && onVerifyDns(organization._id),
    },
    {
      label: "Create Assessment",
      icon: Plus,
      onClick: () => router.push(`/assessments/create?companyId=${organization._id}`),
    },
  ];

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      width="lg"
      title={
        <div className="flex items-center gap-3.5">
          <Avatar name={organization.name} size="md" />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-[var(--text-main)] truncate">
                {organization.name}
              </span>
              <Badge variant="verified">
                {organization.status === "Active" ? "Active Client" : organization.status}
              </Badge>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
              {organization.industry || "Technology"} | {organization.city || organization.country || "New York, USA"}
            </p>
          </div>
        </div>
      }
      subtitle={
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-500">Domain: {organization.domain}</span>
            <Badge variant={organization.verificationStatus === "Verified" ? "verified" : "pending"}>
              {organization.verificationStatus}
            </Badge>
          </div>
          <DropdownMenu trigger={<button type="button" className="p-1 text-slate-400 hover:text-slate-600 rounded"><MoreVertical className="w-4 h-4" /></button>} items={menuItems} />
        </div>
      }
      footer={
        <Button
          variant="primary"
          size="md"
          className="w-full gap-2 font-bold py-2.5 h-11 shadow-sm"
          onClick={() => {
            onClose();
            router.push(`/assessments/create?companyId=${organization._id}`);
          }}
        >
          <span>Create New Assessment</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      }
    >
      {/* Drawer Tabs */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant="underline"
        className="-mt-2 mb-5"
      />

      {/* Tab 1: Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6 text-xs">
          {/* Organization Details Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-[var(--text-main)] tracking-tight">
                Organization Details
              </h4>
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(organization)}
                  className="h-7 px-2.5 text-[11px] gap-1.5"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit</span>
                </Button>
              )}
            </div>

            <div className="p-4 bg-slate-50/70 border border-[var(--border-subtle)] rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Industry</span>
                <span className="font-semibold text-slate-900">{organization.industry || "Technology"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Size</span>
                <span className="font-semibold text-slate-900">{organization.size || "500 - 1,000 employees"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Website</span>
                <a
                  href={`https://${organization.domain}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  <span>{organization.website || `www.${organization.domain}`}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Contact Person</span>
                <span className="font-semibold text-slate-900">{organization.contactPerson || organization.clientUser?.name || "John Anderson"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Email</span>
                <a
                  href={`mailto:${organization.email || organization.clientUser?.email || "contact@" + organization.domain}`}
                  className="font-semibold text-blue-600 hover:underline"
                >
                  {organization.email || organization.clientUser?.email || "contact@" + organization.domain}
                </a>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Phone</span>
                <span className="font-semibold text-slate-900">{organization.phone || "+1 212 555 0100"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Address</span>
                <span className="font-semibold text-slate-900 text-right truncate max-w-[200px]">
                  {organization.address || "123 Business Ave, New York, USA"}
                </span>
              </div>
            </div>
          </div>

          {/* Assessment Summary Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-[var(--text-main)] tracking-tight">
                Assessment Summary
              </h4>
              <button
                type="button"
                onClick={() => setActiveTab("assessments")}
                className="text-[11px] font-semibold text-blue-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                <div className="text-xl font-extrabold text-slate-900 font-sans">{summary.total}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">Total Assessments</div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                <div className="text-xl font-extrabold text-emerald-600 font-sans">{summary.completed}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">Completed</div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                <div className="text-xl font-extrabold text-blue-600 font-sans">{summary.inProgress}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">In Progress</div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                <div className="text-xl font-extrabold text-slate-500 font-sans">{summary.notStarted}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">Not Started</div>
              </div>
            </div>
          </div>

          {/* Latest Assessment Card */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-[var(--text-main)] tracking-tight">
              Latest Assessment
            </h4>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-xs">{latest.assessmentType}</p>
                    <p className="text-[10px] text-slate-400">Responsible AI Assessment</p>
                  </div>
                </div>
                <Badge variant={latest.status === "Submitted" ? "verified" : "info"}>
                  {latest.status === "Submitted" ? "Completed" : "In Progress"}
                </Badge>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Started On</span>
                  <span className="font-mono text-slate-700">{latest.createdAt}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Progress</span>
                  <span className="font-bold text-slate-900 font-mono">{latest.completionPercentage ?? 68}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${latest.completionPercentage ?? 68}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-slate-500">Auditor</span>
                  <span className="font-medium text-slate-800">{latest.auditorName || "Piyush Napit"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Assessments */}
      {activeTab === "assessments" && (
        <div className="space-y-3 text-xs">
          <p className="text-slate-500">Assessments conducted for {organization.name}:</p>
          <div className="space-y-2.5">
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-bold text-slate-900">Full Assessment 2026</p>
                <p className="text-[10px] text-slate-500 font-mono">Started 15 Sep 2026 • 68% complete</p>
              </div>
              <Badge variant="info">In Progress</Badge>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-bold text-slate-900">Light Assessment Q2</p>
                <p className="text-[10px] text-slate-500 font-mono">Completed 10 Aug 2026 • Score 94/120</p>
              </div>
              <Badge variant="verified">Completed</Badge>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: People */}
      {activeTab === "people" && (
        <div className="space-y-4 text-xs">
          <div>
            <h5 className="font-bold text-slate-900 mb-2">Primary Governance Lead</h5>
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-3">
              <Avatar name={organization.contactPerson || "John Anderson"} size="sm" />
              <div>
                <p className="font-bold text-slate-900">{organization.contactPerson || "John Anderson"}</p>
                <p className="text-[10px] text-slate-500 font-mono">{organization.email || "john@abccorp.com"}</p>
              </div>
            </div>
          </div>

          <div>
            <h5 className="font-bold text-slate-900 mb-2">Assigned Auditor</h5>
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-3">
              <Avatar name="Piyush Napit" size="sm" statusDot="online" />
              <div>
                <p className="font-bold text-slate-900">Piyush Napit</p>
                <p className="text-[10px] text-slate-500 font-mono">Lead AI Governance Auditor</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Documents */}
      {activeTab === "documents" && (
        <div className="space-y-3 text-xs">
          <p className="text-slate-500">Governance policies and evidentiary filings:</p>
          <div className="space-y-2">
            <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-slate-900">AI_Governance_Charter.pdf</span>
              </div>
              <Badge variant="verified">Valid</Badge>
            </div>
            <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-slate-900">Executive_Accountability.docx</span>
              </div>
              <Badge variant="verified">Valid</Badge>
            </div>
          </div>
        </div>
      )}
    </SlideOver>
  );
}
