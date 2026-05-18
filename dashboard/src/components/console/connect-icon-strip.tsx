"use client";

/**
 * ConnectIconStrip — Vertical icon strip shown in the collapsed CONNECT
 * zone (48px wide). Each icon displays a count badge and serves as a
 * clickable shortcut to expand the zone and jump to that section.
 *
 * Design: Don Norman principles
 * - Visibility of system status: count badges show what's connected
 * - Recognition over recall: recognizable icons without expanding
 * - Feedback: hover tooltips, click response
 */

import { GitBranch, Terminal, Bot, Key, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConsoleMaturity } from "@/hooks/use-console-maturity";
import { useConsoleIntegrations } from "@/hooks/use-console-integrations";

// ─── Types ───────────────────────────────────────────────────────────

export type ConnectSection =
  | "repositories"
  | "sdks"
  | "agents"
  | "api-keys"
  | "policies";

export interface ConnectIconStripProps {
  /** Called when the user clicks an icon. The layout should expand. */
  onExpand: (section?: ConnectSection) => void;
}

interface IconItem {
  key: ConnectSection;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
  /** maturity level at which this icon appears; null = always show */
  minMaturity: number | null;
}

// ─── Component ───────────────────────────────────────────────────────

export function ConnectIconStrip({ onExpand }: ConnectIconStripProps) {
  const { data: integrations } = useConsoleIntegrations();
  const { isL1 } = useConsoleMaturity();

  const reposData = integrations?.repositories?.data ?? [];
  const sdksData = integrations?.sdks?.data ?? [];
  const agentsData = integrations?.agents?.data ?? [];
  const apiKeysData = integrations?.api_keys?.data ?? [];
  const policiesData = integrations?.policies?.data ?? [];

  const activeSdks = sdksData.filter((s) => s.status === "active").length;
  const onlineAgents = agentsData.filter((a) => a.status === "online").length;
  const activeKeys = apiKeysData.filter((k) => k.status === "active").length;
  const enabledPolicies = policiesData.filter((p) => p.enabled).length;

  const items: IconItem[] = [
    {
      key: "repositories",
      icon: GitBranch,
      label: "Repositories",
      count: reposData.length,
      minMaturity: null,
    },
    {
      key: "sdks",
      icon: Terminal,
      label: "SDKs",
      count: activeSdks,
      minMaturity: null,
    },
    {
      key: "agents",
      icon: Bot,
      label: "Agents",
      count: onlineAgents,
      minMaturity: 2, // L2+
    },
    {
      key: "api-keys",
      icon: Key,
      label: "API Keys",
      count: activeKeys,
      minMaturity: 2, // L2+
    },
    {
      key: "policies",
      icon: Shield,
      label: "Policies",
      count: enabledPolicies,
      minMaturity: 2, // L2+
    },
  ];

  // Filter by maturity
  const visibleItems = items.filter((item) => {
    if (item.minMaturity === null) return true;
    if (item.minMaturity === 2) return !isL1;
    return true;
  });

  return (
    <div className="flex flex-col items-center gap-2 py-3 h-full">
      {/* Header label — minimal */}
      <div className="mb-1">
        <span className="text-[9px] font-semibold uppercase tracking-widest text-[var(--signal-fg-tertiary)] leading-none">
          CN
        </span>
      </div>

      {visibleItems.map((item) => (
        <button
          key={item.key}
          type="button"
          title={item.label}
          onClick={() => onExpand(item.key)}
          className={cn(
            "relative flex h-8 w-8 items-center justify-center rounded-lg",
            "text-[var(--signal-fg-tertiary)]",
            "hover:bg-[var(--signal-bg-accent-muted)] hover:text-[var(--signal-fg-accent)]",
            "transition-colors duration-[var(--signal-duration-fast)]",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-fg-accent)]",
            "group",
          )}
          aria-label={`${item.label} (${item.count})`}
        >
          <item.icon className="h-4 w-4" aria-hidden="true" />
          {/* Count badge */}
          {item.count > 0 && (
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-[3px]",
                "bg-[var(--signal-bg-accent-emphasis)] text-[var(--signal-fg-on-emphasis)]",
                "text-[8px] font-bold leading-none",
                "pointer-events-none",
              )}
            >
              {item.count > 99 ? "99+" : item.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
