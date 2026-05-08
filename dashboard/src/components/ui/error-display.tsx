import Link from "next/link";
import { cn } from "@/lib/utils";
import { AlertIcon } from "@/components/icons/nav-icons";
import { Button } from "./button";

export interface ErrorDisplayProps {
  statusCode?: number;
  title: string;
  message: string;
  fullPage?: boolean;
  onRetry?: () => void;
  showHomeLink?: boolean;
}

export function ErrorDisplay({
  statusCode,
  title,
  message,
  fullPage = false,
  onRetry,
  showHomeLink = false,
}: ErrorDisplayProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 text-center animate-fade-in",
        fullPage ? "min-h-screen bg-[var(--signal-bg-secondary)]" : "py-16 sm:py-24",
      )}
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-50 to-red-100 ring-1 ring-red-200/60 shadow-sm">
        <AlertIcon className="h-7 w-7 text-red-500" />
      </div>

      {statusCode != null && (
        <p className="mt-5 text-6xl font-extrabold tracking-tight text-slate-300">
          {statusCode}
        </p>
      )}

      <h1
        className={cn(
          "font-semibold text-[var(--signal-fg-primary)]",
          statusCode != null ? "mt-3 text-xl" : "mt-5 text-xl",
        )}
      >
        {title}
      </h1>

      <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--signal-fg-secondary)]">
        {message}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <Button onClick={onRetry} variant="primary" size="md">
            Try Again
          </Button>
        )}
        {showHomeLink && (
          <Button variant="secondary" size="md" asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
