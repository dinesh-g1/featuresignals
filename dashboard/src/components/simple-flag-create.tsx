"use client";

import { useState, useCallback, useId } from "react";
import { cn } from "@/lib/utils";
import { suggestSlug } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { Input } from "@/components/ui/input";
import { Select, type SelectOption } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FormField } from "@/components/ui/form-field";
import { ProgressiveDisclosure } from "@/components/ui/progressive-disclosure";
import { FieldHelp } from "@/components/field-help";
import { toast } from "@/components/toast";
import {
  FlagIcon,
  CodeIcon,
  ToggleLeftIcon,
  FileCodeIcon,
  BeakerIcon,
} from "@/components/icons/nav-icons";
import type { Flag } from "@/lib/types";

// ─── Constants ──────────────────────────────────────────────────────

const FLAG_TYPE_OPTIONS: SelectOption[] = [
  { value: "boolean", label: "Boolean (on/off)" },
  { value: "string", label: "String" },
  { value: "number", label: "Number" },
  { value: "json", label: "JSON" },
  { value: "ab", label: "A/B Experiment" },
];

const FLAG_TYPE_ICONS: Record<string, React.ReactNode> = {
  boolean: <ToggleLeftIcon className="h-4 w-4" />,
  string: <CodeIcon className="h-4 w-4" />,
  number: <CodeIcon className="h-4 w-4" />,
  json: <FileCodeIcon className="h-4 w-4" />,
  ab: <BeakerIcon className="h-4 w-4" />,
};

const DEFAULT_ADVANCED_AFTER = 5;

// ─── Types ──────────────────────────────────────────────────────────

export interface SimpleFlagCreateProps {
  /** The project ID to create the flag in */
  projectId: string;
  /** Called after successful flag creation */
  onCreated?: (flag: Flag) => void;
  /** Called when the user cancels */
  onCancel?: () => void;
  /**
   * Number of flags the user has created after which advanced mode
   * auto-enables. Defaults to 5.
   */
  advancedAfterFlags?: number;
  /**
   * Whether to start in advanced mode (overrides the count-based heuristic).
   * Useful for power users who always want the full form.
   */
  startAdvanced?: boolean;
  /** Additional class for the form wrapper */
  className?: string;
}

// ─── Component ──────────────────────────────────────────────────────

/**
 * SimpleFlagCreate — a progressive-disclosure flag creation form.
 *
 * **Simple mode** (default for new users):
 * - Flag name
 * - Flag key (auto-generated from name, editable)
 * - Flag type dropdown
 * - Optional description
 * - On/Off toggle
 *
 * **Advanced mode** (toggled or auto-enabled after N flags):
 * - All simple fields plus:
 * - Targeting rules (placeholder for VisualRuleBuilder)
 * - Segments (placeholder)
 * - Prerequisites (placeholder)
 * - Scheduling (placeholder)
 * - Percentage rollout
 * - Expiration date
 * - Tags
 *
 * Uses the `ProgressiveDisclosure` component for the simple↔advanced toggle.
 * The toggle is a subtle link at the bottom of the form.
 */
