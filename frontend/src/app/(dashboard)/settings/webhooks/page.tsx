"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  webhookService,
  WebhookSubscriptionItem,
  TestWebhookResult,
} from "@/services/webhook.service";
import { companyService } from "@/services/company.service";
import { Company } from "@/types/company.types";
import { WebhooksPageSkeleton, DataTableSkeleton } from "@/components/shared/PageSkeletons";
import {
  SlidersHorizontal,
  Plus,
  RefreshCw,
  AlertCircle,
  Copy,
  Check,
  Trash2,
  Send,
  Building2,
  CheckCircle2,
  XCircle,
  X,
  ExternalLink,
  Shield,
  Activity,
} from "lucide-react";

const AVAILABLE_EVENTS = [
  {
    id: "assessment.submitted",
    label: "assessment.submitted",
    description: "Triggered whenever an assessment is formally finalized and locked by an auditor.",
  },
  {
    id: "assessment.scored",
    label: "assessment.scored",
    description: "Triggered when scoring engine produces spider radar and maturity levels.",
  },
  {
    id: "company.verified",
    label: "company.verified",
    description: "Triggered upon domain DNS record verification or manual admin clearance.",
  },
  {
    id: "ping",
    label: "ping",
    description: "Diagnostic connectivity test event dispatched from platform settings.",
  },
];

