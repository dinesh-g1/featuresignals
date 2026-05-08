"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { SparklesIcon } from "@/components/icons/nav-icons";

// ─── Storage helpers ─────────────────────────────────────────────────────

const SEEN_KEY = "fs_feature_seen";
const DISMISSED_KEY = "fs_feature_dismissed";

interface FeatureRecord {
  firstSeen: number;
  showCount: number;
}

function getSeenFeatures(): Record<string, FeatureRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSeenFeatures(records: Record<string, FeatureRecord>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(records));
  } catch {
    // Silently ignore storage errors
  }
}

function getDismissedFeatures(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function dismissFeature(featureKey: string) {
  if (typeof window === "undefined") return;
  try {
    const dismissed = getDismissedFeatures();
    if (!dismissed.includes(featureKey)) {
      dismissed.push(featureKey);
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed));
    }
  } catch {
    // Silently ignore storage errors
  }
}

// ─── Constants ───────────────────────────────────────────────────────────

const MAX_SHOW_COUNT = 3;
const AUTO_DISMISS_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── Component ───────────────────────────────────────────────────────────

interface NewBadgeProps {
  /** Unique feature identifier, e.g. "env-comparison", "ai-janitor" */
  featureKey: string;
  /** The content the badge is attached to */
  children: React.ReactNode;
  /** Additional class for the badge pill */
  className?: string;
}

/**
 * NewBadge — A "NEW" pill badge for feature discovery.
 *
 * Shows a small sparkle "New" badge next to children. Tracks impressions
 * in localStorage. Auto-dismisses after:
 * - Being clicked
 * - Being shown 3 times
 * - 7 days from first sight
 */
export function NewBadge({ featureKey, children, className }: NewBadgeProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = getDismissedFeatures();
    if (dismissed.includes(featureKey)) return;

    const seen = getSeenFeatures();
    const record = seen[featureKey];

    if (!record) {
      seen[featureKey] = { firstSeen: Date.now(), showCount: 1 };
      saveSeenFeatures(seen);
      setVisible(true);
      return;
    }

    if (Date.now() - record.firstSeen > AUTO_DISMISS_MS) {
      dismissFeature(featureKey);
      return;
    }

    if (record.showCount >= MAX_SHOW_COUNT) {
      dismissFeature(featureKey);
      return;
    }

    seen[featureKey] = {
      ...record,
      showCount: record.showCount + 1,
    };
    saveSeenFeatures(seen);
    setVisible(true);
  }, [featureKey]);

  const handleDismiss = useCallback(() => {
    dismissFeature(featureKey);
    setVisible(false);
  }, [featureKey]);

  if (!visible) return <>{children}</>;

  return (
    <span className="relative inline-flex items-center gap-1.5">
      {children}
      <span
        role="status"
        aria-label={`New feature: ${featureKey}`}
        className={cn(
          "inline-flex cursor-pointer items-center gap-0.5 rounded-full px-1.5 py-0.5",
          "bg-[var(--signal-fg-accent)] text-[9px] font-bold uppercase tracking-wide",
          "text-white shadow-sm transition-all select-none",
          "hover:bg-[var(--signal-fg-accent)]/90 active:scale-95",
          "animate-fade-in",
          className,
        )}
        onClick={handleDismiss}
        title="Click to dismiss"
      >
        <SparklesIcon className="h-2.5 w-2.5" />
        New
      </span>
    </span>
  );
}
