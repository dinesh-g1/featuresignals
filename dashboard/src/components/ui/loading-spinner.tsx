"use client";

import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { PrismLotus } from "@/components/prism-lotus";

/* ---- existing border-spinner variant ---- */

const spinnerVariants = cva(
  "animate-spin rounded-full border-2 border-[var(--signal-border-accent-muted)] border-t-accent",
  {
    variants: {
      size: {
        sm: "h-4 w-4",
        md: "h-6 w-6",
        lg: "h-8 w-8",
      },
    },
    defaultVariants: {
      size: "lg",
    },
  },
);

/* ---- lotus size to pixel mapping ---- */
const LOTUS_SIZE_MAP: Record<string, number> = {
  sm: 32,
  md: 48,
  lg: 64,
};

interface LoadingSpinnerProps extends VariantProps<typeof spinnerVariants> {
  className?: string;
  fullPage?: boolean;
  /** Which visual to show. "spinner" = traditional border spinner, "lotus" = animated Prism Lotus. */
  variant?: "spinner" | "lotus";
}

export function LoadingSpinner({
  size,
  className,
  fullPage = false,
  variant = "spinner",
}: LoadingSpinnerProps) {
  // ---- lotus variant ----
  if (variant === "lotus") {
    const px = LOTUS_SIZE_MAP[size ?? "lg"] ?? 40;

    const lotus = (
      <PrismLotus
        size={px}
        variant="icon"
        animated
        showWordmark={false}
        colorScheme="default"
        className={className}
      />
    );

    if (fullPage) {
      return (
        <div className="flex items-center justify-center py-24">{lotus}</div>
      );
    }

    return lotus;
  }

  // ---- traditional border-spinner variant ----
  const spinner = (
    <div
      role="status"
      aria-label="Loading"
      className={cn(spinnerVariants({ size }), className)}
    />
  );

  if (fullPage) {
    return (
      <div className="flex items-center justify-center py-24">{spinner}</div>
    );
  }

  return spinner;
}
