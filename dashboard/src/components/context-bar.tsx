"use client";

import { ContextSelector } from "@/components/context-selector";
import { Breadcrumb } from "@/components/breadcrumb";
import { CommandPaletteButton } from "@/components/command-palette";

export function ContextBar() {
  return (
    <div className="shrink-0 border-b border-slate-200/50 bg-white/70 shadow-sm shadow-slate-100/80 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-4 py-2 sm:px-6 lg:px-8">
        {/* Project & Environment selectors */}
        <ContextSelector />

        {/* Divider */}
        <div className="hidden h-6 w-px bg-slate-200 sm:block" />

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
