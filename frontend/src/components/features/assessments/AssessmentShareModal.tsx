"use client";

import React, { useCallback, useEffect, useState } from "react";
import { X, Share2, UserPlus, RefreshCw, Users } from "lucide-react";
import { assessmentService } from "@/services/assessment.service";
import { userService } from "@/services/user.service";
import { User } from "@/types/auth.types";
import { AssessmentSession } from "@/types/assessment.types";
import { getApiErrorMessage } from "@/lib/authUser";

interface Props {
  open: boolean;
  sessionId: string;
  sessionLabel?: string;
  onClose: () => void;
  onUpdated?: (session: AssessmentSession) => void;
}

export function AssessmentShareModal({
  open,
  sessionId,
  sessionLabel,
  onClose,
  onUpdated,
}: Props) {
  const [auditors, setAuditors] = useState<User[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [shared, setShared] = useState<{ _id: string; name: string; email: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!open || !sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const [usersRes, sessionRes] = await Promise.all([
        userService.getUsers({ role: "Auditor", limit: 100, status: "Active" }),
        assessmentService.getAssessmentById(sessionId),
      ]);
      const list = Array.isArray(usersRes.data) ? usersRes.data : [];
      setAuditors(list.filter((u) => u.role === "Auditor" || u.role === "Assessor"));
      const session = sessionRes.data?.session;
      const sw = session?.sharedWith ?? [];
      setShared(
        sw.map((s) => ({
          _id:
            typeof s.auditorId === "object" && s.auditorId
              ? String((s.auditorId as { _id?: string })._id ?? "")
              : String(s.auditorId),
          name:
            typeof s.auditorId === "object" && s.auditorId
              ? String((s.auditorId as { name?: string }).name ?? "Auditor")
              : "Auditor",
          email:
            typeof s.auditorId === "object" && s.auditorId
              ? String((s.auditorId as { email?: string }).email ?? "")
              : "",
        }))
      );
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Could not load auditors."));
    } finally {
      setLoading(false);
    }
  }, [open, sessionId]);

  useEffect(() => {
    if (open) {
      setSelected([]);
      setSuccess(null);
      load();
    }
  }, [open, load]);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleShare = async () => {
    if (selected.length === 0) {
      setError("Select at least one auditor.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await assessmentService.shareAssessment(sessionId, { auditorIds: selected });
      const session = (res.data as { session?: AssessmentSession })?.session;
      setSuccess("Assessment shared with selected auditor(s).");
      setSelected([]);
      if (session) onUpdated?.(session);
      await load();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Share failed."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (auditorId: string) => {
    setSubmitting(true);
    setError(null);
    try {
      await assessmentService.revokeAssessmentShare(sessionId, auditorId);
      setSuccess("Share access revoked.");
      await load();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Could not revoke share."));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Share2 className="h-4 w-4 text-teal-600 shrink-0" />
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Share assessment</h3>
              {sessionLabel && (
                <p className="text-[11px] text-slate-500 truncate">{sessionLabel}</p>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {error && (
            <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-2">
              {error}
            </p>
          )}
          {success && (
            <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-2">
              {success}
            </p>
          )}

          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> Currently shared
            </p>
            {shared.length === 0 ? (
              <p className="text-xs text-slate-500">No auditors have shared access yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {shared.map((a) => (
                  <li
                    key={a._id}
                    className="flex items-center justify-between text-xs border border-slate-200 rounded-lg px-2.5 py-1.5"
                  >
                    <span className="font-medium text-slate-800">
                      {a.name}
                      <span className="text-slate-500 font-normal ml-1">{a.email}</span>
                    </span>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleRevoke(a._id)}
                      className="text-rose-600 font-semibold hover:underline disabled:opacity-50"
                    >
                      Revoke
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
              <UserPlus className="h-3.5 w-3.5" /> Add auditors (same tenant)
            </p>
            {loading ? (
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin" /> Loading…
              </p>
            ) : (
              <ul className="max-h-40 overflow-y-auto space-y-1 border border-slate-200 rounded-lg p-2">
                {auditors.map((u) => (
                  <li key={u._id}>
                    <label className="flex items-center gap-2 text-xs cursor-pointer py-1">
                      <input
                        type="checkbox"
                        checked={selected.includes(u._id)}
                        onChange={() => toggle(u._id)}
                        className="rounded border-slate-300"
                      />
                      <span className="font-medium text-slate-800">{u.name}</span>
                      <span className="text-slate-500">{u.email}</span>
                    </label>
                  </li>
                ))}
                {auditors.length === 0 && (
                  <li className="text-xs text-slate-500 py-2 text-center">
                    Invite auditors under Administration → Users first.
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold border rounded-lg text-slate-700"
          >
            Close
          </button>
          <button
            type="button"
            disabled={submitting || selected.length === 0}
            onClick={handleShare}
            className="px-3 py-1.5 text-xs font-semibold bg-teal-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5"
          >
            {submitting ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Share2 className="h-3 w-3" />}
            Share
          </button>
        </div>
      </div>
    </div>
  );
}