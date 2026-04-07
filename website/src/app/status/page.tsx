"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { SectionReveal } from "@/components/section-reveal";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Activity,
  Globe,
  Server,
  Database,
  RefreshCw,
  ChevronDown,
  Clock,
  Minus,
  Zap,
  HardDrive,
  Radio,
  Gauge,
} from "lucide-react";

// --- Types ---

type ComponentStatus = "operational" | "degraded" | "down" | "unreachable" | "unknown";

interface ServiceStatus {
  name: string;
  status: ComponentStatus;
  latency_ms: number;
  message?: string;
}

interface RegionStatus {
  region: string;
  name: string;
  status: ComponentStatus;
  services: ServiceStatus[];
  checked_at: string;
}

interface GlobalStatus {
  overall_status: ComponentStatus;
  regions: RegionStatus[];
  checked_at: string;
}

interface DailyComponentStatus {
  date: string;
  region: string;
  component: string;
  uptime_pct: number;
  total_checks: number;
  operational_checks: number;
}

interface HistoryResponse {
  components: DailyComponentStatus[];
  regions: string[];
  checked_at: string;
}

// --- Config ---

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.featuresignals.com";

const STATUS_CONFIG: Record<
  ComponentStatus,
  { label: string; dot: string; bg: string; text: string }
