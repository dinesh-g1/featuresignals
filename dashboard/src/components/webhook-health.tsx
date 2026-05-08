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
  WebhookIcon,
  CheckIcon,
  XIcon,
  AlertTriangleIcon,
  LoaderIcon,
  PauseIcon,
  ExternalLinkIcon,
} from "lucide-react";
import type { Webhook, WebhookDelivery } from "@/lib/types";

// ─── Types ──────────────────────────────────────────────────────────

type HealthStatus = "healthy" | "degraded" | "failing" | "disabled" | "none";

interface WebhookWithHealth {
  webhook: Webhook;
  deliveries: WebhookDelivery[];
  recentFailures: number;
  lastError: string | null;
  status: HealthStatus;
}

// ─── Helpers ────────────────────────────────────────────────────────

function computeStatus(
  webhook: Webhook,
  deliveries: WebhookDelivery[],
): HealthStatus {
  if (!webhook.enabled) return "disabled";

  if (deliveries.length === 0) return "healthy";

  // Count failures in the last hour
  const oneHourAgo = Date.now() - 3600000;
  const recentDeliveries = deliveries.filter(
    (d) => new Date(d.delivered_at).getTime() > oneHourAgo,
  );
  const recentFailures = recentDeliveries.filter((d) => !d.success).length;

  if (recentFailures >= 5) return "failing";
  if (recentFailures >= 3) return "degraded";
  return "healthy";
}

function getLastError(deliveries: WebhookDelivery[]): string | null {
  const failed = deliveries.find((d) => !d.success);
  if (!failed) return null;
  if (failed.response_body) {
    try {
      const body = JSON.parse(failed.response_body);
      return body.error || body.message || `HTTP ${failed.response_status}`;
    } catch {
      return `HTTP ${failed.response_status}`;
    }
  }
  return `HTTP ${failed.response_status}`;
}

function statusLabel(status: HealthStatus): string {
  switch (status) {
    case "healthy":
      return "All healthy";
    case "degraded":
      return "Some failures";
    case "failing":
      return "Failing";
    case "disabled":
      return "Disabled";
    case "none":
      return "No webhooks";
  }
}

function statusDotClass(status: HealthStatus): string {
  switch (status) {
    case "healthy":
      return "bg-emerald-500 ring-emerald-200";
    case "degraded":
      return "bg-amber-500 ring-amber-200";
    case "failing":
      return "bg-red-500 ring-red-200";
    case "disabled":
      return "bg-gray-400 ring-gray-200";
    case "none":
      return "bg-gray-300 ring-gray-200";
  }
}

function statusBadgeVariant(
  status: HealthStatus,
): "success" | "warning" | "danger" | "default" {
  if (status === "healthy") return "success";
  if (status === "degraded") return "warning";
  if (status === "failing") return "danger";
  return "default";
}

// ─── Sub-components ─────────────────────────────────────────────────

function DeliveryStatusIcon({
  success,
  pending,
}: {
  success: boolean;
  pending?: boolean;
}) {
  if (pending) {
    return (
      <LoaderIcon
        className="h-4 w-4 animate-spin text-[var(--signal-fg-secondary)]"
        aria-label="Pending"
      />
    );
  }
  if (success) {
    return (
      <CheckIcon className="h-4 w-4 text-emerald-500" aria-label="Success" />
    );
  }
  return <XIcon className="h-4 w-4 text-red-500" aria-label="Failed" />;
}

