"use client";

import { usePathname } from "next/navigation";
import { ContextSelector } from "@/components/context-selector";
import { Breadcrumb } from "@/components/breadcrumb";
import { CommandPaletteButton } from "@/components/command-palette";

export function ContextBar() {
  const pathname = usePathname();
  const isOrgPage =
    pathname?.startsWith("/settings/billing") ||
    pathname?.startsWith("/settings/sso") ||
    pathname?.startsWith("/audit") ||
    pathname?.startsWith("/approvals");

  return (
    <div className="shrink-0 border-b border-slate-200/40 bg-white/80 backdrop-blur-xl relative z-[50]">
      <div className="flex items-center gap-1.5 px-3 py-1.5 sm:px-5 lg:px-6">
        {/* Project & Environment selectors */}
        {!isOrgPage && <ContextSelector />}

        {/* Breadcrumb */}
        <Breadcrumb />

        {/* Command palette trigger */}
        <div className="ml-auto shrink-0">
          <CommandPaletteButton />
        </div>
      </div>
    </div>
  );
}
