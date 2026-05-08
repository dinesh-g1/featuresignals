"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import type { ReactNode } from "react";

interface BlankslateProps {
  /** Large icon displayed at 48px — pass a component or SVG element */
  icon?: React.ComponentType<{ className?: string }>;
  /** Emoji fallback when no icon component is available */
  emoji?: string;
  /** Primary title text */
  title: string;
  /** Supporting description text */
  description?: string;
  /** Primary CTA button */
  action?: ReactNode;
  /** Text for the primary CTA button (alternative to action) */
  actionLabel?: string;
  /** Click handler for the primary CTA */
  onAction?: () => void;
  /** Learn more link URL */
  learnMoreUrl?: string;
  /** Learn more link text */
  learnMoreLabel?: string;
  /** Visual variant */
  variant?: "default" | "bordered";
  /** Additional class */
  className?: string;
}

/**
 * Blankslate — empty state component with illustration + CTA.
 *
 * Used when a page/list has no data yet. Shows a large icon (48px),
 * title, description, primary CTA, and optional learn-more link.
 *
 * Variants:
 * - default: centered, no border (full-page empty state)
 * - bordered: card with border (inline empty state)
 */
export function Blankslate({
  icon: Icon,
  emoji,
  title,
  description,
  action,
  actionLabel,
  onAction,
  learnMoreUrl,
  learnMoreLabel,
  variant = "default",
  className,
}: BlankslateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-16 text-center animate-fade-in",
        variant === "bordered" &&
          "rounded-[var(--radius-medium)] border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] shadow-[var(--signal-shadow-sm)]",
        className,
      )}
    >
      {/* Icon */}
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--signal-bg-accent-muted)] ring-1 ring-[var(--signal-border-accent-muted)] shadow-sm">
        {emoji ? (
          <span className="text-2xl leading-none" aria-hidden="true">
            {emoji}
          </span>
        ) : Icon ? (
          <Icon className="h-8 w-8 text-[var(--signal-fg-accent)]" />
        ) : null}
      </div>

      {/* Title */}
      <h3 className="mt-5 text-base font-semibold text-[var(--signal-fg-primary)]">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--signal-fg-secondary)]">
          {description}
        </p>
      )}

      {/* Primary CTA */}
      {(action || actionLabel) && (
        <div className="mt-6">
          {action || (
            <Button variant="primary" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      )}

      {/* Learn more link */}
      {learnMoreUrl && (
        <a
          href={learnMoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--signal-fg-accent)] hover:underline transition-colors"
        >
          {learnMoreLabel || "Learn more"}
          <svg
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M3.75 2h3.5a.75.75 0 0 1 0 1.5h-3.5a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-3.5a.75.75 0 0 1 1.5 0v3.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-8.5C2 2.784 2.784 2 3.75 2Zm6.854-1h4.146a.25.25 0 0 1 .25.25v4.146a.25.25 0 0 1-.427.177L13.03 4.03 9.28 7.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.75-3.75-1.543-1.543A.25.25 0 0 1 10.604 1Z" />
          </svg>
        </a>
      )}
    </div>
  );
}
