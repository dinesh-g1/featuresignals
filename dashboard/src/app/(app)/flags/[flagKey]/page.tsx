"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";

export default function FlagDetailPage() {
  const params = useParams();
  const flagKey = params.flagKey as string;
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const currentEnvId = useAppStore((s) => s.currentEnvId);
  const [flag, setFlag] = useState<any>(null);
  const [state, setState] = useState<any>(null);
  const [envs, setEnvs] = useState<any[]>([]);
  const [selectedEnv, setSelectedEnv] = useState(currentEnvId || "");
  const [tab, setTab] = useState<"overview" | "targeting" | "history">("overview");

  useEffect(() => {
    if (!token || !projectId) return;
    api.getFlag(token, projectId, flagKey).then(setFlag).catch(() => {});
    api.listEnvironments(token, projectId).then((e) => {
      setEnvs(e);
      if (!selectedEnv && e.length > 0) setSelectedEnv(e[0].id);
    });
  }, [token, projectId, flagKey, selectedEnv]);

  useEffect(() => {
    if (!token || !projectId || !selectedEnv) return;
    api.getFlagState(token, projectId, flagKey, selectedEnv).then(setState).catch(() => {});
  }, [token, projectId, flagKey, selectedEnv]);

  async function toggleFlag() {
    if (!token || !projectId || !selectedEnv) return;
    await api.updateFlagState(token, projectId, flagKey, selectedEnv, {
      enabled: !state?.enabled,
    });
    api.getFlagState(token, projectId, flagKey, selectedEnv).then(setState);
  }

  async function updateRollout(percentage: number) {
    if (!token || !projectId || !selectedEnv) return;
    await api.updateFlagState(token, projectId, flagKey, selectedEnv, {
      percentage_rollout: percentage,
    });
    api.getFlagState(token, projectId, flagKey, selectedEnv).then(setState);
  }

  if (!flag) return <div className="p-6 text-center text-gray-500">Loading...</div>;

  const envColors: Record<string, string> = {};
  envs.forEach((e) => { envColors[e.id] = e.color; });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono">{flag.key}</h1>
          <p className="text-sm text-gray-500">{flag.name} &middot; {flag.flag_type}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedEnv}
            onChange={(e) => setSelectedEnv(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
            style={{ borderLeftColor: envColors[selectedEnv] || "#6B7280", borderLeftWidth: 4 }}
          >
            {envs.map((env) => (
              <option key={env.id} value={env.id}>{env.name}</option>
            ))}
          </select>
          <button
            onClick={toggleFlag}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${state?.enabled ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${state?.enabled ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
        {(["overview", "targeting", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize ${tab === t ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-sm font-medium text-gray-500">Status</h3>
            <p className="mt-2 text-lg font-semibold">{state?.enabled ? "Enabled" : "Disabled"}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-sm font-medium text-gray-500">Type</h3>
            <p className="mt-2 text-lg font-semibold capitalize">{flag.flag_type}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-sm font-medium text-gray-500">Default Value</h3>
            <pre className="mt-2 text-sm font-mono">{JSON.stringify(flag.default_value)}</pre>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-sm font-medium text-gray-500">Description</h3>
            <p className="mt-2 text-sm">{flag.description || "No description"}</p>
          </div>
        </div>
      )}

      {tab === "targeting" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-sm font-medium text-gray-500 mb-4">Percentage Rollout</h3>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={0}
                max={10000}
                step={100}
                value={state?.percentage_rollout || 0}
                onChange={(e) => updateRollout(parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-mono w-16 text-right">
                {((state?.percentage_rollout || 0) / 100).toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-sm font-medium text-gray-500 mb-4">Targeting Rules</h3>
            {(!state?.rules || state.rules.length === 0) ? (
              <p className="text-sm text-gray-400">No targeting rules configured. All users receive the default value.</p>
            ) : (
              <div className="space-y-2">
                {state.rules.map((rule: any, i: number) => (
                  <div key={i} className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
                    <p className="font-medium">Rule {i + 1}: {rule.description || "Unnamed rule"}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {rule.conditions?.length || 0} conditions, {(rule.percentage / 100).toFixed(1)}% rollout
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500">Audit history for this flag will appear here.</p>
        </div>
      )}
    </div>
  );
}
