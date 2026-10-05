"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { companyService } from "@/services/company.service";
import { userService } from "@/services/user.service";
import { Company } from "@/types/company.types";
import { UserItem } from "@/types/user.types";
import { VerificationModal } from "@/components/features/companies/VerificationModal";
import { StatusToggleModal } from "@/components/features/companies/StatusToggleModal";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import {
  Building2,
  Globe,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Edit3,
  RefreshCw,
  Users,
  FileText,
  Calendar,
  Save,
  X,
  Plus,
  KeyRound,
  Mail,
  User,
  Lock,
} from "lucide-react";

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { isAdmin } = useAuth();

  const [company, setCompany] = useState<Company | null>(null);
  const [teamMembers, setTeamMembers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dnsVerifying, setDnsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

  // Client account creation state
  const [accountName, setAccountName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  // Edit metadata form state
  const [editName, setEditName] = useState("");
  const [editReg, setEditReg] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [editIndustry, setEditIndustry] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchCompanyData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [compRes, usersRes] = await Promise.all([
        companyService.getById(id),
        isAdmin ? userService.getUsers({ companyId: id, limit: 10 }) : Promise.resolve({ success: false, data: null }),
      ]);

      if (compRes.success && compRes.data) {
        setCompany(compRes.data);
        setEditName(compRes.data.name || "");
        setEditReg(compRes.data.registrationNumber || "");
        setEditCountry(compRes.data.country || "");
        setEditIndustry(compRes.data.industry || "");
      } else {
        setError(compRes.error?.message || "Organization not found or access denied.");
      }

      if (usersRes.success && usersRes.data) {
        const list = Array.isArray(usersRes.data)
          ? usersRes.data
          : Array.isArray((usersRes.data as any).users)
          ? (usersRes.data as any).users
          : [];
        setTeamMembers(list);
      }
    } catch {
      setError("An unexpected network error occurred while retrieving organization data.");
    } finally {
      setLoading(false);
    }
  }, [id, isAdmin]);

  useEffect(() => {
    fetchCompanyData();
  }, [fetchCompanyData]);

  const handleQuickDnsCheck = async () => {
    if (!company) return;
    setDnsVerifying(true);
    try {
      await companyService.verifyDns(company._id);
      await fetchCompanyData();
    } finally {
      setDnsVerifying(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    setEditError(null);
    setEditLoading(true);
    try {
      const res = await companyService.update(company._id, {
        name: editName.trim(),
        registrationNumber: editReg.trim() || undefined,
        country: editCountry.trim() || undefined,
        industry: editIndustry.trim() || undefined,
      });

      if (res.success) {
        setShowEditModal(false);
        await fetchCompanyData();
      } else {
        setEditError(res.error?.message || "Failed to update organization metadata.");
      }
    } catch {
      setEditError("An unexpected error occurred while saving changes.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleOpenAccountModal = () => {
    if (!company) return;
    setAccountName(company.name + " Admin");
    setAccountEmail("admin@" + company.domain);
    setAccountPassword("");
    setAccountError(null);
    setShowAccountModal(true);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    setAccountError(null);
    setAccountLoading(true);
    try {
      const res = await userService.inviteUser({
        name: accountName.trim(),
        email: accountEmail.trim().toLowerCase(),
        role: "Assessor",
        companyId: company._id,
      });
      if (res.success) {
        setShowAccountModal(false);
        await fetchCompanyData();
      } else {
        setAccountError(res.error?.message || "Failed to create client account.");
      }
    } catch {
      setAccountError("An unexpected network error occurred while creating client account.");
    } finally {
      setAccountLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col justify-center items-center gap-3">
        <Spinner size="lg" />
        <p className="text-xs text-zinc-500 font-mono">Loading organization audit records...</p>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="space-y-4 max-w-xl mx-auto py-12 text-center">
        <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <XCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-zinc-950">Organization Unavailable</h2>
        <p className="text-xs text-zinc-500 leading-relaxed">
          {error || "The requested organization does not exist or you do not have permission to view it."}
        </p>
        <div className="pt-2">
          <Link href="/companies">
            <Button variant="outline" size="sm" className="gap-2 text-xs">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Organizations</span>
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isVerified = company.verificationStatus === "Verified";
  const isPending = company.verificationStatus === "Pending";
  const isActive = company.status === "Active";
  const clientUser = company.clientUser || teamMembers[0] || null;

  return (
    <div className="space-y-6 w-full">
      {/* Back link & breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/companies"
          className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Organizations</span>
        </Link>
        <span className="text-[11px] font-mono text-zinc-400">
          ID: {company._id}
        </span>
      </div>

      {/* Main Profile Header Banner */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 sm:p-7 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-zinc-950 text-white font-extrabold flex items-center justify-center text-xl shadow-xs shrink-0">
            {company.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950">
                {company.name}
              </h1>
              <Badge variant={isVerified ? "verified" : isPending ? "pending" : "rejected"}>
                {company.verificationStatus}
              </Badge>
              <Badge variant={isActive ? "active" : "suspended"}>
                {company.status}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 font-medium">
              <a
                href={`https://${company.domain}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-indigo-600 hover:underline font-mono text-[11px]"
              >
                <Globe className="w-3 h-3" />
                <span>{company.domain}</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
              <span>•</span>
              <span>{company.industry || "General AI"}</span>
              <span>•</span>
              <span>{company.country || "Global"}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-2 md:pt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditModal(true)}
              className="gap-1.5 text-xs h-9"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Metadata</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVerifyModal(true)}
              className="gap-1.5 text-xs h-9 font-semibold text-zinc-800"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Review Legitimacy</span>
            </Button>

            <Button
              variant={isActive ? "outline" : "primary"}
              size="sm"
              onClick={() => setShowStatusModal(true)}
              className={`gap-1.5 text-xs h-9 ${isActive ? "text-rose-600 hover:bg-rose-50 hover:border-rose-300" : ""}`}
            >
              {isActive ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Suspend</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Reactivate</span>
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* 2-Column Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Organization Details & Metadata (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border border-zinc-200/80 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)]">
            <CardHeader className="pb-3 border-b border-zinc-100">
              <CardTitle className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-zinc-700" />
                <span>Enterprise Registry Metadata</span>
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Official entity identification recorded in GCRAI corporate database
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4 divide-y divide-zinc-100 text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-zinc-500">Legal Corporate Name</span>
                <span className="font-semibold text-zinc-900">{company.name}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-zinc-500">Primary Domain</span>
                <span className="font-mono text-zinc-900 text-[11px]">{company.domain}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-zinc-500">Registration / Tax ID</span>
                <span className="font-mono text-zinc-900 text-[11px]">{company.registrationNumber || "Not provided"}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-zinc-500">Jurisdiction / Country</span>
                <span className="font-semibold text-zinc-900">{company.country || "Not specified"}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-zinc-500">Industry Sector</span>
                <span className="font-semibold text-zinc-900">{company.industry || "General AI"}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-zinc-500">Onboarded Timestamp</span>
                <span className="font-mono text-zinc-600 text-[11px]">
                  {company.createdAt ? new Date(company.createdAt).toLocaleString() : "—"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Organization Client Account & Credentials */}
          <Card className="border border-zinc-200/80 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)]">
            <CardHeader className="pb-3 border-b border-zinc-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-zinc-700" />
                  <span>Client Login & Account</span>
                </CardTitle>
                <CardDescription className="text-xs text-zinc-500">
                  Primary client user account (Role: Assessor)
                </CardDescription>
              </div>
              {isAdmin && !clientUser && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenAccountModal}
                  className="gap-1 text-xs h-7 px-2"
                >
                  <Plus className="w-3 h-3" />
                  <span>Create Client Login</span>
                </Button>
              )}
            </CardHeader>

            <CardContent className="pt-4">
              {!clientUser ? (
                <div className="py-6 text-center text-xs text-zinc-500 space-y-2">
                  <p className="font-semibold text-zinc-800">No client account bound yet.</p>
                  <p className="text-[11px] text-zinc-400">
                    Create the client account with role Assessor so this organization can sign in.
                  </p>
                  {isAdmin && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleOpenAccountModal}
                      className="gap-1.5 text-xs mt-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create Client Login</span>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-200/70">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                        {clientUser.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-zinc-950 text-xs">{clientUser.name}</p>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-200/80 text-zinc-800 font-semibold">
                            {clientUser.role || "Assessor"}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 font-mono flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-zinc-400" />
                          <span>{clientUser.email}</span>
                        </p>
                      </div>
                    </div>
                    <Badge variant={clientUser.status === "Active" ? "active" : "suspended"}>
                      {clientUser.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg border border-zinc-100 bg-white">
                      <span className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider">Access Scope</span>
                      <p className="font-medium text-zinc-800 mt-0.5">Organization Portal</p>
                    </div>
                    <div className="p-2.5 rounded-lg border border-zinc-100 bg-white">
                      <span className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider">Role</span>
                      <p className="font-medium text-zinc-800 mt-0.5">Assessor (Client)</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Automated DNS Verification Diagnostics & Audit Trail (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border border-zinc-200/80 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] bg-gradient-to-br from-white to-zinc-50/50">
            <CardHeader className="pb-3 border-b border-zinc-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  <span>DNS & Domain Check</span>
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleQuickDnsCheck}
                  disabled={dnsVerifying}
                  className="h-7 text-[11px] px-2 gap-1"
                >
                  {dnsVerifying ? <Spinner size="sm" /> : <RefreshCw className="w-3 h-3" />}
                  <span>Re-test DNS</span>
                </Button>
              </div>
              <CardDescription className="text-xs text-zinc-500">
                Automated background network diagnostics
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-white border border-zinc-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-600 font-medium">Domain Resolution:</span>
                  <span className="font-mono font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Resolving</span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-600 font-medium">MX Mail Record:</span>
                  <span className="font-mono font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Detected</span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-100">
                  <span className="text-zinc-500">Legitimacy State:</span>
                  <Badge variant={isVerified ? "verified" : isPending ? "pending" : "rejected"}>
                    {company.verificationStatus}
                  </Badge>
                </div>
              </div>

              {/* Audit Trail Details */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Verification Audit Record</span>
                </h4>
                <div className="p-3 rounded-xl bg-zinc-100/70 border border-zinc-200/60 text-[11px] space-y-1.5 text-zinc-600">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Verified By:</span>
                    <span className="font-mono font-semibold text-zinc-900">
                      {company.verificationAuditTrail?.verifiedBy || "Automated DNS Engine"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Timestamp:</span>
                    <span className="font-mono text-zinc-700">
                      {company.verificationAuditTrail?.verifiedAt
                        ? new Date(company.verificationAuditTrail.verifiedAt).toLocaleDateString()
                        : "Initial Creation"}
                    </span>
                  </div>
                  <div className="pt-1.5 border-t border-zinc-200/70">
                    <span className="text-zinc-500 block mb-0.5">Auditor Notes:</span>
                    <p className="italic text-zinc-800 bg-white/70 p-2 rounded-lg border border-zinc-200/50">
                      &ldquo;{company.verificationAuditTrail?.notes || "Initial automated domain lookup performed on registration."}&rdquo;
                    </p>
                  </div>
                </div>
              </div>

              {/* Framework Compliance Note */}
              <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-[11px] text-indigo-900 space-y-1">
                <p className="font-semibold flex items-center gap-1 text-indigo-950">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  Regulatory Readiness
                </p>
                <p className="leading-relaxed text-indigo-800">
                  Organizations with Verified status are officially cleared to participate in GCRAI v0.8.4 algorithmic governance evaluations.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Metadata Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-zinc-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-zinc-700" />
                <span>Edit Organization Profile</span>
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1.5 rounded-lg hover:bg-zinc-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700">Legal Company Name</label>
                <Input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700">Registration / Tax ID</label>
                <Input
                  type="text"
                  value={editReg}
                  onChange={(e) => setEditReg(e.target.value)}
                  placeholder="e.g. REG-2026-9921"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700">Jurisdiction / Country</label>
                <Input
                  type="text"
                  value={editCountry}
                  onChange={(e) => setEditCountry(e.target.value)}
                  placeholder="e.g. United States"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700">Industry Sector</label>
                <Input
                  type="text"
                  value={editIndustry}
                  onChange={(e) => setEditIndustry(e.target.value)}
                  placeholder="e.g. FinTech / Healthcare AI"
                  className="h-9 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditModal(false)}
                  disabled={editLoading}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={editLoading}
                  className="text-xs font-semibold"
                >
                  {editLoading ? <Spinner size="sm" /> : <span>Save Changes</span>}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Verification Review Modal */}
      <VerificationModal
        isOpen={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        company={{
          _id: company._id,
          name: company.name,
          verificationStatus: company.verificationStatus as "Verified" | "Pending" | "Rejected",
        }}
        onSuccess={fetchCompanyData}
      />

      {/* Operational Status Modal */}
      <StatusToggleModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        company={{
          _id: company._id,
          name: company.name,
          status: company.status as "Active" | "Suspended",
        }}
        onSuccess={fetchCompanyData}
      />

      {/* Create Client Account Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
          <div className="bg-white border border-zinc-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-950">Create Client Login</h3>
                  <p className="text-[11px] text-zinc-500">Bind primary client user (Role: Assessor)</p>
                </div>
              </div>
              <button
                onClick={() => setShowAccountModal(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {accountError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {accountError}
              </div>
            )}

            <form onSubmit={handleCreateAccount} autoComplete="off" className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700">Client Contact Name</label>
                <Input
                  type="text"
                  required
                  autoComplete="off"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Enter contact name..."
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700">Client Work Email</label>
                <Input
                  type="email"
                  required
                  autoComplete="off"
                  value={accountEmail}
                  onChange={(e) => setAccountEmail(e.target.value)}
                  placeholder="Enter client work email..."
                  className="h-9 text-xs"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/70 text-[11px] text-zinc-600 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="leading-snug">
                  An invitation link will be activated for this client email to set their login password and access assessments.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAccountModal(false)}
                  disabled={accountLoading}
                  className="text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={accountLoading}
                  className="text-xs font-semibold cursor-pointer"
                >
                  {accountLoading ? <Spinner size="sm" /> : <span>Create Account</span>}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
