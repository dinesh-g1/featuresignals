"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import {
  Button,
  Badge,
  EmptyState,
  Skeleton,
  ErrorDisplay,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/toast";
import { cn, timeAgo } from "@/lib/utils";
import {
  ShieldCheckIcon,
  AlertIcon,
  ClockIcon,
  TrendingUpIcon,
  SearchIcon,
  ZapIcon,
  CheckCircleFillIcon,
} from "@/components/icons/nav-icons";
import type {
  MonitorResponse,
  CorrelateResponse,
  RemediateResponse,
} from "@/lib/types";

// ─── Helpers ────────────────────────────────────────────────────────────

function healthColor(health: string): string {
  switch (health) {
    case "healthy":
      return "bg-[var(--signal-bg-success-muted)] text-[var(--signal-fg-success)] border-[var(--signal-border-success-muted)]";
    case "degraded":
      return "bg-[var(--signal-bg-warning-muted)] text-[var(--signal-fg-warning)] border-[var(--signal-border-warning-muted)]";
    case "critical":
      return "bg-[var(--signal-bg-danger-muted)] text-[var(--signal-fg-danger)] border-[var(--signal-border-danger-muted)]";
    default:
      return "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-secondary)]";
  }
}

function healthDot(health: string): string {
  switch (health) {
    case "healthy":
      return "bg-[var(--signal-fg-success)]";
    case "degraded":
      return "bg-[var(--signal-fg-warning)]";
    case "critical":
      return "bg-[var(--signal-fg-danger)]";
    default:
      return "bg-[var(--signal-fg-tertiary)]";
  }
}

function severityBadge(severity: string) {
  switch (severity) {
    case "critical":
      return "danger" as const;
    case "warning":
      return "warning" as const;
    default:
      return "info" as const;
  }
}

function scoreColor(score: number): string {
  if (score >= 0.8)
    return "text-[var(--signal-fg-danger)] bg-[var(--signal-bg-danger-muted)]";
  if (score >= 0.5)
    return "text-[var(--signal-fg-warning)] bg-[var(--signal-bg-warning-muted)]";
  return "text-[var(--signal-fg-success)] bg-[var(--signal-bg-success-muted)]";
}

function alertTypeLabel(type: string): string {
  switch (type) {
    case "latency_spike":
      return "Latency Spike";
    case "error_rate":
      return "Error Rate";
    case "regression":
      return "Regression";
    case "unexpected_behavior":
      return "Unexpected Behavior";
    default:
      return type.replace(/_/g, " ");
  }
}

// ─── Correlate Form ─────────────────────────────────────────────────────

