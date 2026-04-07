"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { PageHeader, Card, CardHeader, StatCard } from "@/components/ui";
import { ErrorDisplay } from "@/components/ui";
import { BarChart3, Users, Building2, TrendingUp, Loader2 } from "lucide-react";
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
  "flag.created": "First Flag",
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
    return <ErrorDisplay title="Analytics unavailable" message={error} onRetry={loadData} />;
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader title="Analytics" description="Internal KPI dashboard — product health at a glance" />
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                period === p.value
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Active Workspaces" value={data.active_workspaces} icon={Building2} color="indigo" />
            <StatCard label="Active Users" value={data.active_users} icon={Users} color="emerald" />
            <StatCard label="Auth Events" value={data.event_counts?.auth ?? 0} icon={TrendingUp} color="amber" />
            <StatCard label="Flag Events" value={data.event_counts?.flag ?? 0} icon={BarChart3} color="indigo" />
          </div>

          <Card>
            <CardHeader>
              <h2 className="font-semibold text-slate-900">Acquisition Funnel</h2>
            </CardHeader>
            <div className="px-4 pb-4 sm:px-6 sm:pb-6">
              <div className="space-y-3">
                {Object.entries(FUNNEL_LABELS).map(([event, label]) => {
                  const count = data.funnel?.[event] ?? 0;
                  const maxCount = Math.max(...Object.values(data.funnel ?? {}), 1);
                  const pct = Math.round((count / maxCount) * 100);
                  return (
                    <div key={event} className="flex items-center gap-3">
                      <span className="w-32 shrink-0 text-sm text-slate-600">{label}</span>
                      <div className="flex-1">
                        <div className="h-7 overflow-hidden rounded-md bg-slate-100">
                          <div
                            className="flex h-full items-center rounded-md bg-indigo-500 px-2 text-xs font-medium text-white transition-all"
                            style={{ width: `${Math.max(pct, 2)}%` }}
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
                <h2 className="font-semibold text-slate-900">Plan Distribution</h2>
              </CardHeader>
              <div className="divide-y divide-slate-100">
                {Object.entries(data.plan_distribution ?? {}).map(([plan, count]) => (
                  <div key={plan} className="flex items-center justify-between px-4 py-3 sm:px-6">
                    <span className="text-sm font-medium capitalize text-slate-700">{plan}</span>
                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                      {count}
                    </span>
                  </div>
                ))}
                {Object.keys(data.plan_distribution ?? {}).length === 0 && (
                  <p className="px-4 py-6 text-center text-sm text-slate-400">No data yet</p>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="font-semibold text-slate-900">Event Volume by Category</h2>
              </CardHeader>
              <div className="divide-y divide-slate-100">
                {Object.entries(data.event_counts ?? {}).map(([cat, count]) => (
                  <div key={cat} className="flex items-center justify-between px-4 py-3 sm:px-6">
                    <span className="text-sm font-medium capitalize text-slate-700">{cat}</span>
                    <span className="text-sm tabular-nums text-slate-600">{count.toLocaleString()}</span>
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
