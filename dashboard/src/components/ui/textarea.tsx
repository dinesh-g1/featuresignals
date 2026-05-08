import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "flex min-h-[80px] w-full rounded-lg border border-[var(--signal-border-default)] bg-white px-3 py-2 text-sm text-[var(--signal-fg-primary)] shadow-sm transition-all duration-200 ease-out placeholder:text-[var(--signal-fg-tertiary)] hover:border-[var(--signal-border-emphasis)] hover:shadow-md focus:border-[var(--signal-fg-accent)] focus:outline-none focus:ring-[3px] focus:ring-[var(--signal-fg-accent)]/10 focus:shadow-md disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
