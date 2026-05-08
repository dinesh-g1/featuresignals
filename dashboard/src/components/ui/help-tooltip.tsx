"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  HelpCircleIcon,
  ExternalLinkIcon,
} from "@/components/icons/nav-icons";

interface HelpTooltipProps {
  /** Short explanation text or rich React content */
  content: string | React.ReactNode;
  /** Optional URL to full documentation */
  docsUrl?: string;
  /** Docs link label (defaults to "Learn more") */
  docsLabel?: string;
  /** The element this tooltip describes */
  children: React.ReactNode;
  /** Additional class for the wrapper */
  className?: string;
}

/**
 * HelpTooltip — Contextual help displayed on hover/focus.
 *
 * Renders a small "?" icon next to the trigger. On hover or keyboard focus,
 * a tooltip appears with a brief explanation and an optional "Learn more →"
 * link to documentation.
 *
 * Accessible: uses aria-describedby, supports keyboard focus, and manages
 * focus order so screen readers can access the tooltip content.
 */
export function HelpTooltip({
  content,
  docsUrl,
  docsLabel = "Learn more",
  children,
  className,
}: HelpTooltipProps) {
  const [visible, setVisible] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tooltipId = useRef(
    `help-tooltip-${Math.random().toString(36).slice(2, 9)}`,
  );

  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => setVisible(false), []);

  // Dismiss on Escape
  useEffect(() => {
    if (!visible) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setVisible(false);
        triggerRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [visible]);

  // Dismiss when clicking outside
  useEffect(() => {
    if (!visible) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setVisible(false);
      }
    }
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [visible]);

  return (
    <span className={cn("relative inline-flex items-center gap-1", className)}>
      {children}
      <span
        ref={triggerRef}
        role="button"
        tabIndex={0}
        aria-describedby={visible ? tooltipId.current : undefined}
        aria-label="Show help"
        aria-expanded={visible}
        className={cn(
          "inline-flex cursor-help items-center justify-center",
          "text-[var(--signal-fg-tertiary)] transition-colors",
          "hover:text-[var(--signal-fg-accent)]",
          "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--signal-fg-accent)]",
        )}
        onMouseEnter={show}
        onFocus={show}
        onMouseLeave={hide}
        onBlur={(e) => {
          if (
            tooltipRef.current &&
            !tooltipRef.current.contains(e.relatedTarget)
          ) {
            hide();
          }
        }}
        onClick={() => setVisible((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setVisible((v) => !v);
          }
        }}
      >
        <HelpCircleIcon className="h-3.5 w-3.5" />
      </span>

      {visible && (
        <div
          ref={tooltipRef}
          id={tooltipId.current}
          role="tooltip"
          className={cn(
            "absolute top-full left-0 z-50 mt-1 w-64 max-w-[calc(100vw-2rem)]",
            "rounded-lg border border-[var(--signal-border-default)]",
            "bg-[var(--signal-bg-primary)] px-3 py-2.5 shadow-lg",
            "animate-fade-in text-sm leading-relaxed",
          )}
          onMouseEnter={show}
          onMouseLeave={hide}
          onFocus={show}
          onBlur={(e) => {
            if (
              triggerRef.current &&
              !triggerRef.current.contains(e.relatedTarget)
            ) {
              hide();
            }
          }}
        >
          <div className="text-[var(--signal-fg-primary)]">
            {typeof content === "string" ? <p>{content}</p> : content}
          </div>
          {docsUrl && (
            <a
              href={docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "mt-1.5 inline-flex items-center gap-1 text-xs font-medium",
                "text-[var(--signal-fg-accent)] hover:underline underline-offset-2",
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {docsLabel}
              <ExternalLinkIcon className="h-3 w-3" />
            </a>
          )}
        </div>
      )}
    </span>
  );
}
