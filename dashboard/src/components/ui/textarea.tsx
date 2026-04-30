import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "flex min-h-[80px] w-full rounded-lg border border-[var(--borderColor-default)] bg-white px-3 py-2 text-sm text-[var(--fgColor-default)] shadow-sm transition-all duration-200 ease-out placeholder:text-[var(--fgColor-subtle)] hover:border-[var(--borderColor-emphasis)] hover:shadow-md focus:border-[var(--fgColor-accent)] focus:outline-none focus:ring-[3px] focus:ring-[var(--fgColor-accent)]/10 focus:shadow-md disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
