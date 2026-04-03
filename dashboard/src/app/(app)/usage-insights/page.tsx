"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";

type SortKey = "flag_key" | "true_percentage" | "total_count";

export default function UsageInsightsPage() {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const currentEnvId = useAppStore((s) => s.currentEnvId);
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("flag_key");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    if (!token || !projectId || !currentEnvId) return;
    setLoading(true);
    api.getFlagInsights(token, projectId, currentEnvId)
      .then((data) => setInsights(data ?? []))
      .catch(() => setInsights([]))
      .finally(() => setLoading(false));
  }, [token, projectId, currentEnvId]);

  function handleSort(key: SortKey) {
    if (sortBy === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortDir(key === "flag_key" ? "asc" : "desc");
    }
  }

  const filtered = insights
    .filter((i) => !search || i.flag_key.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Usage Insights</h1>
        <p className="mt-1 text-sm text-slate-500">Per-flag evaluation distribution for the selected environment</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            placeholder="Search by flag key..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <span className="text-sm text-slate-500">{filtered.length} flag{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {insights.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center">
          <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          <p className="mt-3 text-sm font-medium text-slate-500">No evaluation data yet</p>
          <p className="mt-1 text-xs text-slate-400">Start evaluating flags to see usage insights.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3 cursor-pointer hover:text-slate-700" onClick={() => handleSort("flag_key")}>
                  Flag Key {sortBy === "flag_key" && (sortDir === "asc" ? "\u2191" : "\u2193")}
                </th>
                <th className="px-4 py-3 cursor-pointer hover:text-slate-700" onClick={() => handleSort("true_percentage")}>
                  True % {sortBy === "true_percentage" && (sortDir === "asc" ? "\u2191" : "\u2193")}
                </th>
                <th className="px-4 py-3">True Count</th>
                <th className="px-4 py-3">False Count</th>
                <th className="px-4 py-3 cursor-pointer hover:text-slate-700" onClick={() => handleSort("total_count")}>
                  Total {sortBy === "total_count" && (sortDir === "asc" ? "\u2191" : "\u2193")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((ins: any) => (
                <tr key={ins.flag_key} className="transition-colors hover:bg-indigo-50/30">
                  <td className="px-6 py-3 font-mono font-medium text-slate-900">{ins.flag_key}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${Math.min(ins.true_percentage, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-600">{ins.true_percentage.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-emerald-600 font-medium">{ins.true_count.toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-500">{ins.false_count.toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-700 font-medium">{ins.total_count.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="px-6 py-8 text-center text-sm text-slate-400">No flags match the search.</div>
          )}
        </div>
      )}
    </div>
  );
}
