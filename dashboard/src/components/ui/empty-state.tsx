import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-4 py-12 text-center sm:px-6", className)}>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-100">
        <Icon className="h-6 w-6 text-slate-400" strokeWidth={1.5} />
      </div>
      <p className="mt-3 text-sm font-medium text-slate-500">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-slate-400">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
