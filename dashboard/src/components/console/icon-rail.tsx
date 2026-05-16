"use client";

/**
 * IconRail — 48px icon-only left rail for zone access.
 *
 * Always visible in console view. Provides icon buttons for:
 *   - Connect (integrations, repos, SDKs, API keys, agents)
 *   - Learn (impact, cost, velocity, insights)
 *
 * Reads/writes floatingPanel directly from useConsoleStore.
 */

import { useCallback } from "react";
import { useConsoleStore } from "@/stores/console-store";
import { cn } from "@/lib/utils";
import { Plug, BookOpen } from "lucide-react";

export function IconRail() {
  const floatingPanel = useConsoleStore((s) => s.floatingPanel);
  const setFloatingPanel = useConsoleStore((s) => s.setFloatingPanel);

  const toggleConnect = useCallback(() => {
    setFloatingPanel(floatingPanel === "connect" ? null : "connect");
  }, [floatingPanel, setFloatingPanel]);

  const toggleLearn = useCallback(() => {
    setFloatingPanel(floatingPanel === "learn" ? null : "learn");
  }, [floatingPanel, setFloatingPanel]);

  return (
    <div
      className={cn(
        "w-12 shrink-0 flex flex-col items-center py-3 gap-3",
        "bg-[var(--signal-bg-primary)] border-r border-[var(--signal-border-subtle)]",
      )}
    >
      {/* Connect */}
      <button
        type="button"
        onClick={toggleConnect}
        className={cn(
          "p-2 rounded-lg transition-colors",
          "text-[var(--signal-fg-tertiary)] hover:text-[var(--signal-fg-primary)]",
          "hover:bg-[var(--signal-bg-secondary)]",
          floatingPanel === "connect" &&
            "text-[var(--signal-accent-primary)] bg-[var(--signal-bg-accent-subtle)]",
        )}
        aria-label="Connect panel"
        title="Connect — Repos, SDKs, Agents, API Keys"
      >
        <Plug className="h-4 w-4" />
      </button>

      {/* Learn */}
      <button
        type="button"
        onClick={toggleLearn}
        className={cn(
          "p-2 rounded-lg transition-colors",
          "text-[var(--signal-fg-tertiary)] hover:text-[var(--signal-fg-primary)]",
          "hover:bg-[var(--signal-bg-secondary)]",
          floatingPanel === "learn" &&
            "text-[var(--signal-accent-primary)] bg-[var(--signal-bg-accent-subtle)]",
        )}
        aria-label="Learn panel"
        title="Learn — Impact, Cost, Velocity, Insights"
      >
        <BookOpen className="h-4 w-4" />
      </button>
    </div>
  );
}
