"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const settingsTabs = [
  { href: "/settings/general", label: "General" },
  { href: "/settings/billing", label: "Billing" },
  { href: "/settings/api-keys", label: "API Keys" },
  { href: "/settings/team", label: "Team" },
  { href: "/settings/webhooks", label: "Webhooks" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Settings</h1>

      <nav className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-1 border-b border-slate-200 min-w-max">
          {settingsTabs.map((tab) => {
            const active = pathname === tab.href || pathname === tab.href + "/";
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors sm:px-4",
                  active ? "border-b-2 border-indigo-600 text-indigo-600" : "text-slate-500 hover:text-slate-700",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {children}
    </div>
  );
}
