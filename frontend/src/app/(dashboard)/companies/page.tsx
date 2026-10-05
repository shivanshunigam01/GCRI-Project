"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { companyService } from "@/services/company.service";
import { Company } from "@/types/company.types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Building2,
  Plus,
  Search,
  RefreshCw,
  Globe,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { OnboardCompanyModal } from "@/components/features/companies/OnboardCompanyModal";
import { StatusToggleModal } from "@/components/features/companies/StatusToggleModal";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"ALL" | "VERIFIED" | "PENDING">("ALL");

  // Tab count caches
  const [allCount, setAllCount] = useState(0);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [statusModalCompany, setStatusModalCompany] = useState<{
    _id: string;
    name: string;
    status: "Active" | "Suspended";
  } | null>(null);

  // Fetch summary counts for the 3 tabs
  const fetchCounts = useCallback(async () => {
    try {
      const [allRes, verRes, pendRes] = await Promise.all([
        companyService.getAll({ limit: 1 }),
        companyService.getAll({ limit: 1, verificationStatus: "Verified" }),
        companyService.getAll({ limit: 1, verificationStatus: "Pending" }),
      ]);
      if (allRes.data) setAllCount(allRes.data.total ?? 0);
      if (verRes.data) setVerifiedCount(verRes.data.total ?? 0);
      if (pendRes.data) setPendingCount(pendRes.data.total ?? 0);
    } catch {
      // Fallback silently
    }
  }, []);

  // Primary data loader
  const loadData = useCallback(
    async (
      targetPage: number,
      targetLimit: number,
      targetSearch: string,
      targetTab: "ALL" | "VERIFIED" | "PENDING"
    ) => {
      setLoading(true);
      try {
        const params: {
          page: number;
          limit: number;
          search?: string;
          verificationStatus?: string;
        } = {
          page: targetPage,
          limit: targetLimit,
        };

        if (targetSearch.trim()) {
          params.search = targetSearch.trim();
        }

        if (targetTab === "VERIFIED") {
          params.verificationStatus = "Verified";
        } else if (targetTab === "PENDING") {
          params.verificationStatus = "Pending";
        }

        const res = await companyService.getAll(params);

        if (res.success && res.data) {
          const list = Array.isArray(res.data)
            ? res.data
            : Array.isArray((res.data as any).companies)
            ? (res.data as any).companies
            : [];
          setCompanies(list);

          const totalCount =
            (res.data as any).total ??
            res.pagination?.total ??
            list.length;
          const calcPages =
            (res.data as any).totalPages ??
            res.pagination?.totalPages ??
            Math.max(1, Math.ceil(totalCount / targetLimit));

          setTotal(totalCount);
          setTotalPages(calcPages);
        } else {
          setCompanies([]);
          setTotal(0);
          setTotalPages(1);
        }
      } catch {
        setCompanies([]);
        setTotal(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  useEffect(() => {
    loadData(page, limit, search, filterTab);
  }, [page, limit, search, filterTab, loadData]);

  const handleTabChange = (newTab: "ALL" | "VERIFIED" | "PENDING") => {
    setFilterTab(newTab);
    setPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLimit = Number(e.target.value);
    setLimit(newLimit);
    setPage(1);
  };

  const handleRefresh = async () => {
    await Promise.all([
      loadData(page, limit, search, filterTab),
      fetchCounts(),
    ]);
  };

  const handleVerifyDns = async (id: string) => {
    setVerifyingId(id);
    try {
      await companyService.verifyDns(id);
      await Promise.all([
        loadData(page, limit, search, filterTab),
        fetchCounts(),
      ]);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleOnboardSuccess = async () => {
    setPage(1);
    setSearch("");
    setFilterTab("ALL");
    await Promise.all([
      loadData(1, limit, "", "ALL"),
      fetchCounts(),
    ]);
  };

  // Pagination boundaries
  const fromRecord = total === 0 ? 0 : (page - 1) * limit + 1;
  const toRecord = Math.min(total, page * limit);

  // Dynamic Page numbers calculation
  const pageNumbers = useMemo(() => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", page - 1, page, page + 1, "...", totalPages);
      }
    }
    return pages;
  }, [page, totalPages]);

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full space-y-2.5">
      {/* 1. Fixed Single-Row Toolbar */}
      <div className="shrink-0 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 bg-white p-3 rounded-2xl border border-zinc-200/90 shadow-2xs">
        {/* Left: Filter Tabs with Dynamic Live Counts */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 border border-zinc-200/80 overflow-x-auto">
          <button
            onClick={() => handleTabChange("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              filterTab === "ALL"
                ? "bg-white text-zinc-950 shadow-2xs font-bold"
                : "text-zinc-600 hover:text-zinc-950"
            }`}
          >
            All ({allCount || companies.length})
          </button>
          <button
            onClick={() => handleTabChange("VERIFIED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              filterTab === "VERIFIED"
                ? "bg-white text-emerald-800 shadow-2xs font-bold"
                : "text-zinc-600 hover:text-zinc-950"
            }`}
          >
            DNS Verified ({verifiedCount})
          </button>
          <button
            onClick={() => handleTabChange("PENDING")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              filterTab === "PENDING"
                ? "bg-white text-amber-800 shadow-2xs font-bold"
                : "text-zinc-600 hover:text-zinc-950"
            }`}
          >
            Pending ({pendingCount})
          </button>
        </div>

        {/* Right: Search + Refresh + Onboard Organization in single line */}
        <div className="flex items-center gap-2.5 w-full xl:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search name or domain..."
              value={search}
              onChange={handleSearchChange}
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-zinc-200 bg-zinc-50/80 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-950 focus:bg-white focus:ring-1 focus:ring-zinc-950 transition-all shadow-2xs"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="h-9 px-3 gap-1.5 rounded-xl border-zinc-200 text-xs text-zinc-700 hover:text-zinc-950 shrink-0 shadow-2xs cursor-pointer"
            title="Refresh directory"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowOnboardModal(true)}
            className="h-9 px-3.5 gap-1.5 rounded-xl text-xs font-semibold shrink-0 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard Organization</span>
          </Button>
        </div>
      </div>

      {/* 2. Table Card (Fixed Container: Only Row Data Scrolls) */}
      <div className="flex flex-col flex-1 min-h-0 bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Scrollable Rows Viewport */}
        <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 shadow-2xs">
              <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="w-14 px-4 py-3.5 text-center bg-slate-50 whitespace-nowrap font-mono text-slate-400">
                  S.N.
                </th>
                <th className="px-5 py-3.5 bg-slate-50 whitespace-nowrap">Organization</th>
                <th className="px-5 py-3.5 bg-slate-50 whitespace-nowrap">Primary Domain</th>
                <th className="px-5 py-3.5 bg-slate-50 whitespace-nowrap">Industry</th>
                <th className="px-5 py-3.5 bg-slate-50 whitespace-nowrap">DNS Verification</th>
                <th className="px-5 py-3.5 bg-slate-50 whitespace-nowrap">Status</th>
                <th className="px-5 py-3.5 text-right bg-slate-50 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-20 text-center text-zinc-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-zinc-700" />
                      <span className="font-medium text-zinc-500">Querying organizations...</span>
                    </div>
                  </td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-800 flex items-center justify-center">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-zinc-900">No organizations found</p>
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        {search
                          ? `No matches found for "${search}". Try adjusting your search query.`
                          : "Start by onboarding your first enterprise organization to initiate Responsible AI assessments."}
                      </p>
                      {!search && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setShowOnboardModal(true)}
                          className="gap-2 mt-1 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Onboard First Organization</span>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                companies.map((company, index) => (
                  <tr key={company._id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="w-14 px-4 py-3.5 text-center font-mono text-[11px] font-medium text-zinc-400">
                      {(page - 1) * limit + index + 1}
                    </td>
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/companies/${company._id}`}
                        className="group flex items-start gap-3 hover:opacity-90 py-0.5"
                      >
                        <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs group-hover:bg-indigo-600 transition-colors mt-0.5">
                          {company.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-zinc-900 group-hover:text-indigo-600 transition-colors leading-snug">
                            {company.name}
                          </p>
                          <p className="text-[11px] text-zinc-400 font-medium leading-tight mt-0.5">
                            {company.country || "Global Headquarters"}
                          </p>
                          {company.clientUser?.email && (
                            <p className="text-[11px] text-zinc-500 font-mono leading-tight mt-1 truncate max-w-xs sm:max-w-sm xl:max-w-md">
                              {company.clientUser.email}
                            </p>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-zinc-600">
                      <div className="flex items-center gap-1.5 break-all max-w-[220px] 2xl:max-w-none">
                        <Globe className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span>{company.domain}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-600 text-xs">
                      {company.industry || "Enterprise Technology"}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge
                        variant={
                          company.verificationStatus === "Verified"
                            ? "verified"
                            : company.verificationStatus === "Pending"
                            ? "pending"
                            : "rejected"
                        }
                      >
                        {company.verificationStatus || "Pending"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge
                        variant={
                          company.status === "Active"
                            ? "active"
                            : company.status === "Suspended"
                            ? "suspended"
                            : "neutral"
                        }
                      >
                        {company.status || "Active"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          isLoading={verifyingId === company._id}
                          onClick={() => handleVerifyDns(company._id)}
                          className="text-xs gap-1 h-8"
                          title="Re-run DNS lookup"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span className="hidden xl:inline">Validate DNS</span>
                        </Button>

                        {company.status === "Active" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setStatusModalCompany({
                                _id: company._id,
                                name: company.name,
                                status: "Active",
                              })
                            }
                            className="text-xs h-8 px-2 text-zinc-600 hover:text-rose-600 hover:border-rose-200 cursor-pointer"
                            title="Suspend organization"
                          >
                            <span>Suspend</span>
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setStatusModalCompany({
                                _id: company._id,
                                name: company.name,
                                status: "Suspended",
                              })
                            }
                            className="text-xs h-8 px-2 text-emerald-700 bg-emerald-50/60 border-emerald-200 hover:bg-emerald-100 font-medium cursor-pointer"
                            title="Reactivate organization"
                          >
                            <span>Activate</span>
                          </Button>
                        )}

                        <Link href={`/companies/${company._id}`}>
                          <Button variant="outline" size="sm" className="text-xs h-8 px-2.5 font-medium cursor-pointer">
                            <span>Details</span>
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 3. Fixed Pagination Footer */}
        <div className="shrink-0 px-5 py-2.5 border-t border-slate-200/90 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-600">
          {/* Left: Record Range & Page Size Dropdown */}
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
            <span className="text-zinc-500 font-medium">
              Showing <span className="font-semibold text-zinc-900">{fromRecord}</span> to{" "}
              <span className="font-semibold text-zinc-900">{toRecord}</span> of{" "}
              <span className="font-semibold text-zinc-900">{total}</span> organizations
            </span>

            <div className="flex items-center gap-1.5 pl-3 border-l border-zinc-200">
              <span className="text-[11px] text-zinc-400 font-medium">Per page:</span>
              <select
                value={limit}
                onChange={handleLimitChange}
                disabled={loading}
                className="h-7 px-2 rounded-lg border border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-800 focus:outline-none focus:border-zinc-950 focus:bg-white focus:ring-1 focus:ring-zinc-950 shadow-2xs cursor-pointer"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={200}>200</option>
              </select>
            </div>
          </div>

          {/* Right: Page Navigation Controls */}
          <div className="flex items-center gap-1.5">
            {/* First Page */}
            <button
              onClick={() => setPage(1)}
              disabled={page <= 1 || loading}
              title="First Page"
              className="p-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>

            {/* Previous Page */}
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              title="Previous Page"
              className="p-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Numeric Page Buttons */}
            <div className="flex items-center gap-1 px-1">
              {pageNumbers.map((pNum, idx) => {
                if (pNum === "...") {
                  return (
                    <span key={`ellipsis-${idx}`} className="px-1 text-zinc-400 select-none font-mono">
                      …
                    </span>
                  );
                }
                const isCurrent = pNum === page;
                return (
                  <button
                    key={`page-${pNum}`}
                    onClick={() => setPage(pNum as number)}
                    disabled={loading}
                    className={`min-w-7 h-7 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isCurrent
                        ? "bg-zinc-950 text-white shadow-xs font-bold"
                        : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 border border-transparent hover:border-zinc-200"
                    }`}
                  >
                    {pNum}
                  </button>
                );
              })}
            </div>

            {/* Next Page */}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              title="Next Page"
              className="p-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Last Page */}
            <button
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages || loading}
              title="Last Page"
              className="p-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Compact Modal Popup Dialog */}
      <OnboardCompanyModal
        isOpen={showOnboardModal}
        onClose={() => setShowOnboardModal(false)}
        onSuccess={handleOnboardSuccess}
      />

      {/* 5. Status Toggle Modal */}
      {statusModalCompany && (
        <StatusToggleModal
          isOpen={true}
          onClose={() => setStatusModalCompany(null)}
          company={statusModalCompany}
          onSuccess={() => {
            loadData(page, limit, search, filterTab);
            fetchCounts();
          }}
        />
      )}
    </div>
  );
}
