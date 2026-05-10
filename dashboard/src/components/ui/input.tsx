import * as React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** When true, applies error border and focus ring styling */
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition-all duration-200",
          "bg-[var(--signal-bg-primary)] text-[var(--signal-fg-primary)]",
          "placeholder:text-[var(--signal-fg-tertiary)]",
          "border-[var(--signal-border-default)]",
          "hover:border-[var(--signal-border-emphasis)] hover:shadow-md",
          "focus:border-[var(--signal-fg-accent)] focus:outline-none focus:ring-[3px] focus:ring-[var(--signal-fg-accent)]/10 focus:shadow-md",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--signal-bg-secondary)]",
          "file:border-0 file:bg-transparent file:font-medium file:text-sm file:text-[var(--signal-fg-primary)]",
          error && [
            "border-[var(--signal-border-danger-emphasis)]",
            "bg-[var(--signal-bg-danger-muted)]",
            "focus:border-[var(--signal-border-danger-emphasis)]",
            "focus:ring-[var(--signal-fg-danger)]/10",
          ],
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
export type { InputProps };
