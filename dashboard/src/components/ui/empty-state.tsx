import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon:
    | LucideIcon
    | React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string | React.ReactNode;
  description?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  docsUrl?: string;
  docsLabel?: string;
  emoji?: string;
  className?: string;
}

/**
 * EmptyState — used when a page/list has no data yet.
 * Shows an icon, title, optional description, and optional CTA.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  docsUrl,
  docsLabel,
  emoji,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 py-16 text-center animate-fade-in sm:px-6",
        className,
      )}
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 ring-1 ring-accent/20 shadow-sm">
        {emoji ? (
          <span className="text-xl leading-none">{emoji}</span>
        ) : (
          <Icon className="h-7 w-7 text-accent" strokeWidth={1.5} />
        )}
      </div>
      <p className="mt-4 text-sm font-semibold text-stone-700">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-stone-400">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
      {docsUrl && (
        <a
          href={docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs text-accent hover:text-accent-dark transition-colors"
        >
          {docsLabel || "Learn more in docs"}
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}
