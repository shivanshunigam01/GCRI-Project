"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Globe,
  Mail,
  Phone,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  FileCheck2,
  Users,
  Plus,
  Trash2,
  ExternalLink,
  Edit3,
  RefreshCw,
  FolderLock,
  Layers,
  ArrowRight,
  Activity,
  Award,
} from "lucide-react";
import { companyService } from "@/services/company.service";
import { auditorMappingService } from "@/services/auditorMapping.service";
import { assessmentService } from "@/services/assessment.service";
import { userService } from "@/services/user.service";
import { Company, CompanyStatus } from "@/types/company.types";
import { User as UserType } from "@/types/auth.types";
import { AssessmentSession } from "@/types/assessment.types";
import { OrgAuditorItem } from "@/types/auditorMapping.types";
import Modal, { ConfirmationVariant } from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";

export default function OrganizationProfileFullPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user: currentUser, isAdmin } = useAuth();

  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"overview" | "assessments" | "people" | "documents">("overview");

  // People & Auditor Mappings State
  const [auditors, setAuditors] = useState<OrgAuditorItem[]>([]);
  const [auditorsLoading, setAuditorsLoading] = useState(false);
  const [availableAssessors, setAvailableAssessors] = useState<UserType[]>([]);
  const [selectedAssessorId, setSelectedAssessorId] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [unassigningId, setUnassigningId] = useState<string | null>(null);

  // Reusable Confirmation Dialog Modal State
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

  // Assessments State
  const [assessments, setAssessments] = useState<AssessmentSession[]>([]);
  const [assessmentsLoading, setAssessmentsLoading] = useState(false);

  // Fetch Company Profile
  const fetchCompany = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await companyService.getCompanyById(id);
      if (res?.data) {
        setCompany(res.data);
      }
    } catch (err: any) {
      console.error("Failed to load company profile:", err);
      setError(err?.message || "Failed to load company profile.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Fetch Assigned Auditors
  const fetchAssignedAuditors = useCallback(async () => {
    setAuditorsLoading(true);
    try {
      const res = await auditorMappingService.getMappingsByOrg(id);
      if (res?.data?.auditors) {
        setAuditors(res.data.auditors);
      }
    } catch (err) {
      console.error("Failed to fetch assigned auditors:", err);
    } finally {
      setAuditorsLoading(false);
    }
  }, [id]);

  // Fetch Assessments
  const fetchCompanyAssessments = useCallback(async () => {
    setAssessmentsLoading(true);
    try {
      const res = await assessmentService.getCompanyAssessments(id);
      if (res?.data) {
        setAssessments(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch assessments:", err);
    } finally {
      setAssessmentsLoading(false);
    }
  }, [id]);

  // Fetch Assessors for Assignment Dropdown (Admin only)
  const fetchAvailableAssessors = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await userService.getUsers({ limit: 100, role: "Assessor" });
      if (res?.data) {
        setAvailableAssessors(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch assessors:", err);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchCompany();
    fetchAssignedAuditors();
    fetchCompanyAssessments();
    fetchAvailableAssessors();
  }, [fetchCompany, fetchAssignedAuditors, fetchCompanyAssessments, fetchAvailableAssessors]);

  // Handle Assign Auditor
  const handleAssignAuditor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssessorId) return;
    setAssignLoading(true);
    setAssignError(null);
    try {
      await auditorMappingService.createMapping({
        auditorId: selectedAssessorId,
        organizationId: id,
      });
      setSelectedAssessorId("");
      setShowAssignModal(false);
      fetchAssignedAuditors();
    } catch (err: any) {
      setAssignError(
        err?.response?.data?.message ||
        err?.message ||
        "Failed to assign auditor to this organization."
      );
    } finally {
      setAssignLoading(false);
    }
  };

  // Handle Unassign Auditor with Confirmation Dialog
  const handleUnassignAuditor = (mappingId: string, auditorName: string) => {
    if (!company) return;
    setConfirmModal({
      isOpen: true,
      title: "Unassign Certified Assessor",
      variant: "danger",
      confirmLabel: "Yes, Unassign",
      message: (
        <div className="space-y-2">
          <p>
            Are you sure you want to remove <span className="font-bold text-slate-900">{auditorName}</span> from{" "}
            <span className="font-bold text-slate-900">{company.name}</span>?
          </p>
          <p className="text-[11px] text-slate-400">
            This will revoke the assessor&apos;s authorization to inspect and audit this client organization.
          </p>
        </div>
      ),
      loading: false,
      action: async () => {
        setConfirmModal((prev) => ({ ...prev, loading: true }));
        setUnassigningId(mappingId);
        try {
          await auditorMappingService.deleteMapping(mappingId);
          fetchAssignedAuditors();
          setConfirmModal((prev) => ({ ...prev, isOpen: false, loading: false }));
        } catch (err: any) {
          console.error("Failed to unassign auditor:", err);
          setConfirmModal((prev) => ({ ...prev, loading: false }));
        } finally {
          setUnassigningId(null);
        }
      },
    });
  };

  // Handle Organization Status Toggle (Active / Suspended) with Confirmation Dialog
  const handleToggleStatus = () => {
    if (!company) return;
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
              ? "Suspending this client organization will immediately restrict access to active assessment sessions and audit operations."
              : "Activating this organization restores full access to assessment audits and compliance reporting."}
          </p>
        </div>
      ),
      loading: false,
      action: async () => {
        setConfirmModal((prev) => ({ ...prev, loading: true }));
        try {
          await companyService.updateCompanyStatus(company._id, newStatus);
          setCompany((prev) => (prev ? { ...prev, status: newStatus } : null));
          setConfirmModal((prev) => ({ ...prev, isOpen: false, loading: false }));
        } catch (err: any) {
          console.error("Failed to toggle company status:", err);
          setConfirmModal((prev) => ({ ...prev, loading: false }));
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-slate-500 text-xs">
          <RefreshCw className="h-6 w-6 animate-spin text-teal-600" />
          <span>Loading organization profile...</span>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-rose-600 font-semibold">{error || "Organization not found"}</p>
        <Link
          href="/organizations"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Organizations
        </Link>
      </div>
    );
  }

  const completedCount = assessments.filter((a) => a.status === "Submitted").length;
  const inProgressCount = assessments.filter((a) => a.status === "InProgress").length;
  const latestAssessment = assessments[0] || null;

  return (
    <div className="h-full flex flex-col gap-4 min-h-0">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/organizations"
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-teal-500 via-cyan-600 to-blue-600 text-white font-black text-base flex items-center justify-center shrink-0 shadow-xs">
            {company.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">{company.name}</h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  company.status === "Active"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                    company.status === "Active" ? "bg-emerald-500" : "bg-slate-400"
                  }`}
                />
                {company.status === "Active" ? "Active Client" : "Suspended"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {company.industry || "General Industry"} &bull; {company.country || "Global"} &bull;{" "}
              <a
                href={`https://${company.domain}`}
                target="_blank"
                rel="noreferrer"
                className="text-teal-600 hover:underline font-medium inline-flex items-center gap-0.5"
              >
                {company.domain} <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleStatus}
            className={`p-2 border rounded-lg text-xs flex items-center gap-1.5 font-medium shadow-2xs transition ${
              company.status === "Active"
                ? "border-rose-200 text-rose-600 hover:bg-rose-50"
                : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
            }`}
          >
            {company.status === "Active" ? "Suspend Account" : "Activate Account"}
          </button>
          <button
            onClick={() => {
              fetchCompany();
              fetchAssignedAuditors();
              fetchCompanyAssessments();
            }}
            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-xs flex items-center gap-1.5 font-medium shadow-2xs"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <Link
            href={`/assessments/new?companyId=${company._id}`}
            className="px-3.5 py-2 bg-gradient-to-r from-teal-500 via-cyan-600 to-blue-600 text-white rounded-lg text-xs font-semibold shadow-xs hover:opacity-95 transition flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Create Assessment
          </Link>
        </div>
      </div>

      {/* Tabs Navigation (Overview, Assessments, People / Auditors, Documents) */}
      <div className="bg-white rounded-xl border border-slate-200/90 px-4 pt-3 shrink-0 shadow-2xs flex items-center gap-6 text-xs font-semibold border-b">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 border-b-2 transition ${
            activeTab === "overview"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("assessments")}
          className={`pb-3 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === "assessments"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <span>Assessments</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 font-bold">
            {assessments.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("people")}
          className={`pb-3 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === "people"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <span>People &amp; Assigned Auditors</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-100 text-cyan-800 font-bold">
            {auditors.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("documents")}
          className={`pb-3 border-b-2 transition ${
            activeTab === "documents"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          Documents &amp; Evidence
        </button>
      </div>

      {/* Tab Content Canvas */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* ============================================================== */}
        {/* TAB 1: OVERVIEW                                                */}
        {/* ============================================================== */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs space-y-4 md:col-span-2">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4 text-teal-600" />
                Organization Profile
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px] uppercase font-semibold">Industry</span>
                  <span className="font-semibold text-slate-800 text-sm">{company.industry || "Technology"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] uppercase font-semibold">Size</span>
                  <span className="font-semibold text-slate-800 text-sm">{company.size || "500 - 1,000 employees"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] uppercase font-semibold">Contact Person</span>
                  <span className="font-semibold text-slate-900 text-sm">{company.clientUser?.name || "John Anderson"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] uppercase font-semibold">Email</span>
                  {company.clientUser?.email ? (
                    <a href={`mailto:${company.clientUser.email}`} className="font-semibold text-teal-600 hover:underline text-sm">
                      {company.clientUser.email}
                    </a>
                  ) : (
                    <span className="font-semibold text-teal-600 text-sm">{`contact@${company.domain}`}</span>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] uppercase font-semibold">Phone</span>
                  <span className="font-semibold text-slate-800 text-sm">{company.clientUser?.phone || "+1 212 555 0100"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] uppercase font-semibold">Address</span>
                  <span className="font-semibold text-slate-800 text-sm">{company.country || "123 Business Ave, New York, USA"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] uppercase font-semibold">Registration Number</span>
                  <span className="font-mono text-slate-800 text-sm">{company.registrationNumber || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] uppercase font-semibold">Subscription Tier</span>
                  <span className="font-bold text-amber-700 text-sm">{company.activePlan || "Bronze"}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[11px] uppercase font-semibold">DNS Verification</span>
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold text-sm mt-0.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    {company.verificationStatus === "Verified" ? "Verified Domain" : "Pending Check"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
                <h4 className="font-bold text-slate-900 text-xs">Auditing Scope Summary</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {auditors.length} certified assessor(s) assigned to this client organization in MongoDB.
                </p>
                <button
                  onClick={() => setActiveTab("people")}
                  className="w-full py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 font-semibold text-xs rounded-lg transition"
                >
                  Manage Assigned Auditors ({auditors.length})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: ASSESSMENTS                                             */}
        {/* ============================================================== */}
        {activeTab === "assessments" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs text-center">
                <div className="text-2xl font-black text-slate-900">{assessments.length}</div>
                <div className="text-xs text-slate-500 font-medium">Total Assessments</div>
              </div>
              <div className="bg-white rounded-xl border border-emerald-200 p-4 shadow-2xs text-center">
                <div className="text-2xl font-black text-emerald-600">{completedCount}</div>
                <div className="text-xs text-emerald-600 font-medium">Completed</div>
              </div>
              <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-2xs text-center">
                <div className="text-2xl font-black text-blue-600">{inProgressCount}</div>
                <div className="text-xs text-blue-600 font-medium">In Progress</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs text-center">
                <div className="text-2xl font-black text-slate-400">
                  {assessments.filter((a) => a.status === "Archived").length}
                </div>
                <div className="text-xs text-slate-400 font-medium">Archived</div>
              </div>
            </div>

            {/* Assessment Session Cards */}
            <div className="space-y-3">
              {assessments.map((a) => (
                <div
                  key={a._id}
                  className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                      <FileCheck2 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">
                        {a.assessmentType === "Full" ? "Full Framework Assessment" : "Lightweight Assessment"}
                      </div>
                      <div className="text-xs text-slate-400">
                        Initiated {new Date(a.createdAt || "").toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        a.status === "Submitted"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-blue-50 text-blue-700 border border-blue-200"
                      }`}
                    >
                      {a.status === "Submitted" ? "Submitted" : "In Progress"}
                    </span>
                    <Link
                      href={`/assessments/${a._id}`}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition"
                    >
                      Open Audit
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: PEOPLE & ASSIGNED AUDITORS                              */}
        {/* ============================================================== */}
        {activeTab === "people" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Assigned Certified Assessors</h3>
                <p className="text-xs text-slate-500">
                  Assessors mapped with authorization to verify this client organization.
                </p>
              </div>

              {isAdmin ? (
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-lg text-xs font-semibold shadow-xs hover:opacity-95 transition"
                >
                  <Plus className="h-3.5 w-3.5" /> + Assign Auditor
                </button>
              ) : (
                <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  Managed by Platform Admin
                </span>
              )}
            </div>

            {/* Access Role & Evaluation Scope Guide Banner */}
            <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-xl space-y-1.5 text-xs text-slate-600">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                <ShieldCheck className="h-4 w-4 text-teal-600 shrink-0" />
                <span>Auditor Access &amp; Evaluation Privileges</span>
              </div>
              <ul className="space-y-1 text-xs text-slate-500 leading-tight">
                <li>
                  <strong className="text-slate-700">Owner (Full Edit Access):</strong> Initiates assessments, evaluates controls, and uploads evidence.
                </li>
                <li>
                  <strong className="text-slate-700">Auditor (Review Access):</strong> Authorized co-auditor permitted to review working papers.
                </li>
                <li>
                  <strong className="text-slate-700">Submitted Assessments:</strong> Formally locked to Read-Only / View Only for all parties.
                </li>
              </ul>
            </div>

            {/* List */}
            {auditors.length === 0 ? (
              <div className="p-8 bg-white border border-slate-200 rounded-xl text-center space-y-2">
                <Users className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-800 text-sm">No Assessors Assigned</p>
                <p className="text-xs text-slate-400">
                  {isAdmin
                    ? 'Click "+ Assign Auditor" above to grant an assessor review privileges for this company.'
                    : "No certified assessors have been mapped to this organization by the platform administrator yet."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {auditors.map((item, idx) => {
                  const a = item.auditor;
                  const initial = a?.name?.charAt(0)?.toUpperCase() || "A";
                  const isUnassigning = unassigningId === item.mappingId;
                  const isLeadOwner = idx === 0 || (assessments.length > 0 && a?._id === assessments[0]?.conductedByUserId);
                  const isSubmitted = assessments.length > 0 && assessments[0]?.status === "Submitted";

                  return (
                    <div
                      key={item.mappingId}
                      className="bg-white border border-slate-200/90 rounded-xl p-4 flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-cyan-600 to-teal-500 text-white font-bold text-sm flex items-center justify-center shrink-0">
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-xs truncate">
                            {a?.name || "Assessor"}
                          </div>
                          <div className="text-xs text-slate-500 truncate">{a?.email}</div>

                          {/* Access Role Badge */}
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                isLeadOwner
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : "bg-blue-50 text-blue-800 border-blue-200"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  isLeadOwner ? "bg-emerald-500" : "bg-blue-500"
                                }`}
                              />
                              {isLeadOwner ? "Owner (Full Edit Access)" : "Auditor (Review Access)"}
                            </span>

                            {isSubmitted && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                Submitted (View Only)
                              </span>
                            )}
                          </div>

                          {item.assignedAt && (
                            <div className="text-[10px] text-slate-400 mt-1">
                              Assigned {new Date(item.assignedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>

                      {isAdmin && (
                        <button
                          onClick={() => handleUnassignAuditor(item.mappingId, a?.name || "Assessor")}
                          disabled={isUnassigning}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-50"
                          title="Unassign auditor"
                        >
                          {isUnassigning ? (
                            <RefreshCw className="h-4 w-4 animate-spin text-rose-500" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: DOCUMENTS                                               */}
        {/* ============================================================== */}
        {activeTab === "documents" && (
          <div className="bg-white rounded-xl border border-slate-200/90 p-8 text-center space-y-2">
            <FolderLock className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-800 text-sm">Evidence Vault Connected</p>
            <p className="text-xs text-slate-400">
              Files uploaded to this organization's audits are securely stored in S3.
            </p>
          </div>
        )}
      </div>

      {/* Modal: Assign Auditor */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Assign Auditor to {company.name}</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            <form onSubmit={handleAssignAuditor} className="p-4 space-y-3 text-xs">
              {assignError && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                  {assignError}
                </div>
              )}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Assessor</label>
                <select
                  value={selectedAssessorId}
                  onChange={(e) => setSelectedAssessorId(e.target.value)}
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="">-- Choose Certified Assessor --</option>
                  {availableAssessors
                    .filter((a) => !auditors.some((aud) => aud.auditor?._id === a._id))
                    .map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.name} ({a.email})
                      </option>
                    ))}
                </select>
              </div>
              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignLoading || !selectedAssessorId}
                  className="px-3.5 py-1.5 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition"
                >
                  {assignLoading ? "Assigning..." : "Confirm Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Modal */}
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
