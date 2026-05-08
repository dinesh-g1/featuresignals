import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex w-full rounded-lg border border-[var(--signal-border-default)] bg-white px-3 py-2 text-sm text-[var(--signal-fg-primary)] shadow-sm transition-all duration-200",
        "placeholder:text-[var(--signal-fg-tertiary)]",
        "hover:border-[var(--signal-border-emphasis)] hover:shadow-md",
        "focus:border-[var(--signal-fg-accent)] focus:outline-none focus:ring-[3px] focus:ring-[var(--signal-fg-accent)]/10 focus:shadow-md",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--signal-bg-primary)]",
        "file:border-0 file:bg-transparent file:font-medium file:text-sm file:text-[var(--signal-fg-primary)]",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
