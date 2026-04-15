import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * InlineCreateForm provides a consistent bordered card wrapper
 * for inline "create new" forms across pages (flags, segments, etc.).
 *
 * Replaces the duplicated className string:
 * "rounded-xl border border-slate-200/80 bg-white p-4 space-y-4 shadow-sm ring-1 ring-indigo-100 sm:p-6"
 */
interface InlineCreateFormProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "indigo";
}

export function InlineCreateForm({
  children,
  className,
  variant = "default",
}: InlineCreateFormProps) {
  const baseStyles =
    "rounded-xl border bg-white p-4 space-y-4 shadow-sm ring-1 sm:p-6";

  const variantStyles =
    variant === "indigo"
      ? "border-indigo-200/60 shadow-md shadow-indigo-100/30 ring-indigo-100/60"
      : "border-slate-200/80 ring-indigo-100";

  return (
    <div className={cn(baseStyles, variantStyles, className)}>
      {children}
    </div>
  );
}
