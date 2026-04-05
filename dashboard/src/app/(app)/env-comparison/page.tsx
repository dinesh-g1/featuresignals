"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { toast } from "@/components/toast";
import { PageHeader, Card, CardHeader, Button, Badge, EmptyState } from "@/components/ui";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeftRight } from "lucide-react";
import type { Environment, EnvComparisonItem, EnvComparisonResponse } from "@/lib/types";

export default function EnvComparisonPage() {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const [envs, setEnvs] = useState<Environment[]>([]);
  const [sourceEnv, setSourceEnv] = useState("");
  const [targetEnv, setTargetEnv] = useState("");
  const [comparison, setComparison] = useState<EnvComparisonResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!token || !projectId) return;
    api.listEnvironments(token, projectId).then((e) => setEnvs(e ?? [])).catch(() => {});
  }, [token, projectId]);

  const sourceOptions = useMemo(() => [
    { value: "", label: "Select source…" },
    ...envs.map((e) => ({ value: e.id, label: e.name })),
  ], [envs]);

  const targetOptions = useMemo(() => [
    { value: "", label: "Select target…" },
    ...envs.filter((e) => e.id !== sourceEnv).map((e) => ({ value: e.id, label: e.name })),
  ], [envs, sourceEnv]);

  async function handleCompare() {
    if (!token || !projectId || !sourceEnv || !targetEnv) return;
    setLoading(true);
    try {
      const result = await api.compareEnvironments(token, projectId, sourceEnv, targetEnv);
      setComparison(result);
      setSelected(new Set());
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to compare", "error");
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
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Sync failed", "error");
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
      setSelected(new Set(comparison.diffs.map((d) => d.flag_key)));
    }
  }

  const sourceName = envs.find((e) => e.id === sourceEnv)?.name || "Source";
  const targetName = envs.find((e) => e.id === targetEnv)?.name || "Target";

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Environment Comparison"
        description="Compare flag states between two environments and sync differences"
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
        <div className="flex-1">
          <Label>Source Environment</Label>
          <div className="mt-1">
            <Select value={sourceEnv} onValueChange={setSourceEnv} options={sourceOptions} placeholder="Select source…" />
          </div>
        </div>
        <div className="hidden items-center pb-2 sm:flex">
          <ArrowLeftRight className="h-5 w-5 text-slate-400" />
        </div>
        <div className="flex-1">
          <Label>Target Environment</Label>
          <div className="mt-1">
            <Select value={targetEnv} onValueChange={setTargetEnv} options={targetOptions} placeholder="Select target…" />
          </div>
        </div>
        <Button onClick={handleCompare} disabled={!sourceEnv || !targetEnv || loading}>
          {loading ? "Comparing..." : "Compare"}
        </Button>
      </div>

      {comparison && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            <Card className="p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Flags</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{comparison.total}</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Differences</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">{comparison.diff_count}</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Identical</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">{comparison.total - comparison.diff_count}</p>
            </Card>
          </div>

          {(comparison.diffs ?? []).length > 0 && (
            <Card>
              <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selected.size === (comparison.diffs ?? []).length}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    {selected.size > 0 ? `${selected.size} selected` : "Select flags to sync"}
                  </span>
                </div>
                {selected.size > 0 && (
                  <Button size="sm" onClick={handleSync} disabled={syncing}>
                    {syncing ? "Syncing..." : `Apply ${selected.size} Change${selected.size > 1 ? "s" : ""}`}
                  </Button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3 w-8 sm:px-6"></th>
                      <th className="px-4 py-3 sm:px-6">Flag</th>
                      <th className="px-4 py-3">{sourceName} Enabled</th>
                      <th className="px-4 py-3">{targetName} Enabled</th>
                      <th className="hidden px-4 py-3 sm:table-cell">{sourceName} Rollout</th>
                      <th className="hidden px-4 py-3 sm:table-cell">{targetName} Rollout</th>
                      <th className="px-4 py-3">Differences</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(comparison.diffs ?? []).map((d) => (
                      <tr key={d.flag_key} className="transition-colors hover:bg-indigo-50/30">
                        <td className="px-4 py-3 sm:px-6">
                          <input
                            type="checkbox"
                            checked={selected.has(d.flag_key)}
                            onChange={() => toggleSelect(d.flag_key)}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-4 py-3 font-mono font-medium text-slate-900 sm:px-6">{d.flag_key}</td>
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
                        <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">{d.source_rollout != null ? `${(d.source_rollout / 100).toFixed(0)}%` : "—"}</td>
                        <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">{d.target_rollout != null ? `${(d.target_rollout / 100).toFixed(0)}%` : "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {d.differences?.map((diff: string) => (
                              <Badge key={diff} variant="warning">{diff}</Badge>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {(comparison.diffs ?? []).length === 0 && (
            <Card className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-emerald-600">All flags are identical between these environments</p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
