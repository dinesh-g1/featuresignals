"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { toast } from "@/components/toast";
import { PageHeader, Card, Button, Badge, EmptyState } from "@/components/ui";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  ArrowLeftRightIcon,
  FolderOpenIcon,
} from "@/components/icons/nav-icons";
import type { Environment, EnvComparisonResponse } from "@/lib/types";

export default function EnvComparisonPage() {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const [envs, setEnvs] = useState<Environment[]>([]);
  const [sourceEnv, setSourceEnv] = useState("");
  const [targetEnv, setTargetEnv] = useState("");
  const [comparison, setComparison] = useState<EnvComparisonResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!token || !projectId) return;
    api
      .listEnvironments(token, projectId)
      .then((e) => setEnvs(e ?? []))
      .catch(() => {});
  }, [token, projectId]);

  const sourceOptions = useMemo(
    () => [
      { value: "", label: "Select source…" },
      ...envs.map((e) => ({ value: e.id, label: e.name })),
    ],
    [envs],
  );

  const targetOptions = useMemo(
    () => [
      { value: "", label: "Select target…" },
      ...envs
        .filter((e) => e.id !== sourceEnv)
        .map((e) => ({ value: e.id, label: e.name })),
    ],
    [envs, sourceEnv],
  );

  async function handleCompare() {
    if (!token || !projectId || !sourceEnv || !targetEnv) return;
    setLoading(true);
    try {
      const result = await api.compareEnvironments(
        token,
        projectId,
        sourceEnv,
        targetEnv,
      );
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

  if (!projectId) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <PageHeader
          title="Environment Comparison"
          description="Compare flag states between two environments and sync differences"
        />
        <EmptyState
          icon={FolderOpenIcon}
          title="No project selected"
          description="Select a project using the context bar above to compare environments."
          className="py-16"
        />
      </div>
    );
  }

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
            <Select
              value={sourceEnv}
              onValueChange={setSourceEnv}
              options={sourceOptions}
              placeholder="Select source…"
            />
          </div>
        </div>
        <div className="hidden items-center pb-2 sm:flex">
          <ArrowLeftRightIcon className="h-5 w-5 text-[var(--signal-fg-tertiary)]" />
        </div>
        <div className="flex-1">
          <Label>Target Environment</Label>
          <div className="mt-1">
            <Select
              value={targetEnv}
              onValueChange={setTargetEnv}
              options={targetOptions}
              placeholder="Select target…"
            />
          </div>
        </div>
        <Button
          onClick={handleCompare}
          disabled={!sourceEnv || !targetEnv || loading}
        >
          {loading ? "Comparing..." : "Compare"}
        </Button>
      </div>

      {comparison && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            <Card className="p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
                Total Flags
              </p>
              <p className="mt-1 text-2xl font-bold text-[var(--signal-fg-primary)]">
                {comparison.total}
              </p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
                Differences
              </p>
              <p className="mt-1 text-2xl font-bold text-amber-600">
                {comparison.diff_count}
              </p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
                Identical
              </p>
              <p className="mt-1 text-2xl font-bold text-[var(--signal-fg-success)]">
                {comparison.total - comparison.diff_count}
              </p>
            </Card>
          </div>

          {(comparison.diffs ?? []).length > 0 && (
            <Card>
              <div className="flex flex-col gap-2 border-b border-[var(--signal-border-default)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selected.size === (comparison.diffs ?? []).length}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-[var(--signal-border-emphasis)] text-[var(--signal-fg-accent)] focus:ring-[var(--signal-fg-accent)]"
                  />
                  <span className="text-sm font-medium text-[var(--signal-fg-primary)]">
                    {selected.size > 0
                      ? `${selected.size} selected`
                      : "Select flags to sync"}
                  </span>
                </div>
                {selected.size > 0 && (
                  <Button size="sm" onClick={handleSync} disabled={syncing}>
                    {syncing
                      ? "Syncing..."
                      : `Apply ${selected.size} Change${selected.size > 1 ? "s" : ""}`}
                  </Button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)] text-left text-xs font-semibold uppercase tracking-wider text-[var(--signal-fg-secondary)]">
                      <th className="px-4 py-3 w-8 sm:px-6"></th>
                      <th className="px-4 py-3 sm:px-6">FlagIcon</th>
                      <th className="px-4 py-3">{sourceName} Enabled</th>
                      <th className="px-4 py-3">{targetName} Enabled</th>
                      <th className="hidden px-4 py-3 sm:table-cell">
                        {sourceName} Rollout
                      </th>
                      <th className="hidden px-4 py-3 sm:table-cell">
                        {targetName} Rollout
                      </th>
                      <th className="px-4 py-3">Differences</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(comparison.diffs ?? []).map((d) => (
                      <tr
                        key={d.flag_key}
                        className="transition-colors hover:bg-[var(--signal-bg-accent-emphasis)]-glass"
                      >
                        <td className="px-4 py-3 sm:px-6">
                          <input
                            type="checkbox"
                            checked={selected.has(d.flag_key)}
                            onChange={() => toggleSelect(d.flag_key)}
                            className="h-4 w-4 rounded border-[var(--signal-border-emphasis)] text-[var(--signal-fg-accent)] focus:ring-[var(--signal-fg-accent)]"
                          />
                        </td>
                        <td className="px-4 py-3 font-mono font-medium text-[var(--signal-fg-primary)] sm:px-6">
                          {d.flag_key}
                        </td>
                        <td className="px-4 py-3">
                          {d.source_enabled != null && (
                            <span
                              className={`inline-block h-2 w-2 rounded-full ${d.source_enabled ? "bg-emerald-500" : "bg-slate-300"}`}
                            />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {d.target_enabled != null && (
                            <span
                              className={`inline-block h-2 w-2 rounded-full ${d.target_enabled ? "bg-emerald-500" : "bg-slate-300"}`}
                            />
                          )}
                        </td>
                        <td className="hidden px-4 py-3 text-[var(--signal-fg-secondary)] sm:table-cell">
                          {d.source_rollout != null
                            ? `${(d.source_rollout / 100).toFixed(0)}%`
                            : "—"}
                        </td>
                        <td className="hidden px-4 py-3 text-[var(--signal-fg-secondary)] sm:table-cell">
                          {d.target_rollout != null
                            ? `${(d.target_rollout / 100).toFixed(0)}%`
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {d.differences?.map((diff: string) => (
                              <Badge key={diff} variant="warning">
                                {diff}
                              </Badge>
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
              <p className="text-sm font-medium text-[var(--signal-fg-success)]">
                All flags are identical between these environments
              </p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
