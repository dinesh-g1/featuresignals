"use client";

/**
 * ApprovalPanel — Shows approval requests in the feature detail panel
 * when a feature is in "approve" stage. Displays approver list, status,
 * comments, and approve/reject actions.
 *
 * Fetches from api.listApprovals and api.getApproval.
 *
 * States: loading (skeleton), error (retry), empty (no approvals), success.
 *
 * Signal UI tokens only. Zero hardcoded hex colors.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  MessageSquare,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import type { ApprovalRequest } from "@/lib/types";

// ─── Types ───────────────────────────────────────────────────────────

interface ApprovalPanelProps {
  flagKey: string;
  flagName: string;
  environment: string;
}

interface ApprovalWithMeta {
  id: string;
  status: string;
  requestorId: string;
  reviewNote?: string;
  reviewedAt?: string;
  createdAt: string;
  flagKey: string;
}

// ─── Helpers ────────────────────────────────────────────────────────

function approvalStatusColor(status: string): string {
  switch (status) {
    case "approved":
      return "var(--signal-fg-success)";
    case "rejected":
      return "var(--signal-fg-danger)";
    case "pending":
      return "var(--signal-fg-warning)";
    default:
      return "var(--signal-fg-tertiary)";
  }
}

function approvalStatusBg(status: string): string {
  switch (status) {
    case "approved":
      return "var(--signal-bg-success-muted)";
    case "rejected":
      return "var(--signal-bg-danger-muted)";
    case "pending":
      return "var(--signal-bg-warning-muted)";
    default:
      return "var(--signal-bg-secondary)";
  }
}

function ApprovalStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "approved":
      return (
        <CheckCircle2 className="h-4 w-4 text-[var(--signal-fg-success)]" />
      );
    case "rejected":
      return <XCircle className="h-4 w-4 text-[var(--signal-fg-danger)]" />;
    case "pending":
      return <Clock className="h-4 w-4 text-[var(--signal-fg-warning)]" />;
    default:
      return (
        <ShieldCheck className="h-4 w-4 text-[var(--signal-fg-tertiary)]" />
      );
  }
}

function timeAgo(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Section Header ──────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--signal-fg-secondary)]" />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
        {title}
      </span>
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────

function ApprovalSkeleton() {
  return (
    <div className="border-t border-[var(--signal-border-subtle)] animate-pulse">
      <div className="px-4 py-3 space-y-3">
        <div className="h-10 w-full rounded-[var(--signal-radius-sm)] bg-[var(--signal-border-default)]" />
        <div className="space-y-2">
          <div className="h-3 w-20 rounded bg-[var(--signal-border-default)]" />
          <div className="h-8 w-full rounded bg-[var(--signal-border-default)]" />
        </div>
      </div>
    </div>
  );
}

// ─── Error ───────────────────────────────────────────────────────────

function ApprovalError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="border-t border-[var(--signal-border-subtle)]">
      <div className="px-4 py-4 text-center">
        <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[var(--signal-bg-danger-muted)] ring-1 ring-[var(--signal-border-danger-emphasis)]/30 mb-2">
          <RefreshCw className="h-4 w-4 text-[var(--signal-fg-danger)]" />
        </div>
        <p className="text-xs text-[var(--signal-fg-secondary)] mb-2 leading-relaxed">
          {message}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--signal-fg-accent)] hover:underline"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      </div>
    </div>
  );
}

// ─── Empty ───────────────────────────────────────────────────────────

function ApprovalEmpty() {
  return (
    <div className="border-t border-[var(--signal-border-subtle)]">
      <div className="px-4 py-4 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--signal-bg-secondary)] ring-1 ring-[var(--signal-border-subtle)] shadow-sm mb-2">
          <ShieldCheck className="h-5 w-5 text-[var(--signal-fg-tertiary)]" />
        </div>
        <p className="text-xs text-[var(--signal-fg-secondary)] leading-relaxed">
          No approval requests yet.
        </p>
        <p className="text-[10px] text-[var(--signal-fg-tertiary)] mt-1">
          Create an approval request to require review before this change
          proceeds.
        </p>
      </div>
    </div>
  );
}

// ─── Approval Item ──────────────────────────────────────────────────

function ApprovalItem({
  approval,
  onApprove,
  onReject,
  acting,
}: {
  approval: ApprovalWithMeta;
  onApprove: (note: string) => void;
  onReject: (note: string) => void;
  acting: boolean;
}) {
  const [note, setNote] = useState("");

  return (
    <div
      className="px-3 py-2.5 rounded-[var(--signal-radius-sm)] border"
      style={{
        backgroundColor: approvalStatusBg(approval.status),
        borderColor: "var(--signal-border-subtle)",
      }}
    >
      {/* Status + info */}
      <div className="flex items-center gap-2 mb-2">
        <ApprovalStatusIcon status={approval.status} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-semibold capitalize"
              style={{ color: approvalStatusColor(approval.status) }}
            >
              {approval.status}
            </span>
            <span className="text-[10px] text-[var(--signal-fg-tertiary)]">
              {timeAgo(approval.createdAt)}
            </span>
          </div>
          {approval.reviewNote && (
            <div className="flex items-start gap-1 mt-1">
              <MessageSquare className="h-3 w-3 shrink-0 mt-0.5 text-[var(--signal-fg-tertiary)]" />
              <p className="text-[10px] text-[var(--signal-fg-secondary)] leading-relaxed">
                {approval.reviewNote}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Actions for pending approvals */}
      {approval.status === "pending" && (
        <div className="space-y-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note (optional)..."
            rows={2}
            className={cn(
              "w-full resize-none rounded-[var(--signal-radius-sm)] px-2 py-1.5",
              "text-xs text-[var(--signal-fg-primary)]",
              "bg-[var(--signal-bg-primary)] border border-[var(--signal-border-default)]",
              "placeholder:text-[var(--signal-fg-tertiary)]",
              "focus:outline-none focus:ring-1 focus:ring-[var(--signal-fg-accent)] focus:border-[var(--signal-border-accent-emphasis)]",
            )}
          />
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="xs"
              onClick={() => onApprove(note)}
              loading={acting}
              disabled={acting}
            >
              <ThumbsUp className="h-3 w-3" />
              Approve
            </Button>
            <Button
              variant="danger-ghost"
              size="xs"
              onClick={() => onReject(note)}
              loading={acting}
              disabled={acting}
            >
              <ThumbsDown className="h-3 w-3" />
              Reject
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export function ApprovalPanel({
  flagKey,
  flagName,
  environment,
}: ApprovalPanelProps) {
  const token = useAppStore((s) => s.token);

  const [approvals, setApprovals] = useState<ApprovalWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  // ── Fetch approvals ──────────────────────────────────────────────

  const fetchApprovals = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.listApprovals(token);
      const allApprovals = (result as unknown as ApprovalWithMeta[]) ?? [];
      setApprovals(allApprovals.filter((a) => a.flagKey === flagKey));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load approvals");
    } finally {
      setLoading(false);
    }
  }, [token, flagKey]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  // ── Review approval ──────────────────────────────────────────────

  const handleReview = useCallback(
    async (approvalId: string, action: "approve" | "reject", note: string) => {
      if (!token) return;
      setActing(true);
      try {
        await api.reviewApproval(token, approvalId, action, note);
        // Optimistic update
        setApprovals((prev) =>
          prev.map((a) =>
            a.id === approvalId
              ? {
                  ...a,
                  status: action === "approve" ? "approved" : "rejected",
                  reviewNote: note,
                }
              : a,
          ),
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to submit review",
        );
      } finally {
        setActing(false);
      }
    },
    [token],
  );

  // ── Render ──────────────────────────────────────────────────────

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <ApprovalSkeleton key="skeleton" />
      ) : error ? (
        <ApprovalError key="error" message={error} onRetry={fetchApprovals} />
      ) : approvals.length === 0 ? (
        <ApprovalEmpty key="empty" />
      ) : (
        <motion.div
          key="approvals"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="border-t border-[var(--signal-border-subtle)]"
        >
          <div className="px-4 py-3 space-y-3">
            <SectionHeader icon={ShieldCheck} title="Approvals" />
            <div className="space-y-2">
              {approvals.map((approval) => (
                <ApprovalItem
                  key={approval.id}
                  approval={approval}
                  onApprove={(note) =>
                    handleReview(approval.id, "approve", note)
                  }
                  onReject={(note) => handleReview(approval.id, "reject", note)}
                  acting={acting}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
