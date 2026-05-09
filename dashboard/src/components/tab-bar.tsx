"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { path } from "@/lib/paths";

const tabs = [
  { href: path("/projects"), label: "Projects" },
  { href: path("/usage"), label: "Usage" },
  { href: path("/activity"), label: "Activities" },
  { href: path("/limits"), label: "Limits" },
  { href: path("/support"), label: "Support" },
] as const;

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="flex items-center gap-0.5 border-b border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)]/80 backdrop-blur-md px-4 sm:px-6 shrink-0"
      aria-label="Organization navigation"
    >
      {tabs.map((tab) => {
        const active =
          pathname === tab.href || pathname.startsWith(tab.href + "/");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "px-3 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap",
              active
                ? "border-[var(--signal-fg-accent)] text-[var(--signal-fg-accent)]"
                : "border-transparent text-[var(--signal-fg-secondary)] hover:text-[var(--signal-fg-primary)] hover:border-[var(--signal-border-emphasis)]",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
