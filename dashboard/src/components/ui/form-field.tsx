import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "./label";
import { HelpTooltip } from "./help-tooltip";

interface FormFieldProps {
  /** The field label displayed above the input */
  label: string;
  /** Associates label with input via htmlFor */
  htmlFor?: string;
  /** Error message — when set, overrides hint and shows red text */
  error?: string;
  /** Hint text shown below the input when there's no error */
  hint?: string;
  /** Whether the field is required (adds red asterisk) */
  required?: boolean;
  /**
   * Field-level help content shown via a "?" icon next to the label.
   * Can be a string or rich React content. If provided with docsUrl,
   * the tooltip will include a "Learn more →" link.
   */
  help?: string | React.ReactNode;
  /** URL for full documentation (used with help) */
  helpDocsUrl?: string;
  /** Label for the help docs link (defaults to "Learn more") */
  helpDocsLabel?: string;
  /** Additional class for the wrapper */
  className?: string;
  children: React.ReactNode;
}

/**
 * FormField — single-column, stacked-label field wrapper.
 *
 * Per NNGroup Eyetracking findings (pp. 176-193):
 * - Labels above inputs (stacked, not side-by-side)
 * - No placeholder text in fields (use labels and hints instead)
 * - Single column layout for all fields
 *
 * Supports optional FieldHelp via the `help` prop, which renders
 * a HelpTooltip icon next to the label.
 */
export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required = false,
  help,
  helpDocsUrl,
  helpDocsLabel,
  className,
  children,
}: FormFieldProps) {
  // Generate stable IDs for accessibility
  const errorId = React.useId();
  const hintId = React.useId();

  // Determine which description to associate with the input
  const describedBy =
    [error ? errorId : null, !error && hint ? hintId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-1.5">
        <Label htmlFor={htmlFor}>
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </Label>
        {help && (
          <HelpTooltip
            content={help}
            docsUrl={helpDocsUrl}
            docsLabel={helpDocsLabel}
          >
            <span />
          </HelpTooltip>
        )}
      </div>
      {/* Clone children to inject aria-describedby */}
      {React.isValidElement(children) && describedBy
        ? React.cloneElement(
            children as React.ReactElement<{ "aria-describedby"?: string }>,
            {
              "aria-describedby": describedBy,
            },
          )
        : children}
      {error && (
        <p className="text-xs text-red-500" role="alert" id={errorId}>
          {error}
        </p>
      )}
      {!error && hint && (
        <p className="text-xs text-[var(--signal-fg-tertiary)]" id={hintId}>
          {hint}
        </p>
      )}
    </div>
  );
}
