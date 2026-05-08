"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { cn, timeAgo } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  LoadingSpinner,
  EmptyState,
} from "@/components/ui";
import {
  ActivityIcon,
  CheckIcon,
  AlertTriangleIcon,
  GlobeIcon,
  ZapIcon,
  RefreshCwIcon,
} from "lucide-react";
import type { Environment } from "@/lib/types";

// ─── Types ──────────────────────────────────────────────────────────

type SDKStatus = "connected" | "disconnected" | "never-connected";

interface EnvironmentSDKHealth {
  environment: Environment;
  status: SDKStatus;
  lastSeen: string | null;
  evalCount: number;
}

// ─── Helpers ────────────────────────────────────────────────────────

function statusLabel(s: SDKStatus): string {
  switch (s) {
    case "connected":
      return "Connected";
    case "disconnected":
      return "Disconnected";
    case "never-connected":
      return "No activity";
  }
}

function statusDotClass(s: SDKStatus): string {
  switch (s) {
    case "connected":
      return "bg-emerald-500 ring-emerald-200";
    case "disconnected":
      return "bg-amber-500 ring-amber-200";
    case "never-connected":
      return "bg-gray-300 ring-gray-200";
  }
}

function statusBadgeVariant(s: SDKStatus): "success" | "warning" | "default" {
  if (s === "connected") return "success";
  if (s === "disconnected") return "warning";
  return "default";
}

// ─── Main Component ─────────────────────────────────────────────────

export function SDKHealth() {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const [envHealth, setEnvHealth] = useState<EnvironmentSDKHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    envId: string;
    success: boolean;
    message: string;
  } | null>(null);

  const fetchData = useCallback(async () => {
    if (!token || !projectId) return;
    setLoading(true);
    setError(null);
    try {
      const envs = await api.listEnvironments(token, projectId);

      // Get global eval metrics to determine SDK connectivity
      let metrics: { total_evaluations: number; window_start: string } | null =
        null;
      try {
        metrics = await api.getEvalMetrics(token);
      } catch {
        // metrics unavailable — not critical
      }

      const totalEvals = metrics?.total_evaluations ?? 0;
      const lastSeen = metrics?.window_start ?? null;

      const health = envs.map((env: Environment) => {
        if (totalEvals > 0) {
          return {
            environment: env,
            status: "connected" as SDKStatus,
            lastSeen,
            evalCount: totalEvals,
          };
        }
        return {
          environment: env,
          status: "never-connected" as SDKStatus,
          lastSeen: null,
          evalCount: 0,
        };
      });

      setEnvHealth(health);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load SDK health",
      );
    } finally {
      setLoading(false);
    }
  }, [token, projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTestConnection = async (envId: string) => {
    if (!token || !projectId) return;
    setTestingId(envId);
    setTestResult(null);
    try {
      // Use the inspect target API to test connectivity
      await api.inspectTarget(token, projectId, envId, {
        key: `__health_check_${Date.now()}`,
        attributes: { _health_check: true },
      });
      setTestResult({
        envId,
        success: true,
        message: "Connection successful — SDK can evaluate flags",
      });
    } catch (err) {
      setTestResult({
        envId,
        success: false,
        message: err instanceof Error ? err.message : "Connection failed",
      });
    } finally {
      setTestingId(null);
    }
  };

  // ─── Compute overall status ───────────────────────────────────────

  const overallStatus: SDKStatus = envHealth.some(
    (e) => e.status === "disconnected",
  )
    ? "disconnected"
    : envHealth.every((e) => e.status === "never-connected")
      ? "never-connected"
      : "connected";

  // ─── Loading State ────────────────────────────────────────────────

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ActivityIcon className="h-4 w-4 text-[var(--signal-fg-secondary)]" />
            SDK Connectivity
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── Error State ──────────────────────────────────────────────────

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ActivityIcon className="h-4 w-4 text-[var(--signal-fg-secondary)]" />
            SDK Connectivity
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8">
          <EmptyState
            icon={AlertTriangleIcon}
            title="Failed to load SDK health"
            description={error}
            action={
              <Button onClick={fetchData} variant="secondary" size="sm">
                Retry
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  // ─── Empty State ──────────────────────────────────────────────────

  if (envHealth.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ActivityIcon className="h-4 w-4 text-[var(--signal-fg-secondary)]" />
            SDK Connectivity
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8">
          <EmptyState
            icon={GlobeIcon}
            title="No environments configured"
            description="Create an environment and connect an SDK to start monitoring connectivity."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ActivityIcon className="h-4 w-4 text-[var(--signal-fg-secondary)]" />
            SDK Connectivity
          </CardTitle>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-block h-2.5 w-2.5 rounded-full ring-2",
                statusDotClass(overallStatus),
              )}
              aria-hidden="true"
            />
            <Badge variant={statusBadgeVariant(overallStatus)}>
              {statusLabel(overallStatus)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 p-0">
        {envHealth.map((e) => (
          <div
            key={e.environment.id}
            className="flex items-center gap-3 px-4 py-3 sm:px-6"
          >
            {/* Status dot */}
            <span
              className={cn(
                "inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-2",
                statusDotClass(e.status),
              )}
              aria-label={statusLabel(e.status)}
            />

            {/* Environment info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-[var(--signal-fg-primary)]">
                  {e.environment.name}
                </p>
                <span
                  className="h-3 w-3 rounded-sm shrink-0"
                  style={{ backgroundColor: e.environment.color || "#6b7280" }}
                  aria-hidden="true"
                />
              </div>
              <p className="text-xs text-[var(--signal-fg-secondary)]">
                {e.status === "connected" && e.lastSeen
                  ? `Last seen ${timeAgo(e.lastSeen)} · ${e.evalCount.toLocaleString()} evaluations`
                  : e.status === "disconnected"
                    ? e.lastSeen
                      ? `Not seen for ${timeAgo(e.lastSeen)}`
                      : "No recent activity"
                    : "No SDK activity yet"}
              </p>
            </div>

            {/* Test connection button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleTestConnection(e.environment.id)}
              disabled={testingId === e.environment.id}
              className="shrink-0 text-xs"
              aria-label={`Test connection for ${e.environment.name}`}
            >
              {testingId === e.environment.id ? (
                <>
                  <LoadingSpinner size="sm" className="mr-1 h-3 w-3" />
                  Testing...
                </>
              ) : (
                <>
                  <ZapIcon className="mr-1 h-3 w-3" />
                  Test Connection
                </>
              )}
            </Button>
          </div>
        ))}

        {/* Test result feedback */}
        {testResult && (
          <div className="px-4 pb-3 sm:px-6">
            <div
              className={cn(
                "rounded-md px-3 py-2 text-sm",
                testResult.success
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-[var(--signal-bg-danger-muted)] text-[var(--signal-fg-danger)] border border-[var(--signal-border-danger-emphasis)]/20",
              )}
            >
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckIcon className="h-3.5 w-3.5" />
                ) : (
                  <AlertTriangleIcon className="h-3.5 w-3.5" />
                )}
                <span>{testResult.message}</span>
              </div>
            </div>
          </div>
        )}

        {/* Refresh */}
        <div className="flex justify-end px-4 pb-4">
          <Button variant="ghost" size="sm" onClick={fetchData}>
            <RefreshCwIcon className="mr-1 h-3 w-3" />
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
