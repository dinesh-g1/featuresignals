"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import {
  AlertTriangleIcon,
  RefreshCwIcon,
  HomeIcon,
  LifeBuoyIcon,
} from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error for debugging — user never sees this
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("[GlobalError]", {
        message: error.message,
        digest: error.digest,
        stack: error.stack,
      });
    }
  }, [error]);

  // Determine a friendly message based on common error patterns
  const friendlyMessage = getFriendlyMessage(error);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-primary)] font-sans antialiased">
        <div
          className="flex flex-col items-center justify-center min-h-screen px-4 py-20 text-center animate-fade-in"
          role="alert"
        >
          {/* Logo / Icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--signal-bg-warning-muted)] ring-1 ring-[var(--signal-border-warning-muted)] shadow-sm">
            <AlertTriangleIcon
              className="h-8 w-8 text-amber-600"
              aria-hidden="true"
            />
          </div>

          {/* Title */}
          <h1 className="mt-6 text-xl font-semibold text-[var(--signal-fg-primary)]">
            {friendlyMessage.title}
          </h1>

          {/* Description */}
          <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--signal-fg-secondary)]">
            {friendlyMessage.description}
          </p>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button onClick={reset} variant="primary" size="md">
              <RefreshCwIcon className="mr-1.5 h-4 w-4" />
              Try Again
            </Button>
            <Button variant="secondary" size="md" asChild>
              <Link href="/dashboard">
                <HomeIcon className="mr-1.5 h-4 w-4" />
                Go to Dashboard
              </Link>
            </Button>
            <Button variant="ghost" size="md" asChild>
              <a href="mailto:support@featuresignals.com">
                <LifeBuoyIcon className="mr-1.5 h-4 w-4" />
                Contact Support
              </a>
            </Button>
          </div>

          {/* Subtle error reference for support */}
          {error.digest && (
            <p className="mt-8 text-xs text-[var(--signal-fg-tertiary)]">
              Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}

/**
 * Maps common error patterns to user-friendly messages.
 * Never exposes internal error details to the user.
 */
function getFriendlyMessage(error: Error): {
  title: string;
  description: string;
} {
  const message = error.message?.toLowerCase() || "";

  if (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("timeout")
  ) {
    return {
      title: "Connection Issue",
      description:
        "We couldn't reach our servers. Please check your internet connection and try again. If the problem persists, our servers might be experiencing issues.",
    };
  }

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

  if (message.includes("403") || message.includes("forbidden")) {
    return {
      title: "Access Denied",
      description:
        "You don't have permission to view this page. If you think this is a mistake, contact your organization admin.",
    };
  }

  if (message.includes("404") || message.includes("not found")) {
    return {
      title: "Page Not Found",
      description:
        "The page you're looking for doesn't exist or may have been moved. Check the URL or return to the dashboard.",
    };
  }

  if (message.includes("500") || message.includes("internal")) {
    return {
      title: "Something Went Wrong",
      description:
        "Our servers encountered an unexpected error. This has been logged and our team will investigate. Please try again in a moment.",
    };
  }

  // Default: generic but friendly
  return {
    title: "Something Went Wrong",
    description:
      "An unexpected error occurred while loading the application. Don't worry — your data is safe. You can try again or return to the dashboard.",
  };
}
