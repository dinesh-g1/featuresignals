"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAppStore } from "@/stores/app-store";
import { useUpgradeNudge } from "@/hooks/use-upgrade-nudge";
import { Sparkles, X, AlertTriangle } from "lucide-react";

const DISMISS_KEY = "fs-upgrade-banner-dismissed";

export function UpgradeBanner() {
  const organization = useAppStore((s) => s.organization);
  const [dismissed, setDismissed] = useState(true);
  const { nudges } = useUpgradeNudge();

  useEffect(() => {
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === "true");
  }, []);

  if (organization?.plan !== "free" || dismissed) return null;

  const limitNudge = nudges.find((n) => n.type === "limit_reached");

  function handleDismiss() {
    sessionStorage.setItem(DISMISS_KEY, "true");
    setDismissed(true);
  }

  if (limitNudge) {
    return (
      <div className="flex items-center justify-between bg-amber-600 px-4 py-2.5 text-sm text-white">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          <span className="font-medium">{limitNudge.title}.</span>
          <span className="hidden sm:inline">{limitNudge.message}</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/settings/billing"
            className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50"
          >
            Upgrade Now
          </Link>
          <button
            onClick={handleDismiss}
            className="rounded p-0.5 text-amber-200 hover:text-white"
            aria-label="Dismiss upgrade banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between bg-slate-800 px-4 py-2.5 text-sm text-white">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-amber-400" />
        <span>
          You&apos;re on the <span className="font-semibold">Free</span> plan.
          Unlock unlimited projects, environments, and team members.
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/settings/billing"
          className="rounded-md bg-accent px-3 py-1 text-xs font-semibold text-white hover:bg-accent-dark"
        >
          Upgrade to Pro
        </Link>
        <button
          onClick={handleDismiss}
          className="rounded p-0.5 text-slate-400 hover:text-white"
          aria-label="Dismiss upgrade banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
