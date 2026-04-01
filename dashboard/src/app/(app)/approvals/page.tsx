"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: "bg-amber-50", text: "text-amber-700" },
  approved: { bg: "bg-emerald-50", text: "text-emerald-700" },
  rejected: { bg: "bg-red-50", text: "text-red-700" },
  applied: { bg: "bg-blue-50", text: "text-blue-700" },
};

export default function ApprovalsPage() {
  const token = useAppStore((s) => s.token);
  const [approvals, setApprovals] = useState<any[]>([]);
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
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Approval Requests</h1>
          <p className="mt-1 text-sm text-slate-500">Review and approve flag changes before they go live</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {["", "pending", "approved", "rejected", "applied"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === s ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200" : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white transition-all hover:shadow-lg hover:border-slate-300">
        {approvals.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-3 text-sm font-medium text-slate-500">No approval requests</p>
            <p className="mt-1 text-xs text-slate-400">Changes requiring approval will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {approvals.map((ar: any) => {
              const sc = STATUS_COLORS[ar.status] || STATUS_COLORS.pending;
              const isReviewing = reviewingId === ar.id;
              return (
                <div key={ar.id} className="px-6 py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${sc.bg} ${sc.text} ring-1 ring-inset`}>
                        {ar.status}
                      </span>
                      <span className="text-sm font-medium text-slate-700">{ar.change_type}</span>
                      <span className="text-xs text-slate-400">Flag: {ar.flag_id?.slice(0, 8)}&hellip;</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{new Date(ar.created_at).toLocaleString()}</span>
                      {ar.status === "pending" && !isReviewing && (
                        <button
                          onClick={() => setReviewingId(ar.id)}
                          className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700"
                        >
                          Review
                        </button>
                      )}
                    </div>
                  </div>

                  {ar.review_note && (
                    <p className="text-xs text-slate-500">
                      <span className="font-medium">Review note:</span> {ar.review_note}
                    </p>
                  )}

                  {isReviewing && (
                    <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4 mt-2 space-y-3">
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Add a review note (optional)..."
                        rows={2}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReview(ar.id, "approve")}
                          disabled={loading}
                          className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Approve & Apply
                        </button>
                        <button
                          onClick={() => handleReview(ar.id, "reject")}
                          disabled={loading}
                          className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => { setReviewingId(null); setNote(""); }}
                          className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-600 hover:bg-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