> = {
  operational: { label: "Operational", dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
  degraded: { label: "Degraded", dot: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-700" },
  down: { label: "Down", dot: "bg-red-500", bg: "bg-red-50", text: "text-red-700" },
  unreachable: { label: "Coming Soon", dot: "bg-slate-300", bg: "bg-slate-50", text: "text-slate-500" },
  unknown: { label: "Checking...", dot: "bg-slate-300 animate-pulse", bg: "bg-slate-50", text: "text-slate-500" },
};

const REGION_LABELS: Record<string, string> = { us: "United States", eu: "Europe", in: "India" };
const REGION_FLAGS: Record<string, string> = { us: "\u{1F1FA}\u{1F1F8}", eu: "\u{1F1EA}\u{1F1FA}", in: "\u{1F1EE}\u{1F1F3}" };
const SERVICE_ICONS: Record<string, typeof Server> = {
  "API Server": Server,
  Database: Database,
  "Connection Pool": Activity,
  "Flag Evaluation Engine": Zap,
  Cache: HardDrive,
  "Real-time Streaming": Radio,
};

function useBreakpoint() {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  if (width >= 1024) return 90;
  if (width >= 768) return 60;
  return 30;
}

// --- Sub-components ---

function StatusDot({ status }: { status: ComponentStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.unknown;
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${cfg.dot}`} />;
}

function StatusBadge({ status }: { status: ComponentStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.unknown;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <StatusDot status={status} />
      {cfg.label}
    </span>
  );
}

function OverallBanner({
  status,
  loading,
  lastChecked,
  onRefresh,
  refreshing,
}: {
  status: ComponentStatus;
  loading: boolean;
  lastChecked: string;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const bannerStyles: Record<string, { bg: string; border: string; icon: typeof CheckCircle; text: string; label: string }> = {
    operational: { bg: "bg-emerald-50", border: "border-emerald-200", icon: CheckCircle, text: "text-emerald-700", label: "All Systems Operational" },
    degraded: { bg: "bg-amber-50", border: "border-amber-200", icon: AlertTriangle, text: "text-amber-700", label: "Degraded Performance" },
    partial_outage: { bg: "bg-red-50", border: "border-red-200", icon: XCircle, text: "text-red-700", label: "Partial Outage" },
    down: { bg: "bg-red-50", border: "border-red-200", icon: XCircle, text: "text-red-700", label: "Major Outage" },
    unknown: { bg: "bg-slate-50", border: "border-slate-200", icon: Activity, text: "text-slate-600", label: "Checking Status..." },
  };

  const cfg = bannerStyles[status] ?? bannerStyles.unknown;
  const Icon = cfg.icon;

  return (
    <div className={`rounded-xl border p-5 ${cfg.bg} ${cfg.border}`}>
      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="flex items-center gap-3">
          {loading ? (
            <Activity className="h-6 w-6 animate-pulse text-slate-400" />
          ) : (
            <Icon className={`h-6 w-6 ${cfg.text}`} />
          )}
          <span className={`text-lg font-semibold ${loading ? "text-slate-500" : cfg.text}`}>
            {loading ? "Checking all regions..." : cfg.label}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {lastChecked && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Clock className="h-3 w-3" />
              {lastChecked}
            </span>
          )}
          <button
            onClick={onRefresh}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
            aria-label="Refresh status"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}

function RegionGroup({ region, defaultOpen }: { region: RegionStatus; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const isUnreachable = region.status === "unreachable";

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-slate-50"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{REGION_FLAGS[region.region] ?? "\u{1F310}"}</span>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {region.name || REGION_LABELS[region.region] || region.region.toUpperCase()}
            </h3>
            <p className="text-xs text-slate-400">{region.region.toUpperCase()} Region</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={region.status} />
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>
      {open && (
        <div className="border-t border-slate-100 px-4 pb-4">
          {isUnreachable ? (
            <p className="py-4 text-center text-sm text-slate-400">
              This region is not yet deployed. Infrastructure will be available soon.
            </p>
          ) : (
            <div className="divide-y divide-slate-50">
              {region.services.map((svc) => {
                const SvcIcon = SERVICE_ICONS[svc.name] ?? Server;
                return (
                  <div key={svc.name} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2.5">
                      <SvcIcon className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700">{svc.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {svc.latency_ms >= 0 && svc.status === "operational" && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          svc.latency_ms === 0 ? "bg-emerald-50 text-emerald-600" :
                          svc.latency_ms < 50 ? "bg-emerald-50 text-emerald-600" :
                          svc.latency_ms < 200 ? "bg-amber-50 text-amber-600" :
                          "bg-red-50 text-red-600"
                        }`}>
                          {svc.latency_ms === 0 && svc.name === "Flag Evaluation Engine" ? "< 1ms" : `${svc.latency_ms}ms`}
                        </span>
                      )}
                      <StatusDot status={svc.status} />
                      <span className={`text-xs font-medium ${(STATUS_CONFIG[svc.status] ?? STATUS_CONFIG.unknown).text}`}>
                        {(STATUS_CONFIG[svc.status] ?? STATUS_CONFIG.unknown).label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UptimeBar({
  label,
  region,
  component,
  history,
  days,
  isUnreachable,
}: {
  label: string;
  region: string;
  component: string;
  history: DailyComponentStatus[];
  days: number;
  isUnreachable: boolean;
}) {
  const [hoveredDay, setHoveredDay] = useState<DailyComponentStatus | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const dayMap = useMemo(() => {
    const map = new Map<string, DailyComponentStatus>();
    for (const d of history) {
      if (d.region === region && d.component === component) {
        map.set(d.date, d);
      }
    }
    return map;
  }, [history, region, component]);

  const dateRange = useMemo(() => {
    const dates: string[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }
    return dates;
  }, [days]);

  const overallUptime = useMemo(() => {
    let total = 0;
    let operational = 0;
    for (const d of history) {
      if (d.region === region && d.component === component) {
        total += d.total_checks;
        operational += d.operational_checks;
      }
    }
    if (total === 0) return null;
    return ((operational / total) * 100).toFixed(2);
  }, [history, region, component]);

  return (
    <div className="py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {isUnreachable ? (
          <span className="text-xs text-slate-400">Not yet deployed</span>
        ) : overallUptime !== null ? (
          <span className={`text-xs font-semibold ${
            parseFloat(overallUptime) >= 99.9 ? "text-emerald-600" :
            parseFloat(overallUptime) >= 95 ? "text-amber-600" :
            "text-red-600"
          }`}>
            {overallUptime}% uptime
          </span>
        ) : (
          <span className="text-xs text-slate-400">No data yet</span>
        )}
      </div>
      <div className="relative flex gap-px" role="img" aria-label={`${days}-day uptime for ${label}`}>
        {dateRange.map((date) => {
          const entry = dayMap.get(date);
          let color: string;
          if (isUnreachable) {
            color = "bg-slate-100";
          } else if (!entry) {
            color = "bg-slate-100";
          } else if (entry.uptime_pct >= 100) {
            color = "bg-emerald-400 hover:bg-emerald-500";
          } else if (entry.uptime_pct >= 95) {
            color = "bg-amber-400 hover:bg-amber-500";
          } else {
            color = "bg-red-400 hover:bg-red-500";
          }

          return (
            <div
              key={date}
              className={`h-8 flex-1 rounded-[2px] transition-colors ${color} cursor-pointer`}
              onMouseEnter={(e) => {
                if (entry) {
                  setHoveredDay(entry);
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
                }
              }}
              onMouseLeave={() => {
                setHoveredDay(null);
                setTooltipPos(null);
              }}
              aria-label={entry ? `${date}: ${entry.uptime_pct.toFixed(1)}% uptime` : `${date}: no data`}
            />
          );
        })}
        {hoveredDay && tooltipPos && (
          <div
            className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg"
            style={{ left: tooltipPos.x, top: tooltipPos.y - 8 }}
          >
            <p className="text-xs font-semibold text-slate-900">
              {new Date(hoveredDay.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </p>
            <p className={`text-xs font-medium ${
              hoveredDay.uptime_pct >= 100 ? "text-emerald-600" :
              hoveredDay.uptime_pct >= 95 ? "text-amber-600" :
              "text-red-600"
            }`}>
              {hoveredDay.uptime_pct.toFixed(2)}% uptime
            </p>
            <p className="text-[10px] text-slate-400">
              {hoveredDay.operational_checks}/{hoveredDay.total_checks} checks passed
            </p>
          </div>
        )}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        <span>{days} days ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}

function LatencyCard({
  label,
  sublabel,
  latencyMs,
  thresholds,
  subMs,
}: {
  label: string;
  sublabel: string;
  latencyMs: number | null;
  thresholds: { green: number; amber: number };
  subMs?: boolean;
}) {
  const displayValue =
    latencyMs === null ? "—" : subMs && latencyMs === 0 ? "< 1ms" : `${latencyMs}ms`;

  const color =
    latencyMs === null
      ? "text-slate-400"
      : latencyMs <= thresholds.green
        ? "text-emerald-600"
        : latencyMs <= thresholds.amber
          ? "text-amber-600"
          : "text-red-600";

  const barColor =
    latencyMs === null
      ? "bg-slate-100"
      : latencyMs <= thresholds.green
        ? "bg-emerald-400"
        : latencyMs <= thresholds.amber
          ? "bg-amber-400"
          : "bg-red-400";

  const barWidth =
    latencyMs === null
      ? 0
      : Math.min(100, Math.max(5, (latencyMs / (thresholds.amber * 2)) * 100));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          <p className="text-[10px] text-slate-400">{sublabel}</p>
        </div>
        <span className={`text-lg font-bold tabular-nums ${color}`}>{displayValue}</span>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
}

// --- Main Page ---

export default function StatusPage() {
  const [globalStatus, setGlobalStatus] = useState<GlobalStatus | null>(null);
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [apiLatencyMs, setApiLatencyMs] = useState<number | null>(null);
  const barDays = useBreakpoint();

  const fetchStatus = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    const start = performance.now();
    try {
      const res = await fetch(`${API_BASE}/v1/status/global`, { signal: AbortSignal.timeout(15000) });
      const elapsed = Math.round(performance.now() - start);
      setApiLatencyMs(elapsed);
      if (res.ok) {
        setGlobalStatus(await res.json());
      } else {
        setGlobalStatus({ overall_status: "degraded", regions: [], checked_at: new Date().toISOString() });
      }
    } catch {
      setApiLatencyMs(null);
      setGlobalStatus({ overall_status: "unknown", regions: [], checked_at: new Date().toISOString() });
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLastChecked(new Date().toLocaleString());
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/status/history?days=90`, { signal: AbortSignal.timeout(15000) });
      if (res.ok) {
        setHistory(await res.json());
      }
    } catch {
      // History is non-critical; fail silently
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchHistory();
    const interval = setInterval(() => fetchStatus(), 30000);
    return () => clearInterval(interval);
  }, [fetchStatus, fetchHistory]);

  const overallStatus = globalStatus?.overall_status ?? "unknown";

  const activeRegionServices = useMemo(() => {
    if (!globalStatus) return [];
    const active = globalStatus.regions.find((r) => r.status !== "unreachable");
    return active?.services ?? [];
  }, [globalStatus]);

  const dbLatency = useMemo(() => {
    const svc = activeRegionServices.find((s) => s.name === "Database");
    return svc?.latency_ms ?? null;
  }, [activeRegionServices]);

  const evalLatency = useMemo(() => {
    const svc = activeRegionServices.find((s) => s.name === "Flag Evaluation Engine");
    if (!svc) return null;
    return svc.latency_ms;
  }, [activeRegionServices]);

  const allComponents = useMemo(() => {
    const components: { region: string; component: string; label: string; isUnreachable: boolean }[] = [];
    const regionOrder = ["in", "us", "eu"];
    const serviceOrder = ["API Server", "Database", "Connection Pool", "Flag Evaluation Engine", "Cache", "Real-time Streaming"];

    for (const rc of regionOrder) {
      const region = globalStatus?.regions.find((r) => r.region === rc);
      const isUnreachable = region?.status === "unreachable" || !region;
      for (const svc of serviceOrder) {
        components.push({
          region: rc,
          component: svc,
          label: `${svc} (${rc.toUpperCase()})`,
          isUnreachable,
        });
      }
    }
    return components;
  }, [globalStatus]);

  const regionOrder = ["in", "us", "eu"];
  const sortedRegions = useMemo(() => {
    if (!globalStatus) return [];
    return regionOrder
      .map((code) => globalStatus.regions.find((r) => r.region === code))
      .filter((r): r is RegionStatus => r !== undefined);
  }, [globalStatus]);

  const missingRegions = useMemo(() => {
    if (!globalStatus) return regionOrder;
    const present = new Set(globalStatus.regions.map((r) => r.region));
    return regionOrder.filter((code) => !present.has(code));
  }, [globalStatus]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        {/* Header */}
        <SectionReveal>
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              System Status
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Real-time health of FeatureSignals infrastructure across all regions
            </p>
          </div>
        </SectionReveal>

        {/* Section 1: Overall Status Banner */}
        <SectionReveal delay={0.05}>
          <div className="mt-8">
            <OverallBanner
              status={overallStatus}
              loading={loading}
              lastChecked={lastChecked}
              onRefresh={() => fetchStatus(true)}
              refreshing={refreshing}
            />
          </div>
        </SectionReveal>

        {/* Section 2: Component Groups by Region */}
        <SectionReveal delay={0.1}>
          <div className="mt-10">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-5 w-5 text-slate-400" />
              <h2 className="text-base font-semibold text-slate-900">Components</h2>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse rounded-xl border border-slate-200 bg-white p-5">
                    <div className="h-5 w-40 rounded bg-slate-100" />
                    <div className="mt-3 h-4 w-24 rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {sortedRegions.map((region) => (
                  <RegionGroup
                    key={region.region}
                    region={region}
                    defaultOpen={region.status !== "unreachable"}
                  />
                ))}
                {missingRegions.map((code) => (
                  <RegionGroup
                    key={code}
                    region={{
                      region: code,
                      name: REGION_LABELS[code] ?? code.toUpperCase(),
                      status: "unreachable",
                      services: [],
                      checked_at: new Date().toISOString(),
                    }}
                    defaultOpen={false}
                  />
                ))}
              </div>
            )}
          </div>
        </SectionReveal>

        {/* Section 3: Performance Metrics */}
        {!loading && globalStatus && globalStatus.regions.some((r) => r.status !== "unreachable") && (
          <SectionReveal delay={0.12}>
            <div className="mt-10">
              <div className="flex items-center gap-2 mb-4">
                <Gauge className="h-5 w-5 text-slate-400" />
                <h2 className="text-base font-semibold text-slate-900">Performance Metrics</h2>
                <span className="text-xs text-slate-400">(live)</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <LatencyCard
                  label="API Response"
                  sublabel="Client round-trip"
                  latencyMs={apiLatencyMs}
                  thresholds={{ green: 200, amber: 500 }}
                />
                <LatencyCard
                  label="Database"
                  sublabel="Server-side query"
                  latencyMs={dbLatency}
                  thresholds={{ green: 50, amber: 200 }}
                />
                <LatencyCard
                  label="Flag Evaluation"
                  sublabel="Hot path latency"
                  latencyMs={evalLatency}
                  thresholds={{ green: 1, amber: 5 }}
                  subMs
                />
              </div>
            </div>
          </SectionReveal>
        )}

        {/* Section 4: Uptime History (90-day bars) */}
        <SectionReveal delay={0.18}>
          <div className="mt-10">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-5 w-5 text-slate-400" />
              <h2 className="text-base font-semibold text-slate-900">Uptime History</h2>
              <span className="text-xs text-slate-400">({barDays} days)</span>
            </div>

            {historyLoading ? (
              <div className="mt-4 space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 w-40 rounded bg-slate-100" />
                    <div className="mt-2 h-8 rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : history && history.components.length > 0 ? (
              <div className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white px-5">
                {allComponents.map((comp) => (
                  <UptimeBar
                    key={`${comp.region}-${comp.component}`}
                    label={comp.label}
                    region={comp.region}
                    component={comp.component}
                    history={history.components}
                    days={barDays}
                    isUnreachable={comp.isUnreachable}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-8 text-center">
                <Minus className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm font-medium text-slate-600">No uptime data yet</p>
                <p className="mt-1 text-xs text-slate-400">
                  Monitoring started recently &mdash; history will build over the coming days as health checks are recorded every 5 minutes.
                </p>
              </div>
            )}
          </div>
        </SectionReveal>

        {/* Section 5: Incident History */}
        <SectionReveal delay={0.24}>
          <div className="mt-10">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-slate-400" />
              <h2 className="text-base font-semibold text-slate-900">Incident History</h2>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
              <CheckCircle className="mx-auto h-8 w-8 text-emerald-400" />
              <p className="mt-2 text-sm font-medium text-slate-600">No incidents reported</p>
              <p className="mt-1 text-xs text-slate-400">
                All systems have been operating normally. Past incidents will appear here when they occur.
              </p>
            </div>
          </div>
        </SectionReveal>

        <SectionReveal delay={0.28}>
          <div className="mt-8 border-t border-slate-100 pt-8">
            <h2 className="text-base font-semibold text-slate-900">Report an Issue</h2>
            <p className="mt-1 text-sm text-slate-500">
              If you are experiencing an issue not reflected above, please contact us.
            </p>
            <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row">
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
          </div>
        </SectionReveal>
      </div>
    </div>
  );
}
