"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFeatures } from "@/hooks/use-features";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";

interface SettingsTab {
  href: string;
  label: string;
  gatedFeature?: string;
}

const settingsTabs: SettingsTab[] = [
  { href: "/settings/general", label: "General" },
  { href: "/settings/billing", label: "Billing" },
  { href: "/settings/api-keys", label: "API Keys" },
  { href: "/settings/team", label: "Team" },
  { href: "/settings/webhooks", label: "Webhooks", gatedFeature: "webhooks" },
  { href: "/settings/notifications", label: "Notifications" },
  { href: "/settings/sso", label: "SSO", gatedFeature: "sso" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isEnabled, minPlanFor } = useFeatures();

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Settings</h1>

      <nav className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-1 border-b border-slate-200 min-w-max">
          {settingsTabs.map((tab) => {
            const active = pathname === tab.href || pathname === tab.href + "/";
            const locked = tab.gatedFeature ? !isEnabled(tab.gatedFeature) : false;
            const requiredPlan = tab.gatedFeature ? minPlanFor(tab.gatedFeature) : null;
            return (
              <Link
                key={tab.href}
                href={locked ? "/settings/billing" : tab.href}
                title={locked ? `Upgrade to ${requiredPlan} to unlock ${tab.label}` : undefined}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors sm:px-4",
                  locked
                    ? "text-slate-400 hover:text-amber-600"
                    : active
                      ? "border-b-2 border-indigo-600 text-indigo-600"
                      : "text-slate-500 hover:text-slate-700",
                )}
              >
                {tab.label}
                {locked && <Lock className="h-3 w-3 text-amber-500" strokeWidth={2} />}
              </Link>
            );
          })}
        </div>
      </nav>

      {children}
    </div>
  );
}
