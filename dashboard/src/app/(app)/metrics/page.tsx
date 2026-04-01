"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";

interface Counter {
  flag_key: string;
  env_id: string;
  reason: string;
  count: number;
}

interface MetricsSummary {
  total_evaluations: number;
  window_start: string;
  counters: Counter[];
}

const REASON_COLORS: Record<string, string> = {
  TARGETED: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  ROLLOUT: "bg-blue-100 text-blue-700 ring-blue-200",
  FALLTHROUGH: "bg-slate-100 text-slate-600 ring-slate-200",
  DISABLED: "bg-amber-100 text-amber-700 ring-amber-200",
  DEFAULT: "bg-slate-100 text-slate-600 ring-slate-200",
  NOT_FOUND: "bg-red-100 text-red-700 ring-red-200",
  PREREQUISITE_FAILED: "bg-orange-100 text-orange-700 ring-orange-200",
  MUTUALLY_EXCLUDED: "bg-purple-100 text-purple-700 ring-purple-200",
  ERROR: "bg-red-100 text-red-700 ring-red-200",
};

export default function MetricsPage() {
  const token = useAppStore((s) => s.token);
  const envId = useAppStore((s) => s.currentEnvId);
  const [data, setData] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    if (!token) return;
    setLoading(true);
    api
      .getEvalMetrics(token)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(load, [token]);

  const envCounters = useMemo(() => {
    if (!data) return [];
    return envId
      ? data.counters.filter((c) => c.env_id === envId)
      : data.counters;
  }, [data, envId]);

  const topFlags = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of envCounters) {
      map.set(c.flag_key, (map.get(c.flag_key) || 0) + c.count);
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
  }, [envCounters]);

  const reasonBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of envCounters) {
      map.set(c.reason, (map.get(c.reason) || 0) + c.count);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [envCounters]);

  const totalEnv = useMemo(
    () => envCounters.reduce((sum, c) => sum + c.count, 0),
    [envCounters],
  );

  const maxFlagCount = topFlags.length > 0 ? topFlags[0][1] : 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Evaluation Metrics</h1>
          <p className="mt-1 text-sm text-slate-500">
            Flag evaluation counts since{" "}
            {data ? new Date(data.window_start).toLocaleString() : "—"}
          </p>
        </div>
        <button
          onClick={async () => {
            if (!token) return;
            await api.resetEvalMetrics(token);
            load();
          }}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
        >
          Reset Counters
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center transition-all hover:shadow-lg hover:border-slate-300">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Evaluations
          </p>
          <p className="mt-2 text-4xl font-bold text-indigo-600">
            {(data?.total_evaluations || 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center transition-all hover:shadow-lg hover:border-slate-300">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Current Environment
          </p>
          <p className="mt-2 text-4xl font-bold text-emerald-600">
            {totalEnv.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center transition-all hover:shadow-lg hover:border-slate-300">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Unique Flags Evaluated
          </p>
          <p className="mt-2 text-4xl font-bold text-slate-900">
            {topFlags.length}
          </p>
        </div>
      </div>

      {/* Reason breakdown */}
      <div className="rounded-xl border border-slate-200 bg-white transition-all hover:shadow-lg hover:border-slate-300">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="font-semibold text-slate-900">Evaluation Reasons</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Distribution of why flags returned their values
          </p>
        </div>
        <div className="p-6">
          {reasonBreakdown.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No evaluations recorded yet.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {reasonBreakdown.map(([reason, count]) => (
                <div
                  key={reason}
                  className={`rounded-lg px-4 py-3 ring-1 ${REASON_COLORS[reason] || "bg-slate-100 text-slate-600 ring-slate-200"}`}
                >
                  <p className="text-xs font-medium uppercase tracking-wider opacity-70">
                    {reason}
                  </p>
                  <p className="mt-1 text-2xl font-bold">{count.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top flags bar chart */}
      <div className="rounded-xl border border-slate-200 bg-white transition-all hover:shadow-lg hover:border-slate-300">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="font-semibold text-slate-900">Top Evaluated Flags</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Most-evaluated flags in the current environment
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {topFlags.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">
              No evaluations recorded yet.
            </p>
          ) : (
            topFlags.map(([key, count]) => (
              <div key={key} className="flex items-center gap-4 px-6 py-3">
                <span className="w-48 truncate font-mono text-sm font-medium text-slate-900">
                  {key}
                </span>
                <div className="flex-1 h-6 rounded-full bg-slate-100">
                  <div
                    className="h-6 rounded-full bg-indigo-500 transition-all"
                    style={{
                      width: `${Math.max(2, (count / maxFlagCount) * 100)}%`,
                    }}
                  />
                </div>
                <span className="w-20 text-right text-sm font-semibold text-slate-700">
                  {count.toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
