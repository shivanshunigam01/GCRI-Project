"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { adminFrameworkService } from "@/services/adminFramework.service";
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
} from "lucide-react";

export default function AdminFrameworksPage() {
  const { isAdmin } = useAuth();
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

    try {
      await adminFrameworkService.publishFramework(id);
      setActionMessage(`Version ${version} promoted to Published! Prior versions archived.`);
      fetchFrameworks();
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to publish framework version.");
    }
  };

  const handleDelete = async (id: string, version: string) => {
    if (!confirm(`Are you sure you want to permanently delete draft ${version}?`)) {
      return;
    }

    try {
      await adminFrameworkService.deleteDraft(id);
      setActionMessage(`Draft version ${version} deleted.`);
      fetchFrameworks();
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to delete draft framework.");
    }
  };

  const handleRollback = async (id: string, version: string) => {
    if (!confirm(`Reactivate archived version ${version} to active published status?`)) {
      return;
    }

    try {
      await adminFrameworkService.rollbackFramework(id);
      setActionMessage(`Version ${version} reactivated to Published status.`);
      fetchFrameworks();
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Failed to rollback framework version.");
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
        <Shield className="h-8 w-8 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Access Restricted</h2>
        <p className="text-xs text-slate-500">Only Platform Administrators can manage framework versions.</p>
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
        <div className="space-y-4 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-xl border border-slate-200 p-6 space-y-3">
              <div className="h-5 bg-slate-200 rounded w-1/4" />
              <div className="h-4 bg-slate-200 rounded w-1/2" />
            </div>
          ))}
        </div>
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
                  {isDraft && (
                    <>
                      <button
                        type="button"
                        onClick={() => handlePublish(fw._id, fw.version)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-2xs transition"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Publish
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(fw._id, fw.version)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 font-semibold text-xs rounded-lg transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </>
                  )}

                  {isArchived && (
                    <button
                      type="button"
                      onClick={() => handleRollback(fw._id, fw.version)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg transition"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Reactivate
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
    </div>
  );
}
