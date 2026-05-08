"use client";

import { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Copy, Check } from "lucide-react";

interface CopyButtonProps {
  /** Text to copy to clipboard */
  value: string;
  /** Optional label shown before/after copy */
  label?: string;
  /** Size variant */
  size?: "sm" | "md" | "icon";
  /** Additional class */
  className?: string;
  /** Called after successful copy */
  onCopied?: () => void;
  /** Aria label for accessibility */
  ariaLabel?: string;
}

/**
 * CopyButton — reusable copy-to-clipboard button with visual feedback.
 *
 * Features:
 * - Shows "Copy" by default
 * - Changes to "Copied!" with a checkmark for 2 seconds after clicking
 * - Uses the Clipboard API
 * - Accessible with proper ARIA labels
 * - Handles clipboard API errors gracefully
 */
export function CopyButton({
  value,
  label = "Copy",
  size = "sm",
  className,
  onCopied,
  ariaLabel = "Copy to clipboard",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(async () => {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      onCopied?.();

      // Clear previous timeout if any
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setCopied(false);
        timeoutRef.current = null;
      }, 2000);
    } catch {
      // Fallback for older browsers or permission denied
      // Try using a textarea fallback
      try {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        setCopied(true);
        onCopied?.();

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          setCopied(false);
          timeoutRef.current = null;
        }, 2000);
      } catch {
        // Clipboard not available
      }
    }
  }, [value, onCopied]);

  const sizeClasses = {
    sm: "h-7 px-2.5 text-[11px] gap-1 rounded-sm",
    md: "h-8 px-3 text-xs gap-1.5 rounded-md",
    icon: "h-8 w-8 p-0 rounded-md",
  };

  const isIconOnly = size === "icon";

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-150 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-fg-accent)]/40 focus-visible:ring-offset-2",
        "active:scale-[0.97]",
        sizeClasses[size],
        copied
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60"
          : "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-secondary)] border border-[var(--signal-border-default)] hover:bg-[#e8eaed] hover:text-[var(--signal-fg-primary)]",
        className,
      )}
      aria-label={isIconOnly ? ariaLabel : undefined}
      title={isIconOnly ? ariaLabel : undefined}
    >
      {copied ? (
        <>
          <Check className={cn(isIconOnly ? "h-4 w-4" : "h-3.5 w-3.5")} aria-hidden="true" />
          {!isIconOnly && "Copied!"}
        </>
      ) : (
        <>
          <Copy className={cn(isIconOnly ? "h-4 w-4" : "h-3.5 w-3.5")} aria-hidden="true" />
          {!isIconOnly && label}
        </>
      )}
    </button>
  );
}
