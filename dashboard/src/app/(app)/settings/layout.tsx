"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { useFeatures } from "@/hooks/use-features";
import { cn } from "@/lib/utils";
import { LockIcon } from "@/components/icons/nav-icons";

// Pages that live under /settings but render their own layout (top-level nav items)
const STANDALONE_SETTINGS_PAGES = ["/settings/billing", "/settings/sso"];

interface SettingsTab {
  href: string;
  label: string;
  gatedFeature?: string;
}

const settingsTabs: SettingsTab[] = [
  { href: "/settings/general", label: "General" },
  { href: "/settings/integrations", label: "Integrations" },
  { href: "/settings/notifications", label: "Notifications" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isEnabled, minPlanFor } = useFeatures();

  const isStandalone = STANDALONE_SETTINGS_PAGES.some(
    (p) => pathname === p || pathname?.startsWith(p + "/"),
  );

  if (isStandalone) {
    return <Suspense fallback={<div className="p-6" />}>{children}</Suspense>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--signal-fg-primary)]">
        Settings
      </h1>

      <nav className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-1 border-b border-[var(--signal-border-default)] min-w-max">
          {settingsTabs.map((tab) => {
            const active = pathname === tab.href || pathname === tab.href + "/";
            const locked = tab.gatedFeature
              ? !isEnabled(tab.gatedFeature)
              : false;
            const requiredPlan = tab.gatedFeature
              ? minPlanFor(tab.gatedFeature)
              : null;
            return (
              <Link
                key={tab.href}
                href={locked ? "/settings/billing" : tab.href}
                title={
                  locked
                    ? `Upgrade to ${requiredPlan} to unlock ${tab.label}`
                    : undefined
                }
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors sm:px-4 border-b-2 -mb-px",
                  locked
                    ? "text-[var(--signal-fg-tertiary)] hover:text-amber-600 border-transparent"
                    : active
                      ? "border-[var(--signal-fg-accent)] text-[var(--signal-fg-accent)]"
                      : "border-transparent text-[var(--signal-fg-secondary)] hover:text-[var(--signal-fg-primary)] hover:border-[var(--signal-border-emphasis)]",
                )}
              >
                {tab.label}
                {locked && <LockIcon className="h-3 w-3 text-amber-500" />}
              </Link>
            );
          })}
        </div>
      </nav>

      <Suspense fallback={<div className="p-6" />}>{children}</Suspense>
    </div>
  );
}
