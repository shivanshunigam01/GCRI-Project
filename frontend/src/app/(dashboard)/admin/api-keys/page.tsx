"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiKeyService, ApiKeyItem } from "@/services/apiKey.service";
import { companyService } from "@/services/company.service";
import { Company } from "@/types/company.types";
import { ApiKeysPageSkeleton, DataTableSkeleton } from "@/components/shared/PageSkeletons";
import {
  Lock,
  Key,
  Plus,
  RefreshCw,
  AlertCircle,
  Copy,
  Check,
  Trash2,
  ShieldAlert,
  Building2,
  Clock,
  EyeOff,
  CheckCircle2,
  X,
} from "lucide-react";

export default function ApiKeysPage() {
  const { user, isAdmin } = useAuth();
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Key Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createCompanyId, setCreateCompanyId] = useState("");
  const [createRole, setCreateRole] = useState("ReadOnly");
  const [createExpiresInDays, setCreateExpiresInDays] = useState("90");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Key Generated Success Modal
  const [generatedKeyResult, setGeneratedKeyResult] = useState<{
    name: string;
    rawKey: string;
    prefix: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Revoke Key State
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [keysRes, companiesRes] = await Promise.all([
        apiKeyService.listApiKeys(),
        companyService.getCompanies(),
      ]);
      setKeys(keysRes.data?.keys || []);
      setCompanies(companiesRes.data || []);
      if (companiesRes.data?.length && !createCompanyId) {
        setCreateCompanyId(companiesRes.data[0]._id);
      }
    } catch (err: any) {
      console.error("Failed to load API keys:", err);
      setError(err?.response?.data?.message || err?.message || "Failed to load API keys.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) {
      setCreateError("Key name is required.");
      return;
    }
    if (!createCompanyId) {
      setCreateError("Please select a target client organization.");
      return;
    }

    try {
      setCreating(true);
      setCreateError(null);
      const res = await apiKeyService.createApiKey({
        name: createName.trim(),
        companyId: createCompanyId,
        role: createRole,
        expiresInDays: createExpiresInDays === "never" ? undefined : Number(createExpiresInDays),
      });

      const { apiKey } = res.data;
      setGeneratedKeyResult({
        name: apiKey.name,
        rawKey: apiKey.rawKey,
        prefix: apiKey.prefix,
      });

      setIsCreateOpen(false);
      setCreateName("");
      setCreateExpiresInDays("90");
      loadData();
    } catch (err: any) {
      console.error("Failed to generate API key:", err);
      setCreateError(err?.response?.data?.message || err?.message || "Failed to create API key.");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently revoke API key "${name}"? Headless services using this key will be disconnected immediately.`)) {
      return;
    }

    try {
      setRevokingId(id);
      await apiKeyService.revokeApiKey(id);
      await loadData();
    } catch (err: any) {
      console.error("Failed to revoke API key:", err);
      alert(err?.response?.data?.message || err?.message || "Failed to revoke API key.");
    } finally {
      setRevokingId(null);
    }
  };

  const handleCopyKey = () => {
    if (!generatedKeyResult?.rawKey) return;
    navigator.clipboard.writeText(generatedKeyResult.rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-xs">
        <div className="h-12 w-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Platform Admin Authorization Required</h2>
        <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
          Machine-to-Machine API credential creation is restricted strictly to GRAICE Platform Administrators.
        </p>
      </div>
    );
  }

  const activeKeysCount = keys.filter((k) => k.isActive).length;
  const revokedKeysCount = keys.filter((k) => !k.isActive).length;

  if (loading && keys.length === 0 && !error) {
    return <ApiKeysPageSkeleton />;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
            <Lock className="h-4 w-4" />
            <span>M2M Authentication</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Machine-to-Machine API Keys
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Provision cryptographically signed API keys for headless CI/CD, telemetry ingestion, and automated auditing.
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
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Generate API Key</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
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

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Key className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{keys.length}</div>
            <div className="text-xs font-medium text-slate-500">Total Provisioned Keys</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{activeKeysCount}</div>
            <div className="text-xs font-medium text-slate-500">Active Live Credentials</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-slate-100 text-slate-500 rounded-xl">
            <EyeOff className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{revokedKeysCount}</div>
            <div className="text-xs font-medium text-slate-500">Revoked / Inactive Keys</div>
          </div>
        </div>
      </div>

      {/* Keys Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Provisioned API Credentials</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Secret keys are stored as SHA-256 hashes and cannot be displayed after creation.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-4">
              <DataTableSkeleton rows={5} columns={5} className="border-0 shadow-none" />
            </div>
          ) : keys.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <Key className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="font-medium text-slate-600">No M2M API keys created yet.</p>
              <p className="text-slate-400 mt-0.5">Generate a key to authorize automated external services.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Key Name &amp; Prefix</th>
                  <th className="px-4 py-3">Client Organization</th>
                  <th className="px-4 py-3">Authorized Role</th>
                  <th className="px-4 py-3">Expiration</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {keys.map((k) => {
                  const companyName =
                    typeof k.companyId === "object" && k.companyId?.name
                      ? k.companyId.name
                      : companies.find((c) => c._id === k.companyId)?.name || "All Orgs";

                  return (
                    <tr key={k._id} className="hover:bg-slate-50/60 transition">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-md bg-slate-100 text-slate-700">
                            <Key className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 block">{k.name}</span>
                            <span className="font-mono text-[11px] text-slate-400">
                              {k.prefix}_••••••••••••••••
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
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {k.role}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-slate-500">
                        {k.expiresAt ? (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span>{new Date(k.expiresAt).toLocaleDateString()}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Never expires</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            k.isActive
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-500 line-through"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              k.isActive ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                          />
                          {k.isActive ? "Active" : "Revoked"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-slate-400 text-[11px]">
                        {k.createdAt ? new Date(k.createdAt).toLocaleDateString() : "--"}
                      </td>

                      <td className="px-6 py-3.5 text-right">
                        {k.isActive ? (
                          <button
                            onClick={() => handleRevoke(k._id, k.name)}
                            disabled={revokingId === k._id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>{revokingId === k._id ? "Revoking..." : "Revoke"}</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Inactive</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal: Generate New API Key */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Key className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Generate M2M API Key</h3>
                  <p className="text-xs text-slate-500">Create credentials for automated platform interactions.</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Key Name / Friendly Label *
                </label>
                <input
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g., CI/CD Governance Pipeline, Splunk SIEM Forwarder"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Client Organization *
                </label>
                <select
                  required
                  value={createCompanyId}
                  onChange={(e) => setCreateCompanyId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                >
                  {companies.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.domain})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  This key will be scoped strictly to this client tenant organization.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assigned Role
                  </label>
                  <select
                    value={createRole}
                    onChange={(e) => setCreateRole(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  >
                    <option value="ReadOnly">ReadOnly</option>
                    <option value="Auditor">Auditor</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Key Expiration
                  </label>
                  <select
                    value={createExpiresInDays}
                    onChange={(e) => setCreateExpiresInDays(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  >
                    <option value="30">30 Days</option>
                    <option value="90">90 Days (Recommended)</option>
                    <option value="180">180 Days</option>
                    <option value="365">1 Year</option>
                    <option value="never">Never (Persistent)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-xs disabled:opacity-50"
                >
                  {creating && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>{creating ? "Generating..." : "Generate Key"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Key Generated Success (One-Time Secret Display) */}
      {generatedKeyResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">API Key Successfully Created</h3>
                <p className="text-xs text-slate-500">{generatedKeyResult.name}</p>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-xs text-amber-900">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="h-4 w-4 text-amber-700 shrink-0" />
                <span>Save this secret key immediately!</span>
              </div>
              <p className="text-amber-800 leading-relaxed">
                For security reasons, this raw token is never stored in plaintext and will{" "}
                <strong>never be shown again</strong>. If you lose this key, you must revoke it and generate a new one.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Secret API Token
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-900 text-emerald-400 font-mono text-xs px-3.5 py-2.5 rounded-lg select-all overflow-x-auto break-all border border-slate-800">
                  {generatedKeyResult.rawKey}
                </div>
                <button
                  onClick={handleCopyKey}
                  className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition shrink-0 flex items-center gap-1.5 shadow-xs"
                >
                  {copied ? (
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
                onClick={() => setGeneratedKeyResult(null)}
                className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition"
              >
                I Have Safely Saved This Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
