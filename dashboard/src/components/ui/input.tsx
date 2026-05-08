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
          "flex w-full rounded-lg border bg-white px-3 py-2 text-sm text-[var(--signal-fg-primary)] shadow-sm transition-all duration-200",
          error
            ? "border-red-300 focus:border-red-400 focus:ring-red-200"
            : "border-[var(--signal-border-default)] hover:border-[var(--signal-border-emphasis)] focus:border-[var(--signal-fg-accent)] focus:ring-[var(--signal-fg-accent)]/10",
          "placeholder:text-[var(--signal-fg-tertiary)]",
          "hover:shadow-md",
          "focus:outline-none focus:ring-[3px] focus:shadow-md",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--signal-bg-secondary)]",
          "file:border-0 file:bg-transparent file:font-medium file:text-sm file:text-[var(--signal-fg-primary)]",
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
