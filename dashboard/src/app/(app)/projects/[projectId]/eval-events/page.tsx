"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import {
  PageHeader,
  Card,
  CardHeader,
  CardContent,
  Button,
  Input,
  Select,
  SkeletonCard,
} from "@/components/ui";
import { ErrorDisplay } from "@/components/ui";
import { usePageStates } from "@/hooks/use-page-states";
import { BarChart3, Clock, Activity } from "lucide-react";
import type { EvalEventAnalytics, EvalEventVolume } from "@/lib/types";

// ─── Constants ──────────────────────────────────────────────────────────────

const INTERVALS: { label: string; value: string }[] = [
  { label: "1 hour", value: "1h" },
  { label: "6 hours", value: "6h" },
  { label: "24 hours", value: "24h" },
];

function defaultSince(): string {
  const d = new Date();
  d.setHours(d.getHours() - 24);
  return d.toISOString();
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function EvalEventsSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="h-8 w-64 rounded bg-[var(--signal-bg-secondary)]" />

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Chart skeleton */}
      <Card>
        <CardHeader>
          <div className="h-5 w-40 rounded bg-[var(--signal-bg-secondary)]" />
          <div className="mt-1 h-3 w-56 rounded bg-[var(--signal-bg-secondary)]" />
        </CardHeader>
        <CardContent>
          <div className="h-64 rounded-lg bg-[var(--signal-bg-secondary)] flex items-center justify-center">
            <BarChart3 className="h-8 w-8 text-[var(--signal-fg-tertiary)]" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function EvalEventsPage() {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);

  const [analytics, setAnalytics] = useState<EvalEventAnalytics | null>(null);
  const [volume, setVolume] = useState<EvalEventVolume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [flagKey, setFlagKey] = useState("");
  const [since, setSince] = useState(defaultSince());
  const [interval, setInterval] = useState("1h");

  const hasData = analytics !== null || volume !== null;

  const {
    StaleBanner,
    ForbiddenState,
    RateLimitedState,
    resetErrors,
    classifyError,
    markFresh,
    isForbidden,
    isStale,
    rateLimitRetryAfter,
  } = usePageStates({
    onRefresh: () => load(),
    hasData,
    staleTimeoutMs: 60_000,
    forbiddenTitle: "Access Denied",
    forbiddenDescription:
      "You don't have permission to view evaluation event analytics. Contact your administrator if you need access.",
  });

  const load = useCallback(() => {
    if (!token) return;
    resetErrors();
    setLoading(true);
    setError(null);

    const promises: Promise<unknown>[] = [];

    // Fetch analytics if flag_key is provided
    if (flagKey.trim()) {
      promises.push(
        api
          .getEvalEvents(token, flagKey.trim(), since)
          .then((data) => {
            setAnalytics(data);
            markFresh();
          })
          .catch((err) => {
            classifyError(err);
            setError(
              err instanceof Error
                ? err.message
                : "Failed to load evaluation analytics",
            );
          }),
      );
    } else {
      setAnalytics(null);
    }

    // Always fetch volume
    promises.push(
      api
        .getEvalEventsVolume(token, since, interval)
        .then((data) => {
          setVolume(data);
          markFresh();
        })
        .catch((err) => {
          classifyError(err);
          if (!error) {
            setError(
              err instanceof Error
                ? err.message
                : "Failed to load evaluation volume",
            );
          }
        }),
    );

    Promise.all(promises).finally(() => setLoading(false));
  }, [token, flagKey, since, interval, resetErrors, classifyError, markFresh]);

  useEffect(() => {
    load();
  }, [load]);

  // ─── Derived stats ──────────────────────────────────────────────────

  const stats = useMemo(() => {
    const totalEvaluations = analytics?.total_evaluations ?? 0;
    const activeFeatures = analytics?.by_variant
      ? Object.keys(analytics.by_variant).length
      : 0;
    const avgLatencyUs = analytics?.latency_us?.p50 ?? 0;
    const avgLatencyMs =
      avgLatencyUs > 0 ? (avgLatencyUs / 1000).toFixed(1) : "—";

    return { totalEvaluations, activeFeatures, avgLatencyMs };
  }, [analytics]);

  // ─── Render: Full-page states ───────────────────────────────────────

  if (loading) return <EvalEventsSkeleton />;

  if (isForbidden) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <PageHeader
          title="Evaluation Events"
          description="Real-time feature evaluation analytics and volume tracking"
        />
        {ForbiddenState}
      </div>
    );
  }

  if (rateLimitRetryAfter !== null && !hasData) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <PageHeader
          title="Evaluation Events"
          description="Real-time feature evaluation analytics and volume tracking"
        />
        {RateLimitedState}
      </div>
    );
  }

  if (error && !hasData) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <PageHeader
          title="Evaluation Events"
          description="Real-time feature evaluation analytics and volume tracking"
        />
        <ErrorDisplay
          title="Failed to load evaluation events"
          message={error}
          onRetry={load}
        />
      </div>
    );
  }

  // ─── Render: Success ────────────────────────────────────────────────

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Evaluation Events"
        description="Real-time feature evaluation analytics and volume tracking"
      />

      {StaleBanner}

      {/* Filter Bar */}
      <Card>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3 sm:gap-4 py-2">
            <div className="flex-1 min-w-[160px] max-w-[320px]">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)] mb-1">
                Flag Key
              </label>
              <Input
                placeholder="e.g. dark-mode"
                value={flagKey}
                onChange={(e) => setFlagKey(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="w-[180px]">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)] mb-1">
                Since
              </label>
              <Input
                type="datetime-local"
                value={since.slice(0, 16)}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v) setSince(new Date(v).toISOString());
                }}
                className="w-full"
              />
            </div>

            <div className="w-[140px]">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)] mb-1">
                Interval
              </label>
              <Select
                value={interval}
                onValueChange={(value) => setInterval(value)}
                options={INTERVALS}
              />
            </div>

            <div className="flex items-end">
              <Button
                variant="secondary"
                onClick={load}
                disabled={
                  rateLimitRetryAfter !== null && rateLimitRetryAfter > 0
                }
                className="h-[38px]"
              >
                {rateLimitRetryAfter !== null && rateLimitRetryAfter > 0
                  ? `Wait ${rateLimitRetryAfter}s`
                  : "Refresh"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-6">
        <Card className="p-4 text-center sm:p-6">
          <div className="flex items-center justify-center gap-2 mb-1">
            <BarChart3 className="h-4 w-4 text-[var(--signal-fg-accent)]" />
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
              Total Evaluations
            </p>
          </div>
          <p className="mt-2 text-3xl font-bold text-[var(--signal-fg-accent)] sm:text-4xl">
            {stats.totalEvaluations.toLocaleString()}
          </p>
        </Card>

        <Card className="p-4 text-center sm:p-6">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Activity className="h-4 w-4 text-[var(--signal-fg-success)]" />
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
              Active Features
            </p>
          </div>
          <p className="mt-2 text-3xl font-bold text-[var(--signal-fg-success)] sm:text-4xl">
            {flagKey.trim() ? stats.activeFeatures.toLocaleString() : "—"}
          </p>
          {!flagKey.trim() && (
            <p className="mt-1 text-xs text-[var(--signal-fg-tertiary)]">
              Enter a flag key to see variant counts
            </p>
          )}
        </Card>

        <Card className="p-4 text-center sm:p-6">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-[var(--signal-fg-warning)]" />
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
              Avg Latency
            </p>
          </div>
          <p className="mt-2 text-3xl font-bold text-[var(--signal-fg-warning)] sm:text-4xl">
            {flagKey.trim() ? `${stats.avgLatencyMs} ms` : "—"}
          </p>
          {!flagKey.trim() && (
            <p className="mt-1 text-xs text-[var(--signal-fg-tertiary)]">
              Enter a flag key to see latency data
            </p>
          )}
        </Card>
      </div>

      {/* Time Series Chart Area */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-[var(--signal-fg-primary)]">
            Evaluation Volume Over Time
          </h2>
          <p className="mt-0.5 text-xs text-[var(--signal-fg-secondary)]">
            {volume && volume.data.length > 0
              ? `${volume.data.length} data points at ${interval} intervals`
              : "No volume data available for the selected period"}
          </p>
        </CardHeader>
        <CardContent>
          {!volume || volume.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 rounded-lg border border-dashed border-[var(--signal-border-subtle)] bg-[var(--signal-bg-secondary)]">
              <BarChart3 className="h-10 w-10 text-[var(--signal-fg-tertiary)] mb-3" />
              <p className="text-sm font-medium text-[var(--signal-fg-secondary)]">
                No evaluation data yet
              </p>
              <p className="mt-1 text-xs text-[var(--signal-fg-tertiary)] max-w-xs text-center">
                Evaluation events appear here after features go LIVE. Try
                adjusting the date range or interval.
              </p>
            </div>
          ) : (
            <div className="h-64 rounded-lg border border-[var(--signal-border-subtle)] bg-[var(--signal-bg-secondary)] flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="h-10 w-10 text-[var(--signal-fg-tertiary)] mx-auto mb-2" />
                <p className="text-sm font-medium text-[var(--signal-fg-secondary)]">
                  Chart area — will be replaced with a charting library
                </p>
                <p className="mt-1 text-xs text-[var(--signal-fg-tertiary)]">
                  {volume.data.length} data points available
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-Variant Breakdown (if analytics available) */}
      {analytics?.by_variant &&
        Object.keys(analytics.by_variant).length > 0 && (
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-[var(--signal-fg-primary)]">
                Variant Distribution
              </h2>
              <p className="mt-0.5 text-xs text-[var(--signal-fg-secondary)]">
                Evaluation count by variant for{" "}
                <code className="font-mono text-[var(--signal-fg-accent)]">
                  {analytics.flag_key}
                </code>
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {Object.entries(analytics.by_variant).map(
                  ([variant, count]) => (
                    <div
                      key={variant}
                      className="rounded-lg px-4 py-3 ring-1 bg-[var(--signal-bg-success-muted)] text-[var(--signal-fg-success)] ring-[var(--signal-border-success-muted)]"
                    >
                      <p className="text-xs font-medium uppercase tracking-wider opacity-70">
                        {variant}
                      </p>
                      <p className="mt-1 text-xl font-bold">
                        {count.toLocaleString()}
                      </p>
                    </div>
                  ),
                )}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Latency Percentiles (if available) */}
      {analytics?.latency_us && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-[var(--signal-fg-primary)]">
              Evaluation Latency
            </h2>
            <p className="mt-0.5 text-xs text-[var(--signal-fg-secondary)]">
              Latency percentiles for{" "}
              <code className="font-mono text-[var(--signal-fg-accent)]">
                {analytics.flag_key}
              </code>
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {(["p50", "p95", "p99"] as const).map((p) => {
                const us = analytics.latency_us![p];
                const ms = (us / 1000).toFixed(1);
                return (
                  <div
                    key={p}
                    className="rounded-lg px-4 py-3 text-center bg-[var(--signal-bg-secondary)]"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
                      {p.toUpperCase()}
                    </p>
                    <p className="mt-1 text-xl font-bold text-[var(--signal-fg-primary)]">
                      {ms} ms
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state when no flag_key entered */}
      {!flagKey.trim() && !loading && (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12">
              <Activity className="h-12 w-12 text-[var(--signal-fg-tertiary)] mb-4" />
              <h3 className="text-lg font-semibold text-[var(--signal-fg-primary)]">
                No evaluation data yet
              </h3>
              <p className="mt-2 max-w-md text-sm text-center text-[var(--signal-fg-secondary)]">
                Evaluation events appear here after features go LIVE. Enter a
                flag key above to view detailed analytics including variant
                distribution and latency percentiles.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
