"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { PageHeader, Card, CardHeader, StatCard } from "@/components/ui";
import { ErrorDisplay } from "@/components/ui";
import {
  BarChartIcon, UsersIcon, BuildingIcon, TrendingUpIcon
} from "@/components/icons/nav-icons";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import type { AnalyticsOverview } from "@/lib/types";

const PERIODS = [
  { label: "24h", value: "24h" },
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
  { label: "90 days", value: "90d" },
];

const FUNNEL_LABELS: Record<string, string> = {
  "auth.signup_completed": "Signups",
  "onboarding.completed": "Onboarding Done",
  "flag.created": "First FlagIcon",
  "evaluation.first": "First Eval",
  "billing.checkout_completed": "Checkout",
};

export default function AnalyticsPage() {
  const token = useAppStore((s) => s.token);
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState("30d");

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.getAnalyticsOverview(token, period);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [token, period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (error) {
    return (
      <ErrorDisplay
        title="Analytics unavailable"
        message={error}
        onRetry={loadData}
      />
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Analytics"
          description="Internal KPI dashboard — product health at a glance"
        />
        <div className="flex gap-1 rounded-lg border border-[var(--signal-border-default)] bg-white p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                period === p.value
                  ? "bg-[var(--signal-bg-accent-emphasis)] text-white shadow-sm"
                  : "text-[var(--signal-fg-secondary)] hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Active Workspaces"
              value={data.active_workspaces}
              icon={BuildingIcon}
              color="accent"
            />
            <StatCard
              label="Active Users"
              value={data.active_users}
              icon={UsersIcon}
              color="emerald"
            />
            <StatCard
              label="Auth Events"
              value={data.event_counts?.auth ?? 0}
              icon={TrendingUpIcon}
              color="amber"
            />
            <StatCard
              label="Flag Events"
              value={data.event_counts?.flag ?? 0}
              icon={BarChartIcon}
              color="accent"
            />
          </div>

          <Card>
            <CardHeader>
              <h2 className="font-semibold text-[var(--signal-fg-primary)]">
                Acquisition Funnel
              </h2>
            </CardHeader>
            <div className="px-4 pb-4 sm:px-6 sm:pb-6">
              <div className="space-y-3">
                {Object.entries(FUNNEL_LABELS).map(([event, label]) => {
                  const count = data.funnel?.[event] ?? 0;
                  const maxCount = Math.max(
                    ...Object.values(data.funnel ?? {}),
                    1,
                  );
                  const pct = Math.round((count / maxCount) * 100);
                  return (
                    <div key={event} className="flex items-center gap-3">
                      <span className="w-32 shrink-0 text-sm text-[var(--signal-fg-secondary)]">
                        {label}
                      </span>
                      <div className="flex-1">
                        <div className="h-7 overflow-hidden rounded-md bg-[var(--signal-bg-secondary)]">
                          <div
                            className={`flex h-full items-center rounded-md bg-[var(--signal-bg-accent-emphasis)] px-2 text-xs font-medium text-white transition-all w-[${Math.max(pct, 2)}%]`}
                          >
                            {count}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <h2 className="font-semibold text-[var(--signal-fg-primary)]">
                  Plan Distribution
                </h2>
              </CardHeader>
              <div className="divide-y divide-slate-100">
                {Object.entries(data.plan_distribution ?? {}).map(
                  ([plan, count]) => (
                    <div
                      key={plan}
                      className="flex items-center justify-between px-4 py-3 sm:px-6"
                    >
                      <span className="text-sm font-medium capitalize text-[var(--signal-fg-primary)]">
                        {plan}
                      </span>
                      <span className="rounded-full bg-[var(--signal-bg-accent-muted)] px-2.5 py-0.5 text-xs font-semibold text-[var(--signal-fg-accent)]">
                        {count}
                      </span>
                    </div>
                  ),
                )}
                {Object.keys(data.plan_distribution ?? {}).length === 0 && (
                  <p className="px-4 py-6 text-center text-sm text-[var(--signal-fg-tertiary)]">
                    No data yet
                  </p>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="font-semibold text-[var(--signal-fg-primary)]">
                  Event Volume by Category
                </h2>
              </CardHeader>
              <div className="divide-y divide-slate-100">
                {Object.entries(data.event_counts ?? {}).map(([cat, count]) => (
                  <div
                    key={cat}
                    className="flex items-center justify-between px-4 py-3 sm:px-6"
                  >
                    <span className="text-sm font-medium capitalize text-[var(--signal-fg-primary)]">
                      {cat}
                    </span>
                    <span className="text-sm tabular-nums text-[var(--signal-fg-secondary)]">
                      {count.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
