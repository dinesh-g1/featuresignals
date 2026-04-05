"use client";

import { ErrorDisplay } from "@/components/ui/error-display";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-full bg-slate-50 text-slate-900 font-sans antialiased">
        <ErrorDisplay
          title="Something went wrong"
          message={
            process.env.NODE_ENV === "development" && error.message
              ? error.message
              : "An unexpected error occurred. Please try again or return to the dashboard."
          }
          fullPage
          onRetry={reset}
          showHomeLink
        />
      </body>
    </html>
  );
}
