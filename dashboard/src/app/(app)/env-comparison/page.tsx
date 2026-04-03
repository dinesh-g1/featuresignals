"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { toast } from "@/components/toast";

export default function EnvComparisonPage() {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const [envs, setEnvs] = useState<any[]>([]);
  const [sourceEnv, setSourceEnv] = useState("");
  const [targetEnv, setTargetEnv] = useState("");
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!token || !projectId) return;
    api.listEnvironments(token, projectId).then((e) => setEnvs(e ?? [])).catch(() => {});
  }, [token, projectId]);

  async function handleCompare() {
    if (!token || !projectId || !sourceEnv || !targetEnv) return;
    setLoading(true);
    try {
      const result = await api.compareEnvironments(token, projectId, sourceEnv, targetEnv);
      setComparison(result);
      setSelected(new Set());
    } catch (err: any) {
      toast(err.message || "Failed to compare", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    if (!token || !projectId || selected.size === 0) return;
    setSyncing(true);
    try {
      await api.syncEnvironments(token, projectId, {
        source_env_id: sourceEnv,
        target_env_id: targetEnv,
        flag_keys: Array.from(selected),
      });
      toast(`Synced ${selected.size} flag(s)`, "success");
      handleCompare();
    } catch (err: any) {
      toast(err.message || "Sync failed", "error");
    } finally {
      setSyncing(false);
    }
  }

  function toggleSelect(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAll() {
    if (!comparison?.diffs) return;
    if (selected.size === comparison.diffs.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(comparison.diffs.map((d: any) => d.flag_key)));
    }
  }

  const sourceName = envs.find((e) => e.id === sourceEnv)?.name || "Source";
  const targetName = envs.find((e) => e.id === targetEnv)?.name || "Target";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Environment Comparison</h1>
        <p className="mt-1 text-sm text-slate-500">Compare flag states between two environments and sync differences</p>
      </div>

      <div className="flex items-end gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700">Source Environment</label>
          <select
            value={sourceEnv}
            onChange={(e) => setSourceEnv(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Select source...</option>
            {envs.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center pb-2">
          <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700">Target Environment</label>
          <select
            value={targetEnv}
            onChange={(e) => setTargetEnv(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Select target...</option>
            {envs.filter((e) => e.id !== sourceEnv).map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleCompare}
          disabled={!sourceEnv || !targetEnv || loading}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition-all hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Comparing..." : "Compare"}
        </button>
      </div>

      {comparison && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Flags</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{comparison.total}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Differences</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">{comparison.diff_count}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Identical</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">{comparison.total - comparison.diff_count}</p>
            </div>
          </div>

          {comparison.diffs.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selected.size === comparison.diffs.length}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    {selected.size > 0 ? `${selected.size} selected` : "Select flags to sync"}
                  </span>
                </div>
                {selected.size > 0 && (
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {syncing ? "Syncing..." : `Apply ${selected.size} Change${selected.size > 1 ? "s" : ""}`}
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <th className="px-6 py-3 w-8"></th>
                      <th className="px-6 py-3">Flag</th>
                      <th className="px-4 py-3">{sourceName} Enabled</th>
                      <th className="px-4 py-3">{targetName} Enabled</th>
                      <th className="px-4 py-3">{sourceName} Rollout</th>
                      <th className="px-4 py-3">{targetName} Rollout</th>
                      <th className="px-4 py-3">Differences</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {comparison.diffs.map((d: any) => (
                      <tr key={d.flag_key} className="transition-colors hover:bg-indigo-50/30">
                        <td className="px-6 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(d.flag_key)}
                            onChange={() => toggleSelect(d.flag_key)}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-6 py-3 font-mono font-medium text-slate-900">{d.flag_key}</td>
                        <td className="px-4 py-3">
                          {d.source_enabled != null && (
                            <span className={`inline-block h-2 w-2 rounded-full ${d.source_enabled ? "bg-emerald-500" : "bg-slate-300"}`} />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {d.target_enabled != null && (
                            <span className={`inline-block h-2 w-2 rounded-full ${d.target_enabled ? "bg-emerald-500" : "bg-slate-300"}`} />
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{d.source_rollout != null ? `${(d.source_rollout / 100).toFixed(0)}%` : "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{d.target_rollout != null ? `${(d.target_rollout / 100).toFixed(0)}%` : "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {d.differences?.map((diff: string) => (
                              <span key={diff} className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200">
                                {diff}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {comparison.diffs.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
              <p className="text-sm font-medium text-emerald-600">All flags are identical between these environments</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
