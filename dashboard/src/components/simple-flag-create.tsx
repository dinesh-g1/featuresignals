"use client";

import { useState, useCallback, useId } from "react";
import { cn } from "@/lib/utils";
import { suggestSlug } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FormField } from "@/components/ui/form-field";
import { ProgressiveDisclosure } from "@/components/ui/progressive-disclosure";
import { FieldHelp } from "@/components/field-help";
import { toast } from "@/components/toast";
import { FlagIcon, CodeIcon } from "@/components/icons/nav-icons";
import {
  ToggleRightIcon,
  BracesIcon,
  HashIcon,
  PercentIcon,
  CheckCircle2Icon,
} from "lucide-react";
import type { Flag } from "@/lib/types";

// ─── Constants ──────────────────────────────────────────────────────

const FLAG_TYPE_CARDS: {
  value: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    value: "boolean",
    label: "Boolean",
    description:
      "Simple on/off toggle. Best for feature releases and kill switches.",
    icon: ToggleRightIcon,
  },
  {
    value: "string",
    label: "String",
    description: "Return a string value. Best for config values like API URLs.",
    icon: CodeIcon,
  },
  {
    value: "number",
    label: "Number",
    description: "Return a numeric value. Best for thresholds and limits.",
    icon: HashIcon,
  },
  {
    value: "json",
    label: "JSON",
    description:
      "Return structured JSON. Best for complex configuration objects.",
    icon: BracesIcon,
  },
  {
    value: "ab",
    label: "A/B Experiment",
    description: "Split users into variants. Best for controlled experiments.",
    icon: PercentIcon,
  },
];

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
 * - Flag type selector with visual cards
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
  const [keyTouched, setKeyTouched] = useState(false);

  // Form submission
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Derived: key validation ────────────────────────────────────

  const keyValidation = (() => {
    if (!key) return { valid: false, message: null };
    if (!/^[a-zA-Z0-9._-]+$/.test(key))
      return {
        valid: false,
        message:
          "Only letters, numbers, dots, hyphens, and underscores allowed",
      };
    if (key.length < 2)
      return { valid: false, message: "Key must be at least 2 characters" };
    if (key.length > 100)
      return { valid: false, message: "Key must be under 100 characters" };
    return { valid: true, message: "Key looks good" };
  })();

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
      if (!keyTouched) setKeyTouched(true);
    },
    [keyTouched],
  );

  const handleKeyBlur = useCallback(() => {
    setKeyTouched(true);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent, closeAfter = false) => {
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
      if (!keyValidation.valid) {
        setError(keyValidation.message || "Invalid flag key");
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

        if (closeAfter) {
          toast(`Flag "${flag.name}" created`, "success");
          onCreated?.(flag);
        } else {
          toast(
            `Flag "${flag.name}" created — you can now add targeting rules`,
            "success",
          );
          onCreated?.(flag);
        }
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
      keyValidation,
    ],
  );

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <form
      onSubmit={(e) => handleSubmit(e, true)}
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
            placeholder="e.g. New Checkout Flow"
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
            onBlur={handleKeyBlur}
            disabled={submitting}
            placeholder="e.g. new-checkout-flow"
            className={cn(
              "font-mono text-sm flex-1",
              keyTouched &&
                key &&
                (keyValidation.valid
                  ? "border-emerald-300 focus:border-emerald-400"
                  : "border-red-300 focus:border-red-400"),
            )}
          />
          <FieldHelp docsKey="flags" label="flag key" />
        </div>
        {/* Key validation feedback */}
        {keyTouched && key && (
          <div className="mt-1 flex items-center gap-1.5">
            <div
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                keyValidation.valid ? "bg-emerald-500" : "bg-red-500",
              )}
            />
            <span
              className={cn(
                "text-xs",
                keyValidation.valid ? "text-emerald-600" : "text-red-600",
              )}
            >
              {keyValidation.message}
            </span>
          </div>
        )}
      </FormField>

      {/* ── Flag Type (Visual Cards) ────────────────────────────── */}
      <FormField label="Flag type" required>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {FLAG_TYPE_CARDS.map((card) => {
            const Icon = card.icon;
            const isSelected = flagType === card.value;
            return (
              <button
                key={card.value}
                type="button"
                onClick={() => setFlagType(card.value)}
                disabled={submitting}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-xl border-2 px-4 py-3 text-left transition-all",
                  isSelected
                    ? "border-[var(--signal-fg-accent)] bg-[var(--signal-bg-accent-muted)] ring-2 ring-[var(--signal-border-accent-muted)]"
                    : "border-[var(--signal-border-default)] bg-white hover:border-slate-300 hover:bg-[var(--signal-bg-secondary)]",
                )}
              >
                <div className="flex items-center gap-2 w-full">
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      isSelected
                        ? "bg-[var(--signal-fg-accent)] text-white"
                        : "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-secondary)]",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      isSelected
                        ? "text-[var(--signal-fg-primary)]"
                        : "text-[var(--signal-fg-primary)]",
                    )}
                  >
                    {card.label}
                  </span>
                  {isSelected && (
                    <CheckCircle2Icon className="h-4 w-4 text-[var(--signal-fg-accent)] ml-auto" />
                  )}
                </div>
                <p className="text-xs text-[var(--signal-fg-tertiary)] leading-relaxed">
                  {card.description}
                </p>
              </button>
            );
          })}
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
            placeholder="e.g. Controls the new checkout experience for beta users"
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
              placeholder="e.g. beta, frontend, checkout"
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
      <div className="flex items-center justify-between gap-3 pt-2">
        <div>
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
        </div>
        <div className="flex items-center gap-3">
          {/* "Create and close" */}
          <button
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            disabled={submitting || !name.trim() || !key.trim()}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-all",
              "border border-[var(--signal-border-default)] bg-white text-[var(--signal-fg-primary)]",
              "hover:bg-[var(--signal-bg-secondary)] hover:border-slate-300",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            Create &amp; close
          </button>
          {/* "Create and add targeting" */}
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
            {submitting ? "Creating…" : "Create & add targeting"}
          </button>
        </div>
      </div>
    </form>
  );
}
