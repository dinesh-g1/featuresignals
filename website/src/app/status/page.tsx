"use client";

import { useEffect, useState, useCallback } from "react";
import { SectionReveal } from "@/components/section-reveal";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Activity,
  Globe,
  Server,
  Database,
  Shield,
  Info,
  RefreshCw,
} from "lucide-react";

type ServiceStatusType = "operational" | "degraded" | "down" | "unknown";

interface ServiceStatus {
  name: string;
  status: ServiceStatusType;
  latency_ms: number;
  message?: string;
}

interface RegionStatus {
  region: string;
  name: string;
  status: ServiceStatusType;
  services: ServiceStatus[];
  checked_at: string;
}

interface GlobalStatus {
  overall_status: ServiceStatusType;
  regions: RegionStatus[];
  checked_at: string;
}

const statusConfig: Record<
  ServiceStatusType,
  { label: string; color: string; bg: string; border: string; icon: typeof CheckCircle; pulse?: boolean }
> = {
  operational: {
    label: "Operational",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: CheckCircle,
  },
  degraded: {
    label: "Degraded",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: AlertTriangle,
  },
  down: {
    label: "Down",
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    icon: XCircle,
  },
  unknown: {
    label: "Checking...",
    color: "text-slate-500",
    bg: "bg-slate-50",
    border: "border-slate-200",
    icon: Activity,
    pulse: true,
  },
};

const regionFlags: Record<string, string> = {
  us: "\u{1F1FA}\u{1F1F8}",
  eu: "\u{1F1EA}\u{1F1FA}",
  in: "\u{1F1EE}\u{1F1F3}",
};

const serviceIcons: Record<string, typeof Server> = {
  "API Server": Server,
  Database: Database,
  "Connection Pool": Activity,
};

