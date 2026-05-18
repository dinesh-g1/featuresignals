"use client";

/**
 * Policy Management Page — Full enterprise page for creating and
 * managing governance policies that control agent behavior.
 *
 * Route: /console/policies
 *
 * Features:
 * - Table of all policies with name, effect, priority, enabled status
 * - Toggle enable/disable
 * - Create policy using PolicyForm component
 * - Edit and delete policies
 * - Policy evaluation preview (affected agents/tools)
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
  Shield,
  Trash2,
  Pencil,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  X,
  Eye,
  ChevronDown,
  ChevronRight,
  Bot,
  Wrench,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { PolicyForm } from "@/components/policies/policy-form";
import type {
  Policy,
  PolicyEffect,
  UpdatePolicyRequest,
} from "@/lib/policy-types";
import { POLICY_EFFECT_LABELS, POLICY_EFFECT_VARIANTS } from "@/lib/policy-types";

// ─── Helpers ───────────────────────────────────────────────────────

function effectVariantBg(effect: PolicyEffect): string {
  const variant = POLICY_EFFECT_VARIANTS[effect];
  switch (variant) {
    case "danger":
      return "var(--signal-bg-danger-muted)";
    case "warning":
      return "var(--signal-bg-warning-muted)";
    case "info":
      return "var(--signal-bg-info-muted)";
  }
}

function effectVariantFg(effect: PolicyEffect): string {
  const variant = POLICY_EFFECT_VARIANTS[effect];
  switch (variant) {
    case "danger":
      return "var(--signal-fg-danger)";
    case "warning":
      return "var(--signal-fg-warning)";
    case "info":
      return "var(--signal-fg-info)";
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Skeleton ───────────────────────────────────────────────────────

function PoliciesSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={`pol-sk-${i}`}
          className="rounded-[var(--signal-radius-lg)] border border-[var(--signal-border-subtle)] bg-[var(--signal-bg-primary)] overflow-hidden animate-pulse"
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="h-8 w-8 rounded-full bg-[var(--signal-border-default)]" />
            <div className="space-y-2 flex-1">
              <div className="h-3 w-28 rounded bg-[var(--signal-border-default)]" />
              <div className="h-2 w-16 rounded bg-[var(--signal-border-default)]" />
            </div>
            <div className="h-5 w-14 rounded-full bg-[var(--signal-border-default)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────────────

function PoliciesEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--signal-bg-accent-muted)] ring-1 ring-[var(--signal-border-accent-muted)] shadow-sm mb-5">
        <Shield className="h-8 w-8 text-[var(--signal-fg-accent)]" />
      </div>
      <h2 className="text-lg font-semibold text-[var(--signal-fg-primary)] mb-2">
        No governance policies
      </h2>
      <p className="text-sm text-[var(--signal-fg-secondary)] max-w-md leading-relaxed mb-6">
        Create policies to control what your AI agents can and cannot do.
        Policies can deny actions, require human approval, warn, or just
        audit for compliance.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="inline-flex items-center gap-2 rounded-[var(--signal-radius-sm)] bg-[var(--signal-bg-accent-emphasis)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--signal-shadow-xs)] transition-all duration-[var(--signal-duration-fast)] hover:-translate-y-px hover:shadow-[var(--signal-shadow-sm)]"
      >
        <Plus className="h-4 w-4" />
        Create Policy
      </button>
    </div>
  );
}

// ─── Error State ────────────────────────────────────────────────────

function PoliciesError({
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
        Failed to load policies
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

// ─── Delete Confirmation Dialog ────────────────────────────────────

function DeleteConfirmDialog({
  open,
  policyName,
  onClose,
  onConfirm,
  deleting,
}: {
  open: boolean;
  policyName: string;
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
          aria-label={`Delete policy ${policyName}`}
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--signal-bg-danger-muted)] mb-4">
            <Trash2 className="h-6 w-6 text-[var(--signal-fg-danger)]" />
          </div>
          <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] text-center mb-2">
            Delete Policy
          </h3>
          <p className="text-sm text-[var(--signal-fg-secondary)] text-center mb-6">
            Are you sure you want to delete{" "}
            <span className="font-medium text-[var(--signal-fg-primary)]">
              {policyName}
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

// ─── Edit Policy Dialog ─────────────────────────────────────────────

function EditPolicyDialog({
  open,
  policy,
  onClose,
  onUpdated,
}: {
  open: boolean;
  policy: Policy;
  onClose: () => void;
  onUpdated: (policy: Policy) => void;
}) {
  const token = useAppStore((s) => s.token);
  const [name, setName] = useState(policy.name);
  const [description, setDescription] = useState(policy.description ?? "");
  const [priority, setPriority] = useState(policy.priority);
  const [enabled, setEnabled] = useState(policy.enabled);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(policy.name);
    setDescription(policy.description ?? "");
    setPriority(policy.priority);
    setEnabled(policy.enabled);
  }, [policy]);

  const handleSave = useCallback(async () => {
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      const body: UpdatePolicyRequest = {
        name: name.trim() || undefined,
        description: description.trim() || undefined,
        priority,
        enabled,
      };
      const updated = await api.policies.update(token, policy.id, body);
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update policy");
    } finally {
      setSubmitting(false);
    }
  }, [token, policy.id, name, description, priority, enabled, onUpdated]);

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
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
          className="relative z-10 w-full max-w-lg rounded-[var(--signal-radius-xl)] border border-[var(--signal-border-subtle)] bg-[var(--signal-bg-primary)] shadow-[var(--signal-shadow-xl)] p-6"
          role="dialog"
          aria-label={`Edit policy ${policy.name}`}
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-[var(--signal-fg-primary)]">
              Edit Policy
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--signal-radius-sm)] text-[var(--signal-fg-tertiary)] hover:text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-secondary)] transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-[var(--signal-radius-sm)] bg-[var(--signal-bg-danger-muted)] px-3 py-2 text-xs text-[var(--signal-fg-danger)]">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--signal-fg-secondary)] mb-1.5">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-[var(--signal-radius-sm)] border border-[var(--signal-border-subtle)] px-3 py-2 text-sm text-[var(--signal-fg-primary)] bg-[var(--signal-bg-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-emphasis)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--signal-fg-secondary)] mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-[var(--signal-radius-sm)] border border-[var(--signal-border-subtle)] px-3 py-2 text-sm text-[var(--signal-fg-primary)] bg-[var(--signal-bg-secondary)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-emphasis)]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--signal-fg-secondary)] mb-1.5">
                  Priority
                </label>
                <input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  min={0}
                  max={1000}
                  className="w-full rounded-[var(--signal-radius-sm)] border border-[var(--signal-border-subtle)] px-3 py-2 text-sm text-[var(--signal-fg-primary)] bg-[var(--signal-bg-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-emphasis)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--signal-fg-secondary)] mb-1.5">
                  Effect
                </label>
                <div className="flex items-center h-[38px] px-3 text-sm text-[var(--signal-fg-primary)]">
                  {POLICY_EFFECT_LABELS[policy.effect]}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEnabled((e) => !e)}
                className={cn(
                  "relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-[var(--signal-duration-fast)]",
                  enabled
                    ? "bg-[var(--signal-bg-success-emphasis)]"
                    : "bg-[var(--signal-border-default)]",
                )}
                role="switch"
                aria-checked={enabled}
              >
                <span
                  className={cn(
                    "inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-[var(--signal-duration-fast)]",
                    enabled ? "translate-x-[18px]" : "translate-x-[2px]",
                  )}
                />
              </button>
              <span className="text-xs text-[var(--signal-fg-secondary)]">
                {enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-[var(--signal-border-subtle)]">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-[var(--signal-radius-sm)] border border-[var(--signal-border-subtle)] px-3.5 py-2 text-xs font-medium text-[var(--signal-fg-secondary)] hover:bg-[var(--signal-bg-secondary)] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={submitting}
              className="rounded-[var(--signal-radius-sm)] bg-[var(--signal-bg-accent-emphasis)] px-3.5 py-2 text-xs font-semibold text-white transition-all hover:-translate-y-px disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Preview Dialog ─────────────────────────────────────────────────

function PreviewDialog({
  open,
  policy,
  onClose,
}: {
  open: boolean;
  policy: Policy;
  onClose: () => void;
}) {
  const token = useAppStore((s) => s.token);
  const [preview, setPreview] = useState<{
    affected_agents: { id: string; name: string; type: string }[];
    affected_tools: string[];
    match_count: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !token) return;
    setLoading(true);
    api.policies
      .preview(token, policy.id)
      .then(setPreview)
      .catch(() => setPreview(null))
      .finally(() => setLoading(false));
  }, [open, token, policy.id]);

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
          className="relative z-10 w-full max-w-md rounded-[var(--signal-radius-xl)] border border-[var(--signal-border-subtle)] bg-[var(--signal-bg-primary)] shadow-[var(--signal-shadow-xl)] p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-[var(--signal-fg-primary)]">
              Policy Preview
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--signal-radius-sm)] text-[var(--signal-fg-tertiary)] hover:text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-secondary)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="text-xs text-[var(--signal-fg-secondary)] mb-4">
            Showing agents and tools affected by{" "}
            <span className="font-medium text-[var(--signal-fg-primary)]">
              {policy.name}
            </span>
          </p>

          {loading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-3 w-24 rounded bg-[var(--signal-border-default)]" />
              <div className="h-3 w-32 rounded bg-[var(--signal-border-default)]" />
            </div>
          ) : preview ? (
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
                  Affected Agents ({preview.affected_agents.length})
                </span>
                {preview.affected_agents.length === 0 ? (
                  <p className="text-[11px] text-[var(--signal-fg-tertiary)] mt-1">
                    No agents match this policy&apos;s scope.
                  </p>
                ) : (
                  <div className="space-y-1.5 mt-1.5">
                    {preview.affected_agents.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center gap-2 text-[11px]"
                      >
                        <Bot className="h-3 w-3 text-[var(--signal-fg-tertiary)]" />
                        <span className="text-[var(--signal-fg-primary)]">
                          {a.name}
                        </span>
                        <span className="text-[var(--signal-fg-tertiary)]">
                          {a.type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
                  Affected Tools ({preview.affected_tools.length})
                </span>
                {preview.affected_tools.length === 0 ? (
                  <p className="text-[11px] text-[var(--signal-fg-tertiary)] mt-1">
                    No tools match this policy&apos;s scope.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {preview.affected_tools.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 rounded-full bg-[var(--signal-bg-secondary)] border border-[var(--signal-border-subtle)] px-2 py-0.5 text-[10px] text-[var(--signal-fg-secondary)]"
                      >
                        <Wrench className="h-2.5 w-2.5" />
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-[10px] text-[var(--signal-fg-tertiary)]">
                Total matches: {preview.match_count}
              </p>
            </div>
          ) : (
            <p className="text-xs text-[var(--signal-fg-tertiary)]">
              Unable to load preview data.
            </p>
          )}

          <div className="flex justify-end mt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[var(--signal-radius-sm)] border border-[var(--signal-border-subtle)] px-3.5 py-2 text-xs font-medium text-[var(--signal-fg-secondary)] hover:bg-[var(--signal-bg-secondary)]"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Policy Row ────────────────────────────────────────────────────

function PolicyRow({
  policy,
  onToggle,
  onEdit,
  onDelete,
  onPreview,
}: {
  policy: Policy;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPreview: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-[var(--signal-radius-lg)] border border-[var(--signal-border-subtle)] bg-[var(--signal-bg-primary)] overflow-hidden transition-shadow duration-[var(--signal-duration-fast)] hover:shadow-[var(--signal-shadow-sm)]">
      {/* Header row */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-[var(--signal-duration-fast)] hover:bg-[var(--signal-bg-secondary)]"
        aria-expanded={expanded}
      >
        {/* Icon */}
        <div
          className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
          style={{
            backgroundColor: effectVariantBg(policy.effect),
            color: effectVariantFg(policy.effect),
          }}
        >
          <Shield className="h-4 w-4" />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--signal-fg-primary)] truncate">
              {policy.name}
            </span>
            {!policy.enabled && (
              <span className="text-[10px] font-medium text-[var(--signal-fg-tertiary)]">
                Disabled
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className="text-[11px] font-medium"
              style={{ color: effectVariantFg(policy.effect) }}
            >
              {POLICY_EFFECT_LABELS[policy.effect]}
            </span>
            <span className="text-[11px] text-[var(--signal-fg-tertiary)]">
              Priority {policy.priority}
            </span>
            <span className="text-[11px] text-[var(--signal-fg-tertiary)]">
              · {policy.rules.length} rule{policy.rules.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={cn(
            "shrink-0 p-1 rounded transition-colors",
            policy.enabled
              ? "text-[var(--signal-fg-success)] hover:bg-[var(--signal-bg-success-muted)]"
              : "text-[var(--signal-fg-tertiary)] hover:bg-[var(--signal-bg-secondary)]",
          )}
          aria-label={policy.enabled ? "Disable policy" : "Enable policy"}
        >
          {policy.enabled ? (
            <ToggleRight className="h-5 w-5" />
          ) : (
            <ToggleLeft className="h-5 w-5" />
          )}
        </button>

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
          {/* Description */}
          {policy.description && (
            <p className="text-xs text-[var(--signal-fg-secondary)] leading-relaxed">
              {policy.description}
            </p>
          )}

          {/* Rules */}
          {policy.rules.length > 0 && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
                Rules ({policy.rules.length})
              </span>
              <div className="mt-1.5 space-y-2">
                {policy.rules.map((rule, idx) => (
                  <div
                    key={idx}
                    className="rounded-[var(--signal-radius-sm)] bg-[var(--signal-bg-primary)] border border-[var(--signal-border-subtle)] p-2.5"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[11px] font-medium text-[var(--signal-fg-primary)]">
                        {rule.name || `Rule ${idx + 1}`}
                      </span>
                      {rule.description && (
                        <span className="text-[10px] text-[var(--signal-fg-tertiary)]">
                          — {rule.description}
                        </span>
                      )}
                    </div>
                    <code className="block text-[11px] text-[var(--signal-fg-secondary)] font-mono bg-[var(--signal-bg-secondary)] rounded px-2 py-1 overflow-x-auto whitespace-pre-wrap">
                      {rule.expression}
                    </code>
                    {rule.message && (
                      <p className="text-[10px] text-[var(--signal-fg-tertiary)] mt-1">
                        Failure: {rule.message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scope summary */}
          {policy.scope &&
            Object.values(policy.scope).some(
              (arr) => arr && arr.length > 0,
            ) && (
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
                  Scope
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {policy.scope.agent_types?.map((t) => (
                    <span
                      key={`at-${t}`}
                      className="inline-flex rounded-full bg-[var(--signal-bg-primary)] border border-[var(--signal-border-subtle)] px-2 py-0.5 text-[10px] text-[var(--signal-fg-secondary)]"
                    >
                      Agent: {t}
                    </span>
                  ))}
                  {policy.scope.tool_names?.map((t) => (
                    <span
                      key={`tn-${t}`}
                      className="inline-flex rounded-full bg-[var(--signal-bg-primary)] border border-[var(--signal-border-subtle)] px-2 py-0.5 text-[10px] text-[var(--signal-fg-secondary)]"
                    >
                      Tool: {t}
                    </span>
                  ))}
                  {policy.scope.environments?.map((e) => (
                    <span
                      key={`env-${e}`}
                      className="inline-flex rounded-full bg-[var(--signal-bg-primary)] border border-[var(--signal-border-subtle)] px-2 py-0.5 text-[10px] text-[var(--signal-fg-secondary)]"
                    >
                      Env: {e}
                    </span>
                  ))}
                </div>
              </div>
            )}

          {/* Timestamps */}
          <div className="flex items-center gap-4 text-[10px] text-[var(--signal-fg-tertiary)]">
            <span>Created: {formatDate(policy.created_at)}</span>
            <span>Updated: {formatDate(policy.updated_at)}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-3 border-t border-[var(--signal-border-subtle)]">
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 rounded-[var(--signal-radius-sm)] border border-[var(--signal-border-subtle)] px-3 py-1.5 text-[11px] font-medium text-[var(--signal-fg-secondary)] transition-colors hover:bg-[var(--signal-bg-secondary)]"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
            <button
              type="button"
              onClick={onPreview}
              className="inline-flex items-center gap-1.5 rounded-[var(--signal-radius-sm)] border border-[var(--signal-border-subtle)] px-3 py-1.5 text-[11px] font-medium text-[var(--signal-fg-secondary)] transition-colors hover:bg-[var(--signal-bg-secondary)]"
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
            </button>
            <div className="flex-1" />
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 rounded-[var(--signal-radius-sm)] px-3 py-1.5 text-[11px] font-medium text-[var(--signal-fg-danger)] transition-colors hover:bg-[var(--signal-bg-danger-muted)]"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────

export default function PoliciesPage() {
  const router = useRouter();
  const token = useAppStore((s) => s.token);

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [previewingPolicy, setPreviewingPolicy] = useState<Policy | null>(null);
  const [deletingPolicy, setDeletingPolicy] = useState<Policy | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPolicies = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.policies.list(token, { limit: 50 });
      setPolicies(result.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load policies",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const handleToggle = useCallback(
    async (policy: Policy) => {
      if (!token) return;
      try {
        const result = await api.policies.toggle(token, policy.id, !policy.enabled);
        setPolicies((prev) =>
          prev.map((p) =>
            p.id === policy.id
              ? { ...p, enabled: result.active }
              : p,
          ),
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to toggle policy",
        );
      }
    },
    [token],
  );

  const handleDelete = useCallback(async () => {
    if (!token || !deletingPolicy) return;
    setDeleting(true);
    try {
      await api.policies.delete(token, deletingPolicy.id);
      setPolicies((prev) => prev.filter((p) => p.id !== deletingPolicy.id));
      setDeletingPolicy(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete policy",
      );
    } finally {
      setDeleting(false);
    }
  }, [token, deletingPolicy]);

  const handlePolicyCreated = useCallback((policy: Policy) => {
    setPolicies((prev) => [policy, ...prev]);
    setCreateOpen(false);
  }, []);

  const handlePolicyUpdated = useCallback((policy: Policy) => {
    setPolicies((prev) =>
      prev.map((p) => (p.id === policy.id ? policy : p)),
    );
    setEditingPolicy(null);
  }, []);

  const filteredPolicies = searchQuery.trim()
    ? policies.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.description ?? "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()),
      )
    : policies;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--signal-fg-primary)]">
            Policies
          </h1>
          <p className="text-sm text-[var(--signal-fg-secondary)] mt-1">
            Governance policies that control agent behavior and enforce
            compliance
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-[var(--signal-radius-sm)] bg-[var(--signal-bg-accent-emphasis)] px-3.5 py-2 text-xs font-semibold text-white shadow-[var(--signal-shadow-xs)] transition-all duration-[var(--signal-duration-fast)] hover:-translate-y-px hover:shadow-[var(--signal-shadow-sm)]"
        >
          <Plus className="h-3.5 w-3.5" />
          Create Policy
        </button>
      </div>

      {/* Search */}
      {!loading && !error && policies.length > 0 && (
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
              placeholder="Search policies…"
              className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--signal-fg-primary)] placeholder:text-[var(--signal-fg-tertiary)]"
              aria-label="Search policies"
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
          <PoliciesSkeleton key="skeleton" />
        ) : error ? (
          <PoliciesError key="error" message={error} onRetry={fetchPolicies} />
        ) : filteredPolicies.length === 0 ? (
          searchQuery.trim() ? (
            <motion.div
              key="no-results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <Search className="h-10 w-10 text-[var(--signal-fg-tertiary)] mb-3" />
              <p className="text-sm text-[var(--signal-fg-secondary)]">
                No policies match &quot;{searchQuery}&quot;
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
              <PoliciesEmpty onCreate={() => setCreateOpen(true)} />
            </motion.div>
          )
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {filteredPolicies.map((policy) => (
              <PolicyRow
                key={policy.id}
                policy={policy}
                onToggle={() => handleToggle(policy)}
                onEdit={() => setEditingPolicy(policy)}
                onDelete={() => setDeletingPolicy(policy)}
                onPreview={() => setPreviewingPolicy(policy)}
              />
            ))}

            {/* Footer */}
            <p className="text-center text-[11px] text-[var(--signal-fg-tertiary)] pt-2">
              {filteredPolicies.length} polic
              {filteredPolicies.length !== 1 ? "ies" : "y"}
            </p>

            {/* Navigation hints */}
            <div className="flex items-center justify-center gap-4 pt-1">
              <button
                type="button"
                onClick={() => router.push("/console/agents")}
                className="inline-flex items-center gap-1.5 text-[11px] text-[var(--signal-fg-accent)] hover:underline"
              >
                <Bot className="h-3 w-3" />
                Manage Agents
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

      {/* Create dialog */}
      <PolicyForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handlePolicyCreated}
      />

      {/* Edit dialog */}
      {editingPolicy && (
        <EditPolicyDialog
          open={editingPolicy !== null}
          policy={editingPolicy}
          onClose={() => setEditingPolicy(null)}
          onUpdated={handlePolicyUpdated}
        />
      )}

      {/* Preview dialog */}
      {previewingPolicy && (
        <PreviewDialog
          open={previewingPolicy !== null}
          policy={previewingPolicy}
          onClose={() => setPreviewingPolicy(null)}
        />
      )}

      {/* Delete confirmation */}
      <DeleteConfirmDialog
        open={deletingPolicy !== null}
        policyName={deletingPolicy?.name ?? ""}
        onClose={() => setDeletingPolicy(null)}
        onConfirm={handleDelete}
        deleting={deleting}
      />
    </div>
  );
}
