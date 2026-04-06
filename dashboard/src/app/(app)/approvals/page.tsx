"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { PageHeader, Card, Button, Badge, EmptyState, Textarea } from "@/components/ui";
import { toast } from "@/components/toast";
import { CheckCircle } from "lucide-react";
import type { ApprovalRequest } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_VARIANT: Record<string, "warning" | "success" | "danger" | "info"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  applied: "info",
};

export default function ApprovalsPage() {
  const token = useAppStore((s) => s.token);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [filter, setFilter] = useState("");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  function reload() {
    if (!token) return;
    api.listApprovals(token, filter || undefined).then((a) => setApprovals(a ?? [])).catch(() => {});
  }

  useEffect(() => { reload(); }, [token, filter]);

  async function handleReview(id: string, action: "approve" | "reject") {
    if (!token) return;
    setLoading(true);
    try {
      await api.reviewApproval(token, id, action, note);
      setReviewingId(null);
      setNote("");
      reload();
      toast(action === "approve" ? "Approval granted" : "Request rejected", "success");
    } catch {
      toast("Failed to submit review", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Approval Requests"
        description="Review and approve flag changes before they go live"
      />

      <div className="flex flex-wrap items-center gap-2">
        {["", "pending", "approved", "rejected", "applied"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              filter === s ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200" : "text-slate-500 hover:bg-slate-100",
            )}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      <Card className="hover:shadow-lg hover:border-slate-300">
        {approvals.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title="No approval requests"
            description="Changes requiring approval will appear here."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {approvals.map((ar) => {
              const isReviewing = reviewingId === ar.id;
              return (
                <div key={ar.id} className="px-4 py-3 space-y-2 sm:px-6 sm:py-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <Badge variant={STATUS_VARIANT[ar.status] || "default"}>
                        {ar.status}
                      </Badge>
                      <span className="text-sm font-medium text-slate-700">{ar.change_type}</span>
                      <span className="text-xs text-slate-400">Flag: {ar.flag_id?.slice(0, 8)}&hellip;</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{new Date(ar.created_at).toLocaleString()}</span>
                      {ar.status === "pending" && !isReviewing && (
                        <Button size="sm" onClick={() => setReviewingId(ar.id)}>Review</Button>
                      )}
                    </div>
                  </div>

                  {ar.review_note && (
                    <p className="text-xs text-slate-500">
                      <span className="font-medium">Review note:</span> {ar.review_note}
                    </p>
                  )}

                  {isReviewing && (
                    <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3 mt-2 space-y-3 sm:p-4">
                      <Textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Add a review note (optional)..."
                        rows={2}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => handleReview(ar.id, "approve")} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
                          Approve & Apply
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleReview(ar.id, "reject")} disabled={loading}>
                          Reject
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => { setReviewingId(null); setNote(""); }}>
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