export default function WebhooksPage() {
  const { user, isAdmin } = useAuth();
  const [webhooks, setWebhooks] = useState<WebhookSubscriptionItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Register Modal State
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [registerUrl, setRegisterUrl] = useState("");
  const [registerCompanyId, setRegisterCompanyId] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["assessment.submitted"]);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  // Webhook Created Success Modal (One-time Secret Display)
  const [registeredWebhookResult, setRegisteredWebhookResult] = useState<{
    id: string;
    url: string;
    secret: string;
  } | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);

  // Test Ping State
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    webhookId: string;
    result: TestWebhookResult["result"];
  } | null>(null);

  // Deleting State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [hooksRes, companiesRes] = await Promise.all([
        webhookService.listWebhooks(),
        companyService.getCompanies(),
      ]);
      setWebhooks(hooksRes.data?.webhooks || []);
      setCompanies(companiesRes.data || []);
      if (companiesRes.data?.length && !registerCompanyId) {
        setRegisterCompanyId(companiesRes.data[0]._id);
      }
    } catch (err: any) {
      console.error("Failed to load webhooks:", err);
      setError(err?.response?.data?.message || err?.message || "Failed to load webhook subscriptions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleEvent = (eventId: string) => {
    if (selectedEvents.includes(eventId)) {
      if (selectedEvents.length === 1) return; // Must have at least 1 event
      setSelectedEvents(selectedEvents.filter((e) => e !== eventId));
    } else {
      setSelectedEvents([...selectedEvents, eventId]);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerUrl.trim()) {
      setRegisterError("Target URL is required.");
      return;
    }
    if (!registerUrl.startsWith("http://") && !registerUrl.startsWith("https://")) {
      setRegisterError("URL must begin with http:// or https://");
      return;
    }
    if (!registerCompanyId && !user?.companyId) {
      setRegisterError("Target organization must be selected.");
      return;
    }

    try {
      setRegistering(true);
      setRegisterError(null);
      const resolvedCompanyId =
        registerCompanyId ||
        (typeof user?.companyId === "string"
          ? user.companyId
          : user?.companyId?._id) ||
        undefined;

      const res = await webhookService.registerWebhook({
        url: registerUrl.trim(),
        companyId: resolvedCompanyId,
        events: selectedEvents,
      });

      const { webhook } = res.data;
      setRegisteredWebhookResult({
        id: webhook.id,
        url: webhook.url,
        secret: webhook.secret,
      });

      setIsRegisterOpen(false);
      setRegisterUrl("");
      setSelectedEvents(["assessment.submitted"]);
      loadData();
    } catch (err: any) {
      console.error("Failed to register webhook:", err);
      setRegisterError(err?.response?.data?.message || err?.message || "Failed to register webhook.");
    } finally {
      setRegistering(false);
    }
  };

  const handleDelete = async (id: string, url: string) => {
    if (!confirm(`Are you sure you want to delete the webhook subscription for:\n${url}?`)) {
      return;
    }

    try {
      setDeletingId(id);
      await webhookService.deleteWebhook(id);
      await loadData();
    } catch (err: any) {
      console.error("Failed to delete webhook:", err);
      alert(err?.response?.data?.message || err?.message || "Failed to delete webhook.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleTestPing = async (id: string) => {
    try {
      setTestingId(id);
      setTestResult(null);
      const res = await webhookService.testWebhook(id);
      setTestResult({
        webhookId: id,
        result: res.data.result,
      });
    } catch (err: any) {
      console.error("Webhook test failed:", err);
      setTestResult({
        webhookId: id,
        result: {
          success: false,
          error: err?.response?.data?.message || err?.message || "Network dispatch failure",
        },
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleCopySecret = () => {
    if (!registeredWebhookResult?.secret) return;
    navigator.clipboard.writeText(registeredWebhookResult.secret);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2500);
  };

  if (loading && webhooks.length === 0 && !error) {
    return <WebhooksPageSkeleton />;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
            <SlidersHorizontal className="h-4 w-4" />
            <span>Developer Webhooks</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Outbound Webhooks
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure HMAC-SHA256 authenticated webhook endpoints for automated SIEM alerts, assessment completions, and compliance triggers.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-blue-600" : "text-slate-500"}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsRegisterOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Add Webhook</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadData}
            className="text-xs font-semibold text-red-700 hover:text-red-900 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Test Ping Diagnostic Banner */}
      {testResult && (
        <div
          className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-xs ${
            testResult.result.success
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-red-50 border-red-200 text-red-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {testResult.result.success ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600 shrink-0" />
            )}
            <div>
              <p className="font-bold text-sm">
                {testResult.result.success ? "Test Ping Succeeded" : "Test Ping Failed"}
              </p>
              <p className="mt-0.5">
                {testResult.result.success
                  ? `Target endpoint responded with HTTP ${testResult.result.statusCode || 200} in ${testResult.result.responseTimeMs || 0}ms.`
                  : testResult.result.error || `HTTP ${testResult.result.statusCode} response.`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setTestResult(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Webhooks Subscriptions Directory */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Active Webhook Endpoints</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Outbound HTTP POST payloads include an HMAC signature in the <code className="font-mono text-slate-700">X-GRAICE-Signature</code> header.
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500">
            {webhooks.length} {webhooks.length === 1 ? "subscription" : "subscriptions"}
          </span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-4">
              <DataTableSkeleton rows={4} columns={5} className="border-0 shadow-none" />
            </div>
          ) : webhooks.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <Activity className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="font-medium text-slate-600">No webhook endpoints configured.</p>
              <p className="text-slate-400 mt-0.5">
                Register a webhook URL to receive real-time notifications on assessment completions.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Destination URL</th>
                  <th className="px-4 py-3">Associated Organization</th>
                  <th className="px-4 py-3">Subscribed Events</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {webhooks.map((w) => {
                  const companyName =
                    companies.find((c) => c._id === w.companyId)?.name || "All Orgs";

                  return (
                    <tr key={w._id} className="hover:bg-slate-50/60 transition">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-md bg-slate-100 text-slate-700">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <span className="font-mono text-xs font-semibold text-slate-900 block truncate max-w-sm">
                              {w.url}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              HMAC-SHA256 Signed
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          <span>{companyName}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {w.events.map((ev) => (
                            <span
                              key={ev}
                              className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200"
                            >
                              {ev}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            w.isActive
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              w.isActive ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                          />
                          {w.isActive ? "Active" : "Disabled"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-slate-400 text-[11px]">
                        {w.createdAt ? new Date(w.createdAt).toLocaleDateString() : "--"}
                      </td>

                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleTestPing(w._id)}
                            disabled={testingId === w._id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition disabled:opacity-50"
                          >
                            <Send className={`h-3 w-3 ${testingId === w._id ? "animate-pulse" : ""}`} />
                            <span>{testingId === w._id ? "Pinging..." : "Test Ping"}</span>
                          </button>

                          <button
                            onClick={() => handleDelete(w._id, w.url)}
                            disabled={deletingId === w._id}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition disabled:opacity-50"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>{deletingId === w._id ? "..." : "Delete"}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal: Register Webhook */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add Webhook Subscription</h3>
                  <p className="text-xs text-slate-500">Dispatch live telemetry to an external HTTP receiver.</p>
                </div>
              </div>
              <button
                onClick={() => setIsRegisterOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {registerError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{registerError}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Destination URL *
                </label>
                <input
                  type="url"
                  required
                  value={registerUrl}
                  onChange={(e) => setRegisterUrl(e.target.value)}
                  placeholder="https://api.yourcompany.com/webhooks/graice"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>

              {isAdmin && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Client Organization Scope *
                  </label>
                  <select
                    required
                    value={registerCompanyId}
                    onChange={(e) => setRegisterCompanyId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  >
                    {companies.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.domain})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Subscribed Events
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {AVAILABLE_EVENTS.map((ev) => {
                    const isChecked = selectedEvents.includes(ev.id);
                    return (
                      <label
                        key={ev.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                          isChecked
                            ? "border-blue-300 bg-blue-50/50"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleEvent(ev.id)}
                          className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <span className="font-mono text-xs font-semibold text-slate-900 block">
                            {ev.label}
                          </span>
                          <span className="text-[11px] text-slate-500 block leading-tight">
                            {ev.description}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-xs disabled:opacity-50"
                >
                  {registering && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>{registering ? "Registering..." : "Register Webhook"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Webhook Registered Success (One-Time Secret Display) */}
      {registeredWebhookResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Webhook Registered Successfully</h3>
                <p className="text-xs text-slate-500">{registeredWebhookResult.url}</p>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-xs text-amber-900">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="h-4 w-4 text-amber-700 shrink-0" />
                <span>Save this signing secret now!</span>
              </div>
              <p className="text-amber-800 leading-relaxed">
                Use this secret to verify the <code className="font-mono font-semibold">X-GRAICE-Signature</code> HMAC header on incoming POST requests. It will <strong>never be displayed again</strong>.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Signing Secret (HMAC-SHA256)
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-900 text-emerald-400 font-mono text-xs px-3.5 py-2.5 rounded-lg select-all overflow-x-auto break-all border border-slate-800">
                  {registeredWebhookResult.secret}
                </div>
                <button
                  onClick={handleCopySecret}
                  className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition shrink-0 flex items-center gap-1.5 shadow-xs"
                >
                  {secretCopied ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-300" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setRegisteredWebhookResult(null)}
                className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition"
              >
                I Have Safely Saved This Secret
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
