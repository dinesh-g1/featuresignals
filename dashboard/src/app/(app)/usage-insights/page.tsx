"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import {
  PageHeader,
  Card,
  Input,
  EmptyState,
  SkeletonTable,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui";
import { BarChart3, Search, Globe } from "lucide-react";
import { DOCS_LINKS } from "@/components/docs-link";
import type { FlagInsight } from "@/lib/types";

type SortKey = "flag_key" | "true_percentage" | "total_count";

export default function UsageInsightsPage() {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const currentEnvId = useAppStore((s) => s.currentEnvId);
  const [insights, setInsights] = useState<FlagInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("flag_key");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    if (!token || !projectId || !currentEnvId) return;
    setLoading(true);
    api
      .getFlagInsights(token, projectId, currentEnvId)
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
    .filter(
      (i) =>
        !search ||
        (i.flag_key ?? "").toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <PageHeader
          title="Usage Insights"
          description="Per-flag evaluation distribution for the selected environment"
        />
        <SkeletonTable rows={8} cols={5} />
      </div>
    );
  }

  if (!currentEnvId) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <PageHeader
          title="Usage Insights"
          description="Per-flag evaluation distribution for the selected environment"
        />
        <EmptyState
          icon={Globe}
          title="No environment selected"
          description="Select an environment using the context bar above to view usage insights and evaluation distribution."
          className="py-16"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Usage Insights"
        description="Per-flag evaluation distribution for the selected environment"
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by flag key..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <span className="text-sm text-slate-500">
          {filtered.length} flag{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {insights.length === 0 ? (
        <Card>
          <EmptyState
            icon={BarChart3}
            title="No evaluation data yet"
            description="Connect an SDK to your application and start evaluating flags. Usage data will appear here in real-time."
            docsUrl={DOCS_LINKS.sdks}
            docsLabel="Install an SDK"
            className="py-16"
          />
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:text-slate-700"
                  onClick={() => handleSort("flag_key")}
                >
                  Flag Key{" "}
                  {sortBy === "flag_key" &&
                    (sortDir === "asc" ? "\u2191" : "\u2193")}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:text-slate-700"
                  onClick={() => handleSort("true_percentage")}
                >
                  True %{" "}
                  {sortBy === "true_percentage" &&
                    (sortDir === "asc" ? "\u2191" : "\u2193")}
                </TableHead>
                <TableHead className="hidden sm:table-cell">
                  True Count
                </TableHead>
                <TableHead className="hidden sm:table-cell">
                  False Count
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:text-slate-700"
                  onClick={() => handleSort("total_count")}
                >
                  Total{" "}
                  {sortBy === "total_count" &&
                    (sortDir === "asc" ? "\u2191" : "\u2193")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((ins) => (
                <TableRow key={ins.flag_key}>
                  <TableCell className="font-mono font-medium text-slate-900">
                    {ins.flag_key}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 rounded-full bg-slate-200 overflow-hidden sm:w-24">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{
                            width: `${Math.min(ins.true_percentage ?? 0, 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-600">
                        {(ins.true_percentage ?? 0).toFixed(1)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-emerald-600 font-medium sm:table-cell">
                    {(ins.true_count ?? 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="hidden text-slate-500 sm:table-cell">
                    {(ins.false_count ?? 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-slate-700 font-medium">
                    {(ins.total_count ?? 0).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filtered.length === 0 && (
            <EmptyState
              icon={BarChart3}
              title="No flags match the search."
              className="py-8"
            />
          )}
        </Card>
      )}
    </div>
  );
}
