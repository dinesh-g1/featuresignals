"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { toast } from "@/components/toast";
import { PageHeader, Card, CardHeader, Button } from "@/components/ui";
import { Bell, Mail, Loader2 } from "lucide-react";

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
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.getDismissedHints(token).catch(() => {});
    setLoaded(true);
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
            <Mail className="h-4 w-4 text-slate-500" />
            <h2 className="font-semibold text-slate-900">Email Preferences</h2>
          </div>
        </CardHeader>
        <div className="space-y-4 px-4 pb-6 sm:px-6">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="email-consent"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent"
            />
            <label
              htmlFor="email-consent"
              className="text-sm font-medium text-slate-700"
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
                      ? "border-accent/30 bg-accent/10 ring-1 ring-accent/20"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="email-pref"
                    value={p.value}
                    checked={preference === p.value}
                    onChange={() => setPreference(p.value)}
                    className="mt-0.5 h-4 w-4 border-slate-300 text-accent focus:ring-accent"
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-700">
                      {p.label}
                    </span>
                    <p className="mt-0.5 text-xs text-slate-500">
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
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Bell className="h-4 w-4" />
              )}
              Save Preferences
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
