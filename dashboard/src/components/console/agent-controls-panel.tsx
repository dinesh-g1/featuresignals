"use client";

/**
 * AgentControlsPanel — Shows agent detail & configuration in the CONNECT
 * zone under "Your Agents". Displays agent name, type, status, maturity
 * level, heartbeat, and a configuration form placeholder.
 *
 * Data comes from the console integrations endpoint (already fetched).
 *
 * States: loading (skeleton), empty (no agents), success (agent details).
 *
 * Signal UI tokens only. Zero hardcoded hex colors.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Activity,
  Clock,
  Wrench,
  ChevronDown,
  ChevronRight,
  Settings,
  ExternalLink,
  Shield,
  Zap,
} from "lucide-react";
import type { AgentStatus } from "@/lib/console-types";

// ─── Types ───────────────────────────────────────────────────────────

interface AgentControlsPanelProps {
  agents: AgentStatus[];
  loading?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────

function formatRelativeTime(isoString?: string): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Skeleton ────────────────────────────────────────────────────────

function AgentSkeleton() {
  return (
    <div className="animate-pulse space-y-3 px-3 py-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={`agent-sk-${i}`} className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-[var(--signal-border-default)]" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3 w-24 rounded bg-[var(--signal-border-default)]" />
            <div className="h-2 w-16 rounded bg-[var(--signal-border-default)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Empty ───────────────────────────────────────────────────────────

function AgentEmpty() {
  const router = useRouter();
  return (
    <div className="px-3 py-2 text-center">
      <p className="text-[11px] text-[var(--signal-fg-secondary)]">
        No agents registered.
      </p>
      <button
        type="button"
        onClick={() => router.push("/console/agents")}
        className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--signal-fg-accent)] hover:underline mt-1"
      >
        Register your first AI agent
        <ExternalLink className="h-3 w-3" />
      </button>
    </div>
  );
}

// ─── Agent Card ──────────────────────────────────────────────────────

function AgentCard({ agent }: { agent: AgentStatus }) {
  const [expanded, setExpanded] = useState(false);
  const state = agent.status === "online"
    ? "online"
    : agent.status === "degraded"
      ? "degraded"
      : "offline";

  const stateColors: Record<string, { dot: string; label: string }> = {
    online: { dot: "var(--signal-fg-success)", label: "Online" },
    degraded: { dot: "var(--signal-fg-warning)", label: "Degraded" },
    offline: { dot: "var(--signal-fg-tertiary)", label: "Offline" },
  };

  const sc = stateColors[state] ?? stateColors.offline;

  return (
    <div className="rounded-[var(--signal-radius-sm)] border border-[var(--signal-border-subtle)] overflow-hidden transition-shadow duration-[var(--signal-duration-fast)] hover:shadow-[var(--signal-shadow-sm)]">
      {/* Header row */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors duration-[var(--signal-duration-fast)] hover:bg-[var(--signal-bg-secondary)]"
        aria-expanded={expanded}
      >
        {/* Avatar */}
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
          style={{
            backgroundColor: "var(--signal-bg-accent-muted)",
            color: "var(--signal-fg-accent)",
          }}
        >
          {agent.name.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-[var(--signal-fg-primary)] truncate">
              {agent.name}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-[var(--signal-fg-tertiary)]">
              {agent.type}
            </span>
            <span className="flex items-center gap-1">
              <span
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ backgroundColor: sc.dot }}
              />
              <span className="text-[9px] font-medium" style={{ color: sc.dot }}>
                {sc.label}
              </span>
            </span>
          </div>
        </div>

        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--signal-fg-tertiary)]" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--signal-fg-tertiary)]" />
        )}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="border-t border-[var(--signal-border-subtle)] px-3 py-2.5 space-y-2.5 bg-[var(--signal-bg-secondary)]"
        >
          {/* Status details */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
                Status
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Activity className="h-3 w-3 text-[var(--signal-fg-tertiary)]" />
                <span className="text-[11px] text-[var(--signal-fg-primary)] capitalize">
                  {state}
                </span>
              </div>
            </div>
            <div>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
                Tasks Completed
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Shield
                  className="h-3 w-3"
                  style={{ color: "var(--signal-fg-accent)" }}
                />
                <span className="text-[11px] font-medium text-[var(--signal-fg-primary)]">
                  {agent.tasks_completed.toLocaleString()}
                </span>
              </div>
            </div>
            <div>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
                Last Heartbeat
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Clock className="h-3 w-3 text-[var(--signal-fg-tertiary)]" />
                <span className="text-[11px] text-[var(--signal-fg-primary)]">
                  {agent.last_heartbeat
                    ? formatRelativeTime(agent.last_heartbeat)
                    : "Never"}
                </span>
              </div>
            </div>
            <div>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
                Actions
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Zap className="h-3 w-3 text-[var(--signal-fg-accent)]" />
                <span className="text-[11px] text-[var(--signal-fg-primary)]">
                  {agent.status === "online" ? "Active" : "Idle"}
                </span>
              </div>
            </div>
          </div>

          {/* Config section */}
          <div className="pt-2 border-t border-[var(--signal-border-subtle)]">
            <div className="flex items-center gap-1.5 mb-2">
              <Wrench className="h-3 w-3 text-[var(--signal-fg-tertiary)]" />
              <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
                Configuration
              </span>
            </div>
            <div className="space-y-2 text-[10px] text-[var(--signal-fg-secondary)]">
              <div className="flex items-center justify-between">
                <span>Rate Limits</span>
                <span className="text-[var(--signal-fg-primary)] font-mono">
                  {agent.rate_limits
                    ? `${agent.rate_limits.per_minute}/min · ${agent.rate_limits.per_hour}/hr · ${agent.rate_limits.concurrent} concurrent`
                    : "—/min · —/hr · — concurrent"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Scopes</span>
                <span className="text-[var(--signal-fg-primary)]">
                  {agent.scopes && agent.scopes.length > 0
                    ? agent.scopes.slice(0, 3).join(", ")
                    : "None configured"}
                  {agent.scopes && agent.scopes.length > 3 && ` +${agent.scopes.length - 3} more`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Maturity</span>
                <span className="inline-flex items-center gap-1">
                  <span
                    className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold"
                    style={{
                      backgroundColor: "var(--signal-bg-accent-muted)",
                      color: "var(--signal-fg-accent)",
                    }}
                  >
                    L{agent.maturity_level ?? 1}
                  </span>
                </span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-[var(--signal-border-subtle)]">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[var(--signal-fg-accent)] hover:underline"
              >
                <Settings className="h-3 w-3" />
                Configure in Agent Manager
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export function AgentControlsPanel({
  agents,
  loading = false,
}: AgentControlsPanelProps) {
  const router = useRouter();
  return (
    <div className="space-y-2">
      {loading ? (
        <AgentSkeleton />
      ) : agents.length === 0 ? (
        <AgentEmpty />
      ) : (
        <>
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
          {/* Global agent settings */}
          <button
            type="button"
            onClick={() => router.push("/console/agents")}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-[var(--signal-radius-sm)] border border-[var(--signal-border-subtle)] py-1.5 text-[11px] font-medium text-[var(--signal-fg-secondary)] transition-colors duration-[var(--signal-duration-fast)] hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)]"
          >
            <Settings className="h-3 w-3" />
            Manage Agents
          </button>
        </>
      )}
    </div>
  );
}