function FailureAlertBanner({
  webhook,
  failureCount,
  lastError,
  onPause,
  onDismiss,
  pausing,
}: {
  webhook: Webhook;
  failureCount: number;
  lastError: string | null;
  onPause: () => void;
  onDismiss: () => void;
  pausing: boolean;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3",
        "bg-[var(--signal-bg-warning-muted)] border-[var(--signal-border-warning-muted)]",
        "animate-slide-down",
      )}
    >
      <AlertTriangleIcon
        className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-amber-800">
          Webhook &ldquo;{webhook.name}&rdquo; has failed {failureCount} times
          in the last hour.
        </p>
        {lastError && (
          <p className="mt-0.5 text-xs text-amber-700">
            Last error: {lastError}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-2 py-1 text-xs"
          >
            <ExternalLinkIcon className="mr-1 h-3 w-3" />
            View details
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onPause}
            disabled={pausing}
            className="h-auto px-2 py-1 text-xs text-amber-700 hover:text-amber-800"
          >
            {pausing ? (
              <LoadingSpinner size="sm" className="mr-1 h-3 w-3" />
            ) : (
              <PauseIcon className="mr-1 h-3 w-3" />
            )}
            Pause webhook
          </Button>
          <button
            onClick={onDismiss}
            className="shrink-0 rounded-md p-1 text-amber-600 hover:bg-amber-100/50 hover:text-amber-700 transition-colors ml-auto"
            aria-label="Dismiss alert"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function WebhookHealth() {
  const token = useAppStore((s) => s.token);
  const [webhooks, setWebhooks] = useState<WebhookWithHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(
    new Set(),
  );
  const [pausingId, setPausingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const webhookList = await api.listWebhooks(token);

      // Fetch deliveries for each webhook in parallel
      const withHealth = await Promise.all(
        webhookList.map(async (webhook: Webhook) => {
          try {
            const deliveries = await api.listWebhookDeliveries(
              token,
              webhook.id,
            );
            const oneHourAgo = Date.now() - 3600000;
            const recentFailures = deliveries.filter(
              (d) =>
                !d.success && new Date(d.delivered_at).getTime() > oneHourAgo,
            ).length;
            return {
              webhook,
              deliveries: deliveries.slice(0, 10),
              recentFailures,
              lastError: getLastError(deliveries),
              status: computeStatus(webhook, deliveries),
            } as WebhookWithHealth;
          } catch {
            // If deliveries fetch fails, still show the webhook
            return {
              webhook,
              deliveries: [],
              recentFailures: 0,
              lastError: null,
              status: computeStatus(webhook, []),
            } as WebhookWithHealth;
          }
        }),
      );

      setWebhooks(withHealth);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load webhook health",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePause = async (webhookId: string) => {
    if (!token) return;
    setPausingId(webhookId);
    try {
      await api.updateWebhook(token, webhookId, { enabled: false });
      fetchData();
    } catch {
      // Silently fail — the banner stays visible
    } finally {
      setPausingId(null);
    }
  };

  const handleDismissAlert = (webhookId: string) => {
    setDismissedAlerts((prev) => {
      const next = new Set(prev);
      next.add(webhookId);
      return next;
    });
  };

  // ─── Loading State ────────────────────────────────────────────────

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <WebhookIcon className="h-4 w-4 text-[var(--signal-fg-secondary)]" />
            Webhook Health
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
            <WebhookIcon className="h-4 w-4 text-[var(--signal-fg-secondary)]" />
            Webhook Health
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8">
          <EmptyState
            icon={AlertTriangleIcon}
            title="Failed to load webhook health"
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

  if (webhooks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <WebhookIcon className="h-4 w-4 text-[var(--signal-fg-secondary)]" />
            Webhook Health
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8">
          <EmptyState
            icon={WebhookIcon}
            title="No webhooks configured"
            description="Add webhooks to get notified about flag changes and evaluation events."
          />
        </CardContent>
      </Card>
    );
  }

  // ─── Overall status ───────────────────────────────────────────────

  const overallStatus: HealthStatus = webhooks.some(
    (w) => w.status === "failing",
  )
    ? "failing"
    : webhooks.some((w) => w.status === "degraded")
      ? "degraded"
      : webhooks.every((w) => w.status === "disabled")
        ? "disabled"
        : "healthy";

  const failureAlerts = webhooks.filter(
    (w) => w.status === "failing" && !dismissedAlerts.has(w.webhook.id),
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <WebhookIcon className="h-4 w-4 text-[var(--signal-fg-secondary)]" />
              Webhook Health
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

        <CardContent className="space-y-4 p-0">
          {/* Failure alert banners */}
          {failureAlerts.map((w) => (
            <div key={w.webhook.id} className="px-4">
              <FailureAlertBanner
                webhook={w.webhook}
                failureCount={w.recentFailures}
                lastError={w.lastError}
                onPause={() => handlePause(w.webhook.id)}
                onDismiss={() => handleDismissAlert(w.webhook.id)}
                pausing={pausingId === w.webhook.id}
              />
            </div>
          ))}

          {/* Per-webhook delivery tables */}
          <div className="divide-y divide-[var(--signal-border-default)]">
            {webhooks.map((w) => (
              <div key={w.webhook.id} className="px-4 py-4 sm:px-6">
                {/* Webhook header */}
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className={cn(
                      "inline-block h-2 w-2 shrink-0 rounded-full ring-2",
                      statusDotClass(w.status),
                    )}
                    aria-label={`Status: ${statusLabel(w.status)}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--signal-fg-primary)] truncate">
                      {w.webhook.name}
                    </p>
                    <p className="text-xs text-[var(--signal-fg-secondary)] truncate">
                      {w.webhook.url}
                    </p>
                  </div>
                  <Badge
                    variant={statusBadgeVariant(w.status)}
                    className="shrink-0"
                  >
                    {statusLabel(w.status)}
                  </Badge>
                </div>

                {/* Recent deliveries */}
                {w.deliveries.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table
                      className="w-full text-xs"
                      aria-label={`Recent deliveries for ${w.webhook.name}`}
                    >
                      <thead>
                        <tr className="border-b border-[var(--signal-border-default)] text-[var(--signal-fg-tertiary)]">
                          <th className="py-1.5 pr-3 text-left font-medium">
                            Time
                          </th>
                          <th className="py-1.5 pr-3 text-left font-medium">
                            Event
                          </th>
                          <th className="py-1.5 pr-3 text-right font-medium">
                            Status
                          </th>
                          <th className="py-1.5 pr-3 text-right font-medium">
                            Response
                          </th>
                          <th className="py-1.5 text-center font-medium">
                            Result
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {w.deliveries.map((d) => (
                          <tr
                            key={d.id}
                            className="border-b border-[var(--signal-border-default)]/50 last:border-0"
                          >
                            <td className="py-1.5 pr-3 text-[var(--signal-fg-secondary)] whitespace-nowrap">
                              {timeAgo(d.delivered_at)}
                            </td>
                            <td className="py-1.5 pr-3 text-[var(--signal-fg-primary)] max-w-[120px] truncate">
                              {d.event_type}
                            </td>
                            <td className="py-1.5 pr-3 text-right font-mono">
                              <span
                                className={cn(
                                  d.response_status >= 200 &&
                                    d.response_status < 300
                                    ? "text-emerald-600"
                                    : "text-red-600",
                                )}
                              >
                                {d.response_status}
                              </span>
                            </td>
                            <td className="py-1.5 pr-3 text-right text-[var(--signal-fg-secondary)]">
                              {d.response_body
                                ? `${d.response_body.length} B`
                                : "—"}
                            </td>
                            <td className="py-1.5 text-center">
                              <div className="flex justify-center">
                                <DeliveryStatusIcon
                                  success={d.success}
                                  pending={
                                    d.attempt < d.max_attempts && !d.success
                                  }
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--signal-fg-secondary)] py-2">
                    No deliveries yet
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Refresh */}
          <div className="flex justify-end px-4 pb-4">
            <Button variant="ghost" size="sm" onClick={fetchData}>
              <LoaderIcon className="mr-1 h-3 w-3" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
