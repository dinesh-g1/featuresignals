import * as React from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** When true, applies error border and focus ring styling */
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-lg border bg-white px-3 py-2 text-sm text-[var(--signal-fg-primary)] shadow-sm transition-all duration-200 ease-out",
        error
          ? "border-red-300 focus:border-red-400 focus:ring-red-200"
          : "border-[var(--signal-border-default)] hover:border-[var(--signal-border-emphasis)] focus:border-[var(--signal-fg-accent)] focus:ring-[var(--signal-fg-accent)]/10",
        "placeholder:text-[var(--signal-fg-tertiary)]",
        "hover:shadow-md",
        "focus:outline-none focus:ring-[3px] focus:shadow-md",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--signal-bg-secondary)]",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export { Textarea };
export type { TextareaProps };
