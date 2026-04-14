"use client";

import { useState, useEffect, useCallback } from "react";
import { audit } from "@/lib/api";
import { OpsAuditLog } from "@/lib/types";
import { timeAgo, formatDateTime } from "@/lib/utils";
import { LoadingSpinner } from "@/components/loading-spinner";
import { FileText, RefreshCw } from "lucide-react";

export function AuditPage() {
  const [logs, setLogs] = useState<OpsAuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const loadData = useCallback(async () => {
    setLoading(true);
      setError(null);
    try {
      const result = await audit.list({
        action: actionFilter || undefined,
        limit,
        offset,
      });
      setLogs(result.logs);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [actionFilter, offset]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Log</h1>
          <p className="mt-1 text-sm text-gray-400">{total} entries</p>
        </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
          {error}
        </div>
      )}
        <button onClick={loadData} className="rounded-lg border border-gray-700 bg-gray-800 p-2 text-gray-400 transition hover:text-white">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setOffset(0); }} className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white">
        <option value="">All Actions</option>
        <option value="provision_env">Provision Environment</option>
        <option value="decommission_env">Decommission Environment</option>
        <option value="toggle_maintenance">Toggle Maintenance</option>
        <option value="toggle_debug">Toggle Debug</option>
        <option value="view_logs">View Logs</option>
        <option value="ssh_access">SSH Access</option>
        <option value="override_quota">Override Quota</option>
        <option value="create_license">Create License</option>
        <option value="revoke_license">Revoke License</option>
        <option value="create_sandbox">Create Sandbox</option>
      </select>

      {loading ? <LoadingSpinner fullPage /> : (
        <div className="overflow-hidden rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Target</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {logs.map((log) => (
                <tr key={log.id} className="bg-gray-900 transition hover:bg-gray-800/50">
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDateTime(log.created_at)}</td>
                  <td className="px-4 py-3 text-gray-300">{log.ops_user_name || log.ops_user_id.slice(0, 8)}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-300">{log.action}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {log.target_name || (log.target_id ? `${log.target_type} (${log.target_id.slice(0, 8)})` : "—")}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{log.ip_address || "—"}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                    <FileText className="mx-auto mb-3 h-8 w-8 text-gray-600" />
                    No audit logs found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}</p>
        <div className="flex items-center gap-2">
          <button onClick={() => setOffset((o) => Math.max(0, o - limit))} disabled={offset === 0} className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white disabled:opacity-50">Previous</button>
          <button onClick={() => setOffset((o) => o + limit)} disabled={offset + limit >= total} className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  );
}
