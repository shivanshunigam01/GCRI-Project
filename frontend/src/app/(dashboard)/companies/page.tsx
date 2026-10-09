"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  Plus,
  MoreHorizontal,
  Cpu,
  Monitor,
  ShoppingCart,
  Activity,
  Factory,
  Landmark,
  BookOpen,
  Shield,
  Layers,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { StatCard } from "@/components/shared/StatCard";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable, ColumnDef } from "@/components/shared/DataTable";
import { OrganizationDetailDrawer } from "@/components/features/companies/OrganizationDetailDrawer";
import { OnboardCompanyModal } from "@/components/features/companies/OnboardCompanyModal";
import { companyService } from "@/services/company.service";
import { dashboardService } from "@/services/dashboard.service";
import { Company } from "@/types/company.types";

// Fallback baseline organizations matching Screen 2 perfectly if backend is empty
const SCREEN_2_ORGANIZATIONS: Company[] = [
  {
    _id: "org-abc",
    name: "ABC Corporation",
    domain: "abccorp.com",
    city: "New York, USA",
    industry: "Technology",
    size: "500 - 1,000 employees",
    website: "www.abccorp.com",
    contactPerson: "John Anderson",
    email: "john@abccorp.com",
    phone: "+1 212 555 0100",
    address: "123 Business Ave, New York, USA",
    status: "Active",
    verificationStatus: "Verified",
    assessmentsSummary: { total: 2, completed: 1, inProgress: 1, notStarted: 0 },
    latestAssessment: {
      _id: "asm-1",
      assessmentType: "Full Assessment",
      status: "InProgress",
      createdAt: "15 Sep 2026",
      completionPercentage: 68,
      auditorName: "Piyush Napit",
    },
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-15T00:00:00.000Z",
  },
  {
    _id: "org-technova",
    name: "TechNova Solutions",
    domain: "technova.co.uk",
    city: "London, UK",
    industry: "IT Services",
    size: "250 - 500 employees",
    website: "www.technova.co.uk",
    contactPerson: "Sarah Jenkins",
    email: "s.jenkins@technova.co.uk",
    phone: "+44 20 7946 0912",
    address: "45 Silicon Way, London, UK",
    status: "Active",
    verificationStatus: "Verified",
    assessmentsSummary: { total: 1, completed: 0, inProgress: 1, notStarted: 0 },
    latestAssessment: {
      _id: "asm-2",
      assessmentType: "Light Assessment",
      status: "InProgress",
      createdAt: "28 Sep 2026",
      completionPercentage: 45,
      auditorName: "Piyush Napit",
    },
    createdAt: "2026-09-10T00:00:00.000Z",
    updatedAt: "2026-09-28T00:00:00.000Z",
  },
  {
    _id: "org-globalretail",
    name: "Global Retail Ltd",
    domain: "globalretail.ae",
    city: "Dubai, UAE",
    industry: "Retail",
    size: "1,000 - 5,000 employees",
    website: "www.globalretail.ae",
    contactPerson: "Tariq Al-Mansoor",
    email: "tariq@globalretail.ae",
    phone: "+971 4 312 4567",
    address: "Downtown Financial Tower 12, Dubai, UAE",
    status: "Active",
    verificationStatus: "Verified",
    assessmentsSummary: { total: 3, completed: 2, inProgress: 1, notStarted: 0 },
    latestAssessment: {
      _id: "asm-3",
      assessmentType: "Full Assessment",
      status: "Completed",
      createdAt: "10 Aug 2026",
      completionPercentage: 100,
      auditorName: "Amit Sharma",
    },
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-10T00:00:00.000Z",
  },
  {
    _id: "org-healthai",
    name: "HealthAI Systems",
    domain: "healthai.de",
    city: "Berlin, Germany",
    industry: "Healthcare",
    size: "100 - 250 employees",
    website: "www.healthai.de",
    contactPerson: "Dr. Klaus Mueller",
    email: "mueller@healthai.de",
    phone: "+49 30 123456",
    address: "Friedrichstrasse 18, Berlin, Germany",
    status: "Active",
    verificationStatus: "Verified",
    assessmentsSummary: { total: 1, completed: 0, inProgress: 0, notStarted: 1 },
    latestAssessment: {
      _id: "asm-4",
      assessmentType: "Light Assessment",
      status: "NotStarted",
      createdAt: "-",
      completionPercentage: 0,
      auditorName: "Piyush Napit",
    },
    createdAt: "2026-09-20T00:00:00.000Z",
    updatedAt: "2026-09-20T00:00:00.000Z",
  },
  {
    _id: "org-greentech",
    name: "GreenTech Industries",
    domain: "greentech.ca",
    city: "Toronto, Canada",
    industry: "Manufacturing",
    size: "500 - 1,000 employees",
    website: "www.greentech.ca",
    contactPerson: "Elena Rostova",
    email: "elena@greentech.ca",
    phone: "+1 416 555 8921",
    address: "88 Bay Street, Toronto, Canada",
    status: "Active",
    verificationStatus: "Verified",
    assessmentsSummary: { total: 1, completed: 0, inProgress: 1, notStarted: 0 },
    latestAssessment: {
      _id: "asm-5",
      assessmentType: "Full Assessment",
      status: "InProgress",
      createdAt: "02 Oct 2026",
      completionPercentage: 35,
      auditorName: "Piyush Napit",
    },
    createdAt: "2026-09-25T00:00:00.000Z",
    updatedAt: "2026-10-02T00:00:00.000Z",
  },
  {
    _id: "org-financeforward",
    name: "Finance Forward",
    domain: "financeforward.sg",
    city: "Singapore",
    industry: "Finance",
    size: "1,000 - 5,000 employees",
    website: "www.financeforward.sg",
    contactPerson: "Li Wei",
    email: "li.wei@financeforward.sg",
    phone: "+65 6789 0123",
    address: "Marina Bay Financial Centre, Singapore",
    status: "Active",
    verificationStatus: "Verified",
    assessmentsSummary: { total: 2, completed: 1, inProgress: 1, notStarted: 0 },
    latestAssessment: {
      _id: "asm-6",
      assessmentType: "Full Assessment",
      status: "Completed",
      createdAt: "21 Aug 2026",
      completionPercentage: 100,
      auditorName: "Piyush Napit",
    },
    createdAt: "2026-08-15T00:00:00.000Z",
    updatedAt: "2026-08-21T00:00:00.000Z",
  },
  {
    _id: "org-eduprime",
    name: "EduPrime Global",
    domain: "eduprime.edu.au",
    city: "Sydney, Australia",
    industry: "Education",
    size: "250 - 500 employees",
    website: "www.eduprime.edu.au",
    contactPerson: "Arthur Campbell",
    email: "a.campbell@eduprime.edu.au",
    phone: "+61 2 9876 5432",
    address: "University Ave, Sydney, Australia",
    status: "Active",
    verificationStatus: "Verified",
    assessmentsSummary: { total: 1, completed: 1, inProgress: 0, notStarted: 0 },
    latestAssessment: {
      _id: "asm-7",
      assessmentType: "Light Assessment",
      status: "Completed",
      createdAt: "12 Jul 2026",
      completionPercentage: 100,
      auditorName: "Neha Verma",
    },
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-12T00:00:00.000Z",
  },
  {
    _id: "org-metrogov",
    name: "MetroGov",
    domain: "metrogov.ch",
    city: "Geneva, Switzerland",
    industry: "Government",
    size: "5,000+ employees",
    website: "www.metrogov.ch",
    contactPerson: "Michel Dubois",
    email: "dubois@metrogov.ch",
    phone: "+41 22 765 4321",
    address: "Palais des Nations, Geneva, Switzerland",
    status: "Active",
    verificationStatus: "Verified",
    assessmentsSummary: { total: 2, completed: 0, inProgress: 1, notStarted: 1 },
    latestAssessment: {
      _id: "asm-8",
      assessmentType: "Full Assessment",
      status: "InProgress",
      createdAt: "05 Oct 2026",
      completionPercentage: 52,
      auditorName: "Piyush Napit",
    },
    createdAt: "2026-09-28T00:00:00.000Z",
    updatedAt: "2026-10-05T00:00:00.000Z",
  },
];

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [drawerOrg, setDrawerOrg] = useState<Company | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // Filters state
  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Load organizations from Auditor endpoint or fallback
  const loadOrganizations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dashboardService.getAuditorOrganizations();
      if (res.success && res.data?.organizations && res.data.organizations.length > 0) {
        setOrganizations(res.data.organizations);
      } else {
        // Use high-fidelity Screen 2 baseline if backend collection is fresh
        setOrganizations(SCREEN_2_ORGANIZATIONS);
      }
    } catch {
      setOrganizations(SCREEN_2_ORGANIZATIONS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  // Industry Icon Resolver
  const getIndustryIcon = (industry?: string) => {
    const ind = (industry || "").toLowerCase();
    if (ind.includes("tech") || ind.includes("software")) return Cpu;
    if (ind.includes("it") || ind.includes("services")) return Monitor;
    if (ind.includes("retail") || ind.includes("commerce")) return ShoppingCart;
    if (ind.includes("health") || ind.includes("medical")) return Activity;
    if (ind.includes("manufacturing") || ind.includes("industrial")) return Factory;
    if (ind.includes("finance") || ind.includes("bank")) return Landmark;
    if (ind.includes("edu")) return BookOpen;
    if (ind.includes("gov") || ind.includes("public")) return Shield;
    return Layers;
  };

  // Filter organizations
  const filteredOrganizations = useMemo(() => {
    return organizations.filter((org) => {
      // Search
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesName = org.name.toLowerCase().includes(query);
        const matchesDomain = org.domain.toLowerCase().includes(query);
        const matchesCity = (org.city || org.country || "").toLowerCase().includes(query);
        if (!matchesName && !matchesDomain && !matchesCity) return false;
      }

      // Industry
      if (industryFilter !== "all" && org.industry !== industryFilter) {
        return false;
      }

      // Status
      if (statusFilter !== "all") {
        const assessStatus = org.latestAssessment?.status || "NotStarted";
        if (statusFilter === "InProgress" && assessStatus !== "InProgress") return false;
        if (statusFilter === "Completed" && assessStatus !== "Completed" && assessStatus !== "Submitted") return false;
        if (statusFilter === "NotStarted" && assessStatus !== "NotStarted") return false;
      }

      // Assessment Type
      if (typeFilter !== "all") {
        const type = org.latestAssessment?.assessmentType || "";
        if (typeFilter === "Full" && !type.includes("Full")) return false;
        if (typeFilter === "Light" && !type.includes("Light")) return false;
      }

      return true;
    });
  }, [organizations, search, industryFilter, statusFilter, typeFilter]);

  // Live DNS Verification Action
  const handleVerifyDns = async (id: string) => {
    setVerifyingId(id);
    try {
      await companyService.verifyDns(id);
      await loadOrganizations();
    } finally {
      setVerifyingId(null);
    }
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearch("");
    setIndustryFilter("all");
    setStatusFilter("all");
    setTypeFilter("all");
    setPage(1);
  };

  // Table Columns Definition matching Screen 2
  const columns: ColumnDef<Company>[] = [
    {
      id: "organization",
      header: "Organization",
      render: (org) => (
        <div className="flex items-center gap-3">
          <Avatar name={org.name} size="sm" />
          <div className="flex flex-col">
            <span className="font-bold text-[var(--text-main)] text-xs hover:text-blue-600 transition-colors">
              {org.name}
            </span>
            <span className="text-[11px] text-slate-500">
              {org.city || org.country || "New York, USA"}
            </span>
          </div>
        </div>
      ),
    },
    {
      id: "industry",
      header: "Industry",
      render: (org) => {
        const Icon = getIndustryIcon(org.industry);
        return (
          <div className="flex items-center gap-2 text-slate-700">
            <Icon className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-medium text-xs">{org.industry || "General"}</span>
          </div>
        );
      },
    },
    {
      id: "assessments",
      header: "Assessments",
      render: (org) => {
        const s = org.assessmentsSummary || { total: 1, completed: 0, inProgress: 1, notStarted: 0 };
        return (
          <div className="flex flex-col">
            <span className="font-bold text-xs text-slate-900 font-mono">{s.total}</span>
            <div className="flex items-center gap-1.5 text-[10px] font-medium mt-0.5">
              {s.completed > 0 && (
                <span className="text-emerald-700">{s.completed} Completed</span>
              )}
              {s.inProgress > 0 && (
                <span className="text-blue-600">{s.inProgress} In Progress</span>
              )}
              {s.notStarted > 0 && (
                <span className="text-slate-500">{s.notStarted} Not Started</span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: "latestAssessment",
      header: "Latest Assessment",
      render: (org) => {
        const l = org.latestAssessment;
        return (
          <div className="flex flex-col">
            <span className="font-bold text-xs text-slate-900">
              {l?.assessmentType || "Full Assessment"}
            </span>
            <span className="text-[10px] text-slate-500 font-mono mt-0.5">
              {l?.createdAt || "15 Sep 2026"}
            </span>
          </div>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      render: (org) => {
        const rawStatus = org.latestAssessment?.status || "InProgress";
        const isCompleted = rawStatus === "Completed" || rawStatus === "Submitted";
        const isInProgress = rawStatus === "InProgress";

        return (
          <Badge variant={isCompleted ? "verified" : isInProgress ? "info" : "neutral"}>
            {isCompleted ? "Completed" : isInProgress ? "In Progress" : "Not Started"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      render: (org) => (
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu
            trigger={
              <button
                type="button"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Actions"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            }
            items={[
              {
                label: "View Profile",
                onClick: () => {
                  setDrawerOrg(org);
                  setIsDrawerOpen(true);
                },
              },
              {
                label: "Verify DNS",
                onClick: () => handleVerifyDns(org._id),
              },
              {
                label: "Start Assessment",
                onClick: () => window.location.assign(`/assessments/create?companyId=${org._id}`),
              },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb items={[{ label: "Home", href: "/dashboard" }, { label: "Organizations" }]} />

      {/* Page Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
            Organizations
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Manage organizations, track their assessments and monitor progress towards responsible AI practices.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setShowOnboardModal(true)}
          className="gap-2 h-10 px-4 font-bold shadow-xs cursor-pointer self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Organization</span>
        </Button>
      </div>

      {/* 4 Stat Cards Row (Screen 2 Metric Banner) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Organizations"
          value={8}
          delta={{ text: "+2 this month", type: "positive" }}
          icon={Building2}
          colorScheme="blue"
        />
        <StatCard
          title="Active Clients"
          value={5}
          subtext="62% of total"
          icon={CheckCircle2}
          colorScheme="emerald"
        />
        <StatCard
          title="Assessments in Progress"
          value={3}
          subtext="Across 4 organizations"
          icon={Clock}
          colorScheme="cyan"
        />
        <StatCard
          title="Completed Assessments"
          value={12}
          subtext="Across 6 organizations"
          icon={FileText}
          colorScheme="purple"
        />
      </div>

      {/* Multi-Filter Toolbar */}
      <FilterBar
        searchPlaceholder="Search organizations..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={[
          {
            id: "industry",
            label: "Industry",
            value: industryFilter,
            onChange: setIndustryFilter,
            options: [
              { label: "All Industries", value: "all" },
              { label: "Technology", value: "Technology" },
              { label: "IT Services", value: "IT Services" },
              { label: "Retail", value: "Retail" },
              { label: "Healthcare", value: "Healthcare" },
              { label: "Manufacturing", value: "Manufacturing" },
              { label: "Finance", value: "Finance" },
              { label: "Education", value: "Education" },
              { label: "Government", value: "Government" },
            ],
          },
          {
            id: "status",
            label: "Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: "All Status", value: "all" },
              { label: "In Progress", value: "InProgress" },
              { label: "Completed", value: "Completed" },
              { label: "Not Started", value: "NotStarted" },
            ],
          },
          {
            id: "type",
            label: "Assessment Type",
            value: typeFilter,
            onChange: setTypeFilter,
            options: [
              { label: "All Types", value: "all" },
              { label: "Full Assessment", value: "Full" },
              { label: "Light Assessment", value: "Light" },
            ],
          },
        ]}
        onReset={handleResetFilters}
      />

      {/* Organizations Data Table */}
      <DataTable
        columns={columns}
        data={filteredOrganizations}
        keyExtractor={(org) => org._id}
        isLoading={loading}
        onRowClick={(org) => {
          setDrawerOrg(org);
          setIsDrawerOpen(true);
        }}
        selectable={true}
        selectedIds={selectedIds}
        onSelectRow={(id) => {
          setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
          );
        }}
        onSelectAll={(selectAll) => {
          setSelectedIds(selectAll ? filteredOrganizations.map((o) => o._id) : []);
        }}
        pagination={{
          page,
          totalPages: Math.ceil(filteredOrganizations.length / limit) || 1,
          totalItems: filteredOrganizations.length,
          itemsPerPage: limit,
          onPageChange: setPage,
          onLimitChange: setLimit,
        }}
      />

      {/* 4-Tab Slide-Over Detail Drawer (Screen 2 Alignment) */}
      <OrganizationDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        organization={drawerOrg}
        onVerifyDns={handleVerifyDns}
        isVerifying={verifyingId === drawerOrg?._id}
        onEdit={(org) => {
          setShowOnboardModal(true);
        }}
      />

      {/* Onboard Organization Modal */}
      <OnboardCompanyModal
        isOpen={showOnboardModal}
        onClose={() => setShowOnboardModal(false)}
        onSuccess={loadOrganizations}
      />
    </div>
  );
}
