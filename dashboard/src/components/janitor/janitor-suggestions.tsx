"use client";

import { useState } from "react";
import type { StaleFlag } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GracePeriodBadge } from "@/components/janitor/grace-period-badge";
import { Archive } from "lucide-react";
import {
  BrainIcon,
  CheckCircleFillIcon,
  ClockIcon,
  XIcon,
  SparklesIcon,
} from "@/components/icons/nav-icons";
import { EmptyState } from "@/components/ui/empty-state";

// ─── Types ──────────────────────────────────────────────────────────

export type SuggestedAction = "archive" | "delete";

export interface JanitorSuggestion {
  flag: StaleFlag;
  reasoning: string;
  suggestedAction: SuggestedAction;
  gracePeriodDays: number; // days remaining before flag is automatically flagged for cleanup
}

// ─── Helpers ────────────────────────────────────────────────────────

function deriveSuggestions(flags: StaleFlag[]): JanitorSuggestion[] {
  return flags
    .filter((f) => !f.dismissed && f.safe_to_remove)
    .map((f) => {
      const daysAtFull = f.days_served;
      const percentage = f.percentage_true;

      // Build human-readable reasoning
      let reasoning: string;
      if (percentage >= 100) {
        reasoning = `This flag has served 100% TRUE for ${daysAtFull} day${daysAtFull > 1 ? "s" : ""}`;
      } else if (percentage <= 0) {
        reasoning = `This flag has served 0% FALSE for ${daysAtFull} day${daysAtFull > 1 ? "s" : ""}`;
      } else if (percentage >= 90) {
        reasoning = `This flag has served ${percentage}% TRUE for ${daysAtFull} day${daysAtFull > 1 ? "s" : ""}`;
      } else {
        reasoning = `This flag has been evaluated at ${percentage}% TRUE for ${daysAtFull} day${daysAtFull > 1 ? "s" : ""}`;
      }

      // Deterministic grace period: 14 days, counting down from first detection
      // If days_served > 60, grace period is nearly over
      const staleThreshold = 60; // days after which a flag is considered stale
      const graceWindow = 14; // days of grace period
      const daysOverThreshold = Math.max(0, daysAtFull - staleThreshold);
      const gracePeriodDays = Math.max(0, graceWindow - daysOverThreshold);

      // Suggested action: archive for recent flags, delete for very old ones
      const suggestedAction: SuggestedAction =
        daysAtFull > 90 ? "delete" : "archive";

      return {
        flag: f,
        reasoning,
        suggestedAction,
        gracePeriodDays,
      };
    })
    .sort((a, b) => a.gracePeriodDays - b.gracePeriodDays); // closest to deadline first
}

// ─── Components ──────────────────────────────────────────────────────

interface JanitorSuggestionsProps {
  flags: StaleFlag[];
  onDismiss: (flagKey: string) => void;
  onKeep: (flagKey: string) => void;
  onArchive: (flagKey: string) => void;
  className?: string;
}

