"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { useApprovals } from "@/hooks/use-data";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  EmptyState,
  Textarea,
} from "@/components/ui";
import { toast } from "@/components/toast";
import { CheckCircleFillIcon, ClockIcon } from "@/components/icons/nav-icons";
import type { ApprovalRequest } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

const STATUS_VARIANT: Record<
  string,
  "warning" | "success" | "danger" | "info"
> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  applied: "info",
};

const SLA_HOURS = 24;
const SLA_MS = SLA_HOURS * 60 * 60 * 1000;

function useSlaNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function slaInfo(createdAt: string, now: number) {
  const created = new Date(createdAt).getTime();
  const elapsed = now - created;
  const remaining = SLA_MS - elapsed;
  const elapsedHours = elapsed / (1000 * 60 * 60);
  const remainingHours = remaining / (1000 * 60 * 60);
  const progress = Math.min(1, Math.max(0, elapsed / SLA_MS));
  const expired = remaining <= 0;

  let urgencyColor: "green" | "yellow" | "red" = "green";
  if (expired) {
    urgencyColor = "red";
  } else if (remainingHours < 4) {
    urgencyColor = "red";
  } else if (remainingHours < 12) {
    urgencyColor = "yellow";
  }

  const elapsedLabel =
    elapsedHours < 1
      ? `${Math.round(elapsed / (1000 * 60))}m ago`
      : elapsedHours < 24
        ? `${Math.floor(elapsedHours)}h ago`
        : `${(elapsedHours / 24).toFixed(1)}d ago`;

  const dueLabel = expired
    ? `OVERDUE -- requested ${elapsedLabel}`
    : remainingHours < 1
      ? `Due in ${Math.round(remainingHours * 60)}m`
      : remainingHours < 24
        ? `Due in ${Math.ceil(remainingHours)}h`
        : `Due in ${(remainingHours / 24).toFixed(1)}d`;

  return { elapsedLabel, dueLabel, urgencyColor, progress, expired };
}

function SlaProgress({ ar, now }: { ar: ApprovalRequest; now: number }) {
  if (ar.status !== "pending") return null;
  const { dueLabel, urgencyColor, progress, expired } = slaInfo(
    ar.created_at,
    now,
  );

  const barColor =
    urgencyColor === "red"
      ? "bg-[var(--signal-bg-danger-muted)]0"
      : urgencyColor === "yellow"
        ? "bg-amber-400"
        : "bg-emerald-500";

  const textColor =
    urgencyColor === "red"
      ? "text-red-600"
      : urgencyColor === "yellow"
        ? "text-amber-600"
        : "text-[var(--signal-fg-secondary)]";

  return (
    <div className="flex items-center gap-2 mt-1">
      <ClockIcon className={cn("h-3.5 w-3.5 flex-shrink-0", textColor)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "text-xs font-medium truncate",
              expired ? "text-red-600" : textColor,
            )}
          >
            {dueLabel}
          </span>
          <span className="text-xs text-[var(--signal-fg-tertiary)] flex-shrink-0">
            Requested {slaInfo(ar.created_at, now).elapsedLabel}
          </span>
        </div>
        <div className="mt-1 h-1 w-full rounded-full bg-[var(--signal-bg-secondary)] overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-1000",
              barColor,
              `w-[${progress * 100}%]`,
            )}
          />
        </div>
      </div>
    </div>
  );
}

export default function ApprovalsPage() {
  const token = useAppStore((s) => s.token);
  const user = useAppStore((s) => s.user);
  const now = useSlaNow();
  const [filter, setFilter] = useState("");
  const [tab, setTab] = useState<"all" | "mine">("all");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: approvals = [], refetch } = useApprovals(filter || undefined);

  async function handleReview(id: string, action: "approve" | "reject") {
    if (!token) return;
    setLoading(true);
    try {
      await api.reviewApproval(token, id, action, note);
      setReviewingId(null);
      setNote("");
      refetch();
      toast(
        action === "approve" ? "Approval granted" : "Request rejected",
        "success",
      );
    } catch {
      toast("Failed to submit review", "error");
    } finally {
      setLoading(false);
    }
  }

  const filteredByTab = useMemo(() => {
    if (tab === "mine" && user) {
      return approvals.filter((a) => a.requestor_id === user.id);
    }
    return approvals;
  }, [approvals, tab, user]);

  const handleTabChange = useCallback((t: "all" | "mine") => {
    setTab(t);
    setReviewingId(null);
    setNote("");
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Approval Requests"
        description="Review and approve flag changes before they go live"
      />

      {/* Status filter buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {["", "pending", "approved", "rejected", "applied"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              filter === s
                ? "bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)] ring-1 ring-[var(--signal-border-accent-muted)]"
                : "text-[var(--signal-fg-secondary)] hover:bg-[var(--signal-bg-secondary)]",
            )}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {/* Tabs: All Requests / My Requests */}
      <div className="flex gap-1 border-b border-[var(--signal-border-default)]">
        {[
          { key: "all" as const, label: "All Requests" },
          { key: "mine" as const, label: "My Requests" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              tab === key
                ? "border-[var(--signal-fg-accent)] text-[var(--signal-fg-accent)]"
                : "border-transparent text-[var(--signal-fg-secondary)] hover:text-[var(--signal-fg-primary)] hover:border-[var(--signal-border-emphasis)]",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <Card className="hover:shadow-lg hover:border-[var(--signal-border-emphasis)]">
        {filteredByTab.length === 0 ? (
          <EmptyState
            icon={CheckCircleFillIcon}
            title={
              tab === "mine" ? "No requests from you" : "No approval requests"
            }
            description={
              tab === "mine"
                ? "You haven't submitted any approval requests yet."
                : "Changes requiring approval will appear here."
            }
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredByTab.map((ar) => {
              const isReviewing = reviewingId === ar.id;
              return (
                <div
                  key={ar.id}
                  className="px-4 py-3 space-y-2 sm:px-6 sm:py-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <Badge variant={STATUS_VARIANT[ar.status] || "default"}>
                        {ar.status}
                      </Badge>
                      <span className="text-sm font-medium text-[var(--signal-fg-primary)]">
                        {ar.change_type}
                      </span>
                      <span className="text-xs text-[var(--signal-fg-tertiary)]">
                        Flag: {ar.flag_id?.slice(0, 8)}&hellip;
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--signal-fg-tertiary)]">
                        {timeAgo(ar.created_at)}
                      </span>
                      {ar.status === "pending" && !isReviewing && (
                        <Button size="sm" onClick={() => setReviewingId(ar.id)}>
                          Review
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* SLA countdown progress bar */}
                  <SlaProgress ar={ar} now={now} />

                  {ar.review_note && (
                    <p className="text-xs text-[var(--signal-fg-secondary)]">
                      <span className="font-medium">Review note:</span>{" "}
                      {ar.review_note}
                    </p>
                  )}

                  {isReviewing && (
                    <div className="rounded-lg border border-[var(--signal-border-accent-muted)] bg-[var(--signal-bg-accent-muted)] p-3 mt-2 space-y-3 sm:p-4">
                      <Textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Add a review note (optional)..."
                        rows={2}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleReview(ar.id, "approve")}
                          disabled={loading}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          Approve & Apply
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleReview(ar.id, "reject")}
                          disabled={loading}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setReviewingId(null);
                            setNote("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
