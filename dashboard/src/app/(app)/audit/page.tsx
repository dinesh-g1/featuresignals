"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { useFeatures } from "@/hooks/use-features";
import { PageHeader, Card, Button, Input, Badge, EmptyState } from "@/components/ui";
import { ClipboardList, Download, Search } from "lucide-react";
import { DOCS_LINKS } from "@/components/docs-link";
import type { AuditEntry } from "@/lib/types";

export default function AuditPage() {
  const token = useAppStore((s) => s.token);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const { isEnabled } = useFeatures();
  const canExport = isEnabled("audit_export");
  const limit = 50;

  useEffect(() => {
    if (!token) return;
    api.listAudit(token, limit, offset).then((a) => setEntries(a ?? [])).catch(() => {});
  }, [token, offset]);

  const filtered = entries.filter((e) =>
    !search ||
    e.action?.toLowerCase().includes(search.toLowerCase()) ||
    e.resource_type?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Audit Log"
          description="Track every change made to your feature flags"
          docsUrl={DOCS_LINKS.audit}
        />
        {canExport && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (!token) return;
              api.exportAudit(token, "csv").catch(() => {});
            }}
          >
            <Download className="mr-1.5 h-4 w-4" />
            Export CSV
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          type="text"
          placeholder="Search by action or resource type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card className="hover:shadow-lg hover:border-slate-300">
        <div className="divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No audit entries yet"
              description="Every action — flag creation, state changes, team updates — is logged here automatically for compliance and visibility."
              docsUrl={DOCS_LINKS.audit}
              docsLabel="About the audit log"
            />
          ) : (
            filtered.map((entry) => (
              <div key={entry.id} className="px-4 py-3 transition-colors hover:bg-indigo-50/30 sm:px-6 sm:py-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <Badge variant="primary">{entry.action}</Badge>
                    <span className="text-sm text-slate-600">{entry.resource_type}</span>
                    {entry.actor_type && (
                      <span className="text-xs text-slate-400">by {entry.actor_type}</span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">{new Date(entry.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {entries.length > 0 && (
        <div className="flex items-center justify-between">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
          >
            Previous
          </Button>
          <span className="text-xs text-slate-500">Showing {offset + 1} - {offset + entries.length}</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setOffset(offset + limit)}
            disabled={entries.length < limit}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
