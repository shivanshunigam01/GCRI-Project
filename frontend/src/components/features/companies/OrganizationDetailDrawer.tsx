"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  X,
  Building2,
  Globe,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck2,
  Users,
  ShieldCheck,
  Plus,
  Trash2,
  ArrowRight,
  ExternalLink,
  Edit3,
  RefreshCw,
  FileText,
  FolderLock,
  Layers,
  ChevronRight,
  Check,
  Save,
} from "lucide-react";
import { Company, SubscriptionTier } from "@/types/company.types";
import { User as UserType } from "@/types/auth.types";
import { AssessmentSession } from "@/types/assessment.types";
import { OrgAuditorItem } from "@/types/auditorMapping.types";
import { auditorMappingService } from "@/services/auditorMapping.service";
import { assessmentService } from "@/services/assessment.service";
import { userService } from "@/services/user.service";
import { companyService } from "@/services/company.service";
import Modal, { ConfirmationVariant } from "@/components/ui/Modal";
import { ScreenBusyOverlay } from "@/components/shared/ScreenBusyOverlay";

interface OrganizationDetailDrawerProps {
  company: Company | null;
  onClose: () => void;
  onRefreshCompany?: () => void;
  isAdmin?: boolean;
}

type TabType = "overview" | "assessments" | "people" | "documents";

