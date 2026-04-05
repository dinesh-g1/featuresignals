"use client";

import { useEffect } from "react";
import { ErrorDisplay } from "@/components/ui/error-display";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-full bg-slate-50 text-slate-900 font-sans antialiased">
        <ErrorDisplay
          title="Something went wrong"
          message={error.message || "An unexpected error occurred. Please try again or return to the dashboard."}
          fullPage
          onRetry={reset}
          showHomeLink
        />
      </body>
    </html>
  );
}
