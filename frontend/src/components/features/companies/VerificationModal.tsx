"use client";

import React, { useState } from "react";
import { companyService } from "@/services/company.service";
import { Button } from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  X,
  AlertCircle,
  FileText,
} from "lucide-react";

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: {
    _id: string;
    name: string;
    verificationStatus: "Verified" | "Pending" | "Rejected";
  };
  onSuccess: () => void;
}

export function VerificationModal({
  isOpen,
  onClose,
  company,
  onSuccess,
}: VerificationModalProps) {
  const [status, setStatus] = useState<"Verified" | "Pending" | "Rejected">(
    company.verificationStatus || "Verified"
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!notes.trim()) {
      setError("Audit verification notes are required for institutional compliance.");
      return;
    }

    setLoading(true);
    try {
      const res = await companyService.verify(company._id, {
        verificationStatus: status,
        notes: notes.trim(),
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error?.message || "Failed to update verification status.");
      }
    } catch {
      setError("An unexpected error occurred while communicating with the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-zinc-200/90 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-950">Verify Organization Legitimacy</h3>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Status Selection Cards */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-700">Verification Decision</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Verified */}
              <button
                type="button"
                onClick={() => setStatus("Verified")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  status === "Verified"
                    ? "border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600 text-emerald-950"
                    : "border-zinc-200 hover:border-zinc-300 text-zinc-700"
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1 leading-snug">
                  Cleared for AI governance audits.
                </p>
              </button>

              {/* Pending */}
              <button
                type="button"
                onClick={() => setStatus("Pending")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  status === "Pending"
                    ? "border-amber-600 bg-amber-50/50 ring-1 ring-amber-600 text-amber-950"
                    : "border-zinc-200 hover:border-zinc-300 text-zinc-700"
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pending</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1 leading-snug">
                  Awaiting documentation.
                </p>
              </button>

              {/* Rejected */}
              <button
                type="button"
                onClick={() => setStatus("Rejected")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  status === "Rejected"
                    ? "border-rose-600 bg-rose-50/50 ring-1 ring-rose-600 text-rose-950"
                    : "border-zinc-200 hover:border-zinc-300 text-zinc-700"
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Rejected</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1 leading-snug">
                  Ineligible entity.
                </p>
              </button>
            </div>
          </div>

          {/* Audit Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-zinc-400" />
                <span>Verification Audit Trail Notes</span>
              </span>
              <span className="text-[10px] text-zinc-400 font-normal">Required</span>
            </label>
            <textarea
              required
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Verified business registration via official state registry; MX and DNS records valid."
              className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all"
            />
            <p className="text-[11px] text-zinc-400">
              Permanently recorded in the company audit log with your reviewer signature and timestamp.
            </p>
          </div>

          {/* Footer Controls */}
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
              variant="primary"
              size="sm"
              disabled={loading}
              className="text-xs font-semibold"
            >
              {loading ? <Spinner size="sm" /> : <span>Confirm Decision</span>}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