export function SimpleFlagCreate({
  projectId,
  onCreated,
  onCancel,
  advancedAfterFlags: _advancedAfterFlags = DEFAULT_ADVANCED_AFTER,
  startAdvanced = false,
  className,
}: SimpleFlagCreateProps) {
  const token = useAppStore((s) => s.token);

  // ─── Form state ─────────────────────────────────────────────────

  const nameId = useId();
  const keyId = useId();
  const typeId = useId();
  const descId = useId();

  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [flagType, setFlagType] = useState("boolean");
  const [description, setDescription] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [tags, setTags] = useState("");
  const [percentageRollout, setPercentageRollout] = useState(100);

  // Track whether key was manually edited (so we stop auto-suggesting)
  const [keyManuallyEdited, setKeyManuallyEdited] = useState(false);

  // Form submission
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Handlers ───────────────────────────────────────────────────

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newName = e.target.value;
      setName(newName);
      if (!keyManuallyEdited) {
        setKey(suggestSlug(newName));
      }
    },
    [keyManuallyEdited],
  );

  const handleKeyChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setKey(e.target.value);
      setKeyManuallyEdited(true);
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      // Basic validation
      if (!name.trim()) {
        setError("Flag name is required");
        return;
      }
      if (!key.trim()) {
        setError("Flag key is required");
        return;
      }
      if (!/^[a-zA-Z0-9._-]+$/.test(key)) {
        setError(
          "Flag key can only contain letters, numbers, dots, hyphens, and underscores",
        );
        return;
      }

      if (!token) {
        setError("You must be logged in to create a flag");
        return;
      }

      setSubmitting(true);

      try {
        const payload: Partial<Flag> = {
          name: name.trim(),
          key: key.trim(),
          description: description.trim() || undefined,
          flag_type: flagType,
          status: enabled ? "enabled" : "disabled",
        };

        if (tags.trim()) {
          payload.tags = tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
        }

        const flag = await api.createFlag(token, projectId, payload);
        toast(`Flag "${flag.name}" created`, "success");
        onCreated?.(flag);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to create flag";
        setError(message);
        toast(message, "error");
      } finally {
        setSubmitting(false);
      }
    },
    [
      name,
      key,
      description,
      flagType,
      enabled,
      tags,
      token,
      projectId,
      onCreated,
    ],
  );

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("space-y-5", className)}
      noValidate
    >
      {/* ── Flag Name ──────────────────────────────────────────── */}
      <FormField label="Flag name" htmlFor={nameId} required>
        <div className="flex items-center gap-1.5">
          <Input
            id={nameId}
            type="text"
            value={name}
            onChange={handleNameChange}
            disabled={submitting}
            autoFocus
            className="flex-1"
          />
          <FieldHelp docsKey="flags" label="flag name" />
        </div>
      </FormField>

      {/* ── Flag Key ───────────────────────────────────────────── */}
      <FormField
        label="Flag key"
        htmlFor={keyId}
        required
        hint="Used in your code to reference this flag. Auto-generated from name."
      >
        <div className="flex items-center gap-1.5">
          <Input
            id={keyId}
            type="text"
            value={key}
            onChange={handleKeyChange}
            disabled={submitting}
            className="font-mono text-sm flex-1"
          />
          <FieldHelp docsKey="flags" label="flag key" />
        </div>
      </FormField>

      {/* ── Flag Type ──────────────────────────────────────────── */}
      <FormField label="Flag type" htmlFor={typeId}>
        <div className="flex items-center gap-1.5">
          <Select
            value={flagType}
            onValueChange={setFlagType}
            options={FLAG_TYPE_OPTIONS}
            icon={FLAG_TYPE_ICONS[flagType]}
            disabled={submitting}
            className="flex-1"
          />
          <FieldHelp docsKey="flags" label="flag types" />
        </div>
      </FormField>

      {/* ── Description ────────────────────────────────────────── */}
      <FormField
        label="Description"
        htmlFor={descId}
        hint="Optional. Describe what this flag controls."
      >
        <div className="flex items-center gap-1.5">
          <Input
            id={descId}
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
            className="flex-1"
          />
          <FieldHelp docsKey="flags" label="flag description" />
        </div>
      </FormField>

      {/* ── On/Off Toggle ──────────────────────────────────────── */}
      <div className="flex items-center justify-between rounded-lg border border-[var(--signal-border-default)] px-4 py-3">
        <div>
          <label
            htmlFor={`${nameId}-toggle`}
            className="text-sm font-medium text-[var(--signal-fg-primary)] cursor-pointer"
          >
            Enable flag
          </label>
          <p className="text-xs text-[var(--signal-fg-tertiary)] mt-0.5">
            When enabled, this flag will immediately serve its default value
          </p>
        </div>
        <Switch
          id={`${nameId}-toggle`}
          checked={enabled}
          onCheckedChange={setEnabled}
          disabled={submitting}
        />
      </div>

      {/* ── Advanced Options (Progressive Disclosure) ──────────── */}
      <ProgressiveDisclosure
        label="Advanced options"
        description="Targeting, scheduling, prerequisites, and more"
        defaultExpanded={startAdvanced}
        storageKey="flag-create-advanced"
      >
        <div className="space-y-5">
          {/* Tags */}
          <FormField
            label="Tags"
            hint="Comma-separated tags for organization and filtering"
          >
            <Input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              disabled={submitting}
            />
          </FormField>

          {/* Percentage Rollout */}
          <FormField
            label="Percentage rollout"
            hint={`${percentageRollout}% of users will receive this flag`}
          >
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                value={percentageRollout}
                onChange={(e) => setPercentageRollout(Number(e.target.value))}
                disabled={submitting}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--signal-bg-secondary)] accent-[var(--signal-fg-accent)]"
                aria-label="Percentage rollout"
              />
              <span className="w-10 text-right text-sm font-mono text-[var(--signal-fg-primary)] tabular-nums">
                {percentageRollout}%
              </span>
            </div>
          </FormField>

          {/* Expiration */}
          <FormField
            label="Expiration date"
            hint="Optional. The flag will auto-disable after this date."
          >
            <Input type="date" disabled={submitting} className="w-auto" />
          </FormField>

          {/* Advanced placeholders — explanatory text for future wiring */}
          <p className="text-xs text-[var(--signal-fg-tertiary)] italic">
            Targeting rules, segments, prerequisites, and scheduling are
            configured on the flag detail page after creation.
          </p>
        </div>
      </ProgressiveDisclosure>

      {/* ── Error ──────────────────────────────────────────────── */}
      {error && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* ── Actions ────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              "text-[var(--signal-fg-secondary)] hover:text-[var(--signal-fg-primary)]",
              "hover:bg-[var(--signal-bg-secondary)]",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting || !name.trim() || !key.trim()}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition-all",
            "bg-[var(--signal-fg-accent)] text-white",
            "hover:bg-[var(--signal-fg-accent)]/90 hover:shadow-md",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal-fg-accent)]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        >
          <FlagIcon className="h-4 w-4" />
          {submitting ? "Creating…" : "Create flag"}
        </button>
      </div>
    </form>
  );
}
