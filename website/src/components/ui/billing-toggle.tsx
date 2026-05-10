"use client";

import { cn } from "@/lib/utils";

interface BillingToggleProps {
  annual: boolean;
  onChange: (annual: boolean) => void;
  className?: string;
}

/**
 * Pill toggle for switching between Monthly and Annual billing.
 *
 * Accessibility:
 * - role="switch" with aria-checked for screen readers
 * - Entire pill is clickable
 * - Focus ring for keyboard navigation
 *
 * Feedback:
 * - 150ms ease-out transition on the sliding highlight
 */
export function BillingToggle({
  annual,
  onChange,
  className,
}: BillingToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={annual}
      aria-label={`Billing: ${annual ? "Annual" : "Monthly"}`}
      onClick={() => onChange(!annual)}
      className={cn(
        "group relative inline-flex items-center rounded-full border border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)] p-0.5 transition-colors",
        annual &&
          "border-[var(--signal-border-success-muted)] bg-[var(--signal-bg-success-muted)]",
        className,
      )}
    >
      {/* Sliding highlight pill */}
      <span
        className={cn(
          "absolute top-0.5 h-[calc(100%-4px)] w-[calc(50%-2px)] rounded-full bg-[var(--signal-bg-primary)] shadow-[var(--signal-shadow-sm)] transition-transform duration-150 ease-out",
          annual ? "translate-x-[calc(100%+2px)]" : "translate-x-0",
        )}
        aria-hidden="true"
      />

      {/* Monthly option */}
      <span
        className={cn(
          "relative z-10 px-3.5 py-1.5 text-sm font-medium rounded-full transition-colors duration-150",
          !annual
            ? "text-[var(--signal-fg-primary)]"
            : "text-[var(--signal-fg-secondary)]",
        )}
      >
        Monthly
      </span>

      {/* Annual option */}
      <span
        className={cn(
          "relative z-10 px-3.5 py-1.5 text-sm font-medium rounded-full transition-colors duration-150",
          annual
            ? "text-[var(--signal-fg-primary)]"
            : "text-[var(--signal-fg-secondary)]",
        )}
      >
        Annual
      </span>
    </button>
  );
}