export default function OrganizationDetailDrawer({
  company: initialCompany,
  onClose,
  onRefreshCompany,
  isAdmin = false,
}: OrganizationDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [company, setCompany] = useState<Company | null>(initialCompany);
  const [profileRefreshing, setProfileRefreshing] = useState(false);

  // Fetch fresh company profile (including clientUser from backend)
  const fetchFreshCompany = useCallback(async (id: string) => {
    setProfileRefreshing(true);
    try {
      const res = await companyService.getCompanyById(id);
      if (res?.data) {
        setCompany(res.data);
      }
    } catch (err) {
      console.error("Failed to load enriched company details:", err);
    } finally {
      setProfileRefreshing(false);
    }
  }, []);

  // Sync state if initialCompany prop updates
  useEffect(() => {
    setCompany(initialCompany);
    if (initialCompany) {
      setEditForm({
        name: initialCompany.name,
        domain: initialCompany.domain,
        industry: initialCompany.industry || "",
        country: initialCompany.country || "",
        size: initialCompany.size || "500 - 1,000 employees",
        registrationNumber: initialCompany.registrationNumber || "",
        subscriptionTier: initialCompany.activePlan || "Gold",
      });
      if (initialCompany._id) {
        fetchFreshCompany(initialCompany._id);
      }
    }
  }, [initialCompany, fetchFreshCompany]);

  // Inline Direct Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);
  const [editForm, setEditForm] = useState({
    name: initialCompany?.name || "",
    domain: initialCompany?.domain || "",
    industry: initialCompany?.industry || "",
    country: initialCompany?.country || "",
    size: initialCompany?.size || "500 - 1,000 employees",
    registrationNumber: initialCompany?.registrationNumber || "",
    subscriptionTier: initialCompany?.activePlan || "Gold",
  });

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

  // People / Auditor Mappings State
  const [auditors, setAuditors] = useState<OrgAuditorItem[]>([]);
  const [auditorsLoading, setAuditorsLoading] = useState(false);
  const [availableAssessors, setAvailableAssessors] = useState<UserType[]>([]);
  const [selectedAssessorId, setSelectedAssessorId] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [unassigningId, setUnassigningId] = useState<string | null>(null);
  const [showAssignForm, setShowAssignForm] = useState(false);

  // Assessments State
  const [assessments, setAssessments] = useState<AssessmentSession[]>([]);
  const [assessmentsLoading, setAssessmentsLoading] = useState(false);

  // Fetch Auditors Assigned to this Organization
  const fetchAssignedAuditors = useCallback(async () => {
    if (!company?._id) return;
    setAuditorsLoading(true);
    try {
      const res = await auditorMappingService.getMappingsByOrg(company._id);
      if (res?.data?.auditors) {
        setAuditors(res.data.auditors);
      }
    } catch (err) {
      console.error("Failed to fetch assigned auditors for org:", err);
    } finally {
      setAuditorsLoading(false);
    }
  }, [company?._id]);

  // Fetch All Assessors (for assignment dropdown - Admin only)
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

  // Fetch Company Assessments
  const fetchCompanyAssessments = useCallback(async () => {
    if (!company?._id) return;
    setAssessmentsLoading(true);
    try {
      const res = await assessmentService.getCompanyAssessments(company._id);
      if (res?.data) {
        setAssessments(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch assessments for org:", err);
    } finally {
      setAssessmentsLoading(false);
    }
  }, [company?._id]);

  // Load data when company or tab changes
  useEffect(() => {
    if (company?._id) {
      fetchAssignedAuditors();
      fetchCompanyAssessments();
    }
  }, [company?._id, fetchAssignedAuditors, fetchCompanyAssessments]);

  useEffect(() => {
    if (activeTab === "people") {
      fetchAvailableAssessors();
    }
  }, [activeTab, fetchAvailableAssessors]);

  if (!company) return null;

  // Handle Direct Inline Edit Save (No Dialog Popup!)
  const handleSaveInlineEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company._id) return;
    setSavingEdit(true);
    setEditError(null);

    try {
      const updatedRes = await companyService.updateCompany(company._id, {
        name: editForm.name.trim(),
        industry: editForm.industry.trim() || undefined,
        country: editForm.country.trim() || undefined,
        registrationNumber: editForm.registrationNumber.trim() || undefined,
      });

      if (updatedRes?.data) {
        setCompany((prev) => ({
          ...updatedRes.data,
          clientUser: prev?.clientUser || updatedRes.data.clientUser,
          size: editForm.size.trim() || updatedRes.data.size,
        }));
      } else {
        setCompany((prev) =>
          prev
            ? {
                ...prev,
                name: editForm.name.trim(),
                domain: editForm.domain.trim().toLowerCase(),
                industry: editForm.industry.trim() || undefined,
                country: editForm.country.trim() || undefined,
                size: editForm.size.trim() || undefined,
                registrationNumber: editForm.registrationNumber.trim() || undefined,
                activePlan: editForm.subscriptionTier as any,
              }
            : null
        );
      }

      setIsEditing(false);
      setEditSuccess(true);
      setTimeout(() => setEditSuccess(false), 3000);
      onRefreshCompany?.();
    } catch (err: any) {
      console.error("Inline edit error:", err);
      setEditError(
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update organization details."
      );
    } finally {
      setSavingEdit(false);
    }
  };

  // Cancel Inline Edit
  const handleCancelInlineEdit = () => {
    setEditForm({
      name: company.name,
      domain: company.domain,
      industry: company.industry || "",
      country: company.country || "",
      size: company.size || "500 - 1,000 employees",
      registrationNumber: company.registrationNumber || "",
      subscriptionTier: company.activePlan || "Gold",
    });
    setEditError(null);
    setIsEditing(false);
  };

  // Handle Assign Auditor
  const handleAssignAuditor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssessorId || !company._id) return;
    setAssignLoading(true);
    setAssignError(null);
    try {
      await auditorMappingService.createMapping({
        auditorId: selectedAssessorId,
        organizationId: company._id,
      });
      setSelectedAssessorId("");
      setShowAssignForm(false);
      fetchAssignedAuditors();
      onRefreshCompany?.();
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
          onRefreshCompany?.();
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

  // Assessment Metrics
  const completedCount = assessments.filter((a) => a.status === "Submitted").length;
  const inProgressCount = assessments.filter((a) => a.status === "InProgress").length;
  const latestAssessment = assessments[0] || null;

  return (
    <div className="relative w-[390px] xl:w-[420px] bg-white border-l border-slate-200/90 flex flex-col h-full shrink-0 shadow-xl z-20 animate-in slide-in-from-right duration-200">
      <ScreenBusyOverlay show={profileRefreshing} label="Updating organization…" />
      {/* Header (Matching Reference Screen 4) */}
      <div className="p-4 border-b border-slate-200/80 bg-slate-50/40">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Logo Avatar */}
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 via-cyan-600 to-blue-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-2xs">
              {company.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-extrabold text-slate-900 text-sm truncate leading-tight">
                  {company.name}
                </h2>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    company.status === "Active"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-slate-100 text-slate-600 border border-slate-200"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full mr-1 ${
                      company.status === "Active" ? "bg-emerald-500" : "bg-slate-400"
                    }`}
                  />
                  {company.status === "Active" ? "Active Client" : "Suspended"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                {company.industry || "General Industry"} &bull; {company.country || "Global"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Direct Edit Toggle Button in Header */}
            <button
              onClick={() => {
                setActiveTab("overview");
                setIsEditing(!isEditing);
              }}
              title={isEditing ? "Close Edit" : "Edit Organization Directly"}
              className={`p-1.5 rounded-lg transition ${
                isEditing
                  ? "bg-teal-50 text-teal-700 border border-teal-200"
                  : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onClose}
              title="Close Drawer"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 4 Tabs Bar (Matching Screen 4) */}
        <div className="flex items-center gap-1 mt-4 border-b border-slate-200 -mb-4 pt-1">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-2.5 px-2.5 text-xs font-semibold transition border-b-2 ${
              activeTab === "overview"
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("assessments")}
            className={`pb-2.5 px-2.5 text-xs font-semibold transition border-b-2 flex items-center gap-1.5 ${
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
            className={`pb-2.5 px-2.5 text-xs font-semibold transition border-b-2 flex items-center gap-1.5 ${
              activeTab === "people"
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <span>People</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-100 text-cyan-800 font-bold">
              {auditors.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={`pb-2.5 px-2.5 text-xs font-semibold transition border-b-2 ${
              activeTab === "documents"
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Documents
          </button>
        </div>
      </div>

      {/* Drawer Body (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs [scrollbar-width:thin]">
        {/* ============================================================== */}
        {/* TAB 1: OVERVIEW (Direct Inline Edit Mode Available)            */}
        {/* ============================================================== */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            {editSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center gap-2 text-xs font-medium animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Organization details updated successfully!</span>
              </div>
            )}

            {/* Organization Details Card */}
            <div className="bg-slate-50/60 rounded-xl border border-slate-200/90 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-teal-600" />
                  {isEditing ? "Edit Organization (Direct)" : "Organization Details"}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-600 hover:text-teal-700 transition"
                >
                  <Edit3 className="h-3 w-3" />
                  {isEditing ? "Cancel" : "Edit"}
                </button>
              </div>

              {isEditing ? (
                /* Direct Inline Form - No Popup Dialog */
                <form onSubmit={handleSaveInlineEdit} className="space-y-3 pt-1 animate-in fade-in">
                  {editError && (
                    <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-[11px]">
                      {editError}
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      Legal Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      Primary Domain *
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.domain}
                      onChange={(e) => setEditForm({ ...editForm, domain: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                        Industry
                      </label>
                      <input
                        type="text"
                        value={editForm.industry}
                        onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                        placeholder="e.g. Technology"
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                        Company Size
                      </label>
                      <input
                        type="text"
                        value={editForm.size}
                        onChange={(e) => setEditForm({ ...editForm, size: e.target.value })}
                        placeholder="e.g. 500 - 1,000 employees"
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      Country / Address
                    </label>
                    <input
                      type="text"
                      value={editForm.country}
                      onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                      placeholder="e.g. 123 Business Ave, New York, USA"
                      className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                        Registration No
                      </label>
                      <input
                        type="text"
                        value={editForm.registrationNumber}
                        onChange={(e) => setEditForm({ ...editForm, registrationNumber: e.target.value })}
                        placeholder="e.g. REG-12345"
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                        Tier
                      </label>
                      <select
                        value={editForm.subscriptionTier}
                        onChange={(e) =>
                          setEditForm({ ...editForm, subscriptionTier: e.target.value as SubscriptionTier })
                        }
                        className="w-full text-xs px-2 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 cursor-pointer"
                      >
                        <option value="Gold">Gold</option>
                        <option value="Silver">Silver</option>
                        <option value="Bronze">Bronze</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={handleCancelInlineEdit}
                      className="px-2.5 py-1 text-slate-600 hover:bg-slate-200/60 rounded-md text-[11px] font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingEdit}
                      className="px-3 py-1 bg-gradient-to-r from-teal-500 to-blue-600 hover:opacity-95 text-white rounded-md text-[11px] font-semibold transition disabled:opacity-50 flex items-center gap-1 shadow-2xs"
                    >
                      {savingEdit ? (
                        <>
                          <RefreshCw className="h-3 w-3 animate-spin" /> Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-3 w-3" /> Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                /* View Mode - Matching Reference Screen (All Backend Fields) */
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between py-0.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Industry</span>
                    <span className="font-semibold text-slate-800">
                      {company.industry || "Technology"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-0.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Size</span>
                    <span className="font-semibold text-slate-800">
                      {company.size || "500 - 1,000 employees"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-0.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Website</span>
                    <a
                      href={`https://${company.domain}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-teal-600 hover:underline flex items-center gap-1"
                    >
                      <span>{company.domain}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  <div className="flex items-center justify-between py-0.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Contact Person</span>
                    <span className="font-semibold text-slate-900">
                      {company.clientUser?.name || "John Anderson"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-0.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Email</span>
                    {company.clientUser?.email ? (
                      <a
                        href={`mailto:${company.clientUser.email}`}
                        className="font-semibold text-teal-600 hover:underline"
                      >
                        {company.clientUser.email}
                      </a>
                    ) : (
                      <span className="font-semibold text-teal-600">
                        {`contact@${company.domain}`}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between py-0.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Phone</span>
                    <span className="font-semibold text-slate-800">
                      {company.clientUser?.phone || "+1 212 555 0100"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-0.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Address</span>
                    <span className="font-semibold text-slate-800 text-right">
                      {company.country || "123 Business Ave, New York, USA"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-0.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Registration No</span>
                    <span className="font-mono text-slate-700">
                      {company.registrationNumber || "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-0.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Subscription Tier</span>
                    <span className="font-bold text-amber-700">
                      {company.activePlan || "Standard"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-slate-500 font-medium">DNS Verification</span>
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      {company.verificationStatus === "Verified"
                        ? "Verified Domain"
                        : "Pending Check"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: ASSESSMENTS                                             */}
        {/* ============================================================== */}
        {activeTab === "assessments" && (
          <div className="space-y-4">
            {/* Assessment Summary Counters (Matching Reference Screen 4) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-800 text-xs">Assessment Summary</span>
                <Link
                  href="/assessments"
                  className="text-[11px] font-semibold text-teal-600 hover:underline flex items-center gap-0.5"
                >
                  View All <ArrowRight className="h-2.5 w-2.5" />
                </Link>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80 text-center">
                  <div className="text-lg font-black text-slate-900">{assessments.length}</div>
                  <div className="text-[10px] text-slate-500 font-medium">Total</div>
                </div>
                <div className="bg-emerald-50/70 rounded-xl p-2.5 border border-emerald-200 text-center">
                  <div className="text-lg font-black text-emerald-700">{completedCount}</div>
                  <div className="text-[10px] text-emerald-600 font-medium">Completed</div>
                </div>
                <div className="bg-blue-50/70 rounded-xl p-2.5 border border-blue-200 text-center">
                  <div className="text-lg font-black text-blue-700">{inProgressCount}</div>
                  <div className="text-[10px] text-blue-600 font-medium">In Progress</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80 text-center">
                  <div className="text-lg font-black text-slate-400">
                    {assessments.filter((a) => a.status === "Archived").length}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">Archived</div>
                </div>
              </div>
            </div>

            {/* Latest Assessment Card (Matching Reference Screen 4) */}
            {latestAssessment ? (
              <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                      <FileCheck2 className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-xs">
                        {latestAssessment.assessmentType === "Full" ? "Full Assessment" : "Light Assessment"}
                      </div>
                      <div className="text-[10.5px] text-slate-400">
                        Started {new Date(latestAssessment.createdAt || "").toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      latestAssessment.status === "Submitted"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}
                  >
                    {latestAssessment.status === "Submitted" ? "Completed" : "In Progress"}
                  </span>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-500 font-medium">Progress</span>
                    <span className="font-bold text-teal-700">
                      {latestAssessment.status === "Submitted" ? "100%" : "68%"}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-teal-500 to-blue-600 h-1.5 rounded-full"
                      style={{ width: latestAssessment.status === "Submitted" ? "100%" : "68%" }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                No active assessment sessions found for this company.
              </div>
            )}

            {/* Create New Assessment Primary Button (Matching Reference Screen 4) */}
            <Link
              href={`/assessments/new?companyId=${company._id}`}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-teal-500 via-cyan-600 to-blue-600 hover:opacity-95 text-white font-semibold text-xs rounded-xl shadow-xs transition"
            >
              <span>Create New Assessment</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: PEOPLE / AUDITOR MAPPINGS (THE SINGLE CLEAN HUB)        */}
        {/* ============================================================== */}
        {activeTab === "people" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-teal-600" />
                  Assigned Auditors &amp; Assessors
                </h3>
                <p className="text-[10.5px] text-slate-400 mt-0.5">
                  Certified assessors authorized to review this organization.
                </p>
              </div>

              {isAdmin ? (
                !showAssignForm && (
                  <button
                    onClick={() => setShowAssignForm(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 rounded-lg transition"
                  >
                    <Plus className="h-3 w-3" /> Assign Auditor
                  </button>
                )
              ) : (
                <span className="px-2.5 py-1 rounded-md text-[10.5px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  Managed by Platform Admin
                </span>
              )}
            </div>

            {/* Access Role & Evaluation Scope Guide Banner */}
            <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-xl space-y-1.5 text-xs text-slate-600">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                <ShieldCheck className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                <span>Auditor Access &amp; Evaluation Privileges</span>
              </div>
              <ul className="space-y-1 text-[10.5px] text-slate-500 leading-tight">
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

            {/* Inline Assign Auditor Form (Admin Only) */}
            {isAdmin && showAssignForm && (
              <form
                onSubmit={handleAssignAuditor}
                className="bg-slate-50/90 border border-slate-200 p-3 rounded-xl space-y-2.5 animate-in fade-in"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs">Select Certified Assessor</span>
                  <button
                    type="button"
                    onClick={() => setShowAssignForm(false)}
                    className="text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>

                {assignError && (
                  <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-[11px]">
                    {assignError}
                  </div>
                )}

                <select
                  value={selectedAssessorId}
                  onChange={(e) => setSelectedAssessorId(e.target.value)}
                  required
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-teal-500 font-medium"
                >
                  <option value="">-- Choose Assessor --</option>
                  {availableAssessors
                    .filter((a) => !auditors.some((aud) => aud.auditor?._id === a._id))
                    .map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.name} ({a.email})
                      </option>
                    ))}
                </select>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAssignForm(false)}
                    className="px-2.5 py-1 text-slate-600 hover:bg-slate-200/60 rounded-md text-[11px] font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={assignLoading || !selectedAssessorId}
                    className="px-3 py-1 bg-gradient-to-r from-teal-500 to-blue-600 hover:opacity-95 text-white rounded-md text-[11px] font-semibold transition disabled:opacity-50 flex items-center gap-1"
                  >
                    {assignLoading ? (
                      <>
                        <RefreshCw className="h-3 w-3 animate-spin" /> Assigning...
                      </>
                    ) : (
                      <>
                        <Plus className="h-3 w-3" /> Confirm Assignment
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* List of Assigned Auditors */}
            {auditorsLoading ? (
              <div className="py-2 space-y-3" aria-busy aria-label="Loading auditors">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 rounded-lg bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : auditors.length === 0 ? (
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1.5">
                <Users className="h-6 w-6 text-slate-300 mx-auto" />
                <p className="font-semibold text-slate-700 text-xs">No Auditors Assigned Yet</p>
                <p className="text-[11px] text-slate-400">
                  Certified assessors mapped with privileges to audit this organization.
                </p>
                {isAdmin && !showAssignForm && (
                  <button
                    onClick={() => setShowAssignForm(true)}
                    className="mt-2 px-3 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-teal-700 font-semibold text-[11px] rounded-lg transition"
                  >
                    + Assign First Auditor
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {auditors.map((item, idx) => {
                  const a = item.auditor;
                  const initial = a?.name?.charAt(0)?.toUpperCase() || "A";
                  const isUnassigning = unassigningId === item.mappingId;
                  const isLeadOwner = idx === 0 || (assessments.length > 0 && a?._id === assessments[0]?.conductedByUserId);
                  const isSubmitted = assessments.length > 0 && assessments[0]?.status === "Submitted";

                  return (
                    <div
                      key={item.mappingId}
                      className="bg-white border border-slate-200/90 rounded-xl p-3 flex items-center justify-between gap-2.5 hover:shadow-2xs transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-cyan-600 to-teal-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-xs truncate">
                            {a?.name || "Assessor"}
                          </div>
                          <div className="text-[10.5px] text-slate-500 truncate">{a?.email}</div>
                          
                          {/* Access-based Role Badge */}
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-semibold border ${
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
                              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                Submitted (View Only)
                              </span>
                            )}
                          </div>

                          {item.assignedAt && (
                            <div className="text-[9.5px] text-slate-400 mt-1">
                              Assigned {new Date(item.assignedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Unassign Button (Admin Only) */}
                      {isAdmin && (
                        <button
                          onClick={() => handleUnassignAuditor(item.mappingId, a?.name || "Assessor")}
                          disabled={isUnassigning}
                          title="Unassign auditor"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0 disabled:opacity-40"
                        >
                          {isUnassigning ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin text-rose-500" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
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
        {/* TAB 4: DOCUMENTS / EVIDENCE                                    */}
        {/* ============================================================== */}
        {activeTab === "documents" && (
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <FolderLock className="h-3.5 w-3.5 text-teal-600" />
              Auditing Evidence &amp; Artifacts
            </h3>
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1">
              <FileText className="h-6 w-6 text-slate-300 mx-auto" />
              <p className="font-medium text-slate-700 text-xs">Evidence Repository Linked</p>
              <p className="text-[11px] text-slate-400">
                Uploaded audit documents across active assessments will appear here.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info Lockup */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
        <span className="font-mono text-[10px] text-slate-400 truncate max-w-[200px]">
          ID: {company._id}
        </span>
        <Link
          href={`/organizations/${company._id}`}
          className="font-semibold text-teal-600 hover:underline flex items-center gap-1"
        >
          <span>Full Page</span>
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {/* Confirmation Modal */}
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
