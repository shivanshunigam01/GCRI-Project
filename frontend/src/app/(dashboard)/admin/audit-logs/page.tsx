"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { auditLogService } from "@/services/auditLog.service";
import { AuditLogEntry, AuditLogStats } from "@/types/auditLog.types";
import {
  History,
  Shield,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  User,
  Clock,
  Layers,
  CheckCircle2,
  Lock,
} from "lucide-react";

export default function AdminAuditLogsPage() {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchAuditData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [logsRes, statsRes] = await Promise.all([
        auditLogService.getAuditLogs({
          entity: entityFilter || undefined,
          action: actionFilter || undefined,
          search: searchQuery || undefined,
          limit: 50,
        }),
        auditLogService.getAuditLogStats(),
      ]);

      const logList = Array.isArray(logsRes?.data) ? logsRes.data : [];
      setLogs(logList);
      if (statsRes?.data) setStats(statsRes.data);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || "Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, [entityFilter, actionFilter]);

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
        <Shield className="h-8 w-8 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Access Restricted</h2>
        <p className="text-xs text-slate-500">Only Platform Administrators have access to the immutable security audit trail.</p>
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
              Security Audit Trail Explorer
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Immutable Ledger
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Complete cryptographic audit trail for compliance verification, authentication events, and administrative actions.
          </p>
        </div>

        <button
          onClick={fetchAuditData}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Trail
        </button>
      </div>

      {/* 24h Metrics KPI Row */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              24h Event Velocity
            </span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {stats.eventsLast24Hours}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Auth Denials (24h)
            </span>
            <div className="text-2xl font-extrabold text-rose-600 mt-1">
              {stats.authorizationDenialsCount}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Total Recorded Logs
            </span>
            <div className="text-2xl font-extrabold text-blue-600 mt-1">
              {stats.totalEvents}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Top Action (24h)
            </span>
            <div className="text-sm font-bold text-slate-800 truncate mt-2">
              {stats.topActions?.[0]?.action || "LOGIN_SUCCESS"}
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by actor email or entity ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchAuditData()}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Entity Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <Filter className="h-3.5 w-3.5 text-slate-400" /> Entity:
          </div>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Entities</option>
            <option value="User">User</option>
            <option value="Company">Company</option>
            <option value="AssessmentSession">AssessmentSession</option>
            <option value="AssessmentFramework">AssessmentFramework</option>
            <option value="AuditorOrganization">AuditorOrganization</option>
            <option value="ApiKey">ApiKey</option>
          </select>

          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Actions</option>
            <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
            <option value="LOGIN_FAILED">LOGIN_FAILED</option>
            <option value="AUTHORIZATION_DENIED">AUTHORIZATION_DENIED</option>
            <option value="USER_INVITED">USER_INVITED</option>
            <option value="COMPANY_CREATED">COMPANY_CREATED</option>
            <option value="ASSESSMENT_SUBMITTED">ASSESSMENT_SUBMITTED</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Main Audit Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 bg-slate-100 rounded" />
            ))}
          </div>
        ) : logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] font-semibold text-slate-400 uppercase bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">IP &amp; Client</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const isExpanded = expandedLogId === log._id;
                  const actorEmail =
                    log.actorEmail ||
                    (typeof log.actorId === "object" ? log.actorId?.email : "") ||
                    "System";

                  let actionColor = "bg-slate-100 text-slate-700 border-slate-200";
                  if (log.action.includes("DENIED") || log.action.includes("FAILED")) {
                    actionColor = "bg-rose-50 text-rose-700 border-rose-200";
                  } else if (log.action.includes("SUCCESS") || log.action.includes("SUBMITTED")) {
                    actionColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                  } else if (log.action.includes("CREATED") || log.action.includes("INVITED")) {
                    actionColor = "bg-blue-50 text-blue-700 border-blue-200";
                  }

                  return (
                    <React.Fragment key={log._id}>
                      <tr className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {actorEmail}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${actionColor}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                          {log.entity} {log.entityId ? `(#${log.entityId.slice(-6)})` : ""}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px] font-mono">
                          {log.ipAddress || "127.0.0.1"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedLogId(isExpanded ? null : log._id)
                            }
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                          >
                            {isExpanded ? "Close" : "Inspect"}
                            {isExpanded ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable JSON State Snapshot Drawer */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80">
                          <td colSpan={6} className="p-4 text-xs space-y-2 border-b border-slate-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-[11px]">
                              {log.before && (
                                <div className="p-3 bg-white rounded-lg border border-slate-200">
                                  <span className="font-bold text-slate-700 block mb-1">Before State:</span>
                                  <pre className="text-slate-600 overflow-x-auto">
                                    {JSON.stringify(log.before, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.after && (
                                <div className="p-3 bg-white rounded-lg border border-slate-200">
                                  <span className="font-bold text-slate-700 block mb-1">After State:</span>
                                  <pre className="text-slate-600 overflow-x-auto">
                                    {JSON.stringify(log.after, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                            {log.userAgent && (
                              <div className="text-[10px] text-slate-400">
                                <strong>User Agent:</strong> {log.userAgent}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center space-y-2">
            <History className="h-8 w-8 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900">No audit records found</h3>
            <p className="text-xs text-slate-500">No events matched the selected filter query.</p>
          </div>
        )}
      </div>
    </div>
  );
}
