"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { cn, timeAgo } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  LoadingSpinner,
  EmptyState,
} from "@/components/ui";
import { InlineError } from "@/components/ui/inline-error";
import {
  FlagIcon,
  CheckIcon,
  XIcon,
  AlertTriangleIcon,
  ClockIcon,
  PencilIcon,
  TrashIcon,
  RocketIcon,
  TargetIcon,
  TimerIcon,
  GitCompareIcon,
  ChevronRightIcon,
  HistoryIcon,
} from "lucide-react";
import type { AuditEntry } from "@/lib/types";

// ─── Types ──────────────────────────────────────────────────────────

interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  actor: string;
  actorId?: string;
  timestamp: string;
  description: string;
  metadata?: Record<string, unknown>;
}

type TimelineEventType =
  | "created"
  | "enabled"
  | "disabled"
  | "rules-updated"
  | "promoted"
  | "deleted"
  | "scheduled-change"
  | "unknown";

// ─── Helpers ────────────────────────────────────────────────────────

function parseActionToEventType(action: string): TimelineEventType {
  const lower = action.toLowerCase();
  if (lower.includes("create") || lower.includes("created")) return "created";
  if (
    lower.includes("enable") ||
    lower.includes("enabled") ||
    lower.includes("turned_on")
  )
    return "enabled";
  if (
    lower.includes("disable") ||
    lower.includes("disabled") ||
    lower.includes("turned_off")
  )
    return "disabled";
  if (
    lower.includes("rule") ||
    lower.includes("targeting") ||
    lower.includes("update")
  )
    return "rules-updated";
  if (lower.includes("promote") || lower.includes("promoted"))
    return "promoted";
  if (
    lower.includes("delete") ||
    lower.includes("deleted") ||
    lower.includes("remove")
  )
    return "deleted";
  if (lower.includes("schedule") || lower.includes("scheduled"))
    return "scheduled-change";
  return "unknown";
}

function eventConfig(event: TimelineEventType) {
  switch (event) {
    case "created":
      return {
        icon: CheckIcon,
        dotClass: "bg-emerald-500 ring-emerald-200",
        iconClass: "text-emerald-600",
        label: "Created",
      };
    case "enabled":
      return {
        icon: CheckIcon,
        dotClass: "bg-blue-500 ring-blue-200",
        iconClass: "text-blue-600",
        label: "Enabled",
      };
    case "disabled":
      return {
        icon: XIcon,
        dotClass: "bg-slate-400 ring-slate-200",
        iconClass: "text-slate-500",
        label: "Disabled",
      };
    case "rules-updated":
      return {
        icon: TargetIcon,
        dotClass: "bg-amber-500 ring-amber-200",
        iconClass: "text-amber-600",
        label: "Rules updated",
      };
    case "promoted":
      return {
        icon: RocketIcon,
        dotClass: "bg-purple-500 ring-purple-200",
        iconClass: "text-purple-600",
        label: "Promoted",
      };
    case "deleted":
      return {
        icon: TrashIcon,
        dotClass: "bg-red-500 ring-red-200",
        iconClass: "text-red-600",
        label: "Deleted",
      };
    case "scheduled-change":
      return {
        icon: TimerIcon,
        dotClass: "bg-gray-400 ring-gray-200",
        iconClass: "text-gray-500",
        label: "Scheduled",
      };
    default:
      return {
        icon: ClockIcon,
        dotClass: "bg-gray-300 ring-gray-200",
        iconClass: "text-gray-500",
        label: "Change",
      };
  }
}

function buildDescription(
  entry: AuditEntry,
  eventType: TimelineEventType,
): string {
  // Try to extract meaningful description from the audit entry
  const resource = entry.resource_type?.replace(/_/g, " ") || "item";

  switch (eventType) {
    case "created":
      return `Created ${resource}`;
    case "enabled":
      return `Enabled flag`;
    case "disabled":
      return `Disabled flag`;
    case "rules-updated":
      return `Updated targeting rules`;
    case "promoted":
      return `Promoted to environment`;
    case "deleted":
      return `Deleted ${resource}`;
    case "scheduled-change":
      return `Scheduled a change`;
    default:
      return `${entry.action} on ${resource}`;
  }
}

// ─── Timeline Item ──────────────────────────────────────────────────

