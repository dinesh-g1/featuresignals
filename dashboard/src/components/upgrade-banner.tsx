"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAppStore } from "@/stores/app-store";
import { Sparkles, X } from "lucide-react";

const DISMISS_KEY = "fs-upgrade-banner-dismissed";

export function UpgradeBanner() {
  const organization = useAppStore((s) => s.organization);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === "true");
  }, []);

  if (organization?.plan !== "free" || dismissed) return null;

  function handleDismiss() {
    sessionStorage.setItem(DISMISS_KEY, "true");
    setDismissed(true);
  }

  return (
    <div className="flex items-center justify-between bg-slate-800 px-4 py-2.5 text-sm text-white">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-amber-400" />
        <span>
          You&apos;re on the <span className="font-semibold">Free</span> plan.
          Upgrade to Pro for unlimited projects, environments, and team members.
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/settings/billing"
          className="rounded-md bg-indigo-500 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-400"
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
