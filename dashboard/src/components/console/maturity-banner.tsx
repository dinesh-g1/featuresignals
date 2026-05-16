"use client";

/**
 * MaturityBanner — Subtle, dismissible banner shown at L1 (Solo) to
 * inform users about Progressive Disclosure and how to unlock more
 * features as their team grows.
 *
 * Dismiss state is persisted in localStorage under the key
 * `fs-maturity-banner-dismissed`. Once dismissed, it won't show again
 * even across sessions until localStorage is cleared.
 *
 * Includes a "Show all stages" toggle so L1 users can temporarily
 * preview the full 13-stage lifecycle without changing their maturity
 * level.
 *
 * Signal UI tokens only. Zero hardcoded hex colors. Zero `any`.
 */

import { useState, useEffect, useCallback } from "react";
import { X, ArrowRight, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "fs-maturity-banner-dismissed";

function isDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function persistDismissed(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Storage unavailable — silently ignore
  }
}

export interface MaturityBannerProps {
  /** Whether all 13 stages are currently shown */
  showAllStages: boolean;
  /** Toggle showing all stages */
  onToggleShowAll: () => void;
  /** Number of hidden stages (for the label) */
  hiddenCount: number;
}

export function MaturityBanner({
  showAllStages,
  onToggleShowAll,
  hiddenCount,
}: MaturityBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!isDismissed());
  }, []);

  const handleDismiss = useCallback(() => {
    persistDismissed();
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-2 px-4 py-2.5 mx-3 mt-2 rounded-[var(--signal-radius-md)]",
        "bg-[var(--signal-bg-accent-muted)]/60",
        "border border-[var(--signal-border-accent-muted)]",
        "animate-slide-up",
      )}
      role="status"
      aria-label="You are in Solo mode"
    >
      {/* Icon */}
      <span
        className="text-base leading-none shrink-0 mt-0.5"
        aria-hidden="true"
      >
        👋
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[var(--signal-fg-primary)] leading-relaxed">
          <span className="font-medium">You&apos;re in Solo mode</span> — the
          simplest experience. As your team grows, unlock more stages and
          features.
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1",
              "text-[11px] font-medium text-[var(--signal-fg-accent)]",
              "hover:underline",
              "transition-colors duration-[var(--signal-duration-fast)]",
            )}
          >
            Learn more
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </button>

          <span className="text-[var(--signal-border-subtle)]" aria-hidden="true">
            ·
          </span>

          <button
            type="button"
            onClick={onToggleShowAll}
            className={cn(
              "inline-flex items-center gap-1",
              "text-[11px] font-medium",
              showAllStages
                ? "text-[var(--signal-fg-success)]"
                : "text-[var(--signal-fg-accent)]",
              "hover:underline",
              "transition-colors duration-[var(--signal-duration-fast)]",
            )}
            aria-label={
              showAllStages
                ? "Hide advanced stages"
                : `Show all ${hiddenCount + 4} lifecycle stages`
            }
          >
            {showAllStages ? (
              <>
                <EyeOff className="h-3 w-3" aria-hidden="true" />
                Hide advanced stages
              </>
            ) : (
              <>
                <Eye className="h-3 w-3" aria-hidden="true" />
                Show all {hiddenCount + 4} stages
              </>
            )}
          </button>
        </div>
      </div>

      {/* Dismiss */}
      <button
        type="button"
        onClick={handleDismiss}
        className={cn(
          "shrink-0 p-0.5 rounded-[var(--signal-radius-sm)]",
          "text-[var(--signal-fg-tertiary)]",
          "hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)]",
          "transition-colors duration-[var(--signal-duration-fast)]",
        )}
        aria-label="Dismiss maturity banner"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
