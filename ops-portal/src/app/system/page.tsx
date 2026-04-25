"use client";

import { useCallback, useState } from "react";
import {
  RefreshCw,
  Server,
  Database,
  Activity,
  Cpu,
  BarChart3,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  Globe,
  Shield,
  Layers,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { StatusDot } from "@/components/ui/status-dot";
import { Badge } from "@/components/ui/badge";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useSystemHealth, useServiceStatuses } from "@/hooks/use-system";
import type { NodeStatus, ServiceStatus } from "@/types/api";
import type { ServiceStatusEntry } from "@/lib/api";

// ─── Helpers ───────────────────────────────────────────────────────────────

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  postgresql: <Database className="h-5 w-5" aria-hidden="true" />,
  signoz: <BarChart3 className="h-5 w-5" aria-hidden="true" />,
  temporal: <Activity className="h-5 w-5" aria-hidden="true" />,
  "api-server": <Server className="h-5 w-5" aria-hidden="true" />,
  dashboard: <Globe className="h-5 w-5" aria-hidden="true" />,
  "caddy-ingress": <Shield className="h-5 w-5" aria-hidden="true" />,
};

const DEFAULT_SERVICE_ICON = <Cpu className="h-5 w-5" aria-hidden="true" />;

function getServiceLabel(name: string): string {
  return name.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getServiceIcon(name: string): React.ReactNode {
  return SERVICE_ICONS[name] ?? DEFAULT_SERVICE_ICON;
}

function statusDotVariant(
  status: string,
): "healthy" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "healthy":
      return "healthy";
    case "degraded":
      return "warning";
    case "down":
      return "danger";
    default:
      return "neutral";
  }
}

function statusColorClass(status: string): string {
  switch (status) {
    case "healthy":
      return "text-accent-success";
    case "degraded":
      return "text-accent-warning";
    case "down":
      return "text-accent-danger";
    default:
      return "text-text-muted";
  }
}

// ─── Resource Bar ──────────────────────────────────────────────────────────

