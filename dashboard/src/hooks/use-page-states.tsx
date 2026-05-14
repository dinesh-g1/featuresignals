"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { WifiOff, RefreshCw, Clock, Shield, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PageStateOptions {
  /** Callback to refresh/fetch data */
  onRefresh: () => void;
  /** Whether the page currently has data (used to decide full-page vs banner) */
  hasData: boolean;
  /** Timeout before data is considered stale (default: 60_000ms) */
  staleTimeoutMs?: number;
  /** Custom title for the forbidden state */
  forbiddenTitle?: string;
  /** Custom description for the forbidden state */
  forbiddenDescription?: string;
  /** Custom title for the rate-limited state */
  rateLimitTitle?: string;
}

export interface PageStates {
  // ─── State flags ──────────────────────────────────────────────────────
  isStale: boolean;
  setIsStale: (v: boolean) => void;
  rateLimitRetryAfter: number | null;
  setRateLimitRetryAfter: (v: number | null) => void;
  isForbidden: boolean;
  setIsForbidden: (v: boolean) => void;
  isOffline: boolean;
  setIsOffline: (v: boolean) => void;

  // ─── Actions ──────────────────────────────────────────────────────────
  /** Reset all error state flags before a fresh fetch */
  resetErrors: () => void;
  /** Classify a caught fetch error into the appropriate state flags */
  classifyError: (err: unknown) => void;
  /** Mark data as fresh (clears stale flag) */
  markFresh: () => void;

  // ─── Banner components (null when not active) ─────────────────────────
  OfflineBanner: ReactNode;
  StaleBanner: ReactNode;

  // ─── Full-page state components (null when not active) ────────────────
  ForbiddenState: ReactNode;
  RateLimitedState: ReactNode;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function usePageStates(options: PageStateOptions): PageStates {
  const {
    onRefresh,
    hasData,
    staleTimeoutMs = 60_000,
    forbiddenTitle = "Access Denied",
    forbiddenDescription = "You don't have permission to view this page. Contact your administrator if you need access.",
    rateLimitTitle = "Too Many Requests",
  } = options;

  const [isStale, setIsStale] = useState(false);
  const [rateLimitRetryAfter, setRateLimitRetryAfter] = useState<number | null>(
    null
  );
  const [isForbidden, setIsForbidden] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // ─── Stale data timer ─────────────────────────────────────────────────
  useEffect(() => {
    if (!hasData) return;
    const timer = setTimeout(() => setIsStale(true), staleTimeoutMs);
    return () => clearTimeout(timer);
  }, [hasData, staleTimeoutMs]);

  // ─── Rate limit countdown timer ───────────────────────────────────────
  useEffect(() => {
    if (rateLimitRetryAfter === null || rateLimitRetryAfter <= 0) return;
    const timer = setInterval(() => {
      setRateLimitRetryAfter((prev) => {
        if (prev === null || prev <= 1) return null;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [rateLimitRetryAfter]);

  // ─── Actions ──────────────────────────────────────────────────────────
  const resetErrors = useCallback(() => {
    setIsForbidden(false);
    setRateLimitRetryAfter(null);
    setIsOffline(false);
  }, []);

  const classifyError = useCallback((err: unknown) => {
    if (err instanceof Error) {
      const msg = err.message;
      if (msg.includes("429") || msg.includes("Too many requests")) {
        setRateLimitRetryAfter(60);
      } else if (
        msg.includes("403") ||
        msg.includes("permission") ||
        msg.includes("Forbidden")
      ) {
        setIsForbidden(true);
      } else if (
        msg.includes("offline") ||
        msg.includes("network") ||
        msg.includes("fetch") ||
        msg.includes("Failed to fetch")
      ) {
        setIsOffline(true);
      }
    }
  }, []);

  const markFresh = useCallback(() => {
    setIsStale(false);
  }, []);

  // ─── Offline Banner ───────────────────────────────────────────────────
  const OfflineBanner = isOffline ? (
    <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-[var(--signal-border-warning-muted)] bg-[var(--signal-bg-warning-muted)] px-4 py-2 text-sm text-[var(--signal-fg-warning)]">
      <WifiOff className="h-4 w-4 flex-shrink-0" />
      <span>Disconnected. Data may be outdated.</span>
      <Button
        variant="ghost"
        size="xs"
        onClick={onRefresh}
        className="ml-auto"
      >
        Reconnect
      </Button>
    </div>
  ) : null;

  // ─── Stale Data Banner ────────────────────────────────────────────────
  const StaleBanner =
    isStale && !isOffline ? (
      <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-[var(--signal-border-accent-muted)] bg-[var(--signal-bg-accent-muted)] px-4 py-2 text-sm text-[var(--signal-fg-accent)]">
        <Clock className="h-4 w-4 flex-shrink-0" />
        <span>Data may be stale.</span>
        <Button
          variant="ghost"
          size="xs"
          onClick={onRefresh}
          className="ml-auto"
        >
          <RefreshCw className="mr-1 h-3 w-3" />
          Refresh
        </Button>
      </div>
    ) : null;

  // ─── Forbidden Full-Page State ────────────────────────────────────────
  const ForbiddenState = isForbidden ? (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--signal-bg-warning-muted)] ring-1 ring-[var(--signal-border-warning-muted)]">
        <Shield className="h-7 w-7 text-[var(--signal-fg-warning)]" />
      </div>
      <h1 className="mt-5 text-xl font-semibold text-[var(--signal-fg-primary)]">
        {forbiddenTitle}
      </h1>
      <p className="mt-2 max-w-md text-sm text-[var(--signal-fg-secondary)]">
        {forbiddenDescription}
      </p>
    </div>
  ) : null;

  // ─── Rate-Limited Full-Page State ─────────────────────────────────────
  const RateLimitedState =
    rateLimitRetryAfter !== null && !hasData ? (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--signal-bg-warning-muted)] ring-1 ring-[var(--signal-border-warning-muted)]">
          <AlertTriangle className="h-7 w-7 text-[var(--signal-fg-warning)]" />
        </div>
        <h1 className="mt-5 text-xl font-semibold text-[var(--signal-fg-primary)]">
          {rateLimitTitle}
        </h1>
        <p className="mt-2 max-w-md text-sm text-[var(--signal-fg-secondary)]">
          Please wait {rateLimitRetryAfter} seconds before trying again.
        </p>
        <Button
          onClick={onRefresh}
          variant="secondary"
          className="mt-4"
          disabled={rateLimitRetryAfter > 0}
        >
          {rateLimitRetryAfter > 0
            ? `Retry in ${rateLimitRetryAfter}s`
            : "Retry Now"}
        </Button>
      </div>
    ) : null;

  return {
    isStale,
    setIsStale,
    rateLimitRetryAfter,
    setRateLimitRetryAfter,
    isForbidden,
    setIsForbidden,
    isOffline,
    setIsOffline,
    resetErrors,
    classifyError,
    markFresh,
    OfflineBanner,
    StaleBanner,
    ForbiddenState,
    RateLimitedState,
  };
}