function TimelineItem({
  event,
  isLast,
}: {
  event: TimelineEvent;
  isLast: boolean;
}) {
  const cfg = eventConfig(event.type);
  const Icon = cfg.icon;

  return (
    <div className="flex gap-4">
      {/* Timeline track */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full ring-2",
            cfg.dotClass,
            "bg-white",
          )}
        >
          <Icon className={cn("h-4 w-4", cfg.iconClass)} />
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 bg-[var(--signal-border-default)] min-h-[20px]" />
        )}
      </div>

      {/* Event content */}
      <div className={cn("pb-5", isLast ? "pb-0" : "")}>
        <div className="flex items-baseline gap-2 flex-wrap">
          <Badge variant="default" className="text-xs font-mono">
            {cfg.label}
          </Badge>
          <span className="text-xs text-[var(--signal-fg-secondary)]">
            {timeAgo(event.timestamp)}
          </span>
        </div>
        <p className="mt-1 text-sm text-[var(--signal-fg-primary)]">
          {event.description}
        </p>
        <p className="mt-0.5 text-xs text-[var(--signal-fg-secondary)]">
          {event.actor || "System"}
        </p>

        {/* Optional: View diff link for rules-updated */}
        {event.type === "rules-updated" && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 h-auto px-0 py-0 text-xs text-[var(--signal-fg-accent)] hover:underline"
          >
            <GitCompareIcon className="mr-1 h-3 w-3" />
            View diff
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export interface FlagTimelineProps {
  flagId: string;
}

export function FlagTimeline({ flagId }: FlagTimelineProps) {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch audit entries — pass projectId if available for scoping
      const auditEntries = await api.listAudit(
        token,
        50,
        0,
        projectId ?? undefined,
      );

      // Filter to entries relevant to this flag and map to timeline events
      const flagEvents = auditEntries
        .filter((entry: AuditEntry) => {
          // Match by resource_id (flag ID) or resource_type
          const matchesResource = entry.resource_id === flagId;
          const isFlagResource =
            entry.resource_type === "flag" ||
            entry.resource_type === "flag_state" ||
            entry.resource_type === "targeting_rule";
          return matchesResource || isFlagResource;
        })
        .slice(0, 20)
        .map((entry: AuditEntry) => {
          const eventType = parseActionToEventType(entry.action);
          return {
            id: entry.id,
            type: eventType,
            actor: entry.actor_id || entry.actor_type || "System",
            actorId: entry.actor_id,
            timestamp: entry.created_at,
            description: buildDescription(entry, eventType),
          } as TimelineEvent;
        });

      setEvents(flagEvents);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load flag timeline",
      );
    } finally {
      setLoading(false);
    }
  }, [token, projectId, flagId]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  // ─── Loading State ────────────────────────────────────────────────

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HistoryIcon className="h-4 w-4 text-[var(--signal-fg-secondary)]" />
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── Error State ──────────────────────────────────────────────────

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HistoryIcon className="h-4 w-4 text-[var(--signal-fg-secondary)]" />
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8">
          <EmptyState
            icon={AlertTriangleIcon}
            title="Failed to load timeline"
            description={error}
            action={
              <Button onClick={fetchTimeline} variant="secondary" size="sm">
                Retry
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  // ─── Empty State ──────────────────────────────────────────────────

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HistoryIcon className="h-4 w-4 text-[var(--signal-fg-secondary)]" />
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8">
          <EmptyState
            icon={ClockIcon}
            title="No activity yet"
            description="Changes to this flag will appear here as they happen."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <HistoryIcon className="h-4 w-4 text-[var(--signal-fg-secondary)]" />
            Activity Timeline
          </CardTitle>
          <Badge variant="default">{events.length} events</Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="px-4 py-4 sm:px-6">
          {events.map((event, idx) => (
            <TimelineItem
              key={event.id}
              event={event}
              isLast={idx === events.length - 1}
            />
          ))}
        </div>

        {/* View full audit log link */}
        <div className="border-t border-[var(--signal-border-default)] px-4 py-3 sm:px-6">
          <Button variant="ghost" size="sm" className="text-xs" asChild>
            <Link href="/activity" className="inline-flex items-center gap-1">
              <HistoryIcon className="h-3 w-3" />
              View full audit log
              <ChevronRightIcon className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
