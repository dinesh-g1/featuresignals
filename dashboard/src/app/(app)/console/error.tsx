"use client";

/**
 * Console Error Boundary — Client component.
 *
 * Catches rendering errors within the Console route subtree.
 * Displays a friendly error message with a retry button and
 * a link back to the dashboard.
 *
 * Never exposes internal error details (stack traces, sensitive
 * data) to the user. Uses Signal UI design tokens exclusively.
 */

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangleIcon, RefreshCwIcon, HomeIcon } from "lucide-react";

interface ConsoleErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ConsoleError({ error, reset }: ConsoleErrorProps) {
  useEffect(() => {
    // Structured error logging — user never sees this.
    // In production, this flows to SigNoz via the configured collector.
    if (process.env.NODE_ENV !== "production") {
      console.error("[ConsoleError]", {
        message: error.message,
        digest: error.digest,
        stack: error.stack,
      });
    }
  }, [error]);

  const friendly = getFriendlyMessage(error);

  return (
    <div
      className="flex h-screen items-center justify-center bg-[var(--signal-bg-secondary)] px-4"
      role="alert"
    >
      <div className="text-center space-y-5 max-w-md">
        {/* Icon */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--signal-bg-warning-muted)] ring-1 ring-[var(--signal-border-warning-muted)] shadow-[var(--signal-shadow-sm)]">
          <AlertTriangleIcon
            className="h-7 w-7 text-[var(--signal-fg-warning)]"
            aria-hidden="true"
          />
        </div>

        {/* Title */}
        <h1 className="text-lg font-semibold text-[var(--signal-fg-primary)]">
          {friendly.title}
        </h1>

        {/* Description */}
        <p className="text-sm leading-relaxed text-[var(--signal-fg-secondary)]">
          {friendly.description}
        </p>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--signal-bg-accent-emphasis)] px-4 py-2 text-sm font-medium text-[var(--signal-fg-on-emphasis)] shadow-[var(--signal-shadow-xs)] transition-opacity duration-[var(--signal-duration-instant)] hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal-fg-accent)]"
          >
            <RefreshCwIcon className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-md border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] px-4 py-2 text-sm font-medium text-[var(--signal-fg-secondary)] shadow-[var(--signal-shadow-xs)] transition-colors duration-[var(--signal-duration-instant)] hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal-fg-accent)]"
          >
            <HomeIcon className="h-4 w-4" aria-hidden="true" />
            Back to Dashboard
          </Link>
        </div>

        {/* Subtle error reference for support — digest only, never the full error */}
        {error.digest && (
          <p className="text-xs text-[var(--signal-fg-tertiary)]">
            Reference: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Maps common error patterns to user-friendly messages.
 *
 * Security: Never exposes internal error details, stack traces,
 * or sensitive data to the user. The digest is a server-generated
 * hash safe for display.
 */
function getFriendlyMessage(error: Error): {
  title: string;
  description: string;
} {
  const message = error.message?.toLowerCase() ?? "";

  // Network / connectivity errors
  if (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("timeout") ||
    message.includes("econnrefused")
  ) {
    return {
      title: "Connection Issue",
      description:
        "We couldn't reach our servers. Please check your internet connection and try again. If the problem persists, our servers might be experiencing issues.",
    };
  }

  // Authentication errors
  if (
    message.includes("401") ||
    message.includes("unauthorized") ||
    message.includes("session")
  ) {
    return {
      title: "Session Expired",
      description:
        "Your session has expired or you've been logged out. Please sign in again to continue.",
    };
  }

  // Authorization errors
  if (message.includes("403") || message.includes("forbidden")) {
    return {
      title: "Access Denied",
      description:
        "You don't have permission to view the Console. If you think this is a mistake, contact your organization admin.",
    };
  }

  // Not found
  if (message.includes("404") || message.includes("not found")) {
    return {
      title: "Page Not Found",
      description:
        "The Console page you're looking for doesn't exist or may have been moved.",
    };
  }

  // Server errors
  if (
    message.includes("500") ||
    message.includes("internal") ||
    message.includes("server error")
  ) {
    return {
      title: "Something Went Wrong",
      description:
        "Our servers encountered an unexpected error. This has been logged and our team will investigate. Please try again in a moment.",
    };
  }

  // Default — generic but reassuring
  return {
    title: "Something Went Wrong",
    description:
      "An unexpected error occurred while loading the Console. Don't worry — your data is safe. You can try again or return to the dashboard.",
  };
}