function ResourceBar({ label, percent }: { label: string; percent: number }) {
  const barColor = (pct: number) => {
    if (pct > 80) return "bg-accent-danger";
    if (pct > 60) return "bg-accent-warning";
    return "bg-accent-success";
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-muted w-10 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-bg-elevated overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            barColor(percent),
          )}
          style={{ width: `${Math.min(percent, 100)}%` }}
          role="progressbar"
          aria-valuenow={Math.round(percent)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label}: ${Math.round(percent)}%`}
        />
      </div>
      <span className="text-xs text-text-muted w-9 text-right">
        {Math.round(percent)}%
      </span>
    </div>
  );
}

// ─── Node Card ─────────────────────────────────────────────────────────────

function NodeCard({ node }: { node: NodeStatus }) {
  const ready = node.status === "ready";

  return (
    <Card
      variant="bordered"
      className={cn(!ready && "border-accent-danger/30")}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-tertiary">
              <Server className="h-4 w-4 text-text-muted" aria-hidden="true" />
            </div>
            <span className="text-sm font-medium text-text-primary truncate">
              {node.name}
            </span>
          </div>
          <StatusDot
            status={ready ? "healthy" : "danger"}
            pulse={!ready}
            label={ready ? "Ready" : "Not Ready"}
            size="sm"
          />
        </div>
        <div className="space-y-2">
          <ResourceBar label="CPU" percent={node.cpu_percent} />
          <ResourceBar label="Mem" percent={node.memory_percent} />
          <ResourceBar label="Disk" percent={node.disk_percent} />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Service Card ──────────────────────────────────────────────────────────

interface ServiceCardData extends ServiceStatusEntry {
  uptime?: string;
  version?: string;
}

function ServiceCard({ service }: { service: ServiceCardData }) {
  const displayName = service.displayName || getServiceLabel(service.name);
  const icon = getServiceIcon(service.name);
  const dotVariant = statusDotVariant(service.status);
  const colorCls = statusColorClass(service.status);

  return (
    <Card
      variant="default"
      className={cn(
        "transition-all",
        service.status === "down" &&
          "border-accent-danger/40 bg-accent-danger/5",
        service.status === "degraded" && "border-accent-warning/30",
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                service.status === "healthy"
                  ? "bg-accent-success/10"
                  : service.status === "degraded"
                    ? "bg-accent-warning/10"
                    : "bg-accent-danger/10",
              )}
            >
              <span className={colorCls}>{icon}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {displayName}
              </p>
              <p className={cn("text-xs font-medium capitalize", colorCls)}>
                {service.status}
              </p>
            </div>
          </div>
          <StatusDot
            status={dotVariant}
            pulse={service.status !== "healthy"}
            size="sm"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-text-muted">
          {service.uptime && (
            <span className="flex items-center gap-1">
              <Activity className="h-3 w-3" aria-hidden="true" />
              {service.uptime}
            </span>
          )}
          {service.version && (
            <span className="flex items-center gap-1">
              <Layers className="h-3 w-3" aria-hidden="true" />v
              {service.version}
            </span>
          )}
        </div>

        {service.message && service.status !== "healthy" && (
          <div className="mt-2 rounded-md bg-accent-danger/10 px-2.5 py-1.5">
            <p className="text-xs text-accent-danger">{service.message}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Skeleton Grids ────────────────────────────────────────────────────────

function ClusterSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ServicesSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-3 w-3 rounded-full" />
            </div>
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── SigNoz Section ────────────────────────────────────────────────────────

function SigNozSection() {
  const sigNozUrl = process.env.NEXT_PUBLIC_SIGNOZ_URL;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3
              className="h-4 w-4 text-accent-primary"
              aria-hidden="true"
            />
            SigNoz Observability
          </CardTitle>
          <CardDescription>
            Application performance monitoring and tracing
          </CardDescription>
        </div>
        {sigNozUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              window.open(sigNozUrl, "_blank", "noopener,noreferrer")
            }
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            Open SigNoz
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {sigNozUrl ? (
          <div
            className="relative w-full overflow-hidden rounded-lg border border-border-default"
            style={{ height: "400px" }}
          >
            <iframe
              src={sigNozUrl}
              title="SigNoz Dashboard"
              className="h-full w-full"
              sandbox="allow-scripts allow-same-origin allow-forms"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-default bg-bg-tertiary/30 py-12 text-center">
            <BarChart3
              className="h-10 w-10 text-text-muted mb-3"
              aria-hidden="true"
            />
            <h3 className="text-sm font-semibold text-text-primary">
              SigNoz Not Configured
            </h3>
            <p className="mt-1 max-w-md text-xs text-text-secondary">
              To embed the SigNoz dashboard, set the{" "}
              <code className="rounded bg-bg-tertiary px-1.5 py-0.5 font-mono text-accent-primary text-[10px]">
                NEXT_PUBLIC_SIGNOZ_URL
              </code>{" "}
              environment variable to your SigNoz instance URL.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Auto-Refresh Toggle ───────────────────────────────────────────────────

function AutoRefreshToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
        enabled
          ? "bg-accent-success/10 text-accent-success"
          : "bg-bg-tertiary text-text-muted hover:text-text-secondary",
      )}
      aria-label={enabled ? "Disable auto-refresh" : "Enable auto-refresh"}
      aria-pressed={enabled}
    >
      {enabled ? (
        <ToggleRight className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <ToggleLeft className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {enabled ? "Auto-refresh ON" : "Auto-refresh OFF"}
    </button>
  );
}

// ─── System Health Page ────────────────────────────────────────────────────

export default function SystemHealthPage() {
  const [autoRefresh, setAutoRefresh] = useState(true);

  const toggleAutoRefresh = useCallback(() => {
    setAutoRefresh((prev) => !prev);
  }, []);

  const {
    data: health,
    isLoading: healthLoading,
    error: healthError,
    refetch: refetchHealth,
  } = useSystemHealth({
    enabled: true,
    refetchInterval: autoRefresh ? 30_000 : false,
  });

  const {
    data: serviceStatuses,
    isLoading: servicesLoading,
    error: servicesError,
    refetch: refetchServices,
  } = useServiceStatuses({
    enabled: true,
    refetchInterval: autoRefresh ? 30_000 : false,
  });

  const loadingInitial =
    healthLoading && servicesLoading && !health && !serviceStatuses;
  const refreshing = (healthLoading || servicesLoading) && !!health;
  const hasError = !!healthError || !!servicesError;
  const hasData = !!health || !!serviceStatuses;

  const lastUpdated = health?.last_updated
    ? formatRelativeTime(health.last_updated)
    : undefined;

  const downServices =
    serviceStatuses?.filter(
      (s) => s.status === "down" || s.status === "degraded",
    ) ?? [];

  const healthyCount =
    serviceStatuses?.filter((s) => s.status === "healthy").length ?? 0;
  const totalServices = serviceStatuses?.length ?? 0;

  const handleRetryAll = useCallback(() => {
    refetchHealth();
    refetchServices();
  }, [refetchHealth, refetchServices]);

  // ─── Full failure state ───────────────────────────────────────────────

  if (
    healthError &&
    servicesError &&
    !health &&
    !serviceStatuses &&
    !healthLoading &&
    !servicesLoading
  ) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <ErrorState
          title="Unable to fetch system health"
          message="We couldn't retrieve system health data. This could be a connectivity issue with the monitoring service."
          onRetry={handleRetryAll}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            System Health
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Infrastructure cluster and service status overview
            {lastUpdated && (
              <span className="ml-2 text-xs">· Updated {lastUpdated}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AutoRefreshToggle
            enabled={autoRefresh}
            onToggle={toggleAutoRefresh}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRetryAll}
            disabled={refreshing}
            aria-label="Refresh system health"
          >
            <RefreshCw
              className={cn("h-4 w-4", refreshing && "animate-spin")}
              aria-hidden="true"
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Degraded banner */}
      {hasData && downServices.length > 0 && (
        <div
          className="flex items-center gap-2 rounded-lg border border-accent-danger/30 bg-accent-danger/5 px-4 py-3"
          role="alert"
        >
          <StatusDot status="danger" pulse size="md" />
          <div>
            <p className="text-sm font-medium text-accent-danger">
              {downServices.length}{" "}
              {downServices.length === 1 ? "service is" : "services are"}{" "}
              degraded or down
            </p>
            <p className="text-xs text-text-secondary mt-0.5">
              {downServices
                .map((s) => s.displayName || getServiceLabel(s.name))
                .join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Cluster Status */}
      <section aria-label="Cluster status">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-text-primary">
            Cluster Status
          </h2>
          {health && (
            <Badge
              variant={
                health.cluster.status === "healthy"
                  ? "success"
                  : health.cluster.status === "degraded"
                    ? "warning"
                    : "danger"
              }
              size="sm"
            >
              {health.cluster.status}
            </Badge>
          )}
        </div>

        {healthLoading && !health ? (
          <ClusterSkeleton />
        ) : healthError && !health ? (
          <ErrorState
            title="Failed to load cluster data"
            message="Unable to fetch node status information."
            onRetry={() => refetchHealth()}
            compact
          />
        ) : health?.cluster.nodes && health.cluster.nodes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {health.cluster.nodes.map((node) => (
              <NodeCard key={node.name} node={node} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border-default bg-bg-tertiary/30 py-8 text-center">
            <Server
              className="mx-auto h-8 w-8 text-text-muted mb-2"
              aria-hidden="true"
            />
            <p className="text-sm text-text-muted">
              No cluster nodes available
            </p>
          </div>
        )}
      </section>

      {/* Service Status */}
      <section aria-label="Service statuses">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Services</h2>
          {serviceStatuses && (
            <span className="text-xs text-text-muted">
              {healthyCount}/{totalServices} healthy
              {downServices.length > 0 && (
                <span className="text-accent-danger ml-1">
                  · {downServices.length}{" "}
                  {downServices.length === 1 ? "issue" : "issues"}
                </span>
              )}
            </span>
          )}
        </div>

        {servicesLoading && !serviceStatuses ? (
          <ServicesSkeleton />
        ) : servicesError && !serviceStatuses ? (
          <ErrorState
            title="Failed to load service statuses"
            message="Unable to fetch service health information."
            onRetry={() => refetchServices()}
            compact
          />
        ) : serviceStatuses && serviceStatuses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {serviceStatuses.map((service) => (
              <ServiceCard key={service.name} service={service} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border-default bg-bg-tertiary/30 py-8 text-center">
            <Activity
              className="mx-auto h-8 w-8 text-text-muted mb-2"
              aria-hidden="true"
            />
            <p className="text-sm text-text-muted">No service data available</p>
          </div>
        )}
      </section>

      {/* SigNoz embedded dashboard */}
      <SigNozSection />
    </div>
  );
}
