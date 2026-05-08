"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ProgressiveDisclosure } from "@/components/ui/progressive-disclosure";

/**
 * AdvancedFields — progressive disclosure toggle for advanced form options.
 *
 * Per NNGroup Eyetracking findings (pp. 176-193):
 * - Advanced/expert fields should be hidden behind a toggle to reduce
 *   cognitive load for new users.
 * - The toggle label uses "Advanced options ▼" / "Advanced options ▲"
 *   to signal expandability.
 *
 * Wraps the generic `ProgressiveDisclosure` component with form-specific
 * defaults (chevron label, storage key prefix).
 */
interface AdvancedFieldsProps {
  /** The advanced fields content */
  children: ReactNode;
  /** Label for the toggle (default: "Advanced options") */
  label?: string;
  /** Brief description shown when collapsed */
  description?: string;
  /** Whether expanded by default */
  defaultExpanded?: boolean;
  /** Unique key for persisting expand state in localStorage */
  storageKey?: string;
  /** Additional class for the wrapper */
  className?: string;
}

export function AdvancedFields({
  children,
  label = "Advanced options",
  description,
  defaultExpanded = false,
  storageKey,
  className,
}: AdvancedFieldsProps) {
  const toggleLabel = label; // The ProgressiveDisclosure already handles chevron

  return (
    <ProgressiveDisclosure
      label={toggleLabel}
      description={description}
      defaultExpanded={defaultExpanded}
      storageKey={storageKey ? `form-advanced-${storageKey}` : undefined}
      className={cn("border-dashed", className)}
    >
      <div className="space-y-4">{children}</div>
    </ProgressiveDisclosure>
  );
}
