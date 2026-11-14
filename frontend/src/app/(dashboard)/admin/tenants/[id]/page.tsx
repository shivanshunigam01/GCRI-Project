"use client";

import React, { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTenant } from "@/context/TenantContext";
import { tenantService } from "@/services/tenant.service";
import type { TenantRecord, TenantStatus } from "@/types/tenant.types";
import { getApiErrorMessage } from "@/lib/authUser";
import { ArrowLeft, Layers, RefreshCw, UserPlus } from "lucide-react";

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { isSuperAdmin, isTenantAdmin } = useAuth();
  const { refreshTenants, setActiveTenantId } = useTenant();
  const [tenant, setTenant] = useState<TenantRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<TenantStatus | "">("");
  const [reason, setReason] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [adminForm, setAdminForm] = useState({ name: "", email: "" });
  const [assigning, setAssigning] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await tenantService.getTenantById(id);
      setTenant(res.data);
      setStatus(res.data.status);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to load tenant."));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const canAccess = isSuperAdmin || isTenantAdmin;
  useEffect(() => {
    if (!canAccess) router.replace("/dashboard");
  }, [canAccess, router]);

  const handleStatus = async () => {
    if (!status || status === tenant?.status) return;
    setSavingStatus(true);
    setActionMsg(null);
    try {
      await tenantService.updateTenantStatus(id, {
        status: status as "Active" | "Suspended" | "Retired",
        reason: reason.trim() || undefined,
      });
      setActionMsg("Tenant status updated.");
      await load();
      await refreshTenants();
    } catch (err: unknown) {
      setActionMsg(getApiErrorMessage(err, "Status update failed."));
    } finally {
      setSavingStatus(false);
    }
  };

  const handleAssignAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    setAssigning(true);
    setInviteToken(null);
    setActionMsg(null);
    try {
      const res = await tenantService.assignTenantAdmin(id, {
        name: adminForm.name.trim(),
        email: adminForm.email.trim(),
      });
      const token = (
        res.data as { tenantAdmin?: { invitationToken?: string } } | undefined
      )?.tenantAdmin?.invitationToken;
      if (token) setInviteToken(token);
      setActionMsg("Tenant Admin invited.");
      setAdminForm({ name: "", email: "" });
      await load();
    } catch (err: unknown) {
      setActionMsg(getApiErrorMessage(err, "Could not invite admin."));
    } finally {
      setAssigning(false);
    }
  };

  if (loading && !tenant) {
    return <p className="text-sm text-slate-500 py-8 text-center">Loading tenant…</p>;
  }

  if (error || !tenant) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center space-y-3">
        <p className="text-rose-700">{error || "Tenant not found"}</p>
        <Link href="/admin/tenants" className="text-sm text-teal-700 font-semibold">
          Back to tenants
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Link href="/admin/tenants" className="p-2 rounded-lg border hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="page-title text-xl flex items-center gap-2">
            <Layers className="h-5 w-5 text-teal-600" />
            {tenant.name}
          </h1>
          <p className="text-xs font-mono text-slate-500">{tenant.slug}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setActiveTenantId(tenant._id);
            setActionMsg("Active workspace set — use header switcher or onboard orgs under this tenant.");
          }}
          className="text-xs font-semibold text-teal-700 border border-teal-200 bg-teal-50 px-3 py-1.5 rounded-lg"
        >
          Use as active workspace
        </button>
        <button type="button" onClick={() => load()} className="p-2 border rounded-lg">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {actionMsg && (
        <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          {actionMsg}
        </p>
      )}
      {inviteToken && (
        <p className="text-xs font-mono break-all bg-slate-50 border rounded-lg p-2">
          Invite token: {inviteToken}
        </p>
      )}

      <div className="grid sm:grid-cols-3 gap-3">
        {[
          ["Organizations", tenant.metadata?.clientOrgCount ?? 0],
          ["Assessments", tenant.metadata?.assessmentCount ?? 0],
          ["Auditors", tenant.metadata?.auditorCount ?? 0],
        ].map(([label, val]) => (
          <div key={String(label)} className="rounded-xl border bg-white p-4 shadow-xs">
            <p className="text-[10px] uppercase font-bold text-slate-500">{label}</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{val}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-white p-5 space-y-3">
        <p className="text-sm font-bold text-slate-900">Lifecycle</p>
        <p className="text-xs text-slate-600">
          Current status: <span className="font-semibold">{tenant.status}</span>. Pending tenants become Active when
          the first Tenant Admin accepts their invite (accept-invite flow).
        </p>
        {isSuperAdmin && (
          <div className="flex flex-wrap gap-2 items-end">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TenantStatus)}
              className="text-sm border rounded-lg px-2 py-1.5"
            >
              <option value="Pending">Pending</option>
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
              <option value="Retired">Retired</option>
            </select>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (optional)"
              className="text-sm border rounded-lg px-2 py-1.5 flex-1 min-w-[160px]"
            />
            <button
              type="button"
              disabled={savingStatus}
              onClick={handleStatus}
              className="text-xs font-semibold px-3 py-1.5 bg-slate-900 text-white rounded-lg disabled:opacity-50"
            >
              {savingStatus ? "Saving…" : "Update status"}
            </button>
          </div>
        )}
      </div>

      {isSuperAdmin && (
        <form
          onSubmit={handleAssignAdmin}
          className="rounded-xl border bg-white p-5 space-y-3"
        >
          <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-teal-600" />
            Invite Tenant Admin
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            <input
              required
              value={adminForm.name}
              onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
              placeholder="Name"
              className="text-sm border rounded-lg px-3 py-2"
            />
            <input
              required
              type="email"
              value={adminForm.email}
              onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
              placeholder="Email"
              className="text-sm border rounded-lg px-3 py-2"
            />
          </div>
          <button
            type="submit"
            disabled={assigning}
            className="text-xs font-semibold px-3 py-1.5 bg-teal-600 text-white rounded-lg disabled:opacity-50"
          >
            {assigning ? "Sending invite…" : "Send invite"}
          </button>
        </form>
      )}

      <div className="rounded-xl border border-dashed border-slate-200 p-4 text-xs text-slate-600">
        Next: select this workspace in the header, then{" "}
        <Link href="/organizations" className="text-teal-700 font-semibold hover:underline">
          onboard a client organization
        </Link>{" "}
        — it will be linked to this tenant automatically.
      </div>
    </div>
  );
}