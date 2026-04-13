"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface Tab {
  lang: string;
  label: string;
  code: string;
}

export function CodeTabs({ tabs, id }: { tabs: Tab[]; id: string }) {
  const [active, setActive] = useState(0);

  if (!tabs || tabs.length === 0) return null;

  return (
    <div className="mt-4 overflow-hidden rounded-xl bg-slate-950 ring-1 ring-white/10">
      <div className="flex overflow-x-auto scrollbar-hide border-b border-white/10">
        {tabs.map((tab, i) => (
          <button
            key={`${id}-${i}`}
            onClick={() => setActive(i)}
            className={cn(
              "shrink-0 px-4 py-2.5 text-xs font-medium transition-colors duration-150",
              i === active
                ? "border-b-2 border-indigo-400 text-indigo-300 bg-white/5"
                : "text-slate-400 hover:text-slate-300",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto p-4">
        <pre className="text-xs leading-relaxed text-slate-300 sm:text-sm">
          <code>{tabs[active].code}</code>
        </pre>
      </div>
    </div>
  );
}
