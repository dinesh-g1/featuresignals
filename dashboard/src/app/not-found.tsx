"use client";

import { ErrorDisplay } from "@/components/ui/error-display";

export default function NotFound() {
  return (
    <ErrorDisplay
      statusCode={404}
      title="Page not found"
      message="The page you're looking for doesn't exist or has been moved. Check the URL or head back to the dashboard."
      fullPage
      showHomeLink
    />
  );
}
