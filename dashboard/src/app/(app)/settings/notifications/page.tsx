"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { toast } from "@/components/toast";
import { PageHeader, Card, CardHeader, Button } from "@/components/ui";
import { BellIcon, MailIcon, LoaderIcon } from "@/components/icons/nav-icons";

const PREFS = [
  {
    value: "all",
    label: "All updates",
    description:
      "Product tips, weekly digest, feature announcements, and all notifications",
  },
  {
    value: "important",
    label: "Important only",
    description:
      "Trial reminders, payment alerts, security notifications, and team invites",
  },
  {
    value: "transactional",
    label: "Transactional only",
    description:
      "Verification codes, receipts, and account security alerts — nothing else",
  },
];

export default function NotificationsPage() {
  const token = useAppStore((s) => s.token);
  const [consent, setConsent] = useState(true);
  const [preference, setPreference] = useState("all");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.getDismissedHints(token).catch(() => {});
  }, [token]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      await api.updateEmailPreferences(token, { consent, preference });
      toast("Email preferences updated", "success");
    } catch {
      toast("Failed to update preferences", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Control what emails FeatureSignals sends you"
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MailIcon className="h-4 w-4 text-[var(--signal-fg-secondary)]" />
            <h2 className="font-semibold text-[var(--signal-fg-primary)]">
              Email Preferences
            </h2>
          </div>
        </CardHeader>
        <div className="space-y-4 px-4 pb-6 sm:px-6">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="email-consent"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--signal-border-emphasis)] text-[var(--signal-fg-accent)] focus:ring-[var(--signal-fg-accent)]"
            />
            <label
              htmlFor="email-consent"
              className="text-sm font-medium text-[var(--signal-fg-primary)]"
            >
              I agree to receive emails from FeatureSignals
            </label>
          </div>

          {consent && (
            <div className="ml-7 space-y-3">
              {PREFS.map((p) => (
                <label
                  key={p.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all ${
                    preference === p.value
                      ? "border-[var(--signal-border-accent-muted)] bg-[var(--signal-bg-accent-muted)] ring-1 ring-[var(--signal-border-accent-muted)]"
                      : "border-[var(--signal-border-default)] hover:border-[var(--signal-border-emphasis)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="email-pref"
                    value={p.value}
                    checked={preference === p.value}
                    onChange={() => setPreference(p.value)}
                    className="mt-0.5 h-4 w-4 border-[var(--signal-border-emphasis)] text-[var(--signal-fg-accent)] focus:ring-[var(--signal-fg-accent)]"
                  />
                  <div>
                    <span className="text-sm font-medium text-[var(--signal-fg-primary)]">
                      {p.label}
                    </span>
                    <p className="mt-0.5 text-xs text-[var(--signal-fg-secondary)]">
                      {p.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <LoaderIcon className="h-4 w-4 animate-spin" />
              ) : (
                <BellIcon className="h-4 w-4" />
              )}
              Save Preferences
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
