"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAppStore } from "@/stores/app-store";
import { useUpgradeNudge } from "@/hooks/use-upgrade-nudge";
import { SparklesIcon, XIcon, AlertIcon } from "@/components/icons/nav-icons";

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
      <div className="flex items-center justify-between bg-[var(--bgColor-attention-emphasis)] px-4 py-2.5 text-sm text-white">
        <div className="flex items-center gap-2">
          <AlertIcon className="h-4 w-4" />
          <span className="font-medium">{limitNudge.title}.</span>
          <span className="hidden sm:inline">{limitNudge.message}</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/settings/billing"
            className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-[var(--fgColor-attention)] hover:bg-[var(--bgColor-attention-muted)]"
          >
            Upgrade Now
          </Link>
          <button
            onClick={handleDismiss}
            className="rounded p-0.5 text-white/70 hover:text-white"
            aria-label="Dismiss upgrade banner"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between bg-[var(--bgColor-emphasis)] px-4 py-2.5 text-sm text-white">
      <div className="flex items-center gap-2">
        <SparklesIcon className="h-4 w-4 text-[var(--fgColor-attention)]" />
        <span>
          You&apos;re on the <span className="font-semibold">Free</span> plan.
          Unlock unlimited projects, environments, and team members.
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/settings/billing"
          className="rounded-md bg-[var(--bgColor-accent-emphasis)] px-3 py-1 text-xs font-semibold text-white hover:bg-[#0757ba]"
        >
          Upgrade to Pro
        </Link>
        <button
          onClick={handleDismiss}
          className="rounded p-0.5 text-[var(--fgColor-subtle)] hover:text-white"
          aria-label="Dismiss upgrade banner"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
