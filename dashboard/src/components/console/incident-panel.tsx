"use client";

/**
 * IncidentPanel — Shows incident monitoring data in the feature detail panel
 * when a feature is in "monitor" or "decide" stage.
 *
 * Fetches from api.incident.getMonitor, displays:
 *   - Overall health status
 *   - Anomaly timeline (active alerts)
 *   - Correlated flags / changes
 *   - Auto-remediation status and actions
 *
 * States: loading (skeleton), error (retry), empty (no incidents), success.
 *
 * Signal UI tokens only. Zero hardcoded hex colors.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  RefreshCw,
  Zap,
  Undo2,
  Clock,
  GitBranch,
  ArrowRight,
  Siren,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import type { MonitorResponse, ActiveAlert, RecentCorrelation } from "@/lib/types";

// ─── Types ───────────────────────────────────────────────────────────

interface IncidentPanelProps {
  flagKey: string;
  flagName: string;
  stage: "monitor" | "decide";
  environment: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function healthColor(health: string): string {
  switch (health) {
    case "healthy":
      return "var(--signal-fg-success)";
    case "degraded":
      return "var(--signal-fg-warning)";
    case "critical":
      return "var(--signal-fg-danger)";
    default:
      return "var(--signal-fg-tertiary)";
  }
}

function healthBg(health: string): string {
  switch (health) {
    case "healthy":
      return "var(--signal-bg-success-muted)";
    case "degraded":
      return "var(--signal-bg-warning-muted)";
    case "critical":
      return "var(--signal-bg-danger-muted)";
    default:
      return "var(--signal-bg-secondary)";
  }
}

function healthIcon(health: string) {
  switch (health) {
    case "healthy":
      return <CheckCircle2 className="h-4 w-4" />;
    case "degraded":
      return <AlertTriangle className="h-4 w-4" />;
    case "critical":
      return <ShieldAlert className="h-4 w-4" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
}

function severityColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "var(--signal-fg-danger)";
    case "warning":
      return "var(--signal-fg-warning)";
    case "info":
      return "var(--signal-fg-info)";
    default:
      return "var(--signal-fg-tertiary)";
  }
}

function severityBg(severity: string): string {
  switch (severity) {
    case "critical":
      return "var(--signal-bg-danger-muted)";
    case "warning":
      return "var(--signal-bg-warning-muted)";
    case "info":
      return "var(--signal-bg-info-muted)";
    default:
      return "var(--signal-bg-secondary)";
  }
}

function severityIcon(severity: string) {
  switch (severity) {
    case "critical":
      return <Siren className="h-3.5 w-3.5" />;
    case "warning":
      return <AlertTriangle className="h-3.5 w-3.5" />;
    case "info":
      return <Info className="h-3.5 w-3.5" />;
    default:
      return <Info className="h-3.5 w-3.5" />;
  }
}

function timeAgo(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Section Header ──────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--signal-fg-secondary)]" />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
        {title}
      </span>
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────

function IncidentSkeleton() {
  return (
    <div className="border-t border-[var(--signal-border-subtle)] animate-pulse">
      <div className="px-4 py-3 space-y-3">
        <div className="h-12 w-full rounded-[var(--signal-radius-sm)] bg-[var(--signal-border-default)]" />
        <div className="space-y-2">
          <div className="h-3 w-20 rounded bg-[var(--signal-border-default)]" />
          <div className="h-8 w-full rounded bg-[var(--signal-border-default)]" />
          <div className="h-8 w-full rounded bg-[var(--signal-border-default)]" />
        </div>
      </div>
    </div>
  );
}

// ─── Error ───────────────────────────────────────────────────────────

function IncidentError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="border-t border-[var(--signal-border-subtle)]">
      <div className="px-4 py-4 text-center">
        <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[var(--signal-bg-danger-muted)] ring-1 ring-[var(--signal-border-danger-emphasis)]/30 mb-2">
          <RefreshCw className="h-4 w-4 text-[var(--signal-fg-danger)]" />
        </div>
        <p className="text-xs text-[var(--signal-fg-secondary)] mb-2 leading-relaxed">
          {message}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--signal-fg-accent)] hover:underline"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      </div>
    </div>
  );
}

// ─── No Incidents ────────────────────────────────────────────────────

function NoIncidents() {
  return (
    <div className="border-t border-[var(--signal-border-subtle)]">
      <div className="px-4 py-4 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--signal-bg-success-muted)] ring-1 ring-[var(--signal-border-success-muted)] shadow-sm mb-2">
          <CheckCircle2 className="h-5 w-5 text-[var(--signal-fg-success)]" />
        </div>
        <p className="text-xs text-[var(--signal-fg-secondary)] leading-relaxed">
          All clear. No incidents detected for this feature.
        </p>
        <p className="text-[10px] text-[var(--signal-fg-tertiary)] mt-1">
          Monitoring is active — alerts will appear here if anomalies are
          detected.
        </p>
      </div>
    </div>
  );
}

// ─── Alert Item ────────────────────────────────────────────────────

function AlertItem({ alert }: { alert: ActiveAlert }) {
  return (
    <div
      className="flex items-start gap-2 px-2.5 py-2 rounded-[var(--signal-radius-sm)] border"
      style={{
        backgroundColor: severityBg(alert.severity),
        borderColor: "var(--signal-border-subtle)",
      }}
    >
      <span style={{ color: severityColor(alert.severity) }}>
        {severityIcon(alert.severity)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className="text-xs font-medium"
            style={{ color: severityColor(alert.severity) }}
          >
            {alert.alert_type}
          </span>
          <span
            className="text-[9px] uppercase font-semibold"
            style={{ color: severityColor(alert.severity) }}
          >
            {alert.severity}
          </span>
        </div>
        <p className="text-[10px] text-[var(--signal-fg-secondary)] mt-0.5 leading-relaxed">
          {alert.message}
        </p>
        <p className="text-[9px] text-[var(--signal-fg-tertiary)] mt-0.5 flex items-center gap-1">
          <Clock className="h-2.5 w-2.5" />
          {timeAgo(alert.detected_at)}
        </p>
      </div>
    </div>
  );
}

// ─── Correlation Item ──────────────────────────────────────────────

function CorrelationItem({
  correlation,
}: {
  correlation: RecentCorrelation;
}) {
  const scorePct = Math.round(correlation.correlation_score * 100);

  return (
    <div className="flex items-center gap-2 py-1.5 text-xs">
      <GitBranch className="h-3.5 w-3.5 shrink-0 text-[var(--signal-fg-tertiary)]" />
      <div className="min-w-0 flex-1">
        <span className="text-[var(--signal-fg-primary)] font-medium">
          {correlation.flag_key}
        </span>
      </div>
      <span
        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0"
        style={{
          backgroundColor:
            scorePct >= 70
              ? "var(--signal-bg-danger-muted)"
              : scorePct >= 40
                ? "var(--signal-bg-warning-muted)"
                : "var(--signal-bg-secondary)",
          color:
            scorePct >= 70
              ? "var(--signal-fg-danger)"
              : scorePct >= 40
                ? "var(--signal-fg-warning)"
                : "var(--signal-fg-tertiary)",
        }}
      >
        {scorePct}%
      </span>
      <span className="text-[10px] text-[var(--signal-fg-tertiary)]">
        {timeAgo(correlation.correlated_at)}
      </span>
      {correlation.was_remediated && (
        <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-[var(--signal-fg-success)] shrink-0">
          <CheckCircle2 className="h-2.5 w-2.5" />
          Fixed
        </span>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export function IncidentPanel({
  flagKey,
  flagName,
  stage,
  environment,
}: IncidentPanelProps) {
  const token = useAppStore((s) => s.token);

  const [monitor, setMonitor] = useState<MonitorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remediating, setRemediating] = useState(false);

  // ── Fetch monitor data ───────────────────────────────────────────

  const fetchMonitor = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const result = await api.incident.getMonitor(token, flagKey);
      setMonitor(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load monitoring data",
      );
    } finally {
      setLoading(false);
    }
  }, [token, flagKey]);

  useEffect(() => {
    fetchMonitor();
  }, [fetchMonitor]);

  // ── Remediate ────────────────────────────────────────────────────

  const handleRemediate = useCallback(async () => {
    if (!token) return;
    setRemediating(true);
    try {
      const result = await api.incident.remediate(token, {
        flag_key: flagKey,
        env_id: environment,
        action: "rollback",
        reason: `Manual remediation for ${flagName}`,
      });
      // Refresh after remediation
      await fetchMonitor();
      // Show result briefly via console (in production this would be a toast)
      if (result.status === "applied") {
        setMonitor((prev) =>
          prev
            ? {
                ...prev,
                overall_health: "healthy",
              }
            : null,
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Remediation failed",
      );
    } finally {
      setRemediating(false);
    }
  }, [token, flagKey, environment, flagName, fetchMonitor]);

  // ── Render ──────────────────────────────────────────────────────

  const hasAlerts = monitor && monitor.active_alerts.length > 0;
  const hasCorrelations = monitor && monitor.recent_correlations.length > 0;
  const isQuiet = monitor && !hasAlerts && !hasCorrelations;

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <IncidentSkeleton key="skeleton" />
      ) : error ? (
        <IncidentError key="error" message={error} onRetry={fetchMonitor} />
      ) : !monitor ? (
        <NoIncidents key="empty" />
      ) : isQuiet ? (
        <NoIncidents key="quiet" />
      ) : (
        <motion.div
          key="monitor"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="border-t border-[var(--signal-border-subtle)]"
        >
          <div className="px-4 py-3 space-y-3">
            {/* ── Health Status Banner ────────────────────────────── */}
            <div
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--signal-radius-sm)]"
              style={{ backgroundColor: healthBg(monitor.overall_health) }}
            >
              <span style={{ color: healthColor(monitor.overall_health) }}>
                {healthIcon(monitor.overall_health)}
              </span>
              <div className="min-w-0">
                <p
                  className="text-xs font-semibold capitalize"
                  style={{ color: healthColor(monitor.overall_health) }}
                >
                  {monitor.overall_health}
                </p>
                <p className="text-[10px] text-[var(--signal-fg-secondary)]">
                  {monitor.flags_under_monitoring} flag
                  {monitor.flags_under_monitoring !== 1 ? "s" : ""} under
                  monitoring
                </p>
              </div>
            </div>

            {/* ── Active Alerts ──────────────────────────────────── */}
            {hasAlerts && (
              <div>
                <SectionHeader icon={Siren} title="Active Alerts" />
                <div className="space-y-1.5">
                  {monitor.active_alerts.slice(0, 5).map((alert, i) => (
                    <AlertItem key={i} alert={alert} />
                  ))}
                </div>
              </div>
            )}

            {/* ── Correlated Flags ───────────────────────────────── */}
            {hasCorrelations && (
              <div>
                <SectionHeader icon={GitBranch} title="Correlated Changes" />
                <div className="divide-y divide-[var(--signal-border-subtle)]">
                  {monitor.recent_correlations.slice(0, 5).map((corr) => (
                    <CorrelationItem key={corr.correlation_id} correlation={corr} />
                  ))}
                </div>
              </div>
            )}

            {/* ── Remediation Action ─────────────────────────────── */}
            {monitor.overall_health !== "healthy" && (
              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="danger"
                  size="xs"
                  fullWidth
                  onClick={handleRemediate}
                  loading={remediating}
                >
                  <Undo2 className="h-3 w-3" />
                  Rollback {flagName}
                </Button>
              </div>
            )}

            {/* ── Stage-specific context ─────────────────────────── */}
            {stage === "decide" && monitor.overall_health === "healthy" && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--signal-radius-sm)] bg-[var(--signal-bg-accent-muted)]">
                <Zap className="h-3.5 w-3.5 shrink-0 text-[var(--signal-fg-accent)]" />
                <p className="text-[10px] text-[var(--signal-fg-secondary)] leading-relaxed">
                  Feature is healthy. Time to decide: keep, rollback, or retire.
                </p>
              </div>
            )}

            {stage === "monitor" && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 shrink-0 text-[var(--signal-fg-tertiary)]" />
                <span className="text-[10px] text-[var(--signal-fg-tertiary)]">
                  Monitoring active — anomalies will be detected automatically
                </span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
