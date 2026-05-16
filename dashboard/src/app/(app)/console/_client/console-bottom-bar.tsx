"use client";

/**
 * ConsoleBottomBar — 32px status bar at the bottom of the Console.
 *
 * Layout: flex, items-center, justify-between, text-xs, tertiary color.
 * - Left:   "Last updated: {relative time}" — uses timeAgo() from utils
 * - Center: "{featureCount} features flowing"
 * - Right:  Connection status dot + label (green "Live" / amber "Reconnecting...")
 *
 * Reads lastUpdated, wsConnected, and features.length from useConsoleStore.
 * Signal UI tokens only. No hardcoded colors.
 */

import { useMemo, useCallback } from "react";
import { useConsoleStore } from "@/stores/console-store";
import { timeAgo, cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

export function ConsoleBottomBar() {
  const lastUpdated = useConsoleStore((s) => s.lastUpdated);
  const wsConnected = useConsoleStore((s) => s.wsConnected);
  const wsOffline = useConsoleStore((s) => s.wsOffline);
  const featureCount = useConsoleStore((s) => s.features.length);
  const triggerWsRetry = useConsoleStore((s) => s.triggerWsRetry);

  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdated) return "just now";
    return timeAgo(lastUpdated);
  }, [lastUpdated]);

  const handleRetry = useCallback(() => {
    triggerWsRetry();
  }, [triggerWsRetry]);

  // Connection status: connected → green "Live"
  //                    offline   → red "Offline" + Retry button
  //                    else      → amber pulsing "Connecting..."
  const connectionLabel = wsConnected
    ? "Live"
    : wsOffline
      ? "Offline"
      : "Connecting...";

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
      {/* ── Left: Last Updated ──────────────────────────────────────── */}
      <span className="shrink-0">
        Last updated:{" "}
        <time
          dateTime={lastUpdated ?? undefined}
          className="text-[var(--signal-fg-secondary)]"
        >
          {lastUpdatedLabel}
        </time>
      </span>

      {/* ── Center: Feature Count ───────────────────────────────────── */}
      <span className="shrink-0 text-center">
        <span className="font-medium text-[var(--signal-fg-secondary)]">
          {featureCount}
        </span>{" "}
        feature{featureCount !== 1 ? "s" : ""} flowing
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