function SuggestionRow({
  suggestion,
  onDismiss,
  onKeep,
  onArchive,
  processing,
}: {
  suggestion: JanitorSuggestion;
  onDismiss: (key: string) => void;
  onKeep: (key: string) => void;
  onArchive: (key: string) => void;
  processing: boolean;
}) {
  const { flag, reasoning, suggestedAction, gracePeriodDays } = suggestion;

  return (
    <div
      className={cn(
        "group flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border p-4 transition-all",
        gracePeriodDays <= 3
          ? "border-red-200 bg-red-50/30"
          : gracePeriodDays <= 7
            ? "border-amber-200 bg-amber-50/30"
            : "border-[var(--signal-border-default)] bg-white hover:border-[var(--signal-border-emphasis)]",
      )}
    >
      {/* Left: flag info and reasoning */}
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {/* Status icon */}
        <div
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            gracePeriodDays <= 3
              ? "bg-red-100 text-red-600"
              : gracePeriodDays <= 7
                ? "bg-amber-100 text-amber-600"
                : "bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)]",
          )}
        >
          {gracePeriodDays <= 3 ? (
            <ClockIcon className="h-4 w-4" />
          ) : (
            <BrainIcon className="h-4 w-4" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-sm font-semibold text-[var(--signal-fg-primary)]">
              {flag.key}
            </code>
            <span className="text-xs text-[var(--signal-fg-tertiary)]">·</span>
            <span className="text-xs text-[var(--signal-fg-secondary)]">
              {flag.name}
            </span>
            <Badge
              variant={
                flag.percentage_true >= 100
                  ? "danger"
                  : flag.percentage_true >= 80
                    ? "warning"
                    : "default"
              }
            >
              {flag.percentage_true}% True
            </Badge>
            <Badge variant="purple">
              <BrainIcon className="h-3 w-3 mr-0.5" />
              Suggested: {suggestedAction === "archive" ? "Archive" : "Delete"}
            </Badge>
          </div>

          {/* Reasoning — the key augmentation-mode feature */}
          <p className="mt-1 text-xs text-[var(--signal-fg-secondary)]">
            <span className="text-[var(--signal-fg-tertiary)]">💡</span>{" "}
            {reasoning}
          </p>

          <div className="mt-1.5 flex items-center gap-3 text-xs text-[var(--signal-fg-tertiary)]">
            <span>{flag.environment}</span>
            <span>·</span>
            <span>{flag.days_served}d at 100%</span>
            <span>·</span>
            <span>Last eval: {timeAgo(flag.last_evaluated)}</span>
          </div>
        </div>
      </div>

      {/* Right: grace period + actions */}
      <div className="flex items-center gap-3 mt-3 sm:mt-0 sm:ml-4 shrink-0">
        <GracePeriodBadge daysRemaining={gracePeriodDays} />

        <div className="flex items-center gap-1">
          {/* Archive / Accept suggestion */}
          <Button
            size="xs"
            variant="primary"
            disabled={processing}
            onClick={() => onArchive(flag.key)}
            title={`${suggestedAction === "archive" ? "Archive" : "Delete"} this flag`}
          >
            <Archive className="h-3 w-3" />
            {suggestedAction === "archive" ? "Archive" : "Delete"}
          </Button>

          {/* Keep this flag */}
          <Button
            size="xs"
            variant="secondary"
            disabled={processing}
            onClick={() => onKeep(flag.key)}
            title="Keep this flag — it is still needed"
          >
            <CheckCircleFillIcon className="h-3 w-3" />
            Keep
          </Button>

          {/* Dismiss suggestion */}
          <button
            onClick={() => onDismiss(flag.key)}
            disabled={processing}
            className="rounded-lg p-1.5 text-[var(--signal-fg-tertiary)] transition-colors hover:bg-[var(--signal-bg-danger-muted)] hover:text-red-500"
            title="Dismiss this suggestion"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptySuggestions() {
  return (
    <div className="py-10">
      <EmptyState
        icon={SparklesIcon}
        emoji="✨"
        title="No sweep suggestions right now"
        description="Great job keeping things tidy! The Janitor will notify you when flags are ready for sweep."
      />
    </div>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────

export function JanitorSuggestions({
  flags,
  onDismiss,
  onKeep,
  onArchive,
  className,
}: JanitorSuggestionsProps) {
  const [processingKeys, setProcessingKeys] = useState<Set<string>>(new Set());

  const suggestions = deriveSuggestions(flags);

  const handleDismiss = async (key: string) => {
    setProcessingKeys((prev) => new Set(prev).add(key));
    try {
      await onDismiss(key);
    } finally {
      setProcessingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleKeep = async (key: string) => {
    setProcessingKeys((prev) => new Set(prev).add(key));
    try {
      await onKeep(key);
    } finally {
      setProcessingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleArchive = async (key: string) => {
    setProcessingKeys((prev) => new Set(prev).add(key));
    try {
      await onArchive(key);
    } finally {
      setProcessingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  if (suggestions.length === 0) {
    return <EmptySuggestions />;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Summary header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--signal-fg-primary)]">
          <span className="text-[var(--signal-fg-accent)]">●</span>{" "}
          {suggestions.length} suggestion
          {suggestions.length > 1 ? "s" : ""} for sweep
        </p>
        <p className="text-xs text-[var(--signal-fg-tertiary)]">
          Augmentation mode — review each suggestion before acting
        </p>
      </div>

      {/* Suggestions list */}
      {suggestions.map((suggestion) => (
        <SuggestionRow
          key={suggestion.flag.key}
          suggestion={suggestion}
          onDismiss={handleDismiss}
          onKeep={handleKeep}
          onArchive={handleArchive}
          processing={processingKeys.has(suggestion.flag.key)}
        />
      ))}
    </div>
  );
}
