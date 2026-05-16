"use client";

/**
 * JanitorPanel — Shows stale flag management when a feature is in
 * "learn" stage. Displays janitor stats, stale flags list, and actions
 * to dismiss flags or generate cleanup PRs.
 *
 * Fetches from api.listStaleFlags and api.getJanitorStats.
 *
 * States: loading (skeleton), error (retry), empty (no stale flags), success.
 *
 * Signal UI tokens only. Zero hardcoded hex colors.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  GitPullRequest,
  RefreshCw,
  Sparkles,
  Archive,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { api, type StaleFlag, type JanitorStats } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────

interface JanitorPanelProps {
  flagKey?: string;
  environment: string;
}

// ─── Helpers ────────────────────────────────────────────────────────

function daysAgo(isoInput: string): number {
  return Math.ceil((Date.now() - new Date(isoInput).getTime()) / 86400000);
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

function JanitorSkeleton() {
  return (
    <div className="border-t border-[var(--signal-border-subtle)] animate-pulse">
      <div className="px-4 py-3 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="h-16 rounded-[var(--signal-radius-sm)] bg-[var(--signal-border-default)]" />
          <div className="h-16 rounded-[var(--signal-radius-sm)] bg-[var(--signal-border-default)]" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-20 rounded bg-[var(--signal-border-default)]" />
          <div className="h-10 w-full rounded bg-[var(--signal-border-default)]" />
          <div className="h-10 w-full rounded bg-[var(--signal-border-default)]" />
        </div>
      </div>
    </div>
  );
}

// ─── Error ───────────────────────────────────────────────────────────

function JanitorError({
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

// ─── Empty ───────────────────────────────────────────────────────────

function JanitorEmpty() {
  return (
    <div className="border-t border-[var(--signal-border-subtle)]">
      <div className="px-4 py-4 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--signal-bg-success-muted)] ring-1 ring-[var(--signal-border-success-muted)] shadow-sm mb-2">
          <CheckCircle2 className="h-5 w-5 text-[var(--signal-fg-success)]" />
        </div>
        <p className="text-xs text-[var(--signal-fg-secondary)] leading-relaxed">
          No stale flags detected. Your codebase is clean!
        </p>
        <p className="text-[10px] text-[var(--signal-fg-tertiary)] mt-1">
          The janitor runs automatically to detect flags ready for cleanup.
        </p>
      </div>
    </div>
  );
}

// ─── Stale Flag Item ────────────────────────────────────────────────

function StaleFlagItem({
  staleFlag,
  onDismiss,
  onGeneratePR,
  dismissing,
  generating,
}: {
  staleFlag: StaleFlag;
  onDismiss: () => void;
  onGeneratePR: () => void;
  dismissing: boolean;
  generating: boolean;
}) {
  const daysStale = staleFlag.last_evaluated
    ? daysAgo(staleFlag.last_evaluated)
    : null;

  return (
    <div className="flex items-start gap-2 py-2 border-b border-[var(--signal-border-subtle)] last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-[var(--signal-fg-primary)] truncate">
            {staleFlag.key}
          </span>
          {daysStale !== null && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-[var(--signal-fg-warning)] shrink-0">
              <Clock className="h-2.5 w-2.5" />
              {daysStale}d stale
            </span>
          )}
        </div>
        <p className="text-[10px] text-[var(--signal-fg-secondary)] mt-0.5">
          {staleFlag.safe_to_remove ? "Safe to remove" : "Review needed"} ·{" "}
          {staleFlag.days_served}d served ·{" "}
          {(staleFlag.percentage_true * 100).toFixed(0)}% true
        </p>
        <div className="flex items-center gap-2 mt-1">
          <button
            type="button"
            onClick={onDismiss}
            disabled={dismissing}
            className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--signal-fg-tertiary)] hover:text-[var(--signal-fg-danger)] transition-colors disabled:opacity-50"
          >
            <Archive className="h-2.5 w-2.5" />
            Dismiss
          </button>
          <button
            type="button"
            onClick={onGeneratePR}
            disabled={generating}
            className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--signal-fg-accent)] hover:underline transition-colors disabled:opacity-50"
          >
            <GitPullRequest className="h-2.5 w-2.5" />
            Cleanup PR
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export function JanitorPanel({
  flagKey: _flagKey,
  environment: _environment,
}: JanitorPanelProps) {
  const token = useAppStore((s) => s.token);

  const [staleFlags, setStaleFlags] = useState<StaleFlag[]>([]);
  const [stats, setStats] = useState<JanitorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState<Set<string>>(new Set());

  // ── Fetch data ───────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const [flagsResult, statsResult] = await Promise.all([
        api.listStaleFlags(token, ""),
        api.getJanitorStats(token, ""),
      ]);
      setStaleFlags(flagsResult.data ?? []);
      setStats(statsResult);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load janitor data",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Dismiss flag ─────────────────────────────────────────────────

  const handleDismiss = useCallback(
    async (key: string) => {
      if (!token) return;
      setDismissing((prev) => new Set(prev).add(key));
      try {
        await api.dismissFlag(token, key);
        setStaleFlags((prev) => prev.filter((f) => f.key !== key));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to dismiss flag");
      } finally {
        setDismissing((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [token],
  );

  // ── Generate cleanup PR ──────────────────────────────────────────

  const handleGeneratePR = useCallback(
    async (key: string) => {
      if (!token) return;
      setGenerating((prev) => new Set(prev).add(key));
      try {
        await api.generateCleanupPR(token, key, "");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to generate cleanup PR",
        );
      } finally {
        setGenerating((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [token],
  );

  // ── Render ──────────────────────────────────────────────────────

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <JanitorSkeleton key="skeleton" />
      ) : error ? (
        <JanitorError key="error" message={error} onRetry={fetchData} />
      ) : staleFlags.length === 0 ? (
        <JanitorEmpty key="empty" />
      ) : (
        <motion.div
          key="janitor"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="border-t border-[var(--signal-border-subtle)]"
        >
          <div className="px-4 py-3 space-y-3">
            {/* ── Stats ──────────────────────────────────────────── */}
            {stats && (
              <div className="grid grid-cols-2 gap-2">
                <div
                  className="px-3 py-2.5 rounded-[var(--signal-radius-sm)] text-center"
                  style={{ backgroundColor: "var(--signal-bg-warning-muted)" }}
                >
                  <div className="text-lg font-bold font-mono tabular-nums text-[var(--signal-fg-warning)]">
                    {stats.stale_flags}
                  </div>
                  <p className="text-[9px] text-[var(--signal-fg-secondary)] mt-0.5 leading-tight">
                    Stale Flags
                  </p>
                </div>
                <div
                  className="px-3 py-2.5 rounded-[var(--signal-radius-sm)] text-center"
                  style={{ backgroundColor: "var(--signal-bg-success-muted)" }}
                >
                  <div className="text-lg font-bold font-mono tabular-nums text-[var(--signal-fg-success)]">
                    {stats.safe_to_remove}
                  </div>
                  <p className="text-[9px] text-[var(--signal-fg-secondary)] mt-0.5 leading-tight">
                    Safe to Remove
                  </p>
                </div>
              </div>
            )}

            {/* ── Stale Flags ────────────────────────────────────── */}
            <div>
              <SectionHeader icon={Trash2} title="Stale Flags" />
              <div>
                {staleFlags.slice(0, 10).map((sf) => (
                  <StaleFlagItem
                    key={sf.key}
                    staleFlag={sf}
                    onDismiss={() => handleDismiss(sf.key)}
                    onGeneratePR={() => handleGeneratePR(sf.key)}
                    dismissing={dismissing.has(sf.key)}
                    generating={generating.has(sf.key)}
                  />
                ))}
                {staleFlags.length > 10 && (
                  <p className="text-[10px] text-[var(--signal-fg-tertiary)] text-center pt-2">
                    +{staleFlags.length - 10} more stale flags
                  </p>
                )}
              </div>
            </div>

            {/* ── AI Insight ─────────────────────────────────────── */}
            <div
              className="flex items-start gap-2 px-3 py-2 rounded-[var(--signal-radius-sm)]"
              style={{ backgroundColor: "var(--signal-bg-info-muted)" }}
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[var(--signal-fg-info)]" />
              <p className="text-[10px] text-[var(--signal-fg-secondary)] leading-relaxed">
                Clearing {staleFlags.length} stale flags could reduce code
                complexity and improve build times. Consider addressing them in
                your next sprint.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
