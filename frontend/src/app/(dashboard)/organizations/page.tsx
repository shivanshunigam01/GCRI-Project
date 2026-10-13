"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Building2,
  Plus,
  RefreshCw,
  Search,
  Filter,
  MoreVertical,
  Edit3,
  Globe,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Clock,
  X,
  ExternalLink,
  Crown,
  Sparkles,
} from "lucide-react";
import { companyService } from "@/services/company.service";
import { auditorMappingService } from "@/services/auditorMapping.service";
import { useAuth } from "@/context/AuthContext";
import { Company, CompanyStatus, VerificationStatus, SubscriptionTier } from "@/types/company.types";
import OrganizationDetailDrawer from "@/components/features/companies/OrganizationDetailDrawer";
import Modal, { ConfirmationVariant } from "@/components/ui/Modal";

export default function OrganizationsPage() {
  // Live Data State
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Confirmation Modal State (Reusable for Suspend, Activate, Verify DNS, etc.)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    confirmLabel: string;
    variant: ConfirmationVariant;
    action: () => Promise<void>;
    loading: boolean;
  }>({
    isOpen: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    variant: "danger",
    action: async () => {},
    loading: false,
  });

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [paginationMeta, setPaginationMeta] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [verificationFilter, setVerificationFilter] = useState<string>("all");
  const [tierFilter, setTierFilter] = useState<string>("all");

  // Modal 1: Onboard Organization Modal
  const [onboardModalOpen, setOnboardModalOpen] = useState(false);
  const [onboardLoading, setOnboardLoading] = useState(false);
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const [onboardForm, setOnboardForm] = useState({
    name: "",
    domain: "",
    registrationNumber: "",
    country: "",
    industry: "",
    subscriptionTier: "Gold" as SubscriptionTier,
  });

  const { user: currentUser, isAdmin } = useAuth();

  // Action Menu Dropdown ID
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Selected Company for Interactive Side Drawer (Matching Screen 4)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch Companies Live from MongoDB Backend (Context-Aware for Admin vs Assessor)
  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // If the authenticated user is an Assessor, fetch both their assigned mappings AND scoped companies
      if (currentUser?.role === "Assessor") {
        const auditorId =
          currentUser._id ||
          (currentUser as any)?.id ||
          (currentUser as any)?.userId;

        let assignedCompanies: Company[] = [];

        if (auditorId) {
          try {
            const mappingsRes = await auditorMappingService.getMappingsByAuditor(auditorId);
            const orgList =
              (mappingsRes as any)?.data?.organizations ||
              (mappingsRes as any)?.organizations ||
              (mappingsRes as any)?.data ||
              [];

            assignedCompanies = orgList
              .map((m: any) => m.organization || m.organizationId)
              .filter((c: any) => c && typeof c === "object" && c._id);
          } catch (mapErr) {
            console.warn("Could not fetch auditor mappings:", mapErr);
          }
        }

        // Also fetch via standard companyService (which backend scopes to their company/assigned orgs)
        try {
          const directRes = await companyService.getCompanies({ limit: 100 });
          if (directRes && directRes.data) {
            for (const c of directRes.data) {
              if (!assignedCompanies.some((ac) => ac._id === c._id)) {
                assignedCompanies.push(c);
              }
            }
          }
        } catch (directErr) {
          console.warn("Could not fetch direct companies:", directErr);
        }

        if (debouncedSearch.trim()) {
          const q = debouncedSearch.trim().toLowerCase();
          assignedCompanies = assignedCompanies.filter(
            (c) =>
              c.name.toLowerCase().includes(q) ||
              c.domain.toLowerCase().includes(q)
          );
        }

        if (statusFilter !== "all") {
          assignedCompanies = assignedCompanies.filter((c) => c.status === statusFilter);
        }

        setCompanies(assignedCompanies);
        setPaginationMeta({
          page: 1,
          limit: 100,
          total: assignedCompanies.length,
          totalPages: 1,
        });
        return;
      }

      // For Admin: Fetch platform-wide companies
      const params: {
        page: number;
        limit: number;
        search?: string;
        status?: string;
        tier?: string;
      } = {
        page,
        limit,
      };

      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      if (tierFilter !== "all") {
        params.tier = tierFilter;
      }

      const res = await companyService.getCompanies(params);
      if (res && res.data) {
        let dataList = res.data;
        // Client-side filter for DNS verification status if specified
        if (verificationFilter !== "all") {
          dataList = dataList.filter((c) => c.dnsVerificationStatus === verificationFilter);
        }

        setCompanies(dataList);
        if (res.pagination) {
          const p = res.pagination as any;
          setPaginationMeta({
            page: p.page || page,
            limit: p.limit || limit,
            total: p.total || dataList.length,
            totalPages:
              p.totalPages ||
              p.pages ||
              Math.max(1, Math.ceil((p.total || dataList.length) / limit)),
          });
        } else {
          setPaginationMeta({
            page,
            limit,
            total: dataList.length,
            totalPages: Math.max(1, Math.ceil(dataList.length / limit)),
          });
        }
      }
    } catch (err: any) {
      console.error("Failed to load organizations:", err);
      setError(err?.message || "Failed to load organizations from backend.");
    } finally {
      setLoading(false);
    }
  }, [currentUser, page, limit, debouncedSearch, statusFilter, verificationFilter, tierFilter]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Click Outside Listener for Action Dropdown Menus
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".action-menu-container")) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  // Handle Organization Status Toggle (Active / Suspended) with Confirmation Dialog
  const handleToggleStatus = (company: Company) => {
    setActiveMenuId(null);
    const newStatus: CompanyStatus = company.status === "Active" ? "Suspended" : "Active";
    const isSuspending = newStatus === "Suspended";

    setConfirmModal({
      isOpen: true,
      title: isSuspending ? "Suspend Organization Account" : "Activate Organization Account",
      variant: isSuspending ? "danger" : "success",
      confirmLabel: isSuspending ? "Yes, Suspend Account" : "Yes, Activate Account",
      message: (
        <div className="space-y-2">
          <p>
            Are you sure you want to {isSuspending ? "suspend" : "activate"}{" "}
            <span className="font-bold text-slate-900">{company.name}</span>?
          </p>
          <p className="text-[11px] text-slate-400">
            {isSuspending
              ? "Suspending this client organization will immediately restrict access to active assessment sessions and audit operations across all users."
              : "Activating this organization restores full access to assessment audits, team collaboration, and compliance reporting."}
          </p>
        </div>
      ),
      loading: false,
      action: async () => {
        setConfirmModal((prev) => ({ ...prev, loading: true }));
        try {
          await companyService.updateCompanyStatus(company._id, newStatus);
          setActionSuccess(`${company.name} status updated to ${newStatus}`);
          setTimeout(() => setActionSuccess(null), 4000);
          setConfirmModal((prev) => ({ ...prev, isOpen: false, loading: false }));
          fetchCompanies();
          if (selectedCompany?._id === company._id) {
            setSelectedCompany((prev) => (prev ? { ...prev, status: newStatus } : null));
          }
        } catch (err: any) {
          setError(err?.message || `Failed to update status for ${company.name}`);
          setTimeout(() => setError(null), 5000);
          setConfirmModal((prev) => ({ ...prev, loading: false }));
        }
      },
    });
  };

  // Handle DNS Verification Trigger with Confirmation Dialog
  const handleVerifyDns = (company: Company) => {
    setActiveMenuId(null);
    setConfirmModal({
      isOpen: true,
      title: "Trigger DNS Verification",
      variant: "info",
      confirmLabel: "Verify DNS Now",
      message: (
        <div className="space-y-2">
          <p>
            Initiate cryptographic DNS domain verification for{" "}
            <span className="font-bold text-slate-900">{company.domain}</span>?
          </p>
          <p className="text-[11px] text-slate-400">
            This checks official DNS TXT records to cryptographically prove organization ownership and domain legitimacy.
          </p>
        </div>
      ),
      loading: false,
      action: async () => {
        setConfirmModal((prev) => ({ ...prev, loading: true }));
        try {
          await companyService.verifyCompanyDns(company._id, "Verified");
          setActionSuccess(`DNS verification completed successfully for ${company.domain}!`);
          setTimeout(() => setActionSuccess(null), 4000);
          setConfirmModal((prev) => ({ ...prev, isOpen: false, loading: false }));
          fetchCompanies();
          if (selectedCompany?._id === company._id) {
            setSelectedCompany((prev) => (prev ? { ...prev, dnsVerificationStatus: "Verified" } : null));
          }
        } catch (err: any) {
          setError(err?.message || `DNS verification failed for ${company.domain}`);
          setTimeout(() => setError(null), 5000);
          setConfirmModal((prev) => ({ ...prev, loading: false }));
        }
      },
    });
  };

  // Handle Onboard Organization Form Submit
  const handleSubmitOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardLoading(true);
    setOnboardError(null);

    try {
      await companyService.createCompany({
        name: onboardForm.name.trim(),
        domain: onboardForm.domain.trim().toLowerCase(),
        registrationNumber: onboardForm.registrationNumber.trim() || undefined,
        country: onboardForm.country.trim() || undefined,
        industry: onboardForm.industry.trim() || undefined,
        subscriptionTier: onboardForm.subscriptionTier,
      });

      setOnboardModalOpen(false);
      setActionSuccess(`Organization ${onboardForm.name} onboarded successfully!`);
      setTimeout(() => setActionSuccess(null), 4000);
      fetchCompanies();
    } catch (err: any) {
      console.error("Onboard organization error:", err);
      setOnboardError(err?.message || "Failed to onboard organization. Domain or name may already exist.");
    } finally {
      setOnboardLoading(false);
    }
  };

  // Helper for Status Badges
  const getStatusBadge = (status: CompanyStatus) => {
    const isActive = status === "Active";
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${
          isActive
            ? "bg-emerald-50/80 text-emerald-700 border-emerald-200/80 shadow-2xs"
            : "bg-slate-100 text-slate-600 border-slate-200"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
          }`}
        />
        {isActive ? "Active" : "Suspended"}
      </span>
    );
  };

  // Helper for DNS Verification Badges
  const getDnsBadge = (status?: VerificationStatus) => {
    switch (status) {
      case "Verified":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
            <ShieldCheck className="h-3 w-3 text-emerald-600 shrink-0" />
            Verified
          </span>
        );
      case "Pending":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">
            <Clock className="h-3 w-3 text-amber-500 shrink-0" />
            Pending
          </span>
        );
      case "Rejected":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700">
            <ShieldAlert className="h-3 w-3 text-rose-500 shrink-0" />
            Rejected
          </span>
        );
      default:
        return <span className="text-[11px] text-slate-400">—</span>;
    }
  };

  // Helper for Subscription Tier Badges
  const getTierBadge = (tier?: SubscriptionTier) => {
    switch (tier) {
      case "Gold":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
            <Crown className="h-2.5 w-2.5 text-amber-600 shrink-0" />
            Gold
          </span>
        );
      case "Silver":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300 shadow-2xs">
            <Sparkles className="h-2.5 w-2.5 text-slate-500 shrink-0" />
            Silver
          </span>
        );
      case "Bronze":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-50 text-orange-800 border border-orange-200 shadow-2xs">
            Bronze
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600">
            {tier || "Standard"}
          </span>
        );
    }
  };

  // Live Metric Counts
  const totalCount = paginationMeta.total;
  const activeCount = companies.filter((c) => c.status === "Active").length;
  const verifiedCount = companies.filter((c) => c.dnsVerificationStatus === "Verified").length;
  const goldCount = companies.filter((c) => c.subscriptionTier === "Gold").length;

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 space-y-3 overflow-hidden">
      {/* Global Alerts */}
      {actionSuccess && (
        <div className="flex items-center gap-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium shrink-0 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium shrink-0">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchCompanies()}
            className="text-[11px] font-semibold px-2.5 py-1 bg-rose-100 hover:bg-rose-200 rounded-md transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Compact 4-Card Metric Grid (Fixed Top - Logo Inspired Colors) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        {/* Card 1: Total Organizations - Ocean Blue */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-cyan-50 text-cyan-700 flex items-center justify-center shrink-0 border border-cyan-100 shadow-2xs">
            <Building2 className="h-5 w-5" strokeWidth={1.85} />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-extrabold text-slate-900 leading-tight tracking-tight">{totalCount}</div>
            <div className="text-[11px] font-medium text-slate-500 truncate mt-0.5">Total Organizations</div>
            <div className="text-[10px] font-semibold text-teal-600 mt-0.5">▲ Live in DB</div>
          </div>
        </div>

        {/* Card 2: Active Clients - Emerald/Teal */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 shadow-2xs">
            <CheckCircle2 className="h-5 w-5" strokeWidth={1.85} />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-extrabold text-slate-900 leading-tight tracking-tight">{activeCount}</div>
            <div className="text-[11px] font-medium text-slate-500 truncate mt-0.5">Active Clients</div>
            <div className="text-[10px] font-semibold text-emerald-600 mt-0.5">● On this page</div>
          </div>
        </div>

        {/* Card 3: DNS Verified - Teal */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-100 shadow-2xs">
            <ShieldCheck className="h-5 w-5" strokeWidth={1.85} />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-extrabold text-slate-900 leading-tight tracking-tight">{verifiedCount}</div>
            <div className="text-[11px] font-medium text-slate-500 truncate mt-0.5">DNS Verified</div>
            <div className="text-[10px] font-semibold text-teal-600 mt-0.5">Cryptographic Check</div>
          </div>
        </div>

        {/* Card 4: Gold Tier Subscribers - Amber/Royal */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100 shadow-2xs">
            <Crown className="h-5 w-5" strokeWidth={1.85} />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-extrabold text-slate-900 leading-tight tracking-tight">{goldCount}</div>
            <div className="text-[11px] font-medium text-slate-500 truncate mt-0.5">Gold Subscriptions</div>
            <div className="text-[10px] font-semibold text-amber-600 mt-0.5">Enterprise Tier</div>
          </div>
        </div>
      </div>

      {/* Filter & Action Toolbar (Fixed) */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-2.5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 shrink-0">
        {/* Left: Search & Filter Dropdowns */}
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search organizations or domain..."
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <div className="flex items-center text-[11px] text-slate-500 px-1">
              <Filter className="h-3 w-3 text-slate-400" />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs font-medium py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
            </select>

            <select
              value={verificationFilter}
              onChange={(e) => {
                setVerificationFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs font-medium py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition cursor-pointer"
            >
              <option value="all">DNS Verification</option>
              <option value="Verified">Verified</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>

            <select
              value={tierFilter}
              onChange={(e) => {
                setTierFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs font-medium py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition cursor-pointer"
            >
              <option value="all">All Tiers</option>
              <option value="Gold">Gold</option>
              <option value="Silver">Silver</option>
              <option value="Bronze">Bronze</option>
            </select>

            {(statusFilter !== "all" || verificationFilter !== "all" || tierFilter !== "all" || search) && (
              <button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setVerificationFilter("all");
                  setTierFilter("all");
                  setPage(1);
                }}
                className="text-[11px] text-teal-600 hover:text-teal-800 font-semibold hover:underline px-1 py-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Right: Actions Lockup */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          <button
            onClick={() => fetchCompanies()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-lg transition shadow-2xs disabled:opacity-50"
            title="Refresh Organizations"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => {
              setOnboardForm({
                name: "",
                domain: "",
                registrationNumber: "",
                country: "",
                industry: "",
                subscriptionTier: "Gold",
              });
              setOnboardError(null);
              setOnboardModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Onboard Organization</span>
          </button>
        </div>
      </div>

      {/* Organizations Content Area: Table + Side Detail Drawer */}
      <div className="flex-1 min-h-0 flex gap-3 overflow-hidden">
        {/* Organizations Data Table - Fixed Header & Scrollable Body */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 [scrollbar-width:thin]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50 shadow-xs border-b border-slate-200">
              <tr className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3 w-12 text-center bg-slate-50">S.N.</th>
                <th className="py-2.5 px-3.5 bg-slate-50">Organization</th>
                <th className="py-2.5 px-3 bg-slate-50">Domain / DNS</th>
                <th className="py-2.5 px-3 bg-slate-50">Plan Tier</th>
                <th className="py-2.5 px-3 bg-slate-50">Industry &amp; Country</th>
                <th className="py-2.5 px-3 bg-slate-50">Status</th>
                <th className="py-2.5 px-3 bg-slate-50">Onboarded</th>
                <th className="py-2.5 px-3 text-right bg-slate-50">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3 px-3 text-center"><div className="h-3 w-5 bg-slate-200 rounded mx-auto" /></td>
                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-slate-200" />
                        <div className="space-y-1">
                          <div className="h-3 w-32 bg-slate-200 rounded" />
                          <div className="h-2.5 w-24 bg-slate-100 rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3"><div className="h-4 w-28 bg-slate-100 rounded" /></td>
                    <td className="py-3 px-3"><div className="h-4 w-16 bg-slate-100 rounded-full" /></td>
                    <td className="py-3 px-3"><div className="h-3.5 w-24 bg-slate-100 rounded" /></td>
                    <td className="py-3 px-3"><div className="h-4 w-14 bg-slate-100 rounded-full" /></td>
                    <td className="py-3 px-3"><div className="h-3.5 w-16 bg-slate-100 rounded" /></td>
                    <td className="py-3 px-3 text-right"><div className="h-6 w-6 bg-slate-100 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <div className="max-w-xs mx-auto flex flex-col items-center justify-center text-slate-400">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-bold text-slate-700">No organizations found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {debouncedSearch || statusFilter !== "all" || verificationFilter !== "all" || tierFilter !== "all"
                          ? "No organizations match your search filters."
                          : "No enterprise organizations onboarded yet."}
                      </p>
                      {(debouncedSearch || statusFilter !== "all" || verificationFilter !== "all" || tierFilter !== "all") && (
                        <button
                          onClick={() => {
                            setSearch("");
                            setStatusFilter("all");
                            setVerificationFilter("all");
                            setTierFilter("all");
                          }}
                          className="mt-3 px-3 py-1 text-xs font-medium text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg transition"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                companies.map((c, index) => {
                  const serialNumber = (page - 1) * limit + index + 1;
                  const formattedDate = c.createdAt
                    ? new Date(c.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "—";

                  return (
                    <tr
                      key={c._id}
                      onClick={() => setSelectedCompany(c)}
                      className={`hover:bg-slate-50/80 transition-colors group cursor-pointer ${
                        selectedCompany?._id === c._id ? "bg-teal-50/40 ring-1 ring-teal-500/30" : ""
                      }`}
                    >
                      {/* S.N. Column */}
                      <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-400 font-medium">
                        {serialNumber}
                      </td>

                      {/* Organization Column */}
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-500 via-cyan-600 to-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-2xs">
                            {c.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCompany(c);
                              }}
                              className="font-semibold text-slate-900 group-hover:text-teal-700 transition-colors leading-tight hover:underline flex items-center gap-1 text-left"
                            >
                              <span>{c.name}</span>
                              <ExternalLink className="h-2.5 w-2.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                            {c.registrationNumber && (
                              <div className="text-[10px] text-slate-400 font-mono leading-tight mt-0.5">
                                Reg: {c.registrationNumber}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Domain / DNS Status */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-700">
                          <Globe className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{c.domain}</span>
                        </div>
                        <div className="mt-0.5 pl-4">
                          {getDnsBadge(c.dnsVerificationStatus)}
                        </div>
                      </td>

                      {/* Plan Tier */}
                      <td className="py-2.5 px-3">
                        {getTierBadge(c.subscriptionTier)}
                      </td>

                      {/* Industry & Country */}
                      <td className="py-2.5 px-3">
                        <div className="text-slate-800 font-medium text-[11px] leading-tight">
                          {c.industry || "General Industry"}
                        </div>
                        <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                          {c.country || "Global"}
                        </div>
                      </td>

                      {/* Status Column */}
                      <td className="py-2.5 px-3">{getStatusBadge(c.status)}</td>

                      {/* Created Date */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium text-[11px]">
                          <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{formattedDate}</span>
                        </div>
                      </td>

                      {/* Actions Menu */}
                      <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="relative inline-block text-left action-menu-container">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === c._id ? null : c._id);
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>

                          {activeMenuId === c._id && (
                            <div className="origin-top-right absolute right-0 mt-1 w-48 rounded-xl shadow-lg bg-white border border-slate-200 z-30 py-1 focus:outline-none divide-y divide-slate-100 text-xs animate-in fade-in zoom-in-95">
                              <div className="py-0.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCompany(c);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                                >
                                  <ExternalLink className="h-3 w-3 text-slate-400" />
                                  View Profile
                                </button>
                                <button
                                  onClick={() => handleVerifyDns(c)}
                                  className="w-full text-left px-3 py-1.5 text-teal-700 hover:bg-teal-50 flex items-center gap-2 font-medium"
                                >
                                  <ShieldCheck className="h-3 w-3 text-teal-600" />
                                  Verify DNS Now
                                </button>
                              </div>

                              <div className="py-0.5">
                                <button
                                  onClick={() => handleToggleStatus(c)}
                                  className={`w-full text-left px-3 py-1.5 flex items-center gap-2 font-medium ${
                                    c.status === "Active"
                                      ? "text-rose-600 hover:bg-rose-50"
                                      : "text-emerald-600 hover:bg-emerald-50"
                                  }`}
                                >
                                  {c.status === "Active" ? (
                                    <>
                                      <XCircle className="h-3 w-3 text-rose-500" />
                                      Suspend Account
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                      Activate Account
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Live Pagination Footer (Fixed at Table Bottom) */}
        <div className="py-2.5 px-3.5 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-3">
            <div>
              Showing{" "}
              <span className="font-semibold text-slate-900">
                {companies.length > 0 ? (page - 1) * limit + 1 : 0}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-slate-900">
                {Math.min(page * limit, paginationMeta.total)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-900">{paginationMeta.total}</span> organizations
            </div>

            {/* Rows Per Page Selector */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
              <span className="text-[11px] text-slate-500">Rows:</span>
              <select
                value={limit}
                onChange={(e) => {
                  const newLimit = Number(e.target.value);
                  setLimit(newLimit);
                  setPage(1);
                }}
                className="py-0.5 px-2 text-xs font-semibold bg-white border border-slate-300 rounded-md text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="inline-flex items-center gap-1 px-2.5 py-1 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition font-medium text-xs"
            >
              <ChevronLeft className="h-3 w-3" />
              Previous
            </button>

            <span className="px-2 font-semibold text-slate-700 text-xs">
              Page {paginationMeta.page} of {Math.max(1, paginationMeta.totalPages)}
            </span>

            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= paginationMeta.totalPages || loading}
              className="inline-flex items-center gap-1 px-2.5 py-1 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition font-medium text-xs"
            >
              Next
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

        {/* Side Detail Drawer (Screen 4 Match) */}
        {selectedCompany && (
          <OrganizationDetailDrawer
            company={selectedCompany}
            onClose={() => setSelectedCompany(null)}
            onRefreshCompany={() => {
              fetchCompanies();
            }}
            isAdmin={isAdmin}
          />
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL: ONBOARD NEW ORGANIZATION                                */}
      {/* ============================================================== */}
      {onboardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Onboard Organization</h3>
                  <p className="text-[11px] text-slate-500">
                    Creates company profile &amp; triggers automated DNS verification.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOnboardModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitOnboard} className="p-5 space-y-3.5">
              {onboardError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                  <span>{onboardError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Organization Legal Name *
                </label>
                <input
                  type="text"
                  required
                  value={onboardForm.name}
                  onChange={(e) => setOnboardForm({ ...onboardForm, name: e.target.value })}
                  placeholder="e.g. Acme AI Global Corp"
                  className="w-full text-xs py-2 px-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Primary Domain * (DNS Verified)
                </label>
                <input
                  type="text"
                  required
                  value={onboardForm.domain}
                  onChange={(e) => setOnboardForm({ ...onboardForm, domain: e.target.value })}
                  placeholder="e.g. acme-ai.com"
                  className="w-full text-xs py-2 px-3 bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Industry
                  </label>
                  <input
                    type="text"
                    value={onboardForm.industry}
                    onChange={(e) => setOnboardForm({ ...onboardForm, industry: e.target.value })}
                    placeholder="e.g. FinTech / Healthcare"
                    className="w-full text-xs py-2 px-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subscription Tier
                  </label>
                  <select
                    value={onboardForm.subscriptionTier}
                    onChange={(e) =>
                      setOnboardForm({ ...onboardForm, subscriptionTier: e.target.value as SubscriptionTier })
                    }
                    className="w-full text-xs py-2 px-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition cursor-pointer"
                  >
                    <option value="Gold">Gold Enterprise</option>
                    <option value="Silver">Silver Scale</option>
                    <option value="Bronze">Bronze Starter</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Registration / Tax ID
                  </label>
                  <input
                    type="text"
                    value={onboardForm.registrationNumber}
                    onChange={(e) => setOnboardForm({ ...onboardForm, registrationNumber: e.target.value })}
                    placeholder="e.g. REG-2026-8819"
                    className="w-full text-xs py-2 px-3 bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jurisdiction Country
                  </label>
                  <input
                    type="text"
                    value={onboardForm.country}
                    onChange={(e) => setOnboardForm({ ...onboardForm, country: e.target.value })}
                    placeholder="e.g. United States / India"
                    className="w-full text-xs py-2 px-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOnboardModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={onboardLoading}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center gap-1.5"
                >
                  {onboardLoading ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Onboarding...
                    </>
                  ) : (
                    <>
                      <Plus className="h-3 w-3" />
                      Create Organization
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reusable Confirmation Dialog Modal */}
      <Modal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.action}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        variant={confirmModal.variant}
        loading={confirmModal.loading}
      />
    </div>
  );
}
