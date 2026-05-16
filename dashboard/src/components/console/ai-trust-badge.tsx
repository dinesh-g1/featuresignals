"use client";

import { Check, Sparkles, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── AI Trust Badge ─────────────────────────────────────────────────

interface AITrustBadgeProps {
  /** The AI suggestion lifecycle state */
  type: "suggested" | "executed" | "needs_approval";
  /** Optional label text (e.g., the suggestion summary) */
  label?: string;
  /** AI confidence score (0-1), shown for `needs_approval` type */
  confidence?: number;
  /** Additional class names */
  className?: string;
}

/**
 * AITrustBadge displays the AI interaction state for a feature card.
 *
 * - `suggested`: Purple badge "AI suggested" with sparkles icon + optional label
 * - `executed`: Purple badge with check "AI executed" + optional label
 * - `needs_approval`: Amber badge "Review needed" + optional label + confidence %
 */
export function AITrustBadge({
  type,
  label,
  confidence,
  className,
}: AITrustBadgeProps) {
  const confidencePct =
    confidence !== undefined ? Math.round(confidence * 100) : undefined;

  const baseClasses = cn(
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0",
    className,
  );

  if (type === "suggested") {
    return (
      <span
        className={cn(
          baseClasses,
          "bg-[var(--signal-bg-info-muted)] text-[var(--signal-fg-info)]",
        )}
        title={label ?? "AI suggested this action"}
      >
        <Sparkles className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span className="leading-none">AI suggested</span>
        {label && (
          <span className="text-[var(--signal-fg-secondary)] leading-none truncate max-w-[120px]">
            {label}
          </span>
        )}
      </span>
    );
  }

  if (type === "executed") {
    return (
      <span
        className={cn(
          baseClasses,
          "bg-[var(--signal-bg-info-muted)] text-[var(--signal-fg-info)]",
        )}
        title={label ?? "AI executed this action"}
      >
        <Check className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span className="leading-none">AI executed</span>
        {label && (
          <span className="text-[var(--signal-fg-secondary)] leading-none truncate max-w-[120px]">
            {label}
          </span>
        )}
      </span>
    );
  }

  // needs_approval
  return (
    <span
      className={cn(
        baseClasses,
        "bg-[var(--signal-bg-warning-muted)] text-[var(--signal-fg-warning)]",
      )}
      title={label ?? "AI action requires human review"}
    >
      <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="leading-none">Review needed</span>
      {label && (
        <span className="text-[var(--signal-fg-secondary)] leading-none truncate max-w-[120px]">
          {label}
        </span>
      )}
      {confidencePct !== undefined && (
        <span className="text-[var(--signal-fg-tertiary)] leading-none tabular-nums">
          {confidencePct}%
        </span>
      )}
    </span>
  );
}
