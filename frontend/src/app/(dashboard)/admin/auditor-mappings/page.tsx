"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { TableBodySkeletonRows } from "@/components/shared/PageSkeletons";
import {
  UserCheck,
  Building2,
  Users,
  Search,
  Filter,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  ShieldCheck,
  Calendar,
  User,
  ArrowRight,
  Layers,
  ChevronLeft,
  ChevronRight,
  Shield,
  Activity,
} from "lucide-react";
import { auditorMappingService } from "@/services/auditorMapping.service";
import { userService } from "@/services/user.service";
import { companyService } from "@/services/company.service";
import { AuditorOrganizationMapping } from "@/types/auditorMapping.types";
import { User as UserType } from "@/types/auth.types";
import { Company } from "@/types/company.types";
import { useAuth } from "@/context/AuthContext";

export default function AuditorMappingsPage() {
  const { user: currentUser, isSuperAdmin, isOrgAdmin } = useAuth();
  const userCompanyId = currentUser?.companyId
    ? typeof currentUser.companyId === "string"
      ? currentUser.companyId
      : currentUser.companyId._id
    : "";
  // Live State
  const [mappings, setMappings] = useState<AuditorOrganizationMapping[]>([]);
  const [assessors, setAssessors] = useState<UserType[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

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
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string>("all");
  const [selectedAuditorFilter, setSelectedAuditorFilter] = useState<string>("all");

  // Modal: Create Assignment
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    auditorId: "",
    organizationId: "",
  });

  // Modal: Unassign Confirmation
  const [unassignModalOpen, setUnassignModalOpen] = useState(false);
  const [mappingToUnassign, setMappingToUnassign] = useState<AuditorOrganizationMapping | null>(null);
  const [unassignLoading, setUnassignLoading] = useState(false);

  // Fetch all mappings from Live Backend
  const fetchMappings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await auditorMappingService.getAllMappings({
        page,
        limit,
        status: statusFilter,
        organizationId: selectedOrgFilter !== "all" ? selectedOrgFilter : undefined,
        auditorId: selectedAuditorFilter !== "all" ? selectedAuditorFilter : undefined,
      });

      if (res && res.data) {
        setMappings(res.data.mappings || []);
        if (res.data.pagination) {
          setPaginationMeta(res.data.pagination);
        }
      }
    } catch (err: any) {
      console.error("Failed to load auditor mappings:", err);
      setError(err?.message || "Failed to load auditor assignments from server.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, selectedOrgFilter, selectedAuditorFilter]);

  // Load Dropdown Options (Assessors & Organizations)
  const fetchDropdownOptions = useCallback(async () => {
    try {
      const [usersRes, orgsRes] = await Promise.all([
        userService.getUsers({ limit: 100, role: "Assessor" }),
        companyService.getCompanies({ limit: 100 }),
      ]);

      if (usersRes?.data) {
        setAssessors(usersRes.data);
      }
      if (orgsRes?.data) {
        setCompanies(orgsRes.data);
      }
    } catch (err) {
      console.error("Failed to fetch dropdown options:", err);
    }
  }, []);

  useEffect(() => {
    fetchDropdownOptions();
  }, [fetchDropdownOptions]);

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  // Client-side quick filter on search string
  const filteredMappings = useMemo(() => {
    if (!search.trim()) return mappings;
    const q = search.toLowerCase().trim();
    return mappings.filter((m) => {
      const auditor = typeof m.auditorId === "object" ? m.auditorId : null;
      const org = typeof m.organizationId === "object" ? m.organizationId : null;
      const auditorName = auditor?.name?.toLowerCase() || "";
      const auditorEmail = auditor?.email?.toLowerCase() || "";
      const orgName = org?.name?.toLowerCase() || "";
      const orgDomain = org?.domain?.toLowerCase() || "";

      return (
        auditorName.includes(q) ||
        auditorEmail.includes(q) ||
        orgName.includes(q) ||
        orgDomain.includes(q)
      );
    });
  }, [mappings, search]);

  // Metric Computations
  const totalCount = paginationMeta.total || mappings.length;
  const activeCount = mappings.filter((m) => m.status === "Active").length;
  const uniqueAssessors = useMemo(() => {
    const set = new Set<string>();
    mappings.forEach((m) => {
      const id = typeof m.auditorId === "object" ? m.auditorId?._id : m.auditorId;
      if (id) set.add(id);
    });
    return set.size;
  }, [mappings]);

  const uniqueOrgs = useMemo(() => {
    const set = new Set<string>();
    mappings.forEach((m) => {
      const id = typeof m.organizationId === "object" ? m.organizationId?._id : m.organizationId;
      if (id) set.add(id);
    });
    return set.size;
  }, [mappings]);

  // Handle Create Assignment
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetOrgId = !isSuperAdmin && userCompanyId ? userCompanyId : createForm.organizationId;
    if (!createForm.auditorId || !targetOrgId) {
      setCreateError("Please select both a certified assessor and a client organization.");
      return;
    }

    setCreateLoading(true);
    setCreateError(null);

    try {
      await auditorMappingService.createMapping({
        auditorId: createForm.auditorId,
        organizationId: targetOrgId,
      });

      setActionSuccess("Assessor scope successfully assigned!");
      setTimeout(() => setActionSuccess(null), 4000);
      setCreateModalOpen(false);
      setCreateForm({ auditorId: "", organizationId: "" });
      fetchMappings();
    } catch (err: any) {
      console.error("Create mapping error:", err);
      setCreateError(
        err?.response?.data?.message ||
        err?.message ||
        "Failed to assign assessor to organization. Mapping may already exist."
      );
    } finally {
      setCreateLoading(false);
    }
  };

  // Handle Unassign / Deactivate
  const handleConfirmUnassign = async () => {
    if (!mappingToUnassign) return;
    setUnassignLoading(true);

    try {
      await auditorMappingService.deleteMapping(mappingToUnassign._id);
      setActionSuccess("Auditor scope assignment successfully unassigned/deactivated.");
      setTimeout(() => setActionSuccess(null), 4000);
      setUnassignModalOpen(false);
      setMappingToUnassign(null);
      fetchMappings();
    } catch (err: any) {
      console.error("Unassign error:", err);
      setError(err?.message || "Failed to unassign auditor mapping.");
    } finally {
      setUnassignLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-3 min-h-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Auditor Mappings &amp; Engagements
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
              Many-to-Many Hub
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Assign certified assessors to client organizations and manage their active assessment scopes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchMappings()}
            disabled={loading}
            title="Refresh assignments"
            className="p-2 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-teal-600" : ""}`} />
          </button>

          <button
            onClick={() => {
              setCreateError(null);
              setCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-teal-500 via-cyan-600 to-blue-600 hover:opacity-95 text-white font-medium text-xs sm:text-sm rounded-lg shadow-sm transition"
          >
            <Plus className="h-4 w-4" />
            + New Assignment
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3.5 py-2.5 rounded-lg flex items-center justify-between shadow-2xs shrink-0 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-3.5 py-2.5 rounded-lg flex items-center justify-between shadow-2xs shrink-0 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Compact 4-Card Metric Grid (Fixed Top) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        {/* Card 1: Total Mappings */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-2xs hover:shadow-xs transition flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center shrink-0 border border-cyan-100">
            <Layers className="h-5 w-5" strokeWidth={1.85} />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-black text-slate-900 leading-tight tracking-tight">{totalCount}</div>
            <div className="text-[11px] font-medium text-slate-500 truncate mt-0.5">Total Mappings</div>
            <div className="text-[10px] font-semibold text-cyan-600 mt-0.5">Database Registry</div>
          </div>
        </div>

        {/* Card 2: Active Engagements */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-2xs hover:shadow-xs transition flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <Activity className="h-5 w-5" strokeWidth={1.85} />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-black text-slate-900 leading-tight tracking-tight">{activeCount}</div>
            <div className="text-[11px] font-medium text-slate-500 truncate mt-0.5">Active Scopes</div>
            <div className="text-[10px] font-semibold text-emerald-600 mt-0.5">● Ready for Audit</div>
          </div>
        </div>

        {/* Card 3: Assigned Assessors */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-2xs hover:shadow-xs transition flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-100">
            <UserCheck className="h-5 w-5" strokeWidth={1.85} />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-black text-slate-900 leading-tight tracking-tight">{uniqueAssessors}</div>
            <div className="text-[11px] font-medium text-slate-500 truncate mt-0.5">Mapped Assessors</div>
            <div className="text-[10px] font-semibold text-teal-600 mt-0.5">Active Certified</div>
          </div>
        </div>

        {/* Card 4: Covered Organizations */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-2xs hover:shadow-xs transition flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100">
            <Building2 className="h-5 w-5" strokeWidth={1.85} />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-black text-slate-900 leading-tight tracking-tight">{uniqueOrgs}</div>
            <div className="text-[11px] font-medium text-slate-500 truncate mt-0.5">Client Organizations</div>
            <div className="text-[10px] font-semibold text-blue-600 mt-0.5">Covered Portfolios</div>
          </div>
        </div>
      </div>

      {/* Filter & Action Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-2.5 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by assessor or organization..."
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

          {/* Filters */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <div className="flex items-center text-[11px] text-slate-500 px-1">
              <Filter className="h-3 w-3 text-slate-400 mr-1" />
              <span>Filters:</span>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="py-1 px-2.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:border-teal-500 transition"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive Only</option>
            </select>

            {/* Assessor Filter */}
            <select
              value={selectedAuditorFilter}
              onChange={(e) => {
                setSelectedAuditorFilter(e.target.value);
                setPage(1);
              }}
              className="py-1 px-2.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:border-teal-500 transition max-w-[160px] truncate"
            >
              <option value="all">All Assessors</option>
              {assessors.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name} ({a.email})
                </option>
              ))}
            </select>

            {/* Organization Filter */}
            <select
              value={selectedOrgFilter}
              onChange={(e) => {
                setSelectedOrgFilter(e.target.value);
                setPage(1);
              }}
              className="py-1 px-2.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:border-teal-500 transition max-w-[160px] truncate"
            >
              <option value="all">All Organizations</option>
              {companies.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>

            {(statusFilter !== "All" || selectedOrgFilter !== "all" || selectedAuditorFilter !== "all" || search) && (
              <button
                onClick={() => {
                  setStatusFilter("All");
                  setSelectedOrgFilter("all");
                  setSelectedAuditorFilter("all");
                  setSearch("");
                  setPage(1);
                }}
                className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50 transition"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium shrink-0 self-end md:self-center">
          Showing <span className="font-bold text-slate-800">{filteredMappings.length}</span> of{" "}
          <span className="font-bold text-slate-800">{paginationMeta.total}</span> mappings
        </div>
      </div>

      {/* Main Data Table Card */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse text-xs">
            {/* Sticky Table Header */}
            <thead className="bg-slate-50/90 sticky top-0 z-10 border-b border-slate-200/80 backdrop-blur-xs">
              <tr className="text-slate-600 font-semibold uppercase text-[10.5px] tracking-wider">
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3">Certified Assessor</th>
                <th className="py-2.5 px-3">Assigned Organization</th>
                <th className="py-2.5 px-3">Scope Status</th>
                <th className="py-2.5 px-3">Assigned By</th>
                <th className="py-2.5 px-3">Assigned Date</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading && mappings.length === 0 ? (
                <TableBodySkeletonRows rows={6} cols={7} />
              ) : filteredMappings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <UserCheck className="h-5 w-5" />
                      </div>
                      <p className="font-medium text-slate-600 text-sm">No auditor assignments found</p>
                      <p className="text-xs text-slate-400 max-w-sm text-center">
                        {search || statusFilter !== "All" || selectedOrgFilter !== "all" || selectedAuditorFilter !== "all"
                          ? "Try adjusting your search queries or filter selections."
                          : "Click '+ New Assignment' above to map your first certified assessor to an organization."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMappings.map((m, idx) => {
                  const auditor = typeof m.auditorId === "object" ? (m.auditorId as UserType) : null;
                  const org = typeof m.organizationId === "object" ? (m.organizationId as Company) : null;
                  const assigner = typeof m.assignedBy === "object" ? m.assignedBy : null;
                  const isActive = m.status === "Active";

                  const auditorInitial = auditor?.name?.charAt(0)?.toUpperCase() || "A";
                  const orgInitial = org?.name?.charAt(0)?.toUpperCase() || "O";

                  return (
                    <tr
                      key={m._id}
                      className="hover:bg-slate-50/75 transition-colors group"
                    >
                      {/* S.N. */}
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {(page - 1) * limit + idx + 1}
                      </td>

                      {/* Auditor Details */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-cyan-600 to-teal-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                            {auditorInitial}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate">
                              {auditor?.name || "Unknown Assessor"}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {auditor?.email || "No email provided"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Organization Details */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center justify-center font-bold text-xs shrink-0">
                            {orgInitial}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate">
                              {org?.name || "Unknown Organization"}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate flex items-center gap-1.5">
                              <span>{org?.domain || "No domain"}</span>
                              {((org as any)?.dnsVerificationStatus === "Verified" || (org as any)?.verificationStatus === "Verified") && (
                                <span className="inline-flex items-center text-[10px] text-emerald-600 font-semibold">
                                  <ShieldCheck className="h-3 w-3 mr-0.5 inline" /> Verified
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Scope Status */}
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                            }`}
                          />
                          {isActive ? "Active Scope" : "Inactive Scope"}
                        </span>
                      </td>

                      {/* Assigned By */}
                      <td className="py-2.5 px-3 text-slate-600">
                        <div className="truncate max-w-[140px]" title={assigner?.email || ""}>
                          <span className="font-medium text-slate-800">
                            {assigner?.name || "System Admin"}
                          </span>
                          {assigner?.email && (
                            <span className="block text-[10.5px] text-slate-400 truncate">
                              {assigner.email}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Assigned Date */}
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                        {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : "—"}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isActive ? (
                            <button
                              onClick={() => {
                                setMappingToUnassign(m);
                                setUnassignModalOpen(true);
                              }}
                              title="Unassign / Deactivate scope"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-rose-600 hover:text-rose-700 bg-rose-50/70 hover:bg-rose-100 border border-rose-200/80 rounded-md transition"
                            >
                              <Trash2 className="h-3 w-3" />
                              Unassign
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium px-2 py-1">
                              Deactivated
                            </span>
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

        {/* Sticky Table Footer Pagination */}
        <div className="bg-slate-50/90 border-t border-slate-200/80 px-4 py-2.5 flex items-center justify-between shrink-0 text-xs">
          <div className="text-slate-500">
            Page <span className="font-bold text-slate-800">{page}</span> of{" "}
            <span className="font-bold text-slate-800">{paginationMeta.totalPages || 1}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-1 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-md disabled:opacity-40 transition"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(paginationMeta.totalPages || 1, p + 1))}
              disabled={page >= (paginationMeta.totalPages || 1) || loading}
              className="p-1 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-md disabled:opacity-40 transition"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal 1: Create New Assignment */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Assign Assessor to Organization</h3>
                  <p className="text-xs text-slate-500">
                    Establish an assessment authorization scope mapping in MongoDB.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateAssignment} className="p-5 space-y-4 text-xs">
              {createError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              {/* Informational Scope Note */}
              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-lg text-blue-800 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-blue-600" />
                  Many-to-Many Architecture
                </div>
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  An assessor can be granted active review privileges for multiple independent organizations.
                  Similarly, an organization can be assessed by multiple specialized assessors.
                </p>
              </div>

              {/* Select Certified Assessor */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Certified Assessor <span className="text-rose-500">*</span>
                </label>
                <select
                  value={createForm.auditorId}
                  onChange={(e) => setCreateForm({ ...createForm, auditorId: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-xs transition"
                >
                  <option value="">-- Choose an Assessor --</option>
                  {assessors.map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.name} — {a.email} {a.status === "Active" ? "(Active)" : "(Inactive)"}
                    </option>
                  ))}
                </select>
                <p className="text-[10.5px] text-slate-400 mt-1">
                  Only users with the certified <code>Assessor</code> role are listed.
                </p>
              </div>

              {/* Select Client Organization */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Client Organization <span className="text-rose-500">*</span>
                </label>
                <select
                  disabled={!isSuperAdmin && Boolean(userCompanyId)}
                  value={!isSuperAdmin && userCompanyId ? userCompanyId : createForm.organizationId}
                  onChange={(e) => setCreateForm({ ...createForm, organizationId: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-xs transition disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
                >
                  <option value="">-- Choose a Client Organization --</option>
                  {companies.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} {c.domain ? `(${c.domain})` : ""}
                    </option>
                  ))}
                </select>
                {!isSuperAdmin && userCompanyId ? (
                  <p className="text-[10.5px] text-purple-600 font-medium mt-1">
                    Organization Admin: Scoped strictly to your organization.
                  </p>
                ) : (
                  <p className="text-[10.5px] text-slate-400 mt-1">
                    The client organization where the assessor will perform audit verifications.
                  </p>
                )}
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg font-medium text-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-1.5 bg-gradient-to-r from-teal-500 via-cyan-600 to-blue-600 hover:opacity-95 text-white font-semibold rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {createLoading ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-3.5 w-3.5" />
                      Confirm Assignment
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Confirm Unassign / Deactivate */}
      {unassignModalOpen && mappingToUnassign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-200">
                  <Trash2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Unassign Assessor Scope</h3>
                  <p className="text-xs text-slate-500">Confirm revocation of auditing scope</p>
                </div>
              </div>
              <button
                onClick={() => setUnassignModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Are you sure you want to deactivate the assessment authorization between:
              </p>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 font-medium">
                <div className="flex items-center gap-2 text-slate-800">
                  <User className="h-3.5 w-3.5 text-teal-600" />
                  <span>
                    {typeof mappingToUnassign.auditorId === "object"
                      ? (mappingToUnassign.auditorId as UserType)?.name
                      : "Assessor"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-800">
                  <ArrowRight className="h-3 w-3 text-slate-400" />
                  <Building2 className="h-3.5 w-3.5 text-blue-600" />
                  <span>
                    {typeof mappingToUnassign.organizationId === "object"
                      ? (mappingToUnassign.organizationId as Company)?.name
                      : "Organization"}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                This will soft-deactivate the engagement record in MongoDB and create an audit log. The assessor will no longer see this organization in their active audit portfolio.
              </p>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUnassignModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg font-medium text-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmUnassign}
                  disabled={unassignLoading}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {unassignLoading ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Unassigning...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-3.5 w-3.5" />
                      Confirm Unassign
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
