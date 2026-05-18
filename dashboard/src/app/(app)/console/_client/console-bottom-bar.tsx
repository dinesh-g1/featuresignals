"use client";

/**
 * ConsoleBottomBar — 32px status bar at the bottom of the Console.
 *
 * Layout: flex, items-center, justify-between, text-xs, tertiary color.
 * - Left:   Setup progress indicator (when not complete) or "Last updated: {relative time}"
 * - Center: "{featureCount} features flowing"
 * - Right:  Connection status dot + label (green "Live" / amber "Reconnecting...")
 *
 * Reads lastUpdated, wsConnected, features.length, and setup progress.
 * Signal UI tokens only. No hardcoded colors.
 */

import { useMemo, useCallback } from "react";
import { useConsoleStore } from "@/stores/console-store";
import { useConsoleSetupProgress } from "@/hooks/use-console-setup-progress";
import { useConsoleFeatures } from "@/hooks/use-console-data";
import { timeAgo, cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

export function ConsoleBottomBar() {
  const wsConnected = useConsoleStore((s) => s.wsConnected);
  const wsOffline = useConsoleStore((s) => s.wsOffline);
  const triggerWsRetry = useConsoleStore((s) => s.triggerWsRetry);
  const triggerRetry = useConsoleStore((s) => s.triggerRetry);
  const { data: featuresData, dataUpdatedAt } = useConsoleFeatures();
  const featuresTotal = featuresData?.total ?? 0;
  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toISOString()
    : null;
  const progress = useConsoleSetupProgress();

  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdated) return "just now";
    return timeAgo(lastUpdated);
  }, [lastUpdated]);

  const handleRetry = useCallback(() => {
    triggerWsRetry();
    triggerRetry();
  }, [triggerWsRetry, triggerRetry]);

  // Connection status: connected → green "Live"
  //                    offline   → red "Offline" + Retry button
  //                    else      → amber pulsing "Connecting..."
  const connectionLabel = wsConnected
    ? "Live"
    : wsOffline
      ? "Offline"
      : "Connecting...";

  const setupComplete = progress.phase === "complete";

  return (
    <footer
      className={cn(
        "flex h-full items-center justify-between px-4",
        "text-xs text-[var(--signal-fg-tertiary)]",
        "border-t border-[var(--signal-border-subtle)]",
        "bg-[var(--signal-bg-primary)]",
        "select-none",
      )}
    >
      {/* ── Left: Setup Progress or Last Updated ───────────────────── */}
      <span className="shrink-0 inline-flex items-center gap-2">
        {setupComplete ? (
          <>
            Last updated:{" "}
            <time
              dateTime={lastUpdated ?? undefined}
              className="text-[var(--signal-fg-secondary)]"
            >
              {lastUpdatedLabel}
            </time>
          </>
        ) : (
          <>
            <span className="text-[var(--signal-fg-tertiary)]">
              Setup{" "}
              <span className="font-medium text-[var(--signal-fg-secondary)] tabular-nums">
                {progress.completedSteps}/{progress.totalSteps}
              </span>
            </span>
            {/* Subtle progress bar */}
            <span
              className="inline-block h-1 rounded-full bg-[var(--signal-bg-secondary)] overflow-hidden"
              style={{ width: 60 }}
              role="progressbar"
              aria-valuenow={progress.completedSteps}
              aria-valuemin={0}
              aria-valuemax={progress.totalSteps}
              aria-label={`Setup progress: ${progress.completedSteps} of ${progress.totalSteps} steps complete`}
            >
              <span
                className="block h-full rounded-full bg-[var(--signal-bg-accent-emphasis)] transition-all duration-[var(--signal-duration-normal)]"
                style={{
                  width: `${(progress.completedSteps / progress.totalSteps) * 100}%`,
                }}
              />
            </span>
          </>
        )}
      </span>

      {/* ── Center: Feature Count ───────────────────────────────────── */}
      <span className="shrink-0 text-center">
        <span className="font-medium text-[var(--signal-fg-secondary)]">
          {featuresTotal}
        </span>{" "}
        feature{featuresTotal !== 1 ? "s" : ""} flowing
      </span>

      {/* ── Right: Connection Status ────────────────────────────────── */}
      <span className="inline-flex items-center gap-1.5 shrink-0">
        {/* Status dot */}
        <span
          className={cn(
            "inline-block h-1.5 w-1.5 rounded-full",
            wsConnected && "bg-[var(--signal-bg-success-emphasis)]",
            wsOffline && "bg-[var(--signal-bg-danger-emphasis)]",
            !wsConnected &&
              !wsOffline &&
              "bg-[var(--signal-bg-warning-emphasis)] animate-pulse",
          )}
          style={{
            boxShadow: wsConnected
              ? "0 0 4px var(--signal-bg-success-emphasis)"
              : wsOffline
                ? "0 0 4px var(--signal-bg-danger-emphasis)"
                : "0 0 4px var(--signal-bg-warning-emphasis)",
          }}
          aria-hidden="true"
        />
        <span
          className={cn(
            wsConnected && "text-[var(--signal-fg-success)]",
            wsOffline && "text-[var(--signal-fg-danger)]",
            !wsConnected && !wsOffline && "text-[var(--signal-fg-warning)]",
          )}
        >
          {connectionLabel}
        </span>

        {/* Retry button — only visible when offline */}
        {wsOffline && (
          <button
            type="button"
            onClick={handleRetry}
            className={cn(
              "inline-flex items-center gap-1 ml-1",
              "px-1.5 py-0.5 rounded-sm",
              "text-[11px] font-medium",
              "text-[var(--signal-fg-accent)]",
              "hover:bg-[var(--signal-bg-accent-muted)]",
              "active:bg-[var(--signal-bg-accent-emphasis)] active:text-[var(--signal-fg-on-emphasis)]",
              "transition-colors duration-[var(--signal-duration-fast)]",
              "border border-[var(--signal-border-accent-muted)]",
            )}
            aria-label="Retry WebSocket connection"
          >
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            Retry
          </button>
        )}
      </span>
    </footer>
  );
}
