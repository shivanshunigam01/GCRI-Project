"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { tenantService } from "@/services/tenant.service";
import type { TenantRecord, TenantStatus } from "@/types/tenant.types";
import { getApiErrorMessage } from "@/lib/authUser";
import {
  Layers,
  Plus,
  RefreshCw,
  Search,
  AlertCircle,
  ChevronRight,
  X,
} from "lucide-react";

function statusPill(status: TenantStatus) {
  const map: Record<TenantStatus, string> = {
    Pending: "bg-amber-50 text-amber-800 border-amber-200",
    Active: "bg-emerald-50 text-emerald-800 border-emerald-200",
    Suspended: "bg-rose-50 text-rose-800 border-rose-200",
    Retired: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border ${map[status]}`}>
      {status}
    </span>
  );
}

export default function AdminTenantsPage() {
  const { isSuperAdmin } = useAuth();
  const router = useRouter();
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    adminName: "",
    adminEmail: "",
  });
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isSuperAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const res = await tenantService.listTenants({
        page,
        limit: 20,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
      });
      setTenants(Array.isArray(res.data) ? res.data : []);
      setTotalPages(res.pagination?.pages ?? 1);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to load tenants."));
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, page, search, statusFilter]);

  useEffect(() => {
    if (!isSuperAdmin) {
      router.replace("/dashboard");
      return;
    }
    load();
  }, [isSuperAdmin, load, router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setInviteToken(null);
    setCreating(true);
    try {
      const res = await tenantService.createTenant({
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        tenantAdmin:
          form.adminEmail.trim() && form.adminName.trim()
            ? { name: form.adminName.trim(), email: form.adminEmail.trim() }
            : undefined,
      });
      const token = res.data?.tenantAdmin?.invitationToken;
      if (token) setInviteToken(token);
      setModalOpen(false);
      setForm({ name: "", slug: "", adminName: "", adminEmail: "" });
      await load();
      if (res.data?.tenant?._id) {
        router.push(`/admin/tenants/${res.data.tenant._id}`);
      }
    } catch (err: unknown) {
      setCreateError(getApiErrorMessage(err, "Could not create tenant."));
    } finally {
      setCreating(false);
    }
  };

  if (!isSuperAdmin) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2 text-2xl">
            <Layers className="h-6 w-6 text-teal-600" />
            Tenant workspaces
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Onboard isolated tenants, invite Tenant Admins, and link client organizations under each workspace.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => load()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-white hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => {
              setCreateError(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-teal-600 to-blue-600 rounded-lg"
          >
            <Plus className="h-3.5 w-3.5" />
            Create tenant
          </button>
        </div>
      </div>

      {inviteToken && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
          Tenant Admin invite token (share for accept-invite flow):{" "}
          <code className="font-mono font-bold break-all">{inviteToken}</code>
        </div>
      )}

      {error && (
        <div className="flex gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search name or slug..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="text-sm border border-slate-200 rounded-lg py-2 px-2"
        >
          <option value="">All statuses</option>
          <option value="Pending">Pending</option>
          <option value="Active">Active</option>
          <option value="Suspended">Suspended</option>
          <option value="Retired">Retired</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500">
            <tr>
              <th className="py-3 px-4">Tenant</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 hidden md:table-cell">Organizations</th>
              <th className="py-3 px-4 hidden md:table-cell">Assessments</th>
              <th className="py-3 px-4 w-10" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-500 text-sm">
                  Loading tenants…
                </td>
              </tr>
            ) : tenants.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-500 text-sm">
                  No tenants yet. Create your first workspace.
                </td>
              </tr>
            ) : (
              tenants.map((t) => (
                <tr key={t._id} className="border-t border-slate-100 hover:bg-slate-50/80">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{t.name}</div>
                    <div className="text-[11px] font-mono text-slate-500">{t.slug}</div>
                  </td>
                  <td className="py-3 px-4">{statusPill(t.status)}</td>
                  <td className="py-3 px-4 hidden md:table-cell text-slate-700">
                    {t.metadata?.clientOrgCount ?? "—"}
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell text-slate-700">
                    {t.metadata?.assessmentCount ?? "—"}
                  </td>
                  <td className="py-3 px-4">
                    <Link
                      href={`/admin/tenants/${t._id}`}
                      className="inline-flex p-1.5 rounded-lg text-teal-700 hover:bg-teal-50"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 text-xs border rounded-lg disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs text-slate-600 py-1">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 text-xs border rounded-lg disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50">
          <div className="bg-white rounded-2xl shadow-2xl border max-w-md w-full p-5 space-y-4">
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-slate-900">Create tenant workspace</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            {createError && (
              <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">
                {createError}
              </p>
            )}
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Tenant name"
                className="w-full text-sm border rounded-lg px-3 py-2"
              />
              <input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="Slug (optional)"
                className="w-full text-sm border rounded-lg px-3 py-2 font-mono"
              />
              <p className="text-[10px] font-bold text-slate-500 uppercase">First tenant admin (optional)</p>
              <input
                value={form.adminName}
                onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                placeholder="Admin name"
                className="w-full text-sm border rounded-lg px-3 py-2"
              />
              <input
                type="email"
                value={form.adminEmail}
                onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                placeholder="Admin email"
                className="w-full text-sm border rounded-lg px-3 py-2"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 text-xs border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-600 rounded-lg disabled:opacity-50"
                >
                  {creating ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}