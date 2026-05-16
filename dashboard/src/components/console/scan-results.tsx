"use client";

/**
 * ScanResults — Shows Code2Flag scan results in the CONNECT zone
 * when repositories are connected. Displays detected flaggable code
 * locations with confidence scores and actions to create specs or
 * implementation PRs.
 *
 * Fetches from api.code2flag.listReferences.
 *
 * States: loading (skeleton), error (retry), empty (no detections), success.
 *
 * Signal UI tokens only. Zero hardcoded hex colors.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanSearch,
  Code,
  GitBranch,
  FileCode,
  RefreshCw,
  Sparkles,
  Plus,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import type { Code2FlagReference } from "@/lib/types";

// ─── Types ───────────────────────────────────────────────────────────

interface ScanResultsProps {
  projectId: string;
}

// ─── Helpers ────────────────────────────────────────────────────────

function confidenceColor(confidence: number): string {
  if (confidence >= 0.8) return "var(--signal-fg-success)";
  if (confidence >= 0.5) return "var(--signal-fg-warning)";
  return "var(--signal-fg-tertiary)";
}

function confidenceBg(confidence: number): string {
  if (confidence >= 0.8) return "var(--signal-bg-success-muted)";
  if (confidence >= 0.5) return "var(--signal-bg-warning-muted)";
  return "var(--signal-bg-secondary)";
}

function confidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return "High";
  if (confidence >= 0.5) return "Medium";
  return "Low";
}

function statusColor(status: string): string {
  switch (status) {
    case "accepted":
      return "var(--signal-fg-success)";
    case "rejected":
      return "var(--signal-fg-danger)";
    case "modified":
      return "var(--signal-fg-warning)";
    default:
      return "var(--signal-fg-tertiary)";
  }
}

function conditionalIcon(type: string) {
  switch (type) {
    case "if-statement":
      return <GitBranch className="h-3 w-3" />;
    case "ternary":
      return <Code className="h-3 w-3" />;
    case "switch-case":
      return <FileCode className="h-3 w-3" />;
    default:
      return <Code className="h-3 w-3" />;
  }
}

// ─── Section Header ──────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  count,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--signal-fg-secondary)]" />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
        {title}
      </span>
      {count !== undefined && count > 0 && (
        <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-[var(--signal-bg-accent-muted)] text-[10px] font-semibold text-[var(--signal-fg-accent)]">
          {count}
        </span>
      )}
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────

function ScanSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={`scan-sk-${i}`}
          className="px-3 py-2 rounded-[var(--signal-radius-sm)] bg-[var(--signal-border-default)]"
        >
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-[var(--signal-bg-tertiary)]" />
            <div className="h-3 w-32 rounded bg-[var(--signal-bg-tertiary)]" />
            <div className="flex-1" />
            <div className="h-4 w-12 rounded bg-[var(--signal-bg-tertiary)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Error ───────────────────────────────────────────────────────────

function ScanError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="py-3 text-center">
      <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[var(--signal-bg-danger-muted)] ring-1 ring-[var(--signal-border-danger-emphasis)]/30 mb-2">
        <RefreshCw className="h-4 w-4 text-[var(--signal-fg-danger)]" />
      </div>
      <p className="text-[11px] text-[var(--signal-fg-secondary)] mb-2 leading-relaxed">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--signal-fg-accent)] hover:underline"
      >
        <RefreshCw className="h-3 w-3" />
        Retry
      </button>
    </div>
  );
}

// ─── Empty ───────────────────────────────────────────────────────────

function ScanEmpty() {
  return (
    <div className="py-3 text-center">
      <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[var(--signal-bg-secondary)] ring-1 ring-[var(--signal-border-subtle)] mb-2">
        <ScanSearch className="h-4 w-4 text-[var(--signal-fg-tertiary)]" />
      </div>
      <p className="text-[11px] text-[var(--signal-fg-secondary)] leading-relaxed">
        No flaggable patterns detected yet.
      </p>
      <p className="text-[10px] text-[var(--signal-fg-tertiary)] mt-1">
        Scan a repository to find feature flag candidates.
      </p>
    </div>
  );
}

// ─── Reference Item ──────────────────────────────────────────────────

function ReferenceItem({
  ref,
  onSpec,
  onImpl,
  creating,
}: {
  ref: Code2FlagReference;
  onSpec: () => void;
  onImpl: () => void;
  creating: boolean;
}) {
  const confPct = Math.round(ref.confidence * 100);

  return (
    <button
      type="button"
      className="flex w-full items-start gap-2 py-1.5 text-left transition-colors duration-[var(--signal-duration-fast)] hover:bg-[var(--signal-bg-secondary)] rounded-[var(--signal-radius-sm)] -mx-1 px-1 group"
    >
      <span className="mt-0.5 shrink-0 text-[var(--signal-fg-tertiary)]">
        {conditionalIcon(ref.conditional_type)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-[var(--signal-fg-primary)] truncate group-hover:text-[var(--signal-fg-accent)] transition-colors">
            {ref.file_path}:{ref.line_number}
          </span>
          <span
            className="inline-flex items-center px-1 py-px rounded text-[9px] font-semibold shrink-0"
            style={{
              backgroundColor: confidenceBg(ref.confidence),
              color: confidenceColor(ref.confidence),
            }}
          >
            {confPct}% {confidenceLabel(ref.confidence)}
          </span>
        </div>
        <code className="block text-[10px] text-[var(--signal-fg-tertiary)] mt-0.5 line-clamp-1 font-mono">
          {ref.conditional_text}
        </code>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[9px] text-[var(--signal-fg-tertiary)]">
            {ref.repository}
          </span>
          {ref.status !== "unreviewed" && (
            <span
              className="text-[9px] font-medium"
              style={{ color: statusColor(ref.status) }}
            >
              {ref.status}
            </span>
          )}
        </div>
        {/* Quick actions on hover */}
        <div className="flex items-center gap-2 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSpec();
            }}
            disabled={creating}
            className="inline-flex items-center gap-1 text-[9px] font-medium text-[var(--signal-fg-accent)] hover:underline disabled:opacity-50"
          >
            <Sparkles className="h-2.5 w-2.5" />
            Create Spec
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onImpl();
            }}
            disabled={creating}
            className="inline-flex items-center gap-1 text-[9px] font-medium text-[var(--signal-fg-success)] hover:underline disabled:opacity-50"
          >
            <Plus className="h-2.5 w-2.5" />
            Implement
          </button>
        </div>
      </div>
      <ChevronRight className="h-3 w-3 shrink-0 mt-1 text-[var(--signal-fg-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export function ScanResults({ projectId }: ScanResultsProps) {
  const token = useAppStore((s) => s.token);

  const [references, setReferences] = useState<Code2FlagReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // ── Fetch references ─────────────────────────────────────────────

  const fetchReferences = useCallback(async () => {
    if (!token || !projectId) return;
    setLoading(true);
    setError(null);

    try {
      const result = await api.code2flag.listReferences(token, projectId, {
        limit: 10,
      });
      setReferences(result.data ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load scan results",
      );
    } finally {
      setLoading(false);
    }
  }, [token, projectId]);

  useEffect(() => {
    fetchReferences();
  }, [fetchReferences]);

  // ── Create spec ──────────────────────────────────────────────────

  const handleCreateSpec = useCallback(
    async (ref: Code2FlagReference) => {
      if (!token || !projectId) return;
      setCreating(true);
      try {
        await api.code2flag.createSpec(token, projectId, {
          flag_key: `flag-${ref.file_path.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}`,
          repo_name: ref.repository,
          references: [ref.id],
        });
        setReferences((prev) =>
          prev.map((r) =>
            r.id === ref.id ? { ...r, status: "accepted" as const } : r,
          ),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create spec");
      } finally {
        setCreating(false);
      }
    },
    [token, projectId],
  );

  // ── Create implementation ────────────────────────────────────────

  const handleCreateImpl = useCallback(
    async (ref: Code2FlagReference) => {
      if (!token || !projectId) return;
      setCreating(true);
      try {
        await api.code2flag.createImplementation(token, projectId, {
          flag_key: `flag-${ref.file_path.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}`,
          repo_name: ref.repository,
          language: "go",
          file_path: ref.file_path,
          line_number: ref.line_number,
        });
        setReferences((prev) =>
          prev.map((r) =>
            r.id === ref.id ? { ...r, status: "modified" as const } : r,
          ),
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to create implementation",
        );
      } finally {
        setCreating(false);
      }
    },
    [token, projectId],
  );

  // ── Render ──────────────────────────────────────────────────────

  const unreviewedCount = references.filter(
    (r) => r.status === "unreviewed",
  ).length;

  return (
    <div className="rounded-[var(--signal-radius-lg)] border border-[var(--signal-border-subtle)] bg-[var(--signal-bg-primary)] overflow-hidden transition-shadow duration-[var(--signal-duration-fast)] hover:shadow-[var(--signal-shadow-sm)]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--signal-border-subtle)]">
        <ScanSearch className="h-4 w-4 shrink-0 text-[var(--signal-fg-tertiary)]" />
        <span className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--signal-fg-secondary)]">
          Code2Flag Scan
        </span>
        {unreviewedCount > 0 && (
          <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-[var(--signal-bg-accent-muted)] text-[10px] font-semibold text-[var(--signal-fg-accent)]">
            {unreviewedCount} new
          </span>
        )}
      </div>

      {/* Content */}
      <div className="px-3 py-2">
        <AnimatePresence mode="wait">
          {loading ? (
            <ScanSkeleton key="skeleton" />
          ) : error ? (
            <ScanError key="error" message={error} onRetry={fetchReferences} />
          ) : references.length === 0 ? (
            <ScanEmpty key="empty" />
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="space-y-0.5"
            >
              {references.map((ref) => (
                <ReferenceItem
                  key={ref.id}
                  ref={ref}
                  onSpec={() => handleCreateSpec(ref)}
                  onImpl={() => handleCreateImpl(ref)}
                  creating={creating}
                />
              ))}

              {references.length > 0 && (
                <button
                  type="button"
                  className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-[var(--signal-radius-sm)] border border-[var(--signal-border-subtle)] py-1.5 text-[11px] font-medium text-[var(--signal-fg-secondary)] transition-colors duration-[var(--signal-duration-fast)] hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)]"
                >
                  View all {references.length} references
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
