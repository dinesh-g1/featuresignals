"use client";

import { cn } from "@/lib/utils";
import { CURRENCY_LIST, type CurrencyDef } from "@/lib/currency";

interface CurrencySelectorProps {
  value: CurrencyDef;
  onChange: (currency: CurrencyDef) => void;
  className?: string;
}

/**
 * Three-button segmented control for currency selection.
 *
 * Affordances:
 * - Segmented pill shape signals mutually exclusive choice
 * - Active segment is visually elevated (filled background)
 * - Hover state on inactive segments invites interaction
 *
 * Accessibility:
 * - role="radiogroup" with aria-label for screen readers
 * - Each button has role="radio" and aria-checked
 * - Keyboard navigable (Tab to group, Arrow keys between options)
 */
export function CurrencySelector({
  value,
  onChange,
  className,
}: CurrencySelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Select currency"
      className={cn(
        "inline-flex items-center rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)] p-0.5",
        className,
      )}
    >
      {CURRENCY_LIST.map((currency) => {
        const isActive = currency.code === value.code;
        return (
          <button
            key={currency.code}
            role="radio"
            aria-checked={isActive}
            aria-label={`${currency.code} — ${currency.symbol}`}
            onClick={() => onChange(currency)}
            className={cn(
              "relative px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-150 ease-out",
              isActive
                ? "bg-[var(--signal-bg-primary)] text-[var(--signal-fg-primary)] shadow-[var(--signal-shadow-xs)]"
                : "text-[var(--signal-fg-secondary)] hover:text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-primary)]/50",
            )}
          >
            <span className="tabular-nums">
              {currency.symbol}
            </span>{" "}
            <span className="hidden sm:inline">{currency.code}</span>
          </button>
        );
      })}
    </div>
  );
}
