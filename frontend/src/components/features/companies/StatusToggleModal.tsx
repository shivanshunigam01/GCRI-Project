"use client";

import React, { useState } from "react";
import { companyService } from "@/services/company.service";
import { Button } from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import { AlertTriangle, CheckCircle2, X, AlertCircle } from "lucide-react";

interface StatusToggleModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: {
    _id: string;
    name: string;
    status: "Active" | "Suspended";
  };
  onSuccess: () => void;
}

export function StatusToggleModal({
  isOpen,
  onClose,
  company,
  onSuccess,
}: StatusToggleModalProps) {
  const isCurrentlyActive = company.status === "Active";
  const targetStatus = isCurrentlyActive ? "Suspended" : "Active";

  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isCurrentlyActive && !reason.trim()) {
      setError("A compliance reason is required when suspending an organization.");
      return;
    }

    setLoading(true);
    try {
      const res = await companyService.updateStatus(company._id, {
        status: targetStatus,
        reason: reason.trim() || undefined,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error?.message || "Failed to update operational status.");
      }
    } catch {
      setError("An unexpected error occurred while communicating with the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-zinc-200/90 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isCurrentlyActive ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {isCurrentlyActive ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-950">
                {isCurrentlyActive ? "Suspend Organization" : "Reactivate Organization"}
              </h3>
              <p className="text-[11px] text-zinc-500 font-medium truncate max-w-xs">{company.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 p-1.5 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {isCurrentlyActive ? (
          <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200/80 text-xs text-rose-800 space-y-1">
            <p className="font-semibold flex items-center gap-1.5 text-rose-900">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              Operational Impact
            </p>
            <p className="text-[11px] leading-relaxed text-rose-700">
              Suspended organizations cannot launch new AI governance assessments or invite new team assessors. Existing audit data remains archived and read-only.
            </p>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-emerald-800 space-y-1">
            <p className="font-semibold flex items-center gap-1.5 text-emerald-900">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Restoration of Access
            </p>
            <p className="text-[11px] leading-relaxed text-emerald-700">
              Reactivating this organization will immediately restore active governance workflows, assessor access, and evaluation queues.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 flex items-center justify-between">
              <span>{isCurrentlyActive ? "Suspension Reason" : "Reactivation Note (Optional)"}</span>
              {isCurrentlyActive && <span className="text-[10px] text-zinc-400 font-normal">Required</span>}
            </label>
            <textarea
              required={isCurrentlyActive}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isCurrentlyActive
                  ? "e.g. Failure to provide verified beneficial ownership documents within SLA window."
                  : "e.g. Corrected documentation submitted and validated."
              }
              className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={isCurrentlyActive ? "destructive" : "primary"}
              size="sm"
              disabled={loading}
              className="text-xs font-semibold"
            >
              {loading ? (
                <Spinner size="sm" />
              ) : isCurrentlyActive ? (
                "Confirm Suspension"
              ) : (
                "Reactivate Organization"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
