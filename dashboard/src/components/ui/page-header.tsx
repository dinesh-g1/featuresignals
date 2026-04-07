import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  docsUrl?: string;
  docsLabel?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  className,
  children,
  docsUrl,
  docsLabel = "Docs",
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3 animate-in sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
          {docsUrl && (
            <a
              href={docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600"
              title={`${docsLabel} — opens in new tab`}
            >
              {docsLabel}
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>
      {(actions || children) && (
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          {children}
        </div>
      )}
    </div>
  );
}
