"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { AlertTriangleIcon, XIcon } from "lucide-react";
import { toast } from "@/components/toast";

export interface InlineErrorProps {
  message: string;
  retryAction?: () => void;
  variant?: "inline" | "banner" | "toast";
  onDismiss?: () => void;
  className?: string;
}

/**
 * InlineError — a small, reusable error component.
 *
 * Variants:
 * - "inline": compact red box with icon, message, optional Retry button
 * - "banner": full-width warning banner at top of content, dismissible
 * - "toast": uses existing toast system (renders nothing directly)
 *
 * Used wherever API calls can fail: flag toggle, rule save, environment switch, etc.
 */
export function InlineError({
  message,
  retryAction,
  variant = "inline",
  onDismiss,
  className,
}: InlineErrorProps) {
  // Toast variant fires and forgets via the toast system
  useEffect(() => {
    if (variant === "toast") {
      toast(message, "error");
    }
  }, [variant, message]);

  // Toast variant renders nothing — the toast container handles display
  if (variant === "toast") {
    return null;
  }

  if (variant === "banner") {
    return (
      <div
        role="alert"
        className={cn(
          "flex items-start gap-3 rounded-lg border px-4 py-3",
          "bg-[var(--signal-bg-danger-muted)] border-[var(--signal-border-danger-emphasis)]/30",
          "animate-slide-down",
          className,
        )}
      >
        <AlertTriangleIcon
          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--signal-fg-danger)]"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--signal-fg-danger)]">
            {message}
          </p>
          {retryAction && (
            <Button
              variant="ghost"
              size="sm"
              onClick={retryAction}
              className="mt-1.5 h-auto px-2 py-1 text-xs"
            >
              Retry
            </Button>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="shrink-0 rounded-md p-1 text-[var(--signal-fg-tertiary)] hover:bg-black/5 hover:text-[var(--signal-fg-primary)] transition-colors"
            aria-label="Dismiss error"
          >
            <XIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  // Default: inline variant
  return (
    <div
      role="alert"
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
        "bg-[var(--signal-bg-danger-muted)] text-[var(--signal-fg-danger)]",
        "border border-[var(--signal-border-danger-emphasis)]/20",
        "animate-fade-in",
        className,
      )}
    >
      <AlertTriangleIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="flex-1 min-w-0 truncate">{message}</span>
      {retryAction && (
        <button
          type="button"
          onClick={retryAction}
          className="shrink-0 rounded px-2 py-0.5 text-xs font-medium underline underline-offset-2 hover:text-[var(--signal-fg-danger)] transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
