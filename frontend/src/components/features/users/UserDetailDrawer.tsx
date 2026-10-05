"use client";

import React, { useState, useEffect } from "react";
import { userService } from "@/services/user.service";
import { UserItem } from "@/types/user.types";
import { UserRole } from "@/types/auth.types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import {
  X,
  User,
  Mail,
  ShieldCheck,
  Building2,
  KeyRound,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";

interface UserDetailDrawerProps {
  isOpen: boolean;
  userId: string | null;
  onClose: () => void;
  onUserUpdated: () => void;
}

export function UserDetailDrawer({
  isOpen,
  userId,
  onClose,
  onUserUpdated,
}: UserDetailDrawerProps) {
  const [user, setUser] = useState<UserItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadUserDetails() {
      if (!userId || !isOpen) return;
      setLoading(true);
      setError(null);
      setActionSuccess(null);
      try {
        const res = await userService.getUserById(userId);
        if (res.success && res.data) {
          setUser(res.data);
        } else {
          setError(res.error?.message || "Failed to load user details.");
        }
      } catch {
        setError("Error connecting to server.");
      } finally {
        setLoading(false);
      }
    }

    loadUserDetails();
  }, [userId, isOpen]);

  if (!isOpen) return null;

  const handleRoleChange = async (newRole: UserRole) => {
    if (!user) return;
    setUpdating(true);
    setError(null);
    setActionSuccess(null);
    try {
      const res = await userService.updateRole(user._id, newRole);
      if (res.success && res.data) {
        setUser(res.data);
        setActionSuccess(`Role successfully updated to ${newRole}`);
        onUserUpdated();
      } else {
        setError(res.error?.message || "Failed to update role.");
      }
    } catch {
      setError("Failed to update user role.");
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!user) return;
    const targetStatus = user.status === "Active" ? "Deactivated" : "Active";
    setUpdating(true);
    setError(null);
    setActionSuccess(null);
    try {
      const res = await userService.updateStatus(user._id, targetStatus);
      if (res.success && res.data) {
        setUser(res.data);
        setActionSuccess(`User status changed to ${targetStatus}`);
        onUserUpdated();
      } else {
        setError(res.error?.message || "Failed to change user status.");
      }
    } catch {
      setError("Failed to update user status.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-zinc-950/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-zinc-200 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-800 flex items-center justify-center font-bold">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-950">User Profile Audit</h3>
                  <p className="text-[11px] text-zinc-400 font-mono">ID: {userId}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-2">
                <Spinner size="md" />
                <p className="text-xs text-zinc-400 font-mono">Loading user record...</p>
              </div>
            ) : error ? (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            ) : user ? (
              <div className="space-y-5 text-xs">
                {actionSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{actionSuccess}</span>
                  </div>
                )}

                {/* Identity Lockup */}
                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-zinc-900 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                    {user.name ? user.name.slice(0, 2).toUpperCase() : "US"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-sm text-zinc-950 truncate">{user.name}</h4>
                    <p className="text-zinc-500 font-mono text-[11px] truncate">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant={user.status === "Active" ? "verified" : "rejected"}>
                        {user.status}
                      </Badge>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-zinc-200 text-zinc-700 font-semibold">
                        {user.role}
                      </span>
                    </div>
                  </div>
                </div>

                {/* User Attributes Grid */}
                <div className="space-y-3 pt-2">
                  <h5 className="font-bold text-xs text-zinc-900 uppercase tracking-wider text-[10px] text-zinc-400">
                    Account Metadata
                  </h5>

                  <div className="p-3 rounded-xl border border-zinc-200/80 divide-y divide-zinc-100 space-y-2">
                    <div className="flex items-center justify-between pb-2">
                      <span className="text-zinc-500 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Email Status</span>
                      </span>
                      <span className="font-medium text-zinc-900">Verified</span>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <span className="text-zinc-500 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Assigned Company</span>
                      </span>
                      <span className="font-mono text-zinc-800 text-[11px]">
                        {typeof user.companyId === "string"
                          ? user.companyId
                          : typeof user.companyId === "object" && user.companyId !== null
                          ? (user.companyId as { name?: string }).name || "Assigned Company"
                          : "Global (All Organizations)"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <span className="text-zinc-500 flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-zinc-400" />
                        <span>2FA Security</span>
                      </span>
                      <span className={`font-semibold ${user.mfa?.enabled ? "text-emerald-700" : "text-zinc-500"}`}>
                        {user.mfa?.enabled ? "Enforced (TOTP)" : "Not Enforced"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-zinc-500 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Registered Date</span>
                      </span>
                      <span className="font-mono text-zinc-600 text-[11px]">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Administrative Controls */}
                <div className="space-y-3 pt-2">
                  <h5 className="font-bold text-xs text-zinc-900 uppercase tracking-wider text-[10px] text-zinc-400">
                    Administrative Governance
                  </h5>

                  {/* Role Assignment */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-700">Assign Platform Role</label>
                    <select
                      value={user.role}
                      disabled={updating}
                      onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                      className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-800 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
                    >
                      <option value="Admin">Admin (Full Global Oversight)</option>
                      <option value="MembershipApprover">Membership Approver (Compliance Lead)</option>
                      <option value="Assessor">Assessor (Assessment Specialist)</option>
                    </select>
                  </div>

                  {/* Status Toggle */}
                  <div className="pt-2">
                    <Button
                      variant={user.status === "Active" ? "outline" : "primary"}
                      size="sm"
                      disabled={updating}
                      onClick={handleStatusToggle}
                      className="w-full text-xs h-9 justify-center font-semibold"
                    >
                      {updating ? (
                        <Spinner size="sm" />
                      ) : user.status === "Active" ? (
                        "Deactivate User Account"
                      ) : (
                        "Activate User Account"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="pt-4 border-t border-zinc-100 flex justify-end">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              Close Audit
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
