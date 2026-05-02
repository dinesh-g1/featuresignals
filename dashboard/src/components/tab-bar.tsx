"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/projects", label: "Projects" },
  { href: "/usage", label: "Usage" },
  { href: "/activity", label: "Activities" },
  { href: "/limits", label: "Limits" },
  { href: "/support", label: "Support" },
] as const;

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="flex items-center gap-0.5 border-b border-[var(--borderColor-default)] bg-[var(--bgColor-default)]/80 backdrop-blur-md px-4 sm:px-6 shrink-0"
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
                ? "border-[var(--fgColor-accent)] text-[var(--fgColor-accent)]"
                : "border-transparent text-[var(--fgColor-muted)] hover:text-[var(--fgColor-default)] hover:border-[var(--borderColor-emphasis)]",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
