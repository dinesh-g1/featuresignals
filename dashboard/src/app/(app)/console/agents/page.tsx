"use client";

/**
 * Agent Management Page — Full enterprise page for registering,
 * configuring, and monitoring AI agents in the ABM (Agent Behavior Mesh).
 *
 * Route: /console/agents
 *
 * Features:
 * - Table/list of all registered agents with status, heartbeat, stats
 * - Register new agent dialog
 * - Configure agent (maturity level, rate limits, scopes)
 * - Enable/Disable toggle
 * - Delete with confirmation
 *
 * States: loading skeleton, empty state, error with retry, success.
 *
 * Signal UI tokens only. Zero hardcoded hex. Zero `any` types.
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  RefreshCw,
  Search,
  Bot,
  Activity,
  Clock,
  Trash2,
  Settings,
  Power,
  PowerOff,
  Zap,
  BarChart3,
  ChevronDown,
  ChevronRight,
  X,
  Shield,
  AlertTriangle,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import type { Agent } from "@/lib/agent-types";
import { PolicyForm } from "@/components/policies/policy-form";
import type { Policy } from "@/lib/policy-types";

// ─── Types ──────────────────────────────────────────────────────────

type AgentStatusUI = "active" | "degraded" | "offline";

interface RegisterFormData {
  name: string;
  type: string;
  brain_type: string;
  version: string;
}

const EMPTY_REGISTER_FORM: RegisterFormData = {
  name: "",
  type: "llm",
  brain_type: "llm",
  version: "1.0.0",
};

const BRAIN_TYPE_OPTIONS = [
  { value: "llm", label: "LLM" },
  { value: "rule", label: "Rule" },
  { value: "neuro-symbolic", label: "Neuro-Symbolic" },
  { value: "hybrid", label: "Hybrid" },
  { value: "custom", label: "Custom" },
] as const;

// ─── Helpers ───────────────────────────────────────────────────────

function statusColor(status: AgentStatusUI): string {
  switch (status) {
    case "active":
      return "var(--signal-fg-success)";
    case "degraded":
      return "var(--signal-fg-warning)";
    case "offline":
      return "var(--signal-fg-tertiary)";
  }
}

function statusBg(status: AgentStatusUI): string {
  switch (status) {
    case "active":
      return "var(--signal-bg-success-muted)";
    case "degraded":
      return "var(--signal-bg-warning-muted)";
    case "offline":
      return "var(--signal-bg-secondary)";
  }
}

function formatRelativeTime(isoString?: string): string {
  if (!isoString) return "Never";
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function maturityBadgeColor(level: number): { bg: string; fg: string } {
  switch (level) {
    case 1:
      return { bg: "var(--signal-bg-secondary)", fg: "var(--signal-fg-tertiary)" };
    case 2:
      return { bg: "var(--signal-bg-info-muted)", fg: "var(--signal-fg-info)" };
    case 3:
      return { bg: "var(--signal-bg-accent-muted)", fg: "var(--signal-fg-accent)" };
    case 4:
      return { bg: "var(--signal-bg-warning-muted)", fg: "var(--signal-fg-warning)" };
    case 5:
      return { bg: "var(--signal-bg-success-muted)", fg: "var(--signal-fg-success)" };
    default:
      return { bg: "var(--signal-bg-secondary)", fg: "var(--signal-fg-tertiary)" };
  }
}

// ─── Skeleton ───────────────────────────────────────────────────────

function AgentsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={`agent-sk-${i}`}
          className="rounded-[var(--signal-radius-lg)] border border-[var(--signal-border-subtle)] bg-[var(--signal-bg-primary)] overflow-hidden animate-pulse"
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="h-9 w-9 rounded-full bg-[var(--signal-border-default)]" />
            <div className="space-y-2 flex-1">
              <div className="h-3 w-32 rounded bg-[var(--signal-border-default)]" />
              <div className="h-2 w-20 rounded bg-[var(--signal-border-default)]" />
            </div>
            <div className="h-5 w-16 rounded-full bg-[var(--signal-border-default)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────────────

function AgentsEmpty({ onRegister }: { onRegister: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--signal-bg-accent-muted)] ring-1 ring-[var(--signal-border-accent-muted)] shadow-sm mb-5">
        <Bot className="h-8 w-8 text-[var(--signal-fg-accent)]" />
      </div>
      <h2 className="text-lg font-semibold text-[var(--signal-fg-primary)] mb-2">
        No agents registered
      </h2>
      <p className="text-sm text-[var(--signal-fg-secondary)] max-w-md leading-relaxed mb-6">
        Register your first AI agent to start managing agent behavior,
        governance policies, and automated feature flag operations.
      </p>
      <button
        type="button"
        onClick={onRegister}
        className="inline-flex items-center gap-2 rounded-[var(--signal-radius-sm)] bg-[var(--signal-bg-accent-emphasis)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--signal-shadow-xs)] transition-all duration-[var(--signal-duration-fast)] hover:-translate-y-px hover:shadow-[var(--signal-shadow-sm)]"
      >
        <Plus className="h-4 w-4" />
        Register New Agent
      </button>
    </div>
  );
}

// ─── Error State ────────────────────────────────────────────────────

function AgentsError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--signal-bg-danger-muted)] ring-1 ring-[var(--signal-border-danger-emphasis)]/30 mb-5">
        <AlertTriangle className="h-8 w-8 text-[var(--signal-fg-danger)]" />
      </div>
      <h2 className="text-lg font-semibold text-[var(--signal-fg-primary)] mb-2">
        Failed to load agents
      </h2>
      <p className="text-sm text-[var(--signal-fg-secondary)] max-w-md mb-6">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-[var(--signal-radius-sm)] border border-[var(--signal-border-subtle)] bg-[var(--signal-bg-primary)] px-4 py-2 text-sm font-medium text-[var(--signal-fg-secondary)] transition-colors duration-[var(--signal-duration-fast)] hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)]"
      >
        <RefreshCw className="h-4 w-4" />
        Retry
      </button>
    </div>
  );
}

// ─── Register Dialog ────────────────────────────────────────────────

function RegisterAgentDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (agent: Agent) => void;
}) {
  const token = useAppStore((s) => s.token);

  const [form, setForm] = useState<RegisterFormData>(EMPTY_REGISTER_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setForm(EMPTY_REGISTER_FORM);
    setErrors({});
  }, []);

  const handleClose = useCallback(() => {
    if (!submitting) {
      resetForm();
      onClose();
    }
  }, [submitting, resetForm, onClose]);

  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Agent name is required";
    if (!form.type.trim()) errs.type = "Agent type is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form]);

  const handleSubmit = useCallback(async () => {
    if (!token || !validate()) return;
    setSubmitting(true);
    try {
      const created = await api.agents.register(token, {
        name: form.name.trim(),
        type: form.type.trim(),
        version: form.version || undefined,
        brain_type: form.brain_type,
      });
      resetForm();
      onCreated(created);
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : "Failed to register agent",
      });
    } finally {
      setSubmitting(false);
    }
  }, [token, form, validate, resetForm, onCreated]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
          className="relative z-10 w-full max-w-lg rounded-[var(--signal-radius-xl)] border border-[var(--signal-border-subtle)] bg-[var(--signal-bg-primary)] shadow-[var(--signal-shadow-xl)] p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Register new agent"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-semibold text-[var(--signal-fg-primary)]">
                Register New Agent
              </h3>
              <p className="text-xs text-[var(--signal-fg-tertiary)] mt-0.5">
                Add an AI agent to the Agent Behavior Mesh
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--signal-radius-sm)] text-[var(--signal-fg-tertiary)] hover:text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-secondary)] transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Form error */}
          {errors.form && (
            <div className="mb-4 rounded-[var(--signal-radius-sm)] bg-[var(--signal-bg-danger-muted)] px-3 py-2 text-xs text-[var(--signal-fg-danger)]">
              {errors.form}
            </div>
          )}

          {/* Form fields */}
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label
                htmlFor="agent-name"
                className="block text-xs font-medium text-[var(--signal-fg-secondary)] mb-1.5"
              >
                Agent Name
              </label>
              <input
                id="agent-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g., production-flag-monitor"
                className={cn(
                  "w-full rounded-[var(--signal-radius-sm)] border px-3 py-2 text-sm text-[var(--signal-fg-primary)]",
                  "placeholder:text-[var(--signal-fg-tertiary)] bg-[var(--signal-bg-secondary)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-emphasis)] focus:border-transparent",
                  errors.name
                    ? "border-[var(--signal-border-danger-emphasis)]"
                    : "border-[var(--signal-border-subtle)]",
                )}
              />
              {errors.name && (
                <p className="mt-1 text-[11px] text-[var(--signal-fg-danger)]">
                  {errors.name}
                </p>
              )}
            </div>

            {/* Type */}
            <div>
              <label
                htmlFor="agent-type"
                className="block text-xs font-medium text-[var(--signal-fg-secondary)] mb-1.5"
              >
                Agent Type
              </label>
              <input
                id="agent-type"
                type="text"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                placeholder="e.g., code-reviewer, flag-monitor, incident-responder"
                className={cn(
                  "w-full rounded-[var(--signal-radius-sm)] border px-3 py-2 text-sm text-[var(--signal-fg-primary)]",
                  "placeholder:text-[var(--signal-fg-tertiary)] bg-[var(--signal-bg-secondary)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-emphasis)] focus:border-transparent",
                  errors.type
                    ? "border-[var(--signal-border-danger-emphasis)]"
                    : "border-[var(--signal-border-subtle)]",
                )}
              />
              {errors.type && (
                <p className="mt-1 text-[11px] text-[var(--signal-fg-danger)]">
                  {errors.type}
                </p>
              )}
            </div>

            {/* Brain Type */}
            <div>
              <label
                htmlFor="agent-brain"
                className="block text-xs font-medium text-[var(--signal-fg-secondary)] mb-1.5"
              >
                Brain Type
              </label>
              <select
                id="agent-brain"
                value={form.brain_type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, brain_type: e.target.value }))
                }
                className="w-full rounded-[var(--signal-radius-sm)] border border-[var(--signal-border-subtle)] px-3 py-2 text-sm text-[var(--signal-fg-primary)] bg-[var(--signal-bg-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-emphasis)]"
              >
                {BRAIN_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Version */}
            <div>
              <label
                htmlFor="agent-version"
                className="block text-xs font-medium text-[var(--signal-fg-secondary)] mb-1.5"
              >
                Version
              </label>
              <input
                id="agent-version"
                type="text"
                value={form.version}
                onChange={(e) =>
                  setForm((f) => ({ ...f, version: e.target.value }))
                }
                placeholder="1.0.0"
                className="w-full rounded-[var(--signal-radius-sm)] border border-[var(--signal-border-subtle)] px-3 py-2 text-sm text-[var(--signal-fg-primary)] placeholder:text-[var(--signal-fg-tertiary)] bg-[var(--signal-bg-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-emphasis)]"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-[var(--signal-border-subtle)]">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="inline-flex items-center rounded-[var(--signal-radius-sm)] border border-[var(--signal-border-subtle)] px-3.5 py-2 text-xs font-medium text-[var(--signal-fg-secondary)] transition-colors hover:bg-[var(--signal-bg-secondary)] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-[var(--signal-radius-sm)] px-3.5 py-2 text-xs font-semibold text-white transition-all duration-[var(--signal-duration-fast)]",
                submitting
                  ? "bg-[var(--signal-bg-accent-emphasis)]/50 cursor-not-allowed"
                  : "bg-[var(--signal-bg-accent-emphasis)] hover:-translate-y-px hover:shadow-[var(--signal-shadow-sm)]",
              )}
            >
              {submitting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Registering…
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  Register Agent
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Delete Confirmation Dialog ─────────────────────────────────────

function DeleteConfirmDialog({
  open,
  agentName,
  onClose,
  onConfirm,
  deleting,
}: {
  open: boolean;
  agentName: string;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
}) {
  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
      >
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
          className="relative z-10 w-full max-w-sm rounded-[var(--signal-radius-xl)] border border-[var(--signal-border-subtle)] bg-[var(--signal-bg-primary)] shadow-[var(--signal-shadow-xl)] p-6"
          role="alertdialog"
          aria-label={`Delete agent ${agentName}`}
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--signal-bg-danger-muted)] mb-4">
            <Trash2 className="h-6 w-6 text-[var(--signal-fg-danger)]" />
          </div>
          <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] text-center mb-2">
            Delete Agent
          </h3>
          <p className="text-sm text-[var(--signal-fg-secondary)] text-center mb-6">
            Are you sure you want to delete{" "}
            <span className="font-medium text-[var(--signal-fg-primary)]">
              {agentName}
            </span>
            ? This action cannot be undone.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="flex-1 rounded-[var(--signal-radius-sm)] border border-[var(--signal-border-subtle)] py-2 text-xs font-medium text-[var(--signal-fg-secondary)] transition-colors hover:bg-[var(--signal-bg-secondary)] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={deleting}
              className="flex-1 rounded-[var(--signal-radius-sm)] bg-[var(--signal-bg-danger-emphasis)] py-2 text-xs font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Agent Card ─────────────────────────────────────────────────────

