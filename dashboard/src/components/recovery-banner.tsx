"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/stores/app-store";

const DISMISSED_KEY = "fs-recovery-banner-dismissed";

/**
 * RecoveryBanner — shown on all console pages when the organization is
 * soft-deleted (has `deleted_at` set). The user can log in within 30 days
 * to recover the organization.
 *
 * Amber/warning design tokens. Dismissible per session.
 */
export function RecoveryBanner() {
  const organization = useAppStore((s) => s.organization);
  const deletedAt = organization?.deleted_at;

  const [dismissed, setDismissed] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [deletionDate, setDeletionDate] = useState<string>("");

  useEffect(() => {
    if (!deletedAt) {
      setDaysRemaining(null);
      return;
    }

    const expiryDate = new Date(deletedAt);
    // 30-day grace period from deletion date
    const hardDeleteDate = new Date(
      expiryDate.getTime() + 30 * 24 * 60 * 60 * 1000
    );

    setDeletionDate(
      hardDeleteDate.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    );

    const update = () => {
      const remaining = Math.max(
        0,
        Math.ceil((hardDeleteDate.getTime() - Date.now()) / 86400000)
      );
      setDaysRemaining(remaining);
    };

    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [deletedAt]);

  // Check local storage dismiss
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem(DISMISSED_KEY) === "true") {
      setDismissed(true);
    }
  }, []);

  if (!deletedAt || dismissed) return null;

  return (
    <div className="border-b border-[var(--signal-border-warning-muted)] bg-[var(--signal-bg-warning-muted)] px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <svg
            className="h-5 w-5 flex-shrink-0 text-[var(--signal-fg-warning)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <div className="text-sm text-[var(--signal-fg-warning)]">
            <span className="font-semibold">
              Your organization is scheduled for deletion
            </span>
            {deletionDate && daysRemaining !== null && (
              <span>
                {" "}
                on{" "}
                <span className="font-bold">{deletionDate}</span> (
                {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining).
                Log in before this date to recover it.
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => {
            localStorage.setItem(DISMISSED_KEY, "true");
            setDismissed(true);
          }}
          className="flex-shrink-0 rounded p-1 text-[var(--signal-fg-tertiary)] transition-colors hover:bg-[var(--signal-bg-warning-muted)]/60 hover:text-[var(--signal-fg-warning)]"
          aria-label="Dismiss recovery banner"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
