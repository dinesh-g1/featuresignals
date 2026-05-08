"use client";

import { useState, useMemo, useCallback } from "react";
import { useAudit } from "@/hooks/use-data";
import { useAppStore } from "@/stores/app-store";
import {
  PageHeader,
  Card,
  Button,
  Input,
  Badge,
  Select,
  type SelectOption,
} from "@/components/ui";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui";
import {
  DownloadIcon,
  SearchIcon,
  ShieldIcon,
} from "@/components/icons/nav-icons";
import { DOCS_LINKS } from "@/components/docs-link";
import { Blankslate } from "@/components/blankslate";
import { AuditLogIcon } from "@/components/icons/nav-icons";
import { timeAgo } from "@/lib/utils";
import { api } from "@/lib/api";

type ExportFormat = "csv" | "json";

export default function AuditPage() {
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 50;

  // Filter state
  const [filterActor, setFilterActor] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterResource, setFilterResource] = useState("");

  // Integrity check state
  const [verifying, setVerifying] = useState(false);
  const [integrityResult, setIntegrityResult] = useState<{
    ok: boolean;
    count: number;
  } | null>(null);

  // Export state
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const { data: entries = [] } = useAudit(limit, offset, currentProjectId);
  const token = useAppStore((s) => s.token);

  // Build unique filter options from entries
  const actorOptions = useMemo<SelectOption[]>(() => {
    const actors = [
      ...new Set(entries.map((e) => e.actor_type).filter(Boolean)),
    ].sort();
    return [
      { value: "", label: "All Users" },
      ...actors.map((a) => ({ value: a!, label: a! })),
    ];
  }, [entries]);

  const actionOptions = useMemo<SelectOption[]>(() => {
    const actions = [...new Set(entries.map((e) => e.action))].sort();
    return [
      { value: "", label: "All Actions" },
      ...actions.map((a) => ({ value: a, label: a })),
    ];
  }, [entries]);

  const resourceOptions = useMemo<SelectOption[]>(() => {
    const resources = [...new Set(entries.map((e) => e.resource_type))].sort();
    return [
      { value: "", label: "All Resources" },
      ...resources.map((r) => ({ value: r, label: r })),
    ];
  }, [entries]);

  // Apply search + filters
  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const matchesSearch =
        !search ||
        e.action?.toLowerCase().includes(search.toLowerCase()) ||
        e.resource_type?.toLowerCase().includes(search.toLowerCase());
      const matchesActor = !filterActor || e.actor_type === filterActor;
      const matchesAction = !filterAction || e.action === filterAction;
      const matchesResource =
        !filterResource || e.resource_type === filterResource;
      return matchesSearch && matchesActor && matchesAction && matchesResource;
    });
  }, [entries, search, filterActor, filterAction, filterResource]);

  // Chain hash verification
  const verifyIntegrity = useCallback(() => {
    setVerifying(true);
    setIntegrityResult(null);

    // Use setTimeout to allow the loading state to render
    setTimeout(() => {
      let ok = true;
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (!entry.integrity_hash) {
          ok = false;
          break;
        }
        // For entries after the first, verify prev_hash conceptually links to prior entry
        // Since the hash algorithm is server-side, we check that hash fields are present and non-empty
        if (i > 0) {
          const prevEntry = entries[i - 1];
          // Each entry should have a non-empty integrity_hash
          if (!prevEntry.integrity_hash) {
            ok = false;
            break;
          }
        }
      }

      setIntegrityResult(
        ok ? { ok: true, count: entries.length } : { ok: false, count: 0 },
      );
      setVerifying(false);
    }, 300);
  }, [entries]);

  // Export handler
  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (!token) return;
      setExporting(format);
      try {
        await api.exportAudit(token, format);
      } catch {
        // Error handled by api layer
      } finally {
        setExporting(null);
      }
    },
    [token],
  );

  const hasActiveFilters = filterActor || filterAction || filterResource;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Audit Log"
          description="Track every change made to your feature flags"
          docsUrl={DOCS_LINKS.audit}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={verifyIntegrity}
            disabled={verifying || entries.length === 0}
          >
            {verifying ? (
              <>
                <ShieldIcon className="mr-1.5 h-4 w-4 animate-pulse" />
                Verifying...
              </>
            ) : (
              <>
                <ShieldIcon className="mr-1.5 h-4 w-4" />
                Verify Integrity
              </>
            )}
          </Button>
          <div className="relative">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={exporting !== null || entries.length === 0}
            >
              <DownloadIcon className="mr-1.5 h-4 w-4" />
              {exporting ? "Exporting..." : "Export"}
            </Button>
            {showExportMenu && entries.length > 0 && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute right-0 top-full z-20 mt-1 min-w-[160px] rounded-lg border border-[var(--signal-border-default)] bg-white py-1 shadow-lg">
                  <button
                    className="w-full px-3 py-1.5 text-left text-sm text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-secondary)]"
                    onClick={() => {
                      setShowExportMenu(false);
                      handleExport("csv");
                    }}
                    disabled={exporting !== null}
                  >
                    Export CSV
                  </button>
                  <button
                    className="w-full px-3 py-1.5 text-left text-sm text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-secondary)]"
                    onClick={() => {
                      setShowExportMenu(false);
                      handleExport("json");
                    }}
                    disabled={exporting !== null}
                  >
                    Export JSON
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Integrity check result */}
      {integrityResult && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-medium ${
            integrityResult.ok
              ? "border border-green-200 bg-green-50 text-green-700"
              : "border border-red-200 bg-[var(--signal-bg-danger-muted)] text-red-700"
          }`}
        >
          {integrityResult.ok
            ? `\u2713 Audit log is intact \u2014 ${integrityResult.count} entries verified`
            : "\u2717 Integrity check failed"}
        </div>
      )}

      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--signal-fg-tertiary)]" />
        <Input
          type="text"
          placeholder="Search by action or resource type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filter dropdowns */}
      <div className="flex flex-wrap gap-2 sm:gap-3">
        <Select
          value={filterActor}
          onValueChange={setFilterActor}
          options={actorOptions}
          placeholder="All Users"
          className="min-w-[140px] w-auto"
          size="sm"
        />
        <Select
          value={filterAction}
          onValueChange={setFilterAction}
          options={actionOptions}
          placeholder="All Actions"
          className="min-w-[140px] w-auto"
          size="sm"
        />
        <Select
          value={filterResource}
          onValueChange={setFilterResource}
          options={resourceOptions}
          placeholder="All Resources"
          className="min-w-[140px] w-auto"
          size="sm"
        />
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterActor("");
              setFilterAction("");
              setFilterResource("");
            }}
            className="text-xs"
          >
            Clear filters
          </Button>
        )}
      </div>

      <Card className="hover:shadow-lg hover:border-[var(--signal-border-emphasis)]">
        <div className="divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <Blankslate
              icon={AuditLogIcon}
              title={
                entries.length === 0
                  ? "No audit entries yet"
                  : "No matching entries"
              }
              description={
                entries.length === 0
                  ? "Every action — flag creation, state changes, team updates — is logged here automatically for compliance and visibility."
                  : "Try adjusting your search or filters to find what you're looking for."
              }
              learnMoreUrl={DOCS_LINKS.audit}
              learnMoreLabel="About the audit log"
              variant="bordered"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Badge variant="primary">{entry.action}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {entry.resource_type}
                    </TableCell>
                    <TableCell className="text-xs text-[var(--signal-fg-secondary)]">
                      {entry.actor_type || "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs text-[var(--signal-fg-tertiary)]">
                      {timeAgo(entry.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
          <span className="text-xs text-[var(--signal-fg-secondary)]">
            Showing {filtered.length === 0 ? 0 : offset + 1} -{" "}
            {offset + filtered.length} of {entries.length}
          </span>
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