function StatusBadge({ status }: { status: ServiceStatusType }) {
  const cfg = statusConfig[status];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.color}`}
    >
      <Icon className={`h-3.5 w-3.5 ${cfg.pulse ? "animate-pulse" : ""}`} />
      {cfg.label}
    </span>
  );
}

function LatencyBadge({ ms }: { ms: number }) {
  if (ms <= 0) return null;
  const color =
    ms < 50
      ? "text-emerald-600 bg-emerald-50"
      : ms < 200
        ? "text-amber-600 bg-amber-50"
        : "text-red-600 bg-red-50";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${color}`}>
      {ms}ms
    </span>
  );
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function StatusPage() {
  const [globalStatus, setGlobalStatus] = useState<GlobalStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE}/v1/status/global`, {
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const data: GlobalStatus = await res.json();
        setGlobalStatus(data);
      } else {
        setGlobalStatus({
          overall_status: "degraded",
          regions: [],
          checked_at: new Date().toISOString(),
        });
      }
    } catch {
      setGlobalStatus({
        overall_status: "unknown",
        regions: [],
        checked_at: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLastChecked(new Date().toLocaleString());
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => fetchStatus(), 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const overallStatus: ServiceStatusType = globalStatus?.overall_status ?? "unknown";
  const overallCfg = statusConfig[overallStatus];
  const OverallIcon = overallCfg.icon;

  const allOperational =
    overallStatus === "operational" &&
    (globalStatus?.regions ?? []).every((r) => r.status === "operational");

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-b from-slate-50 to-white py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <SectionReveal>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
              <Shield className="h-7 w-7 text-emerald-600" />
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              System Status
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Real-time health of FeatureSignals infrastructure across all regions
            </p>

            {loading ? (
              <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-50 px-5 py-2.5 text-sm font-semibold text-slate-500">
                <Activity className="h-5 w-5 animate-pulse" />
                Checking all regions...
              </div>
            ) : (
              <div
                className={`mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold ${overallCfg.bg} ${overallCfg.color}`}
              >
                <OverallIcon className="h-5 w-5" />
                {allOperational
                  ? "All systems operational"
                  : overallStatus === "unknown"
                    ? "Unable to determine status"
                    : overallStatus === "degraded"
                      ? "Some services degraded"
                      : overallStatus === "down"
                        ? "Partial outage detected"
                        : overallCfg.label}
              </div>
            )}

            <div className="mt-3 flex items-center justify-center gap-3">
              {lastChecked && (
                <p className="text-sm text-slate-400">
                  Last checked: {lastChecked}
                </p>
              )}
              <button
                onClick={() => fetchStatus(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* Regional Status */}
      <section className="py-10 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <SectionReveal>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-slate-400" />
              <h2 className="text-lg font-semibold text-slate-900">
                Regional Health
              </h2>
            </div>

            {loading ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-xl border border-slate-200 bg-white p-5"
                  >
                    <div className="h-6 w-32 rounded bg-slate-100" />
                    <div className="mt-3 h-4 w-20 rounded bg-slate-100" />
                    <div className="mt-4 space-y-3">
                      <div className="h-10 rounded bg-slate-50" />
                      <div className="h-10 rounded bg-slate-50" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {(globalStatus?.regions ?? []).length > 0 ? (
                  globalStatus!.regions.map((region) => {
                    const rCfg = statusConfig[region.status] ?? statusConfig.unknown;
                    return (
                      <div
                        key={region.region}
                        className={`rounded-xl border bg-white p-5 transition-shadow hover:shadow-md ${rCfg.border}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {regionFlags[region.region] ?? "🌐"}
                            </span>
                            <h3 className="text-sm font-semibold text-slate-900">
                              {region.name}
                            </h3>
                          </div>
                          <StatusBadge status={region.status} />
                        </div>

                        <div className="mt-4 divide-y divide-slate-100">
                          {region.services.map((svc) => {
                            const SvcIcon = serviceIcons[svc.name] ?? Server;
                            return (
                              <div
                                key={svc.name}
                                className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                              >
                                <div className="flex items-center gap-2">
                                  <SvcIcon className="h-3.5 w-3.5 text-slate-400" />
                                  <span className="text-xs font-medium text-slate-700">
                                    {svc.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <LatencyBadge ms={svc.latency_ms} />
                                  <StatusBadge status={svc.status} />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {region.checked_at && (
                          <p className="mt-3 text-[10px] text-slate-400">
                            Checked: {new Date(region.checked_at).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-3 rounded-xl border border-slate-200 bg-white p-8 text-center">
                    <Activity className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-sm text-slate-500">
                      Unable to fetch regional status. The API may be unreachable.
                    </p>
                  </div>
                )}
              </div>
            )}
          </SectionReveal>

          {/* Uptime summary */}
          <SectionReveal delay={0.1}>
            <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-slate-900">Infrastructure Overview</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-slate-50 p-4 text-center">
                  <p className="text-2xl font-bold text-slate-900">
                    {globalStatus?.regions?.length ?? 0}
                  </p>
                  <p className="text-xs text-slate-500">Active Regions</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4 text-center">
                  <p className="text-2xl font-bold text-slate-900">
                    {(globalStatus?.regions ?? []).reduce(
                      (acc, r) => acc + r.services.length,
                      0
                    )}
                  </p>
                  <p className="text-xs text-slate-500">Monitored Services</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">30s</p>
                  <p className="text-xs text-slate-500">Check Interval</p>
                </div>
              </div>
            </div>
          </SectionReveal>

          {/* Info */}
          <SectionReveal delay={0.15}>
            <div className="mt-6 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
              <div className="text-sm text-blue-800">
                <p>
                  This page queries the <code className="rounded bg-blue-100 px-1 py-0.5 text-xs font-mono">/v1/status/global</code>{" "}
                  endpoint which aggregates health from all regional API servers in real-time. Each
                  region independently reports its API, database, and connection pool health.
                </p>
                <p className="mt-2">
                  For self-hosted deployments, set{" "}
                  <code className="rounded bg-blue-100 px-1 py-0.5 text-xs font-mono">
                    NEXT_PUBLIC_API_URL
                  </code>{" "}
                  to point to your instance.
                </p>
              </div>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* Report an Issue */}
      <section className="border-t border-slate-100 bg-slate-50 py-10 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <SectionReveal>
            <h2 className="text-lg font-semibold text-slate-900">
              Report an Issue
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              If you are experiencing an issue that is not reflected on this
              page, please contact us.
            </p>
            <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row">
              <a
                href="mailto:support@featuresignals.com"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-indigo-700"
              >
                Contact Support
              </a>
              <a
                href="https://github.com/dinesh-g1/featuresignals/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50"
              >
                Open GitHub Issue
              </a>
            </div>
          </SectionReveal>
        </div>
      </section>
    </div>
  );
}