function CorrelateForm({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (result: CorrelateResponse) => void;
}) {
  const token = useAppStore((s) => s.token);
  const currentEnvId = useAppStore((s) => s.currentEnvId);

  const [startedAt, setStartedAt] = useState("");
  const [endedAt, setEndedAt] = useState("");
  const [servicesAffected, setServicesAffected] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!token) return;
    if (!startedAt) {
      setError("Incident start time is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body: {
        incident_started_at: string;
        incident_ended_at?: string;
        services_affected?: string[];
        env_id?: string;
      } = {
        incident_started_at: new Date(startedAt).toISOString(),
      };
      if (endedAt) body.incident_ended_at = new Date(endedAt).toISOString();
      if (servicesAffected.trim())
        body.services_affected = servicesAffected
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      if (currentEnvId) body.env_id = currentEnvId;

      const result = await api.incident.correlate(token, body);
      onSuccess(result);
      onOpenChange(false);
      toast(
        `Correlation complete: Found ${result.total_flags_changed} correlated flag changes.`,
        "success",
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to correlate incident",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Correlate Incident</DialogTitle>
          <DialogDescription>
            Find flag changes correlated with an incident window.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {error && (
            <div
              className="mb-4 rounded-lg border border-[var(--signal-border-danger-emphasis)] bg-[var(--signal-bg-danger-muted)] p-3 text-sm text-[var(--signal-fg-danger)]"
              role="alert"
            >
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="corr-started">Incident Start *</Label>
              <Input
                id="corr-started"
                type="datetime-local"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="corr-ended">Incident End</Label>
              <Input
                id="corr-ended"
                type="datetime-local"
                value={endedAt}
                onChange={(e) => setEndedAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="corr-services">
                Services Affected (comma-separated)
              </Label>
              <Input
                id="corr-services"
                placeholder="api, web, worker"
                value={servicesAffected}
                onChange={(e) => setServicesAffected(e.target.value)}
              />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Correlating..." : "Run Correlation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Remediate Confirmation Dialog ───────────────────────────────────────

function RemediateDialog({
  open,
  onOpenChange,
  flagKey,
  onRemediated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flagKey: string;
  onRemediated: (result: RemediateResponse) => void;
}) {
  const token = useAppStore((s) => s.token);
  const currentEnvId = useAppStore((s) => s.currentEnvId);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (action: "pause" | "rollback" | "kill") => {
    if (!token || !currentEnvId) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.incident.remediate(token, {
        flag_key: flagKey,
        env_id: currentEnvId,
        action,
        reason: reason || undefined,
      });
      onRemediated(result);
      onOpenChange(false);
      toast(
        `${action} applied: Remediation ${result.status} for ${flagKey}.`,
        result.status === "applied" ? "success" : "info",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remediation failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remediate: {flagKey}</DialogTitle>
          <DialogDescription>
            Choose a remediation action for this flag. This will immediately
            affect live traffic.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {error && (
            <div
              className="mb-4 rounded-lg border border-[var(--signal-border-danger-emphasis)] bg-[var(--signal-bg-danger-muted)] p-3 text-sm text-[var(--signal-fg-danger)]"
              role="alert"
            >
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rem-reason">Reason (optional)</Label>
              <Input
                id="rem-reason"
                placeholder="Why is this remediation needed?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                onClick={() => handleAction("pause")}
                disabled={submitting}
              >
                <ClockIcon className="h-4 w-4 mr-1.5" />
                Pause Flag
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleAction("rollback")}
                disabled={submitting}
              >
                <AlertIcon className="h-4 w-4 mr-1.5" />
                Rollback
              </Button>
              <Button
                variant="danger"
                onClick={() => handleAction("kill")}
                disabled={submitting}
              >
                <ZapIcon className="h-4 w-4 mr-1.5" />
                Kill Switch
              </Button>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────

function IncidentsInner() {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);

  const [monitor, setMonitor] = useState<MonitorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCorrelate, setShowCorrelate] = useState(false);
  const [correlationResult, setCorrelationResult] =
    useState<CorrelateResponse | null>(null);
  const [remediateTarget, setRemediateTarget] = useState<string | null>(null);

  const fetchMonitor = useCallback(async () => {
    if (!token || !projectId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.incident.getMonitor(token, projectId);
      setMonitor(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load monitoring data",
      );
    } finally {
      setLoading(false);
    }
  }, [token, projectId]);

  useEffect(() => {
    fetchMonitor();
  }, [fetchMonitor]);

  // ── Loading state ──────────────────────────────────────────────────
  if (loading && !monitor) {
    return (
      <div className="space-y-6 animate-in">
        <PageHeader
          title="Incidents"
          description="Post-change safety net — monitor, detect, respond"
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────
  if (error && !monitor) {
    return (
      <div className="space-y-6 animate-in">
        <PageHeader
          title="Incidents"
          description="Post-change safety net — monitor, detect, respond"
        />
        <ErrorDisplay
          title="Failed to load monitoring data"
          message={error}
          onRetry={fetchMonitor}
        />
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────
  if (!loading && !error && !monitor) {
    return (
      <div className="space-y-6 animate-in">
        <PageHeader
          title="Incidents"
          description="Post-change safety net — monitor, detect, respond"
          actions={
            <Button onClick={() => setShowCorrelate(true)}>
              <SearchIcon className="h-4 w-4 mr-1.5" />
              Correlate
            </Button>
          }
        />
        <EmptyState
          icon={ShieldCheckIcon}
          title="No active monitoring"
          description="IncidentFlag monitors feature flag changes in real-time and correlates them with production incidents. Connect your observability tools to activate monitoring."
          action={
            <Button onClick={() => setShowCorrelate(true)}>
              Correlate an Incident
            </Button>
          }
        />
        <CorrelateForm
          open={showCorrelate}
          onOpenChange={setShowCorrelate}
          onSuccess={(result) => {
            setCorrelationResult(result);
            fetchMonitor();
          }}
        />
      </div>
    );
  }

  // ── Success state ──────────────────────────────────────────────────
  const m = monitor!;
  const health = m.overall_health;

  return (
    <div className="space-y-6 animate-in">
      <PageHeader
        title="Incidents"
        description="Post-change safety net — monitor, detect, respond"
        actions={
          <Button onClick={() => setShowCorrelate(true)}>
            <SearchIcon className="h-4 w-4 mr-1.5" />
            Correlate
          </Button>
        }
      />

      {/* Health Banner */}
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border px-5 py-4",
          healthColor(health),
        )}
        role="status"
        aria-label={`System health is ${health}`}
      >
        <span
          className={cn("h-3 w-3 rounded-full", healthDot(health))}
          aria-hidden="true"
        />
        <span className="text-sm font-semibold capitalize">
          {health === "healthy"
            ? "All Systems Healthy"
            : health === "degraded"
              ? "System Degraded"
              : "Critical Alert"}
        </span>
        <span className="text-sm ml-auto">{flagsToMonitoredText(m)}</span>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Health"
          value={health.charAt(0).toUpperCase() + health.slice(1)}
          icon={health === "healthy" ? CheckCircleFillIcon : AlertIcon}
          className={cn(
            "border-l-4",
            health === "healthy"
              ? "border-l-[var(--signal-fg-success)]"
              : health === "degraded"
                ? "border-l-[var(--signal-fg-warning)]"
                : "border-l-[var(--signal-fg-danger)]",
          )}
        />
        <StatCard
          label="Flags Under Monitoring"
          value={m.flags_under_monitoring}
          icon={TrendingUpIcon}
        />
        <StatCard
          label="Active Alerts"
          value={m.active_alerts.length}
          icon={AlertIcon}
          trend={m.active_alerts.length > 0 ? "up" : "neutral"}
        />
      </div>

      {/* Active Alerts + Recent Correlations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertIcon className="h-4 w-4 text-[var(--signal-fg-warning)]" />
              Active Alerts
            </CardTitle>
            <CardDescription>
              {m.active_alerts.length === 0
                ? "No active alerts"
                : `${m.active_alerts.length} alert${m.active_alerts.length > 1 ? "s" : ""}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {m.active_alerts.length === 0 ? (
              <p className="text-sm text-[var(--signal-fg-tertiary)] py-4 text-center">
                No active alerts. Everything looks good.
              </p>
            ) : (
              <ul className="space-y-3" role="list">
                {m.active_alerts.map((alert, i) => (
                  <li
                    key={`${alert.flag_key}-${i}`}
                    className="flex items-start gap-3 rounded-lg border border-[var(--signal-border-default)] p-3"
                  >
                    <AlertIcon
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        alert.severity === "critical"
                          ? "text-[var(--signal-fg-danger)]"
                          : alert.severity === "warning"
                            ? "text-[var(--signal-fg-warning)]"
                            : "text-[var(--signal-fg-info)]",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                          {alert.flag_key}
                        </span>
                        <Badge variant={severityBadge(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        <Badge variant="default" className="text-[11px]">
                          {alertTypeLabel(alert.alert_type)}
                        </Badge>
                      </div>
                      <p className="text-sm text-[var(--signal-fg-secondary)]">
                        {alert.message}
                      </p>
                      <p className="text-xs text-[var(--signal-fg-tertiary)] mt-1">
                        {timeAgo(alert.detected_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent Correlations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <SearchIcon className="h-4 w-4 text-[var(--signal-fg-accent)]" />
              Recent Correlations
            </CardTitle>
            <CardDescription>
              {m.recent_correlations.length === 0
                ? "No recent correlations"
                : `${m.recent_correlations.length} correlation${m.recent_correlations.length > 1 ? "s" : ""}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {m.recent_correlations.length === 0 ? (
              <p className="text-sm text-[var(--signal-fg-tertiary)] py-4 text-center">
                No recent correlations yet. Run a correlation to get started.
              </p>
            ) : (
              <ul className="space-y-3" role="list">
                {m.recent_correlations.map((corr) => (
                  <li
                    key={corr.correlation_id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-[var(--signal-border-default)] p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                          {corr.flag_key}
                        </span>
                        {corr.was_remediated && (
                          <span className="inline-flex items-center gap-1 text-xs text-[var(--signal-fg-success)]">
                            <CheckCircleFillIcon className="h-3 w-3" />
                            Remediated
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--signal-fg-tertiary)]">
                        {timeAgo(corr.correlated_at)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-xs font-bold",
                        scoreColor(corr.correlation_score),
                      )}
                      aria-label={`Correlation score: ${(corr.correlation_score * 100).toFixed(0)}%`}
                    >
                      {(corr.correlation_score * 100).toFixed(0)}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Correlation Result */}
      {correlationResult && (
        <Card className="border-[var(--signal-border-accent-muted)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUpIcon className="h-4 w-4 text-[var(--signal-fg-accent)]" />
              Correlation Results
            </CardTitle>
            <CardDescription>
              {correlationResult.total_flags_changed} flag change
              {correlationResult.total_flags_changed !== 1 ? "s" : ""} found
              &middot; Highest score:{" "}
              {(correlationResult.highest_correlation * 100).toFixed(0)}%
            </CardDescription>
          </CardHeader>
          <CardContent>
            {correlationResult.correlated_changes.length === 0 ? (
              <p className="text-sm text-[var(--signal-fg-tertiary)] py-4 text-center">
                No correlated flag changes found in this window.
              </p>
            ) : (
              <ul className="space-y-2" role="list">
                {correlationResult.correlated_changes.map((change, i) => (
                  <li
                    key={`${change.flag_key}-${i}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-[var(--signal-border-default)] p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                          {change.flag_key}
                        </span>
                        <Badge variant="default" className="text-[11px]">
                          {change.change_type}
                        </Badge>
                        {change.was_reverted && (
                          <Badge variant="success">Reverted</Badge>
                        )}
                      </div>
                      <p className="text-xs text-[var(--signal-fg-tertiary)]">
                        Changed {timeAgo(change.changed_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-1 text-xs font-bold",
                          scoreColor(change.correlation_score),
                        )}
                      >
                        {(change.correlation_score * 100).toFixed(0)}%
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setRemediateTarget(change.flag_key)}
                        aria-label={`Remediate ${change.flag_key}`}
                      >
                        Remediate
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <CorrelateForm
        open={showCorrelate}
        onOpenChange={setShowCorrelate}
        onSuccess={(result) => {
          setCorrelationResult(result);
          fetchMonitor();
        }}
      />

      {remediateTarget && (
        <RemediateDialog
          open={!!remediateTarget}
          onOpenChange={(open) => {
            if (!open) setRemediateTarget(null);
          }}
          flagKey={remediateTarget}
          onRemediated={(_result) => {
            setRemediateTarget(null);
            fetchMonitor();
          }}
        />
      )}
    </div>
  );
}

// ─── Helpers (after imports) ─────────────────────────────────────────────

function flagsToMonitoredText(monitor: MonitorResponse): string {
  if (monitor.flags_under_monitoring === 0) return "No flags under monitoring";
  return `${monitor.flags_under_monitoring} flag${monitor.flags_under_monitoring > 1 ? "s" : ""} under monitoring`;
}

// ─── Page Export ─────────────────────────────────────────────────────────

export default function IncidentsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <PageHeader
            title="Incidents"
            description="Post-change safety net — monitor, detect, respond"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </div>
      }
    >
      <IncidentsInner />
    </Suspense>
  );
}
