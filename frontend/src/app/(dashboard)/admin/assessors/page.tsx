"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  MoreVertical,
  Edit3,
  Key,
  Building2,
  Phone,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  X,
  UserCheck,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  userService,
  InviteUserResponse,
  AdminResetPasswordResponse,
} from "@/services/user.service";
import { companyService } from "@/services/company.service";
import { User, UserRole, UserStatus } from "@/types/auth.types";
import { Company } from "@/types/company.types";
import { useAuth } from "@/context/AuthContext";

export default function AdminAssessorsPage() {
  const { isSuperAdmin } = useAuth();
  // Live State
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Pagination & Filters
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
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Companies for dropdowns
  const [companies, setCompanies] = useState<Company[]>([]);

  // Modal 1: 48h Invitation Modal State
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<InviteUserResponse | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    role: "Assessor" as UserRole,
    companyId: "",
  });

  // Modal 2: Direct Add User (with initial credentials)
  const [directAddModalOpen, setDirectAddModalOpen] = useState(false);
  const [directAddLoading, setDirectAddLoading] = useState(false);
  const [directAddError, setDirectAddError] = useState<string | null>(null);
  const [showDirectPassword, setShowDirectPassword] = useState(false);
  const [directAddForm, setDirectAddForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "Assessor" as UserRole,
    companyId: "",
  });

  // Modal 3: Edit User Profile
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    role: "Assessor" as UserRole,
    status: "Active" as UserStatus,
    companyId: "",
  });

  // Modal 4: Password Reset Modal
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<User | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<AdminResetPasswordResponse | null>(null);
  const [copiedReset, setCopiedReset] = useState(false);

  // Active Dropdown Action Row
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load Companies
  useEffect(() => {
    companyService
      .getCompanies({ limit: 100 })
      .then((res) => {
        if (res.data) setCompanies(res.data);
      })
      .catch((err) => {
        console.warn("Could not fetch companies for dropdown:", err);
      });
  }, []);

  // Fetch Users Live from Backend
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: {
        page: number;
        limit: number;
        search?: string;
        role?: string;
        status?: string;
      } = {
        page,
        limit,
      };

      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }
      if (roleFilter !== "all") {
        params.role = roleFilter;
      }
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }

      const res = await userService.getUsers(params);
      if (res && res.data) {
        setUsers(res.data);
        if (res.pagination) {
          const p = res.pagination as any;
          setPaginationMeta({
            page: p.page || page,
            limit: p.limit || limit,
            total: p.total || 0,
            totalPages:
              p.totalPages ||
              p.pages ||
              Math.max(1, Math.ceil((p.total || 0) / (p.limit || limit))),
          });
        } else {
          setPaginationMeta({
            page,
            limit,
            total: res.data.length,
            totalPages: Math.max(1, Math.ceil(res.data.length / limit)),
          });
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch users from backend:", err);
      setError(
        err?.message ||
          "Unable to load users from the server. Please check your credentials or backend connection."
      );
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Close open dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".action-menu-container")) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  // Handle Status Toggle
  const handleToggleStatus = async (user: User) => {
    setActiveMenuId(null);
    const newStatus: UserStatus = user.status === "Active" ? "Deactivated" : "Active";
    try {
      await userService.updateUserStatus(user._id, newStatus);
      setActionSuccess(`User ${user.email} marked as ${newStatus}`);
      setTimeout(() => setActionSuccess(null), 4000);
      fetchUsers();
    } catch (err: any) {
      setError(err?.message || `Failed to update status for ${user.email}`);
      setTimeout(() => setError(null), 5000);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (user: User) => {
    setActiveMenuId(null);
    setEditingUser(user);
    const companyIdStr =
      typeof user.companyId === "string"
        ? user.companyId
        : user.companyId?._id || "";

    setEditForm({
      name: user.name || "",
      phone: user.phone || "",
      role: user.role || "Assessor",
      status: user.status || "Active",
      companyId: companyIdStr,
    });
    setEditError(null);
    setEditModalOpen(true);
  };

  // Submit Edit Form
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditLoading(true);
    setEditError(null);

    try {
      await userService.adminUpdateUser(editingUser._id, {
        name: editForm.name.trim(),
        phone: editForm.phone.trim() || undefined,
        role: editForm.role,
        status: editForm.status,
        companyId: editForm.companyId ? editForm.companyId : null,
      });

      setEditModalOpen(false);
      setActionSuccess(`User ${editingUser.email} updated successfully!`);
      setTimeout(() => setActionSuccess(null), 4000);
      fetchUsers();
    } catch (err: any) {
      console.error("Edit user error:", err);
      setEditError(err?.message || "Failed to update user details.");
    } finally {
      setEditLoading(false);
    }
  };

  // Direct Add User
  const handleSubmitDirectAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setDirectAddLoading(true);
    setDirectAddError(null);

    try {
      const regRes = await userService.registerDirectUser({
        name: directAddForm.name.trim(),
        email: directAddForm.email.trim(),
        password: directAddForm.password,
        role: directAddForm.role,
      });

      // If custom role or company selected, apply it immediately via adminUpdateUser
      const createdUserId =
        (regRes as any)?.data?.userId ||
        (regRes as any)?.data?.user?.id ||
        (regRes as any)?.data?._id;

      if (
        createdUserId &&
        (directAddForm.role !== "Assessor" || directAddForm.companyId)
      ) {
        try {
          await userService.adminUpdateUser(createdUserId, {
            role: directAddForm.role,
            companyId: directAddForm.companyId ? directAddForm.companyId : undefined,
          });
        } catch (updateErr) {
          console.warn("Could not set custom role/organization after register:", updateErr);
        }
      }

      setDirectAddModalOpen(false);
      setActionSuccess(`Account created successfully for ${directAddForm.email}!`);
      setTimeout(() => setActionSuccess(null), 4000);
      fetchUsers();
    } catch (err: any) {
      console.error("Direct add user error:", err);
      setDirectAddError(err?.message || "Failed to register user. Email may already exist.");
    } finally {
      setDirectAddLoading(false);
    }
  };

  // Open Reset Password Modal
  const handleOpenReset = (user: User) => {
    setActiveMenuId(null);
    setResetTargetUser(user);
    setResetResult(null);
    setResetError(null);
    setCopiedReset(false);
    setResetModalOpen(true);
  };

  // Submit Password Reset Request
  const handleExecuteResetPassword = async () => {
    if (!resetTargetUser) return;
    setResetLoading(true);
    setResetError(null);

    try {
      const res = await userService.adminResetPassword(resetTargetUser._id);
      if (res && res.data) {
        setResetResult(res.data);
      }
    } catch (err: any) {
      console.error("Password reset error:", err);
      setResetError(err?.message || "Failed to generate password reset token.");
    } finally {
      setResetLoading(false);
    }
  };

  // Submit Invite Form
  const handleSubmitInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setInviteError(null);

    try {
      const res = await userService.inviteUser({
        name: inviteForm.name.trim(),
        email: inviteForm.email.trim(),
        role: inviteForm.role,
        companyId: inviteForm.companyId ? inviteForm.companyId : undefined,
      });

      if (res && res.data) {
        setInviteResult(res.data);
        setActionSuccess(`Invitation generated for ${inviteForm.email}`);
        setTimeout(() => setActionSuccess(null), 4000);
        fetchUsers();
      }
    } catch (err: any) {
      console.error("Invite user error:", err);
      setInviteError(
        err?.message ||
          "Failed to send user invitation. Please ensure the email is unique."
      );
    } finally {
      setInviteLoading(false);
    }
  };

  // Helper for Role Badges
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "SuperAdmin":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-rose-50/80 text-rose-700 border border-rose-200/80 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Super Admin
          </span>
        );
      case "Admin":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-purple-50/80 text-purple-700 border border-purple-200/80 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
            Org Admin
          </span>
        );
      case "Assessor":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-50/80 text-blue-700 border border-blue-200/80 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Assessor
          </span>
        );
      case "MembershipApprover":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50/80 text-amber-700 border border-amber-200/80 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Approver
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            {role}
          </span>
        );
    }
  };

  // Helper for Status Badges
  const getStatusBadge = (status?: UserStatus) => {
    const isActive = status === "Active";
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
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
        {isActive ? "Active" : "Deactivated"}
      </span>
    );
  };

  // Helper for Initials
  const getInitials = (name?: string, email?: string) => {
    if (name && name.trim()) {
      const parts = name.trim().split(" ");
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return "US";
  };

  // Compact metrics calculated from real data
  const totalCount = paginationMeta.total;
  const activeCount = users.filter((u) => u.status === "Active").length;
  const adminCount = users.filter((u) => u.role === "Admin").length;
  const assessorCount = users.filter((u) => u.role === "Assessor").length;

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
            onClick={() => fetchUsers()}
            className="text-[11px] font-semibold px-2.5 py-1 bg-rose-100 hover:bg-rose-200 rounded-md transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Compact 4-Card Metric Grid (Fixed Top - Logo Inspired Colors) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        {/* Card 1: Total Users - Deep Ocean Blue */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-cyan-50 text-cyan-700 flex items-center justify-center shrink-0 border border-cyan-100 shadow-2xs">
            <Users className="h-5 w-5" strokeWidth={1.85} />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-extrabold text-slate-900 leading-tight tracking-tight">{totalCount}</div>
            <div className="text-[11px] font-medium text-slate-500 truncate mt-0.5">Total Users</div>
            <div className="text-[10px] font-semibold text-teal-600 mt-0.5">▲ Live in DB</div>
          </div>
        </div>

        {/* Card 2: Active Users - Vibrant Emerald/Teal */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 shadow-2xs">
            <CheckCircle2 className="h-5 w-5" strokeWidth={1.85} />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-extrabold text-slate-900 leading-tight tracking-tight">{activeCount}</div>
            <div className="text-[11px] font-medium text-slate-500 truncate mt-0.5">Active Users</div>
            <div className="text-[10px] font-semibold text-emerald-600 mt-0.5">● On this page</div>
          </div>
        </div>

        {/* Card 3: Assessors - Sky/Cyan */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-100 shadow-2xs">
            <UserCheck className="h-5 w-5" strokeWidth={1.85} />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-extrabold text-slate-900 leading-tight tracking-tight">{assessorCount}</div>
            <div className="text-[11px] font-medium text-slate-500 truncate mt-0.5">Assessors</div>
            <div className="text-[10px] font-semibold text-teal-600 mt-0.5">Auditing Team</div>
          </div>
        </div>

        {/* Card 4: Super Admins - Deep Royal Blue */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100 shadow-2xs">
            <Shield className="h-5 w-5" strokeWidth={1.85} />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-extrabold text-slate-900 leading-tight tracking-tight">{adminCount}</div>
            <div className="text-[11px] font-medium text-slate-500 truncate mt-0.5">Super Admins</div>
            <div className="text-[10px] font-semibold text-blue-600 mt-0.5">Full Privileges</div>
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
              placeholder="Search users by name or email..."
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
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs font-medium py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition cursor-pointer"
            >
              <option value="all">All Roles</option>
              {isSuperAdmin && <option value="SuperAdmin">Super Admin</option>}
              <option value="Admin">Org Admin</option>
              <option value="Assessor">Assessor</option>
              <option value="MembershipApprover">Membership Approver</option>
            </select>

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
              <option value="Deactivated">Deactivated</option>
            </select>

            {(roleFilter !== "all" || statusFilter !== "all" || search) && (
              <button
                onClick={() => {
                  setSearch("");
                  setRoleFilter("all");
                  setStatusFilter("all");
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
            onClick={() => fetchUsers()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-lg transition shadow-2xs disabled:opacity-50"
            title="Refresh Users"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => {
              setInviteForm({
                name: "",
                email: "",
                role: "Assessor",
                companyId: "",
              });
              setInviteResult(null);
              setInviteError(null);
              setCopiedInvite(false);
              setInviteModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-teal-600/90 bg-white hover:bg-teal-50/70 text-teal-700 font-semibold text-xs rounded-lg shadow-2xs transition"
          >
            <Mail className="h-3.5 w-3.5 text-teal-600" />
            <span>Send 48h Invite</span>
          </button>

          <button
            onClick={() => {
              setDirectAddForm({
                name: "",
                email: "",
                password: "",
                role: "Assessor",
                companyId: "",
              });
              setDirectAddError(null);
              setShowDirectPassword(false);
              setDirectAddModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs transition"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Users Data Table - Fixed Header & Scrollable Body */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 [scrollbar-width:thin]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50 shadow-xs border-b border-slate-200">
              <tr className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3 w-12 text-center bg-slate-50">S.N.</th>
                <th className="py-2.5 px-3.5 bg-slate-50">User</th>
                <th className="py-2.5 px-3 bg-slate-50">Role</th>
                <th className="py-2.5 px-3 bg-slate-50">Organization</th>
                <th className="py-2.5 px-3 bg-slate-50">Status</th>
                <th className="py-2.5 px-3 bg-slate-50">MFA</th>
                <th className="py-2.5 px-3 bg-slate-50">Created</th>
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
                        <div className="h-8 w-8 rounded-full bg-slate-200" />
                        <div className="space-y-1">
                          <div className="h-3 w-28 bg-slate-200 rounded" />
                          <div className="h-2.5 w-36 bg-slate-100 rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3"><div className="h-4 w-16 bg-slate-100 rounded-full" /></td>
                    <td className="py-3 px-3"><div className="h-3.5 w-24 bg-slate-100 rounded" /></td>
                    <td className="py-3 px-3"><div className="h-4 w-14 bg-slate-100 rounded-full" /></td>
                    <td className="py-3 px-3"><div className="h-3.5 w-12 bg-slate-100 rounded" /></td>
                    <td className="py-3 px-3"><div className="h-3.5 w-16 bg-slate-100 rounded" /></td>
                    <td className="py-3 px-3 text-right"><div className="h-6 w-6 bg-slate-100 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <div className="max-w-xs mx-auto flex flex-col items-center justify-center text-slate-400">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                        <Users className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-bold text-slate-700">No users found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {debouncedSearch || roleFilter !== "all" || statusFilter !== "all"
                          ? "No user accounts match your search filters."
                          : "No users registered in this system yet."}
                      </p>
                      {(debouncedSearch || roleFilter !== "all" || statusFilter !== "all") && (
                        <button
                          onClick={() => {
                            setSearch("");
                            setRoleFilter("all");
                            setStatusFilter("all");
                          }}
                          className="mt-3 px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((u, index) => {
                  const companyObj =
                    typeof u.companyId === "object" && u.companyId !== null
                      ? u.companyId
                      : null;
                  const companyName = companyObj?.name || "Unassigned";

                  const formattedDate = u.createdAt
                    ? new Date(u.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "—";

                  const hasMfa = u.mfa?.enabled || u.mfaEnabled;
                  const serialNumber = (page - 1) * limit + index + 1;

                  return (
                    <tr
                      key={u._id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* S.N. Column */}
                      <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-400 font-medium">
                        {serialNumber}
                      </td>

                      {/* User Column */}
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-teal-500 via-cyan-600 to-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-2xs">
                            {getInitials(u.name, u.email)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 group-hover:text-teal-700 transition-colors leading-tight">
                              {u.name || "Unnamed User"}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono leading-tight">
                              {u.email}
                            </div>
                            {u.phone && (
                              <div className="text-[10px] text-slate-400 font-sans flex items-center gap-1 mt-0.5 leading-tight">
                                <Phone className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                                <span>{u.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role Column */}
                      <td className="py-2.5 px-3">{getRoleBadge(u.role)}</td>

                      {/* Organization Column */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                          <span
                            className={
                              companyObj
                                ? "font-medium text-slate-700"
                                : "text-slate-400 italic text-[11px]"
                            }
                          >
                            {companyName}
                          </span>
                        </div>
                        {companyObj?.domain && (
                          <span className="text-[10px] text-slate-400 font-mono ml-4 block leading-tight">
                            {companyObj.domain}
                          </span>
                        )}
                      </td>

                      {/* Status Column */}
                      <td className="py-2.5 px-3">{getStatusBadge(u.status)}</td>

                      {/* MFA Column */}
                      <td className="py-2.5 px-3">
                        {hasMfa ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                            <ShieldCheck className="h-3 w-3 text-emerald-600" />
                            Enabled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                            <ShieldAlert className="h-3 w-3 text-slate-300" />
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium text-[11px]">
                          <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{formattedDate}</span>
                        </div>
                      </td>

                      {/* Actions Menu */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="relative inline-block text-left action-menu-container">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === u._id ? null : u._id);
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>

                          {activeMenuId === u._id && (
                            <div className="origin-top-right absolute right-0 mt-1 w-44 rounded-xl shadow-lg bg-white border border-slate-200 z-30 py-1 focus:outline-none divide-y divide-slate-100 text-xs animate-in fade-in zoom-in-95">
                              <div className="py-0.5">
                                <button
                                  onClick={() => handleOpenEdit(u)}
                                  className="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                                >
                                  <Edit3 className="h-3 w-3 text-slate-400" />
                                  Edit User
                                </button>
                                <button
                                  onClick={() => handleOpenReset(u)}
                                  className="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                                >
                                  <Key className="h-3 w-3 text-slate-400" />
                                  Reset Password
                                </button>
                              </div>

                              <div className="py-0.5">
                                <button
                                  onClick={() => handleToggleStatus(u)}
                                  className={`w-full text-left px-3 py-1.5 flex items-center gap-2 font-medium ${
                                    u.status === "Active"
                                      ? "text-rose-600 hover:bg-rose-50"
                                      : "text-emerald-600 hover:bg-emerald-50"
                                  }`}
                                >
                                  {u.status === "Active" ? (
                                    <>
                                      <XCircle className="h-3 w-3 text-rose-500" />
                                      Deactivate
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                      Activate
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
                {users.length > 0 ? (page - 1) * limit + 1 : 0}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-slate-900">
                {Math.min(page * limit, paginationMeta.total)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-900">{paginationMeta.total}</span> users
            </div>

            {/* Rows Per Page Selector (20, 50, 100) */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
              <span className="text-[11px] text-slate-500">Rows:</span>
              <select
                value={limit}
                onChange={(e) => {
                  const newLimit = Number(e.target.value);
                  setLimit(newLimit);
                  setPage(1);
                }}
                className="py-0.5 px-2 text-xs font-semibold bg-white border border-slate-300 rounded-md text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
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

      {/* ============================================================== */}
      {/* MODAL 1: SEND 48-HOUR INVITATION MODAL                         */}
      {/* ============================================================== */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Send 48h Invitation</h3>
                  <p className="text-[11px] text-slate-500">
                    Generates a cryptographic pre-registration invitation token.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5">
              {inviteResult ? (
                <div className="space-y-3.5">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">{inviteResult.message}</p>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Invited {inviteResult.user.name} ({inviteResult.user.email}) as{" "}
                        <span className="font-semibold">{inviteResult.user.role}</span>.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Invitation Acceptance Link (Valid 48h)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value={`${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/accept-invite?token=${inviteResult.invitationToken}`}
                        className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 select-all"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const link = `${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/accept-invite?token=${inviteResult.invitationToken}`;
                          navigator.clipboard.writeText(link);
                          setCopiedInvite(true);
                          setTimeout(() => setCopiedInvite(false), 3000);
                        }}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center gap-1 shrink-0 transition"
                      >
                        {copiedInvite ? (
                          <>
                            <Check className="h-3 w-3" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setInviteModalOpen(false)}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg transition"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitInvite} className="space-y-3.5">
                  {inviteError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
                      <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                      <span>{inviteError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={inviteForm.name}
                      onChange={(e) =>
                        setInviteForm({ ...inviteForm, name: e.target.value })
                      }
                      placeholder="e.g. Sarah Jenkins"
                      className="w-full text-xs py-2 px-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={inviteForm.email}
                      onChange={(e) =>
                        setInviteForm({ ...inviteForm, email: e.target.value })
                      }
                      placeholder="e.g. sarah.jenkins@company.com"
                      className="w-full text-xs py-2 px-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        System Role *
                      </label>
                      <select
                        value={inviteForm.role}
                        onChange={(e) =>
                          setInviteForm({
                            ...inviteForm,
                            role: e.target.value as UserRole,
                          })
                        }
                        className="w-full text-xs py-2 px-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                      >
                        <option value="Assessor">Assessor</option>
                        <option value="Admin">Organization Admin</option>
                        {isSuperAdmin && <option value="SuperAdmin">Super Admin</option>}
                        <option value="MembershipApprover">Membership Approver</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Organization
                      </label>
                      <select
                        value={inviteForm.companyId}
                        onChange={(e) =>
                          setInviteForm({ ...inviteForm, companyId: e.target.value })
                        }
                        className="w-full text-xs py-2 px-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                      >
                        <option value="">None / Independent</option>
                        {companies.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setInviteModalOpen(false)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={inviteLoading}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center gap-1.5"
                    >
                      {inviteLoading ? (
                        <>
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="h-3 w-3" />
                          Generate Invite
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: DIRECT ADD USER MODAL                                 */}
      {/* ============================================================== */}
      {directAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Direct Add User</h3>
                  <p className="text-[11px] text-slate-500">
                    Creates an active account with initial credentials directly.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDirectAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitDirectAdd} className="p-5 space-y-3.5">
              {directAddError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                  <span>{directAddError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={directAddForm.name}
                  onChange={(e) =>
                    setDirectAddForm({ ...directAddForm, name: e.target.value })
                  }
                  placeholder="e.g. Michael Thorne"
                  className="w-full text-xs py-2 px-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={directAddForm.email}
                  onChange={(e) =>
                    setDirectAddForm({ ...directAddForm, email: e.target.value })
                  }
                  placeholder="e.g. michael.thorne@graice.io"
                  className="w-full text-xs py-2 px-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Initial Password * (min 8 characters)
                </label>
                <div className="relative">
                  <input
                    type={showDirectPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={directAddForm.password}
                    onChange={(e) =>
                      setDirectAddForm({ ...directAddForm, password: e.target.value })
                    }
                    placeholder="••••••••••••"
                    className="w-full text-xs py-2 pl-3 pr-9 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDirectPassword(!showDirectPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    tabIndex={-1}
                  >
                    {showDirectPassword ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Initial Role *
                  </label>
                  <select
                    value={directAddForm.role}
                    onChange={(e) =>
                      setDirectAddForm({
                        ...directAddForm,
                        role: e.target.value as UserRole,
                      })
                    }
                    className="w-full text-xs py-2 px-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                  >
                    <option value="Assessor">Assessor</option>
                    <option value="Admin">Organization Admin</option>
                    {isSuperAdmin && <option value="SuperAdmin">Super Admin</option>}
                    <option value="MembershipApprover">Membership Approver</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Organization
                  </label>
                  <select
                    value={directAddForm.companyId}
                    onChange={(e) =>
                      setDirectAddForm({ ...directAddForm, companyId: e.target.value })
                    }
                    className="w-full text-xs py-2 px-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                  >
                    <option value="">None / Independent</option>
                    {companies.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDirectAddModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={directAddLoading}
                  className="px-3.5 py-1.5 bg-[#0c162c] hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center gap-1.5"
                >
                  {directAddLoading ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-3 w-3" />
                      Create User
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: EDIT USER DETAILS                                     */}
      {/* ============================================================== */}
      {editModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Edit3 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Edit User Profile</h3>
                  <p className="text-[11px] text-slate-500">{editingUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="p-5 space-y-3.5">
              {editError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full text-xs py-2 px-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="w-full text-xs py-2 px-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    System Role *
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) =>
                      setEditForm({ ...editForm, role: e.target.value as UserRole })
                    }
                    className="w-full text-xs py-2 px-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                  >
                    <option value="Assessor">Assessor</option>
                    <option value="Admin">Organization Admin</option>
                    {isSuperAdmin && <option value="SuperAdmin">Super Admin</option>}
                    <option value="MembershipApprover">Membership Approver</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status *
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm({ ...editForm, status: e.target.value as UserStatus })
                    }
                    className="w-full text-xs py-2 px-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Deactivated">Deactivated</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Organization
                </label>
                <select
                  value={editForm.companyId}
                  onChange={(e) => setEditForm({ ...editForm, companyId: e.target.value })}
                  className="w-full text-xs py-2 px-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                >
                  <option value="">None / Independent Assessor</option>
                  {companies.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition"
                >
                  {editLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: ADMIN PASSWORD RESET MODAL                            */}
      {/* ============================================================== */}
      {resetModalOpen && resetTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                  <Key className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Admin Password Reset</h3>
                  <p className="text-[11px] text-slate-500">{resetTargetUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setResetModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5">
              {resetResult ? (
                <div className="space-y-3.5">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">{resetResult.message}</p>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Token generated for {resetResult.user.name} ({resetResult.user.email}).
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Password Reset URL (Expires in 24 Hours)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value={resetResult.resetUrl}
                        className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 select-all"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(resetResult.resetUrl);
                          setCopiedReset(true);
                          setTimeout(() => setCopiedReset(false), 3000);
                        }}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center gap-1 shrink-0 transition"
                      >
                        {copiedReset ? (
                          <>
                            <Check className="h-3 w-3" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setResetModalOpen(false)}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg transition"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {resetError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
                      <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                      <span>{resetError}</span>
                    </div>
                  )}

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Generate a secure 24-hour cryptographic password reset URL for{" "}
                    <span className="font-semibold text-slate-900">
                      {resetTargetUser.name || resetTargetUser.email}
                    </span>
                    .
                  </p>

                  <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setResetModalOpen(false)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteResetPassword}
                      disabled={resetLoading}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center gap-1.5"
                    >
                      {resetLoading ? (
                        <>
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Key className="h-3 w-3" />
                          Generate Reset Link
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
