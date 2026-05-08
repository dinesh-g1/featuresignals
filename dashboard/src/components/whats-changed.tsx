"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { RelativeTime } from "@/components/ui/relative-time";
import { EnhancedEmptyState } from "@/components/ui/enhanced-empty-state";
import { Card } from "@/components/ui";
import { Button } from "@/components/ui";
import {
  ToggleLeft,
  ToggleRight,
  PlusCircle,
  Edit,
  Trash2,
  Users,
  Settings,
  GitBranch,
  Activity,
  ArrowRight,
} from "lucide-react";
import type { AuditEntry } from "@/lib/types";

// ─── Action Config ───────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    label: string;
  }
> = {
  "flag.created": {
    icon: PlusCircle,
    color: "text-emerald-500",
    label: "created",
  },
  "flag.updated": { icon: Edit, color: "text-blue-500", label: "updated" },
  "flag.deleted": { icon: Trash2, color: "text-red-500", label: "deleted" },
  "flag.enabled": {
    icon: ToggleRight,
    color: "text-emerald-500",
    label: "enabled",
  },
  "flag.disabled": {
    icon: ToggleLeft,
    color: "text-slate-500",
    label: "disabled",
  },
  "state.updated": {
    icon: Edit,
    color: "text-blue-500",
    label: "updated targeting for",
  },
  "rule.created": {
    icon: GitBranch,
    color: "text-purple-500",
    label: "added rule to",
  },
  "rule.updated": {
    icon: GitBranch,
    color: "text-purple-500",
    label: "updated rule on",
  },
  "rule.deleted": {
    icon: Trash2,
    color: "text-red-500",
    label: "removed rule from",
  },
  "member.invited": { icon: Users, color: "text-blue-500", label: "invited" },
  "member.removed": { icon: Users, color: "text-red-500", label: "removed" },
  "settings.updated": {
    icon: Settings,
    color: "text-slate-500",
    label: "updated settings for",
  },
};

const DEFAULT_ACTION = {
  icon: Activity,
  color: "text-slate-500",
  label: "modified",
};

// ─── Description Builder ─────────────────────────────────────────────────────

function buildDescription(entry: AuditEntry): string {
  const config = ACTION_CONFIG[entry.action] || DEFAULT_ACTION;
  const resourceName = entry.resource_id
    ? `"${entry.resource_id}"`
    : entry.resource_type || "resource";
  const actorName = entry.actor_type || "Someone";

  return `${actorName} ${config.label} ${resourceName}`;
}

// ─── What's Changed Timeline Item ────────────────────────────────────────────

function TimelineItem({ entry }: { entry: AuditEntry }) {
  const config = ACTION_CONFIG[entry.action] || DEFAULT_ACTION;
  const Icon = config.icon;
  const description = buildDescription(entry);

  return (
    <div className="flex items-start gap-3 py-2.5">
      {/* Icon */}
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          "bg-[var(--signal-bg-secondary)]",
        )}
      >
        <Icon className={cn("h-3.5 w-3.5", config.color)} aria-hidden="true" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-[var(--signal-fg-primary)] leading-relaxed line-clamp-2">
          {description}
        </p>
        <div className="mt-0.5">
          <RelativeTime date={entry.created_at} className="text-[10px]" />
        </div>
      </div>
    </div>
  );
}

// ─── What's Changed Component ────────────────────────────────────────────────

interface WhatsChangedProps {
  /** Audit log entries, most recent first */
  entries: AuditEntry[];
  /** Whether data is loading */
  loading?: boolean;
  /** Whether there was an error fetching data */
  error?: string | null;
  /** Project ID for the "View all activity" link */
  projectId?: string;
  /** Maximum number of items to show (default 10) */
  maxItems?: number;
  /** Additional class */
  className?: string;
}

export function WhatsChanged({
  entries,
  loading = false,
  error = null,
  projectId,
  maxItems = 10,
  className,
}: WhatsChangedProps) {
  const router = useRouter();

  const visibleEntries = useMemo(
    () => entries.slice(0, maxItems),
    [entries, maxItems],
  );

  const handleViewAll = () => {
    if (projectId) {
      router.push(`/projects/${projectId}/audit`);
    }
  };

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--signal-border-default)]/60">
        <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)]">
          What&apos;s changed?
        </h3>
        {visibleEntries.length > 0 && projectId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleViewAll}
            className="text-xs gap-1"
          >
            View all
            <ArrowRight className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="py-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 animate-pulse">
              <div className="h-7 w-7 rounded-full bg-[var(--signal-bg-secondary)] shrink-0" />
              <div className="flex-1 space-y-1.5 pt-1">
                <div className="h-3 w-3/4 rounded bg-[var(--signal-bg-secondary)]" />
                <div className="h-2.5 w-16 rounded bg-[var(--signal-bg-secondary)]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="py-8 text-center">
          <p className="text-xs text-[var(--signal-fg-danger)]">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && entries.length === 0 && (
        <EnhancedEmptyState
          variant="no-data"
          title="No recent changes"
          description="Activity from your team will appear here."
          className="py-8"
        />
      )}

      {/* Timeline */}
      {!loading && !error && visibleEntries.length > 0 && (
        <div className="divide-y divide-[var(--signal-border-default)]/40">
          {visibleEntries.map((entry) => (
            <TimelineItem key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </Card>
  );
}
