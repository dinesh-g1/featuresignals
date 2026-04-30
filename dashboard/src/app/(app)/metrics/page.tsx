"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import {
  PageHeader,
  Card,
  CardHeader,
  CardContent,
  Button,
  LoadingSpinner,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";

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
  TARGETED: "bg-[var(--bgColor-success-muted)] text-emerald-700 ring-emerald-200",
  ROLLOUT: "bg-blue-100 text-blue-700 ring-blue-200",
  FALLTHROUGH: "bg-[var(--bgColor-muted)] text-[var(--fgColor-muted)] ring-[var(--borderColor-default)]",
  DISABLED: "bg-amber-100 text-amber-700 ring-amber-200",
  DEFAULT: "bg-[var(--bgColor-muted)] text-[var(--fgColor-muted)] ring-[var(--borderColor-default)]",
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
    const counters = data.counters ?? [];
    return envId ? counters.filter((c) => c.env_id === envId) : counters;
  }, [data, envId]);

  const topFlags = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of envCounters) {
      map.set(c.flag_key, (map.get(c.flag_key) || 0) + c.count);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
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
    return <LoadingSpinner fullPage />;
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Evaluation Metrics"
        description={`FlagIcon evaluation counts since ${data ? formatDate(data.window_start) : "—"}`}
        actions={
          <Button
            variant="secondary"
            onClick={async () => {
              if (!token) return;
              await api.resetEvalMetrics(token);
              load();
            }}
          >
            Reset Counters
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-6">
        <Card className="p-4 text-center hover:shadow-lg hover:border-[var(--borderColor-emphasis)] sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fgColor-subtle)]">
            Total Evaluations
          </p>
          <p className="mt-2 text-3xl font-bold text-[var(--fgColor-accent)] sm:text-4xl">
            {(data?.total_evaluations || 0).toLocaleString()}
          </p>
        </Card>
        <Card className="p-4 text-center hover:shadow-lg hover:border-[var(--borderColor-emphasis)] sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fgColor-subtle)]">
            Current Environment
          </p>
          <p className="mt-2 text-3xl font-bold text-[var(--fgColor-success)] sm:text-4xl">
            {totalEnv.toLocaleString()}
          </p>
        </Card>
        <Card className="p-4 text-center hover:shadow-lg hover:border-[var(--borderColor-emphasis)] sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fgColor-subtle)]">
            Unique Flags Evaluated
          </p>
          <p className="mt-2 text-3xl font-bold text-[var(--fgColor-default)] sm:text-4xl">
            {topFlags.length}
          </p>
        </Card>
      </div>

      <Card className="hover:shadow-lg hover:border-[var(--borderColor-emphasis)]">
        <CardHeader>
          <h2 className="font-semibold text-[var(--fgColor-default)]">Evaluation Reasons</h2>
          <p className="mt-0.5 text-xs text-[var(--fgColor-muted)]">
            Distribution of why flags returned their values
          </p>
        </CardHeader>
        <CardContent>
          {reasonBreakdown.length === 0 ? (
            <p className="text-sm text-[var(--fgColor-subtle)] text-center py-4">
              No evaluations recorded yet.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {reasonBreakdown.map(([reason, count]) => (
                <div
                  key={reason}
                  className={`rounded-lg px-3 py-2 ring-1 sm:px-4 sm:py-3 ${REASON_COLORS[reason] || "bg-[var(--bgColor-muted)] text-[var(--fgColor-muted)] ring-[var(--borderColor-default)]"}`}
                >
                  <p className="text-xs font-medium uppercase tracking-wider opacity-70">
                    {reason}
                  </p>
                  <p className="mt-1 text-xl font-bold sm:text-2xl">
                    {count.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg hover:border-[var(--borderColor-emphasis)]">
        <CardHeader>
          <h2 className="font-semibold text-[var(--fgColor-default)]">Top Evaluated Flags</h2>
          <p className="mt-0.5 text-xs text-[var(--fgColor-muted)]">
            Most-evaluated flags in the current environment
          </p>
        </CardHeader>
        <div className="divide-y divide-slate-100">
          {topFlags.length === 0 ? (
            <p className="text-sm text-[var(--fgColor-subtle)] text-center py-8">
              No evaluations recorded yet.
            </p>
          ) : (
            topFlags.map(([key, count]) => (
              <div
                key={key}
                className="flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6"
              >
                <span className="w-28 truncate font-mono text-sm font-medium text-[var(--fgColor-default)] sm:w-48">
                  {key}
                </span>
                <div className="flex-1 h-5 rounded-full bg-[var(--bgColor-muted)] sm:h-6">
                  <div
                    className={`h-full rounded-full bg-[var(--bgColor-accent-emphasis)] transition-all w-[${Math.max(2, (count / maxFlagCount) * 100)}%]`}
                  />
                </div>
                <span className="w-16 text-right text-sm font-semibold text-[var(--fgColor-default)] sm:w-20">
                  {count.toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
