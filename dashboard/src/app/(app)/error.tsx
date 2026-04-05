"use client";

import { useEffect } from "react";
import { ErrorDisplay } from "@/components/ui/error-display";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AppError]", error);
  }, [error]);

  return (
    <ErrorDisplay
      title="Something went wrong"
      message={error.message || "An unexpected error occurred. Please try again."}
      onRetry={reset}
      showHomeLink
    />
  );
}
