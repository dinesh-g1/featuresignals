import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  docsUrl?: string;
  docsLabel?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  docsUrl,
  docsLabel,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-4 py-16 text-center animate-fade-in sm:px-6", className)}>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-slate-100 ring-1 ring-indigo-100/60 shadow-sm">
        <Icon className="h-7 w-7 text-indigo-400" strokeWidth={1.5} />
      </div>
      <p className="mt-4 text-sm font-medium text-slate-600">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-400">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
      {docsUrl && (
        <a
          href={docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
        >
          {docsLabel || "Learn more in docs"}
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}
