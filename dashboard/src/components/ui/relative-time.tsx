"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { timeAgo, formatDateTime } from "@/lib/utils";

interface RelativeTimeProps {
  /** ISO 8601 date string or Date object */
  date: string | Date;
  /** If true, shows "Never" for dates far in the past or missing */
  neverLabel?: string;
  /** Additional class */
  className?: string;
  /** Minimum time in seconds before "just now" switches to seconds (default 60) */
  justNowThreshold?: number;
}

/**
 * RelativeTime — displays relative timestamps ("2 min ago") with a tooltip
 * showing the full date on hover.
 *
 * Features:
 * - Shows "just now", "Xm ago", "Xh ago", "Xd ago", "Xw ago", "Xmo ago", "Xy ago"
 * - Tooltip with full formatted date on hover
 * - Shows "Never" if date is invalid or far in the past
 */
export function RelativeTime({
  date,
  neverLabel = "Never",
  className,
  justNowThreshold = 60,
}: RelativeTimeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Handle invalid or missing dates
  if (!date) {
    return (
      <span className={cn("text-xs text-[var(--signal-fg-tertiary)]", className)}>
        {neverLabel}
      </span>
    );
  }

  const dateObj = date instanceof Date ? date : new Date(date);

  // Check for invalid date
  if (isNaN(dateObj.getTime())) {
    return (
      <span className={cn("text-xs text-[var(--signal-fg-tertiary)]", className)}>
        {neverLabel}
      </span>
    );
  }

  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  // If date is in the future, show full date
  if (diffSec < 0) {
    return (
      <span className={cn("text-xs text-[var(--signal-fg-tertiary)]", className)}>
        {formatDateTime(dateObj)}
      </span>
    );
  }

  // If more than 100 years, show "Never"
  if (diffSec > 100 * 365 * 86400) {
    return (
      <span className={cn("text-xs text-[var(--signal-fg-tertiary)]", className)}>
        {neverLabel}
      </span>
    );
  }

  const relativeText = timeAgo(dateObj);
  const fullText = formatDateTime(dateObj);

  return (
    <span className="relative inline-flex">
      <span
        className={cn(
          "cursor-default text-xs text-[var(--signal-fg-tertiary)] border-b border-dotted border-[var(--signal-border-subtle)] hover:text-[var(--signal-fg-secondary)] hover:border-[var(--signal-fg-secondary)] transition-colors",
          className,
        )}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        tabIndex={0}
        role="time"
        aria-label={fullText}
        title={fullText}
      >
        {relativeText}
      </span>
      {showTooltip && (
        <div
          className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 rounded-md border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] px-2.5 py-1.5 text-[11px] text-[var(--signal-fg-secondary)] shadow-[var(--signal-shadow-md)] whitespace-nowrap pointer-events-none"
          role="tooltip"
        >
          {fullText}
          <div className="absolute left-1/2 top-full -translate-x-1/2 -mt-px">
            <div className="h-2 w-2 rotate-45 border-r border-b border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)]" />
          </div>
        </div>
      )}
    </span>
  );
}
