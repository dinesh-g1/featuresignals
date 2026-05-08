import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * InlineCreateForm provides a consistent bordered card wrapper
 * for inline "create new" forms across pages (flags, segments, etc.).
 *
 * Replaces the duplicated className string:
 * "rounded-xl border border-[var(--signal-border-default)]/80 bg-white p-4 space-y-4 shadow-sm ring-1 ring-accent/10 sm:p-6"
 */
interface InlineCreateFormProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "accent";
}

export function InlineCreateForm({
  children,
  className,
  variant = "default",
}: InlineCreateFormProps) {
  const baseStyles =
    "rounded-xl border bg-white p-4 space-y-4 shadow-sm ring-1 sm:p-6";

  const variantStyles =
    variant === "accent"
      ? "border-[var(--signal-border-accent-muted)] shadow-md shadow-accent/10 ring-accent/10"
      : "border-[var(--signal-border-default)]/80 ring-accent/10";

  return (
    <div className={cn(baseStyles, variantStyles, className)}>{children}</div>
  );
}
