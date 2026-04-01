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
      const list = e ?? [];
      setEnvs(list);
      if (!selectedEnv && list.length > 0) setSelectedEnv(list[0].id);
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

  if (!flag) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  const envColors: Record<string, string> = {};
  envs.forEach((e) => { envColors[e.id] = e.color; });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono text-slate-900">{flag.key}</h1>
          <p className="mt-1 text-sm text-slate-500">{flag.name} &middot; {flag.flag_type}</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedEnv}
            onChange={(e) => setSelectedEnv(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            style={{ borderLeftColor: envColors[selectedEnv] || "#6B7280", borderLeftWidth: 4 }}
          >
            {envs.map((env) => (
              <option key={env.id} value={env.id}>{env.name}</option>
            ))}
          </select>
          <button
            onClick={toggleFlag}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${state?.enabled ? "bg-emerald-500" : "bg-slate-300"}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${state?.enabled ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {(["overview", "targeting", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors ${tab === t ? "border-b-2 border-indigo-600 text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:shadow-lg hover:border-slate-300">
            <h3 className="text-sm font-medium text-slate-500">Status</h3>
            <div className="mt-2 flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${state?.enabled ? "bg-emerald-500" : "bg-slate-300"}`} />
              <p className="text-lg font-semibold text-slate-900">{state?.enabled ? "Enabled" : "Disabled"}</p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:shadow-lg hover:border-slate-300">
            <h3 className="text-sm font-medium text-slate-500">Type</h3>
            <p className="mt-2 text-lg font-semibold capitalize text-slate-900">{flag.flag_type}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:shadow-lg hover:border-slate-300">
            <h3 className="text-sm font-medium text-slate-500">Default Value</h3>
            <pre className="mt-2 rounded-lg bg-slate-50 p-2 text-sm font-mono text-slate-700 ring-1 ring-slate-100">{JSON.stringify(flag.default_value)}</pre>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:shadow-lg hover:border-slate-300">
            <h3 className="text-sm font-medium text-slate-500">Description</h3>
            <p className="mt-2 text-sm text-slate-700">{flag.description || "No description"}</p>
          </div>
        </div>
      )}

      {tab === "targeting" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:shadow-lg hover:border-slate-300">
            <h3 className="text-sm font-medium text-slate-500 mb-4">Percentage Rollout</h3>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <input
                  type="range"
                  min={0}
                  max={10000}
                  step={100}
                  value={state?.percentage_rollout || 0}
                  onChange={(e) => updateRollout(parseInt(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <div className="mt-1 flex justify-between text-xs text-slate-400">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
              <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-mono font-semibold text-indigo-700 ring-1 ring-indigo-100">
                {((state?.percentage_rollout || 0) / 100).toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:shadow-lg hover:border-slate-300">
            <h3 className="text-sm font-medium text-slate-500 mb-4">Targeting Rules</h3>
            {(!state?.rules || state.rules.length === 0) ? (
              <div className="rounded-lg border border-dashed border-slate-300 px-6 py-8 text-center">
                <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                <p className="mt-2 text-sm text-slate-500">No targeting rules configured.</p>
                <p className="mt-1 text-xs text-slate-400">All users receive the default value.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {state.rules.map((rule: any, i: number) => (
                  <div key={i} className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-100 transition-colors hover:bg-indigo-50/30">
                    <p className="font-medium text-sm text-slate-700">Rule {i + 1}: {rule.description || "Unnamed rule"}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {rule.conditions?.length || 0} conditions &middot; {(rule.percentage / 100).toFixed(1)}% rollout
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:shadow-lg hover:border-slate-300">
          <div className="rounded-lg border border-dashed border-slate-300 px-6 py-8 text-center">
            <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-2 text-sm text-slate-500">Audit history for this flag will appear here.</p>
          </div>
        </div>
      )}
    </div>
  );
}
