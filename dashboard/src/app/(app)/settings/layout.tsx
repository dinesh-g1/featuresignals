"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

      <nav className="flex gap-1 border-b border-slate-200">
        {settingsTabs.map((tab) => {
          const active = pathname === tab.href || pathname === tab.href + "/";
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${active ? "border-b-2 border-indigo-600 text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