function AgentCard({
  agent,
  onDelete,
  onToggle,
  onConfigure,
}: {
  agent: Agent;
  onDelete: () => void;
  onToggle: () => void;
  onConfigure: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const mc = maturityBadgeColor(agent.maturity.current_level);
  const status = agent.status as AgentStatusUI;
  const isOnline = status === "active";

  return (
    <>
      <div className="rounded-[var(--signal-radius-lg)] border border-[var(--signal-border-subtle)] bg-[var(--signal-bg-primary)] overflow-hidden transition-shadow duration-[var(--signal-duration-fast)] hover:shadow-[var(--signal-shadow-sm)]">
        {/* Header row */}
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-[var(--signal-duration-fast)] hover:bg-[var(--signal-bg-secondary)]"
          aria-expanded={expanded}
        >
          {/* Avatar */}
          <div
            className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
            style={{
              backgroundColor: statusBg(status),
              color: statusColor(status),
            }}
          >
            {agent.name.charAt(0).toUpperCase()}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[var(--signal-fg-primary)] truncate">
                {agent.name}
              </span>
              <span
                className="inline-flex items-center rounded-full px-1.5 py-px text-[10px] font-semibold"
                style={{
                  backgroundColor: mc.bg,
                  color: mc.fg,
                }}
              >
                L{agent.maturity.current_level}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-[var(--signal-fg-tertiary)]">
                {agent.type}
              </span>
              <span className="text-[11px] text-[var(--signal-fg-tertiary)]">·</span>
              <span className="text-[11px] text-[var(--signal-fg-tertiary)]">
                v{agent.version}
              </span>
            </div>
          </div>

          {/* Status badge */}
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold shrink-0"
            style={{
              backgroundColor: statusBg(status),
              color: statusColor(status),
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: statusColor(status) }}
            />
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </div>

          {/* Expand chevron */}
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-[var(--signal-fg-tertiary)]" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--signal-fg-tertiary)]" />
          )}
        </button>

        {/* Expanded detail */}
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="border-t border-[var(--signal-border-subtle)] bg-[var(--signal-bg-secondary)] px-4 py-4 space-y-4"
          >
            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
                  Status
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <Activity className="h-3.5 w-3.5" style={{ color: statusColor(status) }} />
                  <span className="text-xs font-medium text-[var(--signal-fg-primary)] capitalize">
                    {status}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
                  Heartbeat
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <Clock className="h-3.5 w-3.5 text-[var(--signal-fg-tertiary)]" />
                  <span className="text-xs text-[var(--signal-fg-primary)]">
                    {formatRelativeTime(agent.last_heartbeat)}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
                  Accuracy
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <BarChart3 className="h-3.5 w-3.5 text-[var(--signal-fg-accent)]" />
                  <span className="text-xs font-medium text-[var(--signal-fg-primary)]">
                    {Math.round(agent.maturity.stats.accuracy * 100)}%
                  </span>
                </div>
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
                  Decisions
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <Zap className="h-3.5 w-3.5 text-[var(--signal-fg-accent)]" />
                  <span className="text-xs font-medium text-[var(--signal-fg-primary)]">
                    {agent.maturity.stats.total_decisions.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Rate limits */}
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
                Rate Limits
              </span>
              <div className="flex items-center gap-4 mt-1.5 text-[11px] text-[var(--signal-fg-secondary)]">
                <span>{agent.rate_limits.per_minute}/min</span>
                <span>{agent.rate_limits.per_hour}/hr</span>
                <span>{agent.rate_limits.concurrent_actions} concurrent</span>
              </div>
            </div>

            {/* Scopes */}
            {agent.scopes.length > 0 && (
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
                  Scopes
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {agent.scopes.map((scope) => (
                    <span
                      key={scope}
                      className="inline-flex items-center rounded-full bg-[var(--signal-bg-primary)] border border-[var(--signal-border-subtle)] px-2 py-0.5 text-[10px] text-[var(--signal-fg-secondary)]"
                    >
                      {scope}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-3 border-t border-[var(--signal-border-subtle)]">
              <button
                type="button"
                onClick={onToggle}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-[var(--signal-radius-sm)] px-3 py-1.5 text-[11px] font-medium transition-all duration-[var(--signal-duration-fast)]",
                  isOnline
                    ? "border border-[var(--signal-border-warning)] text-[var(--signal-fg-warning)] hover:bg-[var(--signal-bg-warning-muted)]"
                    : "border border-[var(--signal-border-success)] text-[var(--signal-fg-success)] hover:bg-[var(--signal-bg-success-muted)]",
                )}
              >
                {isOnline ? (
                  <>
                    <PowerOff className="h-3.5 w-3.5" />
                    Disable
                  </>
                ) : (
                  <>
                    <Power className="h-3.5 w-3.5" />
                    Enable
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onConfigure}
                className="inline-flex items-center gap-1.5 rounded-[var(--signal-radius-sm)] border border-[var(--signal-border-subtle)] px-3 py-1.5 text-[11px] font-medium text-[var(--signal-fg-secondary)] transition-colors hover:bg-[var(--signal-bg-secondary)]"
              >
                <Settings className="h-3.5 w-3.5" />
                Configure
              </button>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 rounded-[var(--signal-radius-sm)] px-3 py-1.5 text-[11px] font-medium text-[var(--signal-fg-danger)] transition-colors hover:bg-[var(--signal-bg-danger-muted)]"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Delete confirmation */}
      <DeleteConfirmDialog
        open={confirmDelete}
        agentName={agent.name}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          onDelete();
          setConfirmDelete(false);
        }}
        deleting={false}
      />
    </>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────

export default function AgentsPage() {
  const router = useRouter();
  const token = useAppStore((s) => s.token);

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [registerOpen, setRegisterOpen] = useState(false);
  const [policyFormOpen, setPolicyFormOpen] = useState(false);
  const [configuringAgent, setConfiguringAgent] = useState<Agent | null>(null);

  const fetchAgents = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.agents.list(token, { limit: 50 });
      setAgents(result.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load agents",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleToggle = useCallback(
    async (agent: Agent) => {
      if (!token) return;
      const newEnabled = agent.status !== "active";
      try {
        const updated = await api.agents.toggle(token, agent.id, newEnabled);
        setAgents((prev) =>
          prev.map((a) => (a.id === agent.id ? updated : a)),
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to toggle agent",
        );
      }
    },
    [token],
  );

  const handleDelete = useCallback(
    async (agent: Agent) => {
      if (!token) return;
      try {
        await api.agents.delete(token, agent.id);
        setAgents((prev) => prev.filter((a) => a.id !== agent.id));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to delete agent",
        );
      }
    },
    [token],
  );

  const handleAgentCreated = useCallback((agent: Agent) => {
    setAgents((prev) => [agent, ...prev]);
    setRegisterOpen(false);
  }, []);

  const handlePolicyCreated = useCallback((_policy: Policy) => {
    setPolicyFormOpen(false);
  }, []);

  const filteredAgents = searchQuery.trim()
    ? agents.filter(
        (a) =>
          a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.type.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : agents;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--signal-fg-primary)]">
            Agents
          </h1>
          <p className="text-sm text-[var(--signal-fg-secondary)] mt-1">
            Manage your registered AI agents and their behavior
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPolicyFormOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-[var(--signal-radius-sm)] border border-[var(--signal-border-subtle)] px-3.5 py-2 text-xs font-medium text-[var(--signal-fg-secondary)] transition-colors hover:bg-[var(--signal-bg-secondary)]"
          >
            <Shield className="h-3.5 w-3.5" />
            Create Policy
          </button>
          <button
            type="button"
            onClick={() => setRegisterOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-[var(--signal-radius-sm)] bg-[var(--signal-bg-accent-emphasis)] px-3.5 py-2 text-xs font-semibold text-white shadow-[var(--signal-shadow-xs)] transition-all duration-[var(--signal-duration-fast)] hover:-translate-y-px hover:shadow-[var(--signal-shadow-sm)]"
          >
            <Plus className="h-3.5 w-3.5" />
            Register Agent
          </button>
        </div>
      </div>

      {/* Search */}
      {!loading && !error && agents.length > 0 && (
        <div className="mb-4">
          <div
            className={cn(
              "flex items-center gap-2 rounded-[var(--signal-radius-md)] border border-[var(--signal-border-subtle)] bg-[var(--signal-bg-primary)] px-3 py-2 max-w-sm",
              "focus-within:ring-2 focus-within:ring-[var(--signal-border-accent-emphasis)] focus-within:border-transparent",
            )}
          >
            <Search className="h-4 w-4 shrink-0 text-[var(--signal-fg-tertiary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search agents…"
              className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--signal-fg-primary)] placeholder:text-[var(--signal-fg-tertiary)]"
              aria-label="Search agents"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="shrink-0 text-[var(--signal-fg-tertiary)] hover:text-[var(--signal-fg-primary)]"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        {loading ? (
          <AgentsSkeleton key="skeleton" />
        ) : error ? (
          <AgentsError key="error" message={error} onRetry={fetchAgents} />
        ) : filteredAgents.length === 0 ? (
          searchQuery.trim() ? (
            <motion.div
              key="no-results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <Search className="h-10 w-10 text-[var(--signal-fg-tertiary)] mb-3" />
              <p className="text-sm text-[var(--signal-fg-secondary)]">
                No agents match &quot;{searchQuery}&quot;
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-2 text-xs text-[var(--signal-fg-accent)] hover:underline"
              >
                Clear search
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <AgentsEmpty onRegister={() => setRegisterOpen(true)} />
            </motion.div>
          )
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {filteredAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onDelete={() => handleDelete(agent)}
                onToggle={() => handleToggle(agent)}
                onConfigure={() => setConfiguringAgent(agent)}
              />
            ))}

            {/* Footer */}
            <p className="text-center text-[11px] text-[var(--signal-fg-tertiary)] pt-2">
              {filteredAgents.length} agent{filteredAgents.length !== 1 ? "s" : ""} registered
            </p>

            {/* Navigation hints */}
            <div className="flex items-center justify-center gap-4 pt-1">
              <button
                type="button"
                onClick={() => router.push("/console/policies")}
                className="inline-flex items-center gap-1.5 text-[11px] text-[var(--signal-fg-accent)] hover:underline"
              >
                <Shield className="h-3 w-3" />
                Manage Policies
              </button>
              <button
                type="button"
                onClick={() => router.push("/console")}
                className="inline-flex items-center gap-1.5 text-[11px] text-[var(--signal-fg-secondary)] hover:underline"
              >
                <Terminal className="h-3 w-3" />
                Back to Console
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Register dialog */}
      <RegisterAgentDialog
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onCreated={handleAgentCreated}
      />

      {/* Policy creation dialog */}
      <PolicyForm
        open={policyFormOpen}
        onClose={() => setPolicyFormOpen(false)}
        onCreated={handlePolicyCreated}
      />

      {/* Configure agent dialog */}
      {configuringAgent && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
          >
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setConfiguringAgent(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-lg rounded-[var(--signal-radius-xl)] border border-[var(--signal-border-subtle)] bg-[var(--signal-bg-primary)] shadow-[var(--signal-shadow-xl)] p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-[var(--signal-fg-primary)]">
                  Configure {configuringAgent.name}
                </h3>
                <button
                  type="button"
                  onClick={() => setConfiguringAgent(null)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--signal-radius-sm)] text-[var(--signal-fg-tertiary)] hover:text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-secondary)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-medium text-[var(--signal-fg-secondary)]">
                    Maturity Level: {configuringAgent.maturity.current_level}
                  </span>
                  <p className="text-[11px] text-[var(--signal-fg-tertiary)] mt-1">
                    Agent configuration settings are managed through the ABM
                    Behavior Mesh. Full config UI coming in a future release.
                  </p>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setConfiguringAgent(null)}
                    className="rounded-[var(--signal-radius-sm)] border border-[var(--signal-border-subtle)] px-3.5 py-2 text-xs font-medium text-[var(--signal-fg-secondary)] hover:bg-[var(--signal-bg-secondary)]"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
