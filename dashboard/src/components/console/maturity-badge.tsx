"use client";

/**
 * MaturityBadge — Displays the org's current maturity level and provides
 * a dropdown to upgrade (admin/owner only).
 *
 * The badge shows a short label (L1–L5) with the level's semantic color.
 * Clicking opens a dropdown listing available upgrades (levels ≥ current).
 * Downgrades are not permitted via UI.
 *
 * Signal UI tokens only. Zero hardcoded hex colors. Zero `any`.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, ChevronUp, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MATURITY_LEVELS,
  MATURITY_LEVEL_OPTIONS,
} from "@/lib/console-constants";
import type { MaturityLevel } from "@/lib/console-types";

export interface MaturityBadgeProps {
  /** Current maturity level (1-5) */
  level: MaturityLevel;
  /** Whether the current user can change the level */
  canManage: boolean;
  /** Called when the user selects a new level */
  onChangeLevel?: (level: MaturityLevel) => void;
  /** Whether a level change is in progress */
  changing?: boolean;
}

export function MaturityBadge({
  level,
  canManage,
  onChangeLevel,
  changing = false,
}: MaturityBadgeProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const info = MATURITY_LEVELS[level];
  const buttonLabel = info ? `${info.shortLabel} ${info.label}` : `L${level}`;

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const handleSelect = useCallback(
    (newLevel: MaturityLevel) => {
      setOpen(false);
      if (onChangeLevel && newLevel !== level) {
        onChangeLevel(newLevel);
      }
    },
    [level, onChangeLevel],
  );

  const badgeColor = info?.color ?? "var(--signal-bg-secondary)";
  const badgeTextColor = info?.textColor ?? "var(--signal-fg-secondary)";

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => canManage && setOpen((o) => !o)}
        disabled={changing}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
          "text-[10px] font-semibold leading-relaxed",
          "border border-[var(--signal-border-subtle)]",
          "transition-all duration-[var(--signal-duration-fast)]",
          canManage &&
            "cursor-pointer hover:shadow-[var(--signal-shadow-sm)] hover:-translate-y-px",
          !canManage && "cursor-default",
          changing && "opacity-60",
        )}
        style={{
          backgroundColor: badgeColor,
          color: badgeTextColor,
        }}
        aria-label={`Organization maturity: ${buttonLabel}${canManage ? ". Click to change." : ""}`}
        aria-haspopup={canManage ? "listbox" : undefined}
        aria-expanded={canManage ? open : undefined}
      >
        <span>{info?.shortLabel ?? `L${level}`}</span>
        <span className="hidden sm:inline">{info?.label ?? ""}</span>
        {canManage &&
          (open ? (
            <ChevronUp className="h-3 w-3 opacity-60" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3 w-3 opacity-60" aria-hidden="true" />
          ))}
        {!canManage && (
          <Lock className="h-2.5 w-2.5 opacity-50" aria-hidden="true" />
        )}
      </button>

      {/* Dropdown */}
      {open && canManage && (
        <div
          className={cn(
            "absolute left-0 top-full mt-1 z-50",
            "min-w-[200px] rounded-[var(--signal-radius-lg)]",
            "border border-[var(--signal-border-subtle)]",
            "bg-[var(--signal-bg-primary)]",
            "shadow-[var(--signal-shadow-lg)]",
            "py-1",
            "animate-slide-up",
          )}
          role="listbox"
          aria-label="Select maturity level"
        >
          <div className="px-3 py-1.5 border-b border-[var(--signal-border-subtle)]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
              Switch mode
            </p>
          </div>
          {MATURITY_LEVEL_OPTIONS.filter((opt) => opt.level >= level).map(
            (opt) => {
              const isCurrent = opt.level === level;
              return (
                <button
                  key={opt.level}
                  type="button"
                  role="option"
                  aria-selected={isCurrent}
                  onClick={() => handleSelect(opt.level)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-left",
                    "transition-colors duration-[var(--signal-duration-fast)]",
                    "hover:bg-[var(--signal-bg-secondary)]",
                    isCurrent && "bg-[var(--signal-bg-secondary)]",
                  )}
                >
                  <span
                    className="inline-flex items-center justify-center h-5 w-5 rounded-full text-[9px] font-bold shrink-0"
                    style={{
                      backgroundColor: opt.color,
                      color: opt.textColor,
                    }}
                  >
                    {opt.shortLabel}
                  </span>
                  <span className="flex-1 text-xs text-[var(--signal-fg-primary)]">
                    {opt.label}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] text-[var(--signal-fg-tertiary)] shrink-0">
                      Current
                    </span>
                  )}
                </button>
              );
            },
          )}
          <div className="px-3 py-1.5 border-t border-[var(--signal-border-subtle)]">
            <p className="text-[10px] text-[var(--signal-fg-tertiary)] leading-relaxed">
              Need to downgrade?{" "}
              <span className="text-[var(--signal-fg-accent)]">
                Contact support
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
