"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAppStore } from "@/stores/app-store";

const DOWNGRADE_DISMISSED_KEY = "fs-downgrade-interstitial-dismissed";
const DOWNGRADE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function TrialBanner() {
  const plan = useAppStore((s) => s.organization?.plan);
  const trialExpiresAt = useAppStore((s) => s.organization?.trial_expires_at);
  const logout = useAppStore((s) => s.logout);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [showDowngradeInterstitial, setShowDowngradeInterstitial] =
    useState(false);

  useEffect(() => {
    if (plan === "trial" && trialExpiresAt) {
      const update = () => {
        const expiryMs = new Date(trialExpiresAt).getTime();
        const remaining = Math.max(
          0,
          Math.ceil((expiryMs - Date.now()) / 86400000),
        );
        setDaysRemaining(remaining);
      };
      update();
      const interval = setInterval(update, 60000);
      return () => clearInterval(interval);
    }

    setDaysRemaining(null);

    if (plan === "free" && trialExpiresAt) {
      const expiryMs = new Date(trialExpiresAt).getTime();
      const daysSinceExpiry = Date.now() - expiryMs;
      const alreadyDismissed =
        localStorage.getItem(DOWNGRADE_DISMISSED_KEY) === "true";
      if (
        daysSinceExpiry > 0 &&
        daysSinceExpiry < DOWNGRADE_WINDOW_MS &&
        !alreadyDismissed
      ) {
        setShowDowngradeInterstitial(true);
      }
    }
  }, [plan, trialExpiresAt]);

  function dismissDowngradeInterstitial() {
    localStorage.setItem(DOWNGRADE_DISMISSED_KEY, "true");
    setShowDowngradeInterstitial(false);
  }

  if (showDowngradeInterstitial) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#25292e]/80 backdrop-blur-sm">
        <div className="mx-4 max-w-md rounded-[var(--radius-large)] bg-[var(--bgColor-default)] p-8 shadow-[var(--shadow-floating-large)]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bgColor-attention-muted)]">
            <svg
              className="h-7 w-7 text-[var(--fgColor-attention)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          </div>
          <h2 className="text-center text-xl font-bold text-[var(--fgColor-default)]">
            Your trial has ended
          </h2>
          <p className="mt-2 text-center text-sm text-[var(--fgColor-muted)]">
            Your 14-day Pro trial has expired. You&apos;ve been moved to the
            Free plan. Upgrade anytime to unlock unlimited projects,
            environments, and team members.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/settings/billing"
              onClick={dismissDowngradeInterstitial}
              className="block w-full rounded-lg bg-[var(--bgColor-accent-emphasis)] py-2.5 text-center text-sm font-semibold text-white hover:bg-[#0757ba]"
            >
              Upgrade to Pro
            </Link>
            <button
              onClick={dismissDowngradeInterstitial}
              className="rounded-lg border border-[var(--borderColor-default)] py-2 text-sm font-medium text-[var(--fgColor-muted)] hover:bg-[var(--bgColor-muted)]"
            >
              Continue with Free Plan
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (plan !== "trial" || daysRemaining === null) return null;

  if (daysRemaining <= 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#25292e]/80 backdrop-blur-sm">
        <div className="mx-4 max-w-md rounded-[var(--radius-large)] bg-[var(--bgColor-default)] p-8 shadow-[var(--shadow-floating-large)]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bgColor-attention-muted)]">
            <svg
              className="h-7 w-7 text-[var(--fgColor-attention)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          </div>
          <h2 className="text-center text-xl font-bold text-[var(--fgColor-default)]">
            Your trial has expired
          </h2>
          <p className="mt-2 text-center text-sm text-[var(--fgColor-muted)]">
            Your 14-day Pro trial is over. Upgrade to keep all Pro features, or
            continue with the free plan.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/settings/billing"
              className="block w-full rounded-lg bg-[var(--bgColor-accent-emphasis)] py-2.5 text-center text-sm font-semibold text-white hover:bg-[#0757ba]"
            >
              Upgrade to Pro
            </Link>
            <p className="text-center text-xs text-[var(--fgColor-subtle)]">
              Your account has been downgraded to the Free plan. All your data
              is preserved.
            </p>
            <button
              onClick={logout}
              className="text-sm text-[var(--fgColor-subtle)] hover:text-[var(--fgColor-muted)]"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (daysRemaining <= 3) {
    return (
      <div className="flex items-center justify-between bg-[var(--bgColor-attention-emphasis)] px-4 py-2.5 text-sm text-white">
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
          <span className="font-medium">
            Trial expires in {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}
            !
          </span>
          <span className="hidden sm:inline">
            Upgrade now to keep all Pro features.
          </span>
        </div>
        <Link
          href="/settings/billing"
          className="rounded-md bg-white/20 px-3 py-1 text-xs font-medium text-white hover:bg-white/30"
        >
          Upgrade Now
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between bg-[var(--bgColor-accent-emphasis)] px-4 py-2 text-sm text-white">
      <div className="flex items-center gap-2">
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
          />
        </svg>
        <span>
          Pro trial &mdash; {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}{" "}
          remaining. Full Pro features included.
        </span>
      </div>
      <Link
        href="/settings/billing"
        className="rounded-md bg-white/20 px-3 py-1 text-xs font-medium text-white hover:bg-white/30"
      >
        View Plans
      </Link>
    </div>
  );
}
