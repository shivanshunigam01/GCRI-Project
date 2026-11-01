"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { adminFrameworkService } from "@/services/adminFramework.service";
import { FrameworkListSkeleton, DataTableSkeleton } from "@/components/shared/PageSkeletons";
import {
  Layers,
  Plus,
  CheckCircle2,
  Clock,
  Archive,
  Trash2,
  RotateCcw,
  Upload,
  AlertCircle,
  Loader2,
  FileText,
  Shield,
  ChevronRight,
  BookOpen,
  Settings,
  Search,
  Sliders,
  Check,
  X,
} from "lucide-react";
import { AssessmentFramework, FrameworkQuestion } from "@/types/framework.types";

export default function AdminFrameworksPage() {
  const { isSuperAdmin } = useAuth();
  const [frameworks, setFrameworks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Draft Modal State
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [newVersion, setNewVersion] = useState("");
  const [newType, setNewType] = useState<"Light" | "Full">("Full");
  const [cloneFrom, setCloneFrom] = useState("");
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [frameworkActionKey, setFrameworkActionKey] = useState<string | null>(null);
  const [questionActionId, setQuestionActionId] = useState<string | null>(null);

  const fetchFrameworks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFrameworkService.listFrameworks();
      const list = Array.isArray(res?.data) ? res.data : [];
      setFrameworks(list);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || "Failed to load framework versions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFrameworks();
  }, []);

  // Control Inspection & Authoring Drawer State
  const [controlsModalOpen, setControlsModalOpen] = useState(false);
  const [activeFrameworkDetail, setActiveFrameworkDetail] = useState<AssessmentFramework | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [controlSearch, setControlSearch] = useState("");
  const [showAddControl, setShowAddControl] = useState(false);
  const [addingControl, setAddingControl] = useState(false);
  const [newQuestionForm, setNewQuestionForm] = useState({
    questionId: "",
    pillarId: "",
    text: "",
    mandatory: true,
  });

  const openControlsDrawer = async (frameworkId: string) => {
    setControlsModalOpen(true);
    setLoadingDetail(true);
    setShowAddControl(false);
    setControlSearch("");
    try {
      const res = await adminFrameworkService.getFrameworkById(frameworkId);
      const fw = res?.data;
      if (fw) {
        setActiveFrameworkDetail(fw);
        if (fw.pillars?.length) {
          setNewQuestionForm((prev) => ({ ...prev, pillarId: fw.pillars[0].pillarId }));
        }
      }
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to load framework controls.");
      setControlsModalOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleToggleQuestion = async (questionId: string, currentActive: boolean) => {
    if (!activeFrameworkDetail?._id) return;
    setQuestionActionId(questionId);
    try {
      await adminFrameworkService.toggleQuestionStatus(activeFrameworkDetail._id, questionId, !currentActive);
      setActiveFrameworkDetail((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          questions: prev.questions.map((q) =>
            q.questionId === questionId ? { ...q, isActive: !currentActive } : q
          ),
        };
      });
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to toggle question status.");
    } finally {
      setQuestionActionId(null);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!activeFrameworkDetail?._id) return;
    if (!confirm(`Are you sure you want to delete control '${questionId}'?`)) return;
    setQuestionActionId(questionId);
    try {
      await adminFrameworkService.deleteQuestion(activeFrameworkDetail._id, questionId);
      setActiveFrameworkDetail((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          questions: prev.questions.filter((q) => q.questionId !== questionId),
        };
      });
      fetchFrameworks();
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to delete control.");
    } finally {
      setQuestionActionId(null);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFrameworkDetail?._id) return;
    if (!newQuestionForm.questionId.trim() || !newQuestionForm.text.trim() || !newQuestionForm.pillarId) {
      alert("Question ID, Pillar, and Requirement text are required.");
      return;
    }
    setAddingControl(true);
    try {
      const selectedPillar = activeFrameworkDetail.pillars.find((p) => p.pillarId === newQuestionForm.pillarId);
      const payload: FrameworkQuestion = {
        questionId: newQuestionForm.questionId.trim(),
        pillarId: newQuestionForm.pillarId,
        pillarNumber: selectedPillar?.pillarNumber || 1,
        pillarName: selectedPillar?.name || "Governance",
        text: newQuestionForm.text.trim(),
        mandatory: newQuestionForm.mandatory,
        isActive: true,
        order: activeFrameworkDetail.questions.length + 1,
        responseOptions: [
          { code: "Pass", label: "Full Compliance", scoreValue: 10, order: 1 },
          { code: "Inconclusive", label: "Partial Compliance", scoreValue: 5, order: 2 },
          { code: "Fail", label: "Non-Compliant Exception", scoreValue: 0, order: 3 },
          { code: "N/A", label: "Not Applicable", scoreValue: 0, order: 4 },
        ],
      };

      const res = await adminFrameworkService.addQuestion(activeFrameworkDetail._id, payload);
      const addedQ = res.data?.question || payload;
      setActiveFrameworkDetail((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          questions: [...prev.questions, addedQ],
        };
      });
      setShowAddControl(false);
      setNewQuestionForm({
        questionId: "",
        pillarId: activeFrameworkDetail.pillars[0]?.pillarId || "",
        text: "",
        mandatory: true,
      });
      fetchFrameworks();
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to add control.");
    } finally {
      setAddingControl(false);
    }
  };

  const handleCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersion.trim()) return;

    setCreatingDraft(true);
    setActionMessage(null);
    try {
      await adminFrameworkService.createDraft({
        version: newVersion.trim(),
        assessmentType: newType,
        cloneFromVersion: cloneFrom.trim() || undefined,
      });
      setShowDraftModal(false);
      setNewVersion("");
      setCloneFrom("");
      setActionMessage(`Draft framework version created successfully!`);
      fetchFrameworks();
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to create framework draft.");
    } finally {
      setCreatingDraft(false);
    }
  };

  const handlePublish = async (id: string, version: string) => {
    if (!confirm(`Are you sure you want to promote ${version} to Published? Any existing published version of this type will be archived.`)) {
      return;
    }

    setFrameworkActionKey(`publish:${id}`);
    try {
      await adminFrameworkService.publishFramework(id);
      setActionMessage(`Version ${version} promoted to Published! Prior versions archived.`);
      fetchFrameworks();
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to publish framework version.");
    } finally {
      setFrameworkActionKey(null);
    }
  };

  const handleDelete = async (id: string, version: string) => {
    if (!confirm(`Are you sure you want to permanently delete draft ${version}?`)) {
      return;
    }

    setFrameworkActionKey(`delete:${id}`);
    try {
      await adminFrameworkService.deleteDraft(id);
      setActionMessage(`Draft version ${version} deleted.`);
      fetchFrameworks();
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to delete draft framework.");
    } finally {
      setFrameworkActionKey(null);
    }
  };

  const handleRollback = async (id: string, version: string) => {
    if (!confirm(`Reactivate archived version ${version} to active published status?`)) {
      return;
    }

    setFrameworkActionKey(`rollback:${id}`);
    try {
      await adminFrameworkService.rollbackFramework(id);
      setActionMessage(`Version ${version} reactivated to Published status.`);
      fetchFrameworks();
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to rollback framework version.");
    } finally {
      setFrameworkActionKey(null);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-3 shadow-xs">
        <Shield className="h-8 w-8 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Platform Governance Restricted</h2>
        <p className="text-xs text-slate-500">Only Platform Super Administrators can author and publish framework versions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-editorial">
              Framework Version Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Governance Engine
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Author and release framework versions, configure controls across 7 pillars, and enforce deterministic scoring thresholds.
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowDraftModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0c162c] hover:bg-slate-800 text-white font-semibold text-xs rounded-lg shadow-sm transition"
          >
            <Plus className="h-4 w-4" />
            + New Framework Draft
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{actionMessage}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-slate-400 hover:text-slate-600 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Framework Cards List */}
      {loading ? (
        <FrameworkListSkeleton />
      ) : frameworks.length > 0 ? (
        <div className="space-y-4">
          {frameworks.map((fw) => {
            const isPublished = fw.status === "Published";
            const isDraft = fw.status === "Draft";
            const isArchived = fw.status === "Archived";

            let statusPill = "bg-slate-100 text-slate-700 border-slate-200";
            if (isPublished) statusPill = "bg-emerald-50 text-emerald-700 border-emerald-200";
            else if (isDraft) statusPill = "bg-amber-50 text-amber-700 border-amber-200";

            return (
              <div
                key={fw._id}
                className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-base font-bold text-slate-900 font-mono">
                      v{fw.version}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                      {fw.assessmentType} Framework
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusPill}`}>
                      {fw.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600">
                    {fw.title || `GRAICE ${fw.assessmentType} Assurance Framework`} • {fw.questions?.length || 0} Controls across {fw.pillars?.length || 7} Pillars
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-slate-400">
                    <span>Created: {new Date(fw.createdAt).toLocaleDateString()}</span>
                    {fw.publishedAt && (
                      <span>Published: {new Date(fw.publishedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                {/* Framework Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => openControlsDrawer(fw._id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg shadow-2xs transition"
                  >
                    <Sliders className="h-3.5 w-3.5 text-slate-500" />
                    {isDraft ? "Manage Controls" : "View Controls"}
                  </button>

                  {isDraft && (
                    <>
                      <button
                        type="button"
                        disabled={frameworkActionKey === `publish:${fw._id}`}
                        onClick={() => handlePublish(fw._id, fw.version)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-2xs transition disabled:opacity-60"
                      >
                        {frameworkActionKey === `publish:${fw._id}` ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}{" "}
                        Publish
                      </button>
                      <button
                        type="button"
                        disabled={frameworkActionKey === `delete:${fw._id}`}
                        onClick={() => handleDelete(fw._id, fw.version)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 font-semibold text-xs rounded-lg transition disabled:opacity-60"
                      >
                        {frameworkActionKey === `delete:${fw._id}` ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}{" "}
                        Delete
                      </button>
                    </>
                  )}

                  {isArchived && (
                    <button
                      type="button"
                      disabled={frameworkActionKey === `rollback:${fw._id}`}
                      onClick={() => handleRollback(fw._id, fw.version)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg transition disabled:opacity-60"
                    >
                      {frameworkActionKey === `rollback:${fw._id}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3.5 w-3.5" />
                      )}{" "}
                      Reactivate
                    </button>
                  )}

                  {isPublished && (
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Active Live Version
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
          <BookOpen className="h-8 w-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900">No framework versions found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Create a new draft version to start authoring GRAICE framework controls.
          </p>
        </div>
      )}

      {/* New Framework Draft Modal */}
      {showDraftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 font-editorial">
                Create Framework Draft
              </h3>
              <button
                type="button"
                onClick={() => setShowDraftModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDraft} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Version Identifier (e.g. 1.2.0-draft)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1.2.0-draft"
                  value={newVersion}
                  onChange={(e) => setNewVersion(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Evaluation Framework Tier
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewType("Light")}
                    className={`py-2 px-3 rounded-lg border text-center transition font-semibold ${
                      newType === "Light"
                        ? "border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600"
                        : "border-slate-200 text-slate-600 bg-white"
                    }`}
                  >
                    Lightweight
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewType("Full")}
                    className={`py-2 px-3 rounded-lg border text-center transition font-semibold ${
                      newType === "Full"
                        ? "border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600"
                        : "border-slate-200 text-slate-600 bg-white"
                    }`}
                  >
                    Full Framework
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Clone Controls from Existing Version (Optional)
                </label>
                <select
                  value={cloneFrom}
                  onChange={(e) => setCloneFrom(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Start Empty (No clone)</option>
                  {frameworks.map((f) => (
                    <option key={f._id} value={f.version}>
                      v{f.version} ({f.status}) — {f.questions?.length || 0} questions
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDraftModal(false)}
                  className="px-3.5 py-2 text-slate-600 hover:text-slate-900 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingDraft}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0c162c] hover:bg-slate-800 disabled:opacity-50 text-white font-semibold rounded-lg shadow-sm"
                >
                  {creatingDraft ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" /> Create Draft
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Framework Controls Modal / Drawer */}
      {controlsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                  <Sliders className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 font-editorial">
                      Framework Controls &amp; Question Builder
                    </h3>
                    {activeFrameworkDetail && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800 font-mono">
                        v{activeFrameworkDetail.version}
                      </span>
                    )}
                    {activeFrameworkDetail && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          activeFrameworkDetail.status === "Published"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : activeFrameworkDetail.status === "Draft"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {activeFrameworkDetail.status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {activeFrameworkDetail?.status === "Draft"
                      ? "Author, modify, toggle, or remove compliance controls for this draft version."
                      : "Cryptographically finalized controls for deterministic audit scoring."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setControlsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {loadingDetail ? (
                <div className="py-4">
                  <DataTableSkeleton rows={8} columns={4} />
                </div>
              ) : activeFrameworkDetail ? (
                <>
                  {/* Top Control Bar: Search and + Add button */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search controls by ID or text..."
                        value={controlSearch}
                        onChange={(e) => setControlSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {activeFrameworkDetail.status === "Draft" && (
                      <button
                        type="button"
                        onClick={() => setShowAddControl(!showAddControl)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0c162c] hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {showAddControl ? "Cancel Add" : "+ Add New Control"}
                      </button>
                    )}
                  </div>

                  {/* Add Control Inline Form */}
                  {showAddControl && activeFrameworkDetail.status === "Draft" && (
                    <form
                      onSubmit={handleAddQuestion}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-in fade-in text-xs"
                    >
                      <h4 className="font-bold text-slate-900">Define New Framework Control</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Control ID (e.g. SEC-08)
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. SEC-08"
                            value={newQuestionForm.questionId}
                            onChange={(e) =>
                              setNewQuestionForm((p) => ({ ...p, questionId: e.target.value }))
                            }
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Pillar Classification
                          </label>
                          <select
                            value={newQuestionForm.pillarId}
                            onChange={(e) =>
                              setNewQuestionForm((p) => ({ ...p, pillarId: e.target.value }))
                            }
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {activeFrameworkDetail.pillars?.map((p) => (
                              <option key={p.pillarId} value={p.pillarId}>
                                {p.name || p.pillarId}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Mandatory Control?
                          </label>
                          <select
                            value={newQuestionForm.mandatory ? "yes" : "no"}
                            onChange={(e) =>
                              setNewQuestionForm((p) => ({
                                ...p,
                                mandatory: e.target.value === "yes",
                              }))
                            }
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="yes">Yes (Mandatory)</option>
                            <option value="no">No (Elective / Advisory)</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Control Requirement Statement / Verification Procedure
                        </label>
                        <textarea
                          required
                          rows={2}
                          placeholder="Describe the control objective and evidence verification procedure required from the client..."
                          value={newQuestionForm.text}
                          onChange={(e) =>
                            setNewQuestionForm((p) => ({ ...p, text: e.target.value }))
                          }
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowAddControl(false)}
                          className="px-3 py-1.5 text-slate-600 hover:text-slate-900 font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={addingControl}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg shadow-sm"
                        >
                          {addingControl ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Adding...
                            </>
                          ) : (
                            <>
                              <Plus className="h-3.5 w-3.5" /> Save Control
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Controls Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">Control ID</th>
                          <th className="py-2.5 px-3">Pillar</th>
                          <th className="py-2.5 px-3">Control Statement</th>
                          <th className="py-2.5 px-3">Status</th>
                          {activeFrameworkDetail.status === "Draft" && (
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {activeFrameworkDetail.questions
                          .filter((q) => {
                            if (!controlSearch.trim()) return true;
                            const query = controlSearch.toLowerCase();
                            return (
                              q.questionId.toLowerCase().includes(query) ||
                              q.text.toLowerCase().includes(query) ||
                              q.pillarName?.toLowerCase().includes(query)
                            );
                          })
                          .map((q) => (
                            <tr key={q.questionId} className="hover:bg-slate-50/50 transition">
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900 shrink-0">
                                {q.questionId}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 shrink-0">
                                <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 font-medium">
                                  {q.pillarName || q.pillarId}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-800 max-w-md">
                                <p className="line-clamp-2">{q.text}</p>
                              </td>
                              <td className="py-2.5 px-3 shrink-0">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    q.isActive !== false
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : "bg-slate-100 text-slate-500 border border-slate-200"
                                  }`}
                                >
                                  {q.isActive !== false ? "Active" : "Inactive"}
                                </span>
                              </td>
                              {activeFrameworkDetail.status === "Draft" && (
                                <td className="py-2.5 px-3 text-right shrink-0">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      disabled={questionActionId === q.questionId}
                                      onClick={() => handleToggleQuestion(q.questionId, q.isActive !== false)}
                                      className="p-1 rounded hover:bg-slate-100 text-slate-600 text-[11px] font-semibold disabled:opacity-50 inline-flex items-center gap-1"
                                      title={q.isActive !== false ? "Deactivate Control" : "Activate Control"}
                                    >
                                      {questionActionId === q.questionId ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : null}
                                      {q.isActive !== false ? "Deactivate" : "Activate"}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={questionActionId === q.questionId}
                                      onClick={() => handleDeleteQuestion(q.questionId)}
                                      className="p-1 rounded hover:bg-rose-50 text-rose-600 text-[11px] font-semibold"
                                      title="Delete Control"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span>
                Total Controls Assessed:{" "}
                <strong className="text-slate-800 font-mono">
                  {activeFrameworkDetail?.questions?.length || 0}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => setControlsModalOpen(false)}
                className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg shadow-2xs transition"
              >
                Close Specification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
