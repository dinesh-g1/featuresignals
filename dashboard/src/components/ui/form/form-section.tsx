import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * FormSection — groups related form fields with an optional section title.
 *
 * Per NNGroup Eyetracking findings: long forms should be broken into
 * logical sections with clear headings for scannability (F-pattern).
 * Each section stacks its fields in a single column.
 */
interface FormSectionProps {
  /** Section heading */
  title?: string;
  /** Optional subtitle / description */
  description?: string;
  /** Section content — typically FormField components */
  children: ReactNode;
  className?: string;
}

export function FormSection({
  title,
  description,
  children,
  className,
}: FormSectionProps) {
  return (
    <fieldset className={cn("space-y-4", className)}>
      {(title || description) && (
        <div className="border-b border-[var(--signal-border-default)] pb-2">
          {title && (
            <legend className="text-sm font-semibold text-[var(--signal-fg-primary)]">
              {title}
            </legend>
          )}
          {description && (
            <p className="mt-1 text-xs text-[var(--signal-fg-tertiary)]">
              {description}
            </p>
          )}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </fieldset>
  );
}
