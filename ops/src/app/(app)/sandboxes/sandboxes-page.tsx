"use client";

import { useState, useEffect, useCallback } from "react";
import { sandboxes } from "@/lib/api";
import { SandboxEnvironment } from "@/lib/types";
import { statusBadge, timeAgo, formatDate } from "@/lib/utils";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Activity, Plus, RefreshCw, X } from "lucide-react";

export function SandboxesPage() {
  const [sandboxes, setSandboxes] = useState<SandboxEnvironment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  const loadSandboxes = useCallback(async () => {
    setLoading(true);
      setError(null);
    try {
      const result = await sandboxes.list({
        status: statusFilter || undefined,
      });
      setSandboxes(result.sandboxes);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sandboxes");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadSandboxes();
  }, [loadSandboxes]);

  async function handleRenew(id: string) {
    try {
      const updated = await sandboxes.renew(id);
      setSandboxes((prev) => prev.map((s) => (s.id === id ? updated : s)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to renew sandbox");
    }
  }

  async function handleDecommission(id: string) {
    if (!confirm("Decommission this sandbox?")) return;
    try {
      await sandboxes.decommission(id);
      setSandboxes((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to decommission");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sandboxes</h1>
          <p className="mt-1 text-sm text-gray-400">
            Internal test environments — {total} active
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadSandboxes} className="rounded-lg border border-gray-700 bg-gray-800 p-2 text-gray-400 transition hover:text-white">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create Sandbox
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="decommissioned">Decommissioned</option>
        </select>
      </div>

      {loading ? <LoadingSpinner fullPage /> : (
        <>
          <div className="overflow-hidden rounded-lg border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Sandbox</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Owner</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Purpose</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Expires</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Renewals</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {sandboxes.map((s) => (
                  <tr key={s.id} className="bg-gray-900 transition hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{s.subdomain}</p>
                      <p className="text-xs text-gray-500">{s.vps_ip} ({s.vps_type})</p>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{s.owner_email || s.owner_user_id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-gray-400">{s.purpose || "—"}</td>
                    <td className="px-4 py-3">{statusBadge(s.status)}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-300">{formatDate(s.expires_at)}</span>
                      <span className="ml-2 text-xs text-gray-500">({timeAgo(s.expires_at)})</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {s.renewal_count}/{s.max_renewals}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {s.status === "active" && (
                          <>
                            <button
                              onClick={() => handleRenew(s.id)}
                              disabled={s.renewal_count >= s.max_renewals}
                              className="rounded px-2 py-1 text-xs text-blue-400 hover:bg-blue-500/10 disabled:opacity-50"
                            >
                              Renew
                            </button>
                            <button
                              onClick={() => handleDecommission(s.id)}
                              className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
                            >
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {sandboxes.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                      <Activity className="mx-auto mb-3 h-8 w-8 text-gray-600" />
                      No sandboxes found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showCreate && <CreateSandboxModal onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); loadSandboxes(); }} />}
    </div>
  );
}

function CreateSandboxModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [purpose, setPurpose] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
      setError(null);
    setError("");
    try {
      await sandboxes.create({ purpose });
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create sandbox");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Create Sandbox</h2>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">Purpose</label>
            <input
              type="text"
              required
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Demo for prospect X, Testing feature Y..."
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <p className="text-xs text-gray-500">
            Sandbox expires in 30 days. Max 2 renewals (60 days total).
          </p>
          {error && <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700">Cancel</button>
            <button type="submit" disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
