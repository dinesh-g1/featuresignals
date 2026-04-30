"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import type { ReactNode } from "react";

type BannerVariant = "info" | "warning" | "success" | "critical" | "upsell" | "unavailable";

interface BannerAction {
  label: string;
  onClick: () => void;
  variant?: "primary" | "default" | "danger";
}

interface BannerProps {
  variant?: BannerVariant;
  title?: string;
  description?: string | ReactNode;
  primaryAction?: BannerAction;
  secondaryAction?: BannerAction;
  onDismiss?: () => void;
  className?: string;
}

// ─── Inline Icons ──────────────────────────────────────────────────

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 1a7 7 0 1 0 7 7 7.008 7.008 0 0 0-7-7Zm0 12.5a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11ZM8.75 5.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm-.5 2a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3a.75.75 0 0 1 .75-.75Z" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM.5 8a7.5 7.5 0 1 1 15 0A7.5 7.5 0 0 1 .5 8Zm7.5-2.25a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3a.75.75 0 0 1 .75-.75Zm0 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
    </svg>
  );
}

function CheckFillIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16Zm3.78-9.72a.75.75 0 0 0-1.06-1.06L6.75 9.19 5.28 7.72a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l4.5-4.5Z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M4.47.22A.749.749 0 0 1 5 0h6c.199 0 .39.079.53.22l4.25 4.25c.141.14.22.331.22.53v6a.749.749 0 0 1-.22.53l-4.25 4.25A.749.749 0 0 1 11 16H5a.749.749 0 0 1-.53-.22L.22 11.53A.749.749 0 0 1 0 11V5c0-.199.079-.39.22-.53L4.47.22Zm.84 1.28L1.5 5.31v5.38l3.81 3.81h5.38l3.81-3.81V5.31L10.69 1.5H5.31ZM8 4.75a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V5.5A.75.75 0 0 1 8 4.75Zm0 6.75a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M7.784 1.026a.75.75 0 0 1 1.432 0l.634 2.126a.75.75 0 0 0 .521.522l2.127.634a.75.75 0 0 1 0 1.431l-2.127.634a.75.75 0 0 0-.521.522l-.634 2.127a.75.75 0 0 1-1.432 0l-.634-2.127a.75.75 0 0 0-.521-.522l-2.127-.634a.75.75 0 0 1 0-1.431l2.127-.634a.75.75 0 0 0 .521-.522l.634-2.126Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
    </svg>
  );
}

// ─── Variant Config ────────────────────────────────────────────────

const variantConfig: Record<
  BannerVariant,
  {
    icon: ReactNode;
    bg: string;
    border: string;
    titleColor: string;
    descColor: string;
  }
> = {
  info: {
    icon: <InfoIcon />,
    bg: "bg-[var(--bgColor-accent-muted)]",
    border: "border-[var(--borderColor-accent-muted)]",
    titleColor: "text-[var(--fgColor-accent)]",
    descColor: "text-[var(--fgColor-muted)]",
  },
  warning: {
    icon: <AlertIcon />,
    bg: "bg-[var(--bgColor-attention-muted)]",
    border: "border-[var(--borderColor-attention-muted)]",
    titleColor: "text-[var(--fgColor-attention)]",
    descColor: "text-[var(--fgColor-muted)]",
  },
  success: {
    icon: <CheckFillIcon />,
    bg: "bg-[var(--bgColor-success-muted)]",
    border: "border-[var(--borderColor-success-muted)]",
    titleColor: "text-[var(--fgColor-success)]",
    descColor: "text-[var(--fgColor-muted)]",
  },
  critical: {
    icon: <StopIcon />,
    bg: "bg-[var(--bgColor-danger-muted)]",
    border: "border-[var(--borderColor-danger-emphasis)]/30",
    titleColor: "text-[var(--fgColor-danger)]",
    descColor: "text-[var(--fgColor-muted)]",
  },
  upsell: {
    icon: <SparkleIcon />,
    bg: "bg-[var(--bgColor-done-muted)]",
    border: "border-[var(--borderColor-attention-muted)]",
    titleColor: "text-[var(--fgColor-done)]",
    descColor: "text-[var(--fgColor-muted)]",
  },
  unavailable: {
    icon: <AlertIcon />,
    bg: "bg-[var(--bgColor-muted)]",
    border: "border-[var(--borderColor-default)]",
    titleColor: "text-[var(--fgColor-muted)]",
    descColor: "text-[var(--fgColor-subtle)]",
  },
};

/**
 * Primer Banner component.
 *
 * Displays system-level messages with optional actions.
 * Variants: info, warning, success, critical, upsell, unavailable.
 */
export function Banner({
  variant = "info",
  title,
  description,
  primaryAction,
  secondaryAction,
  onDismiss,
  className,
}: BannerProps) {
  const cfg = variantConfig[variant];

  return (
    <div
      role={variant === "critical" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-[var(--radius-medium)] border p-4",
        cfg.bg,
        cfg.border,
        className,
      )}
    >
      {/* Icon */}
      <div className={cn("mt-0.5 shrink-0", cfg.titleColor)}>{cfg.icon}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {title && (
          <p className={cn("text-sm font-semibold", cfg.titleColor)}>
            {title}
          </p>
        )}
        {description && (
          <div
            className={cn(
              "text-sm leading-relaxed",
              title ? "mt-1" : "",
              cfg.descColor,
            )}
          >
            {typeof description === "string" ? (
              <p>{description}</p>
            ) : (
              description
            )}
          </div>
        )}

        {/* Actions */}
        {(primaryAction || secondaryAction) && (
          <div className="mt-3 flex items-center gap-2">
            {primaryAction && (
              <Button
                variant={primaryAction.variant ?? "primary"}
                size="sm"
                onClick={primaryAction.onClick}
              >
                {primaryAction.label}
              </Button>
            )}
            {secondaryAction && (
              <Button
                variant={secondaryAction.variant ?? "default"}
                size="sm"
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Dismiss */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={cn(
            "shrink-0 rounded-md p-1 transition-colors",
            "text-[var(--fgColor-subtle)] hover:bg-[#0000000d] hover:text-[var(--fgColor-default)]",
          )}
          aria-label="Dismiss banner"
        >
          <CloseIcon />
        </button>
      )}
    </div>
  );
}
