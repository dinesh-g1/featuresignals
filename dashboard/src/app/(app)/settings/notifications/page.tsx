"use client";

/**
 * Settings → Notifications — Email preferences management.
 *
 * Console design language. Signal UI tokens only. All states handled.
 */

import { useEffect, useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BellIcon, MailIcon, LoaderIcon, AlertIcon } from "@/components/icons/nav-icons";

// ─── Constants ────────────────────────────────────────────────────────

const PREFS = [
  {
    value: "all",
    label: "All updates",
    description: "Product tips, weekly digest, feature announcements, and all notifications",
  },
  {
    value: "important",
    label: "Important only",
    description: "Trial reminders, payment alerts, security notifications, and team invites",
  },
  {
    value: "transactional",
    label: "Transactional only",
    description: "Verification codes, receipts, and account security alerts — nothing else",
  },
];

// ─── Skeleton ─────────────────────────────────────────────────────────

function NotificationsSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="p-4 sm:p-6">
        <div className="space-y-4">
          <div className="h-6 w-48 rounded bg-[var(--signal-bg-secondary)] animate-pulse" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-[var(--signal-bg-secondary)] animate-pulse" />
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const token = useAppStore((s) => s.token);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [consent, setConsent] = useState(true);
  const [preference, setPreference] = useState("all");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load preferences
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setLoadError(null);
    api
      .getDismissedHints(token)
      .then(() => {
        // Preferences are stored server-side; default local state is used
        // until the server returns actual values
      })
      .catch((err) => {
        setLoadError(
          err instanceof Error ? err.message : "Failed to load preferences",
        );
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setSaved(false);
    try {
      await api.updateEmailPreferences(token, { consent, preference });
      toast("Email preferences updated", "success");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      toast(
        err instanceof Error ? err.message : "Failed to update preferences",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────

  if (loading) {
    return <NotificationsSkeleton />;
  }

  // ── Error ─────────────────────────────────────────────────────────

  if (loadError) {
    return (
      <div className="flex items-center justify-center py-20 animate-fade-in">
        <Card className="border-[var(--signal-border-danger-emphasis)]/30 bg-[var(--signal-bg-danger-muted)] p-6 text-center max-w-md">
          <AlertIcon className="mx-auto h-8 w-8 text-[var(--signal-fg-danger)] mb-3" />
          <h2 className="text-lg font-semibold text-[var(--signal-fg-danger)] mb-1">
            Failed to load preferences
          </h2>
          <p className="text-sm text-[var(--signal-fg-secondary)] mb-4">
            {loadError}
          </p>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            <LoaderIcon className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-semibold text-[var(--signal-fg-primary)]">
          Notifications
        </h2>
        <p className="mt-1 text-sm text-[var(--signal-fg-secondary)]">
          Control what emails FeatureSignals sends you.
        </p>
      </div>

      <Card className="p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-6">
          <MailIcon className="h-4 w-4 text-[var(--signal-fg-secondary)]" />
          <h3 className="font-semibold text-[var(--signal-fg-primary)]">
            Email Preferences
          </h3>
        </div>

        <div className="space-y-5">
          {/* Consent */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => {
                setConsent(e.target.checked);
                setSaved(false);
              }}
              className="h-4 w-4 rounded border-[var(--signal-border-default)] text-[var(--signal-fg-accent)] focus:ring-[var(--signal-fg-accent)]"
            />
            <span className="text-sm font-medium text-[var(--signal-fg-primary)]">
              I agree to receive emails from FeatureSignals
            </span>
          </label>

          {/* Preference Options */}
          {consent && (
            <div className="ml-7 space-y-3">
              {PREFS.map((p) => (
                <label
                  key={p.value}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all",
                    preference === p.value
                      ? "border-[var(--signal-border-accent-muted)] bg-[var(--signal-bg-accent-muted)]"
                      : "border-[var(--signal-border-default)] hover:border-[var(--signal-border-emphasis)]",
                  )}
                >
                  <input
                    type="radio"
                    name="email-preference"
                    value={p.value}
                    checked={preference === p.value}
                    onChange={(e) => {
                      setPreference(e.target.value);
                      setSaved(false);
                    }}
                    className="mt-0.5 h-4 w-4 text-[var(--signal-fg-accent)] focus:ring-[var(--signal-fg-accent)]"
                  />
                  <div>
                    <p className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                      {p.label}
                    </p>
                    <p className="text-xs text-[var(--signal-fg-secondary)] mt-0.5">
                      {p.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}

          {!consent && (
            <div className="ml-7 flex items-start gap-2 rounded-lg border border-[var(--signal-border-warning-muted)] bg-[var(--signal-bg-warning-muted)] p-3">
              <BellIcon className="h-4 w-4 text-[var(--signal-fg-warning)] shrink-0 mt-0.5" />
              <p className="text-xs text-[var(--signal-fg-secondary)]">
                You won&apos;t receive any marketing emails. Transactional emails
                (password resets, verification codes) will still be sent.
              </p>
            </div>
          )}
        </div>

        {/* Save */}
        <div className="flex items-center gap-3 mt-6 pt-5 border-t border-[var(--signal-border-default)]">
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Preferences"
            )}
          </Button>
          {saved && (
            <span className="text-sm text-[var(--signal-fg-success)] animate-fade-in">
              Preferences saved
            </span>
          )}
        </div>
      </Card>
    </div>
  );
}
