"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api";
import type {
  Policy,
  CreatePolicyRequest,
  PolicyEffect,
  PolicyRule,
  PolicyScope,
} from "@/lib/policy-types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  X,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Gavel,
} from "lucide-react";

// ─── Tag Input ─────────────────────────────────────────────────────────────

function TagInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}) {
  const [inputValue, setInputValue] = useState("");

  const addTag = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setInputValue("");
  };

  const removeTag = (tag: string) => {
    onChange(values.filter((v) => v !== tag));
  };

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-[var(--signal-fg-tertiary)] uppercase tracking-wide">
        {label}
      </label>
      <div className="space-y-2">
        {values.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {values.map((v) => (
              <span
                key={v}
                className="inline-flex items-center gap-1 rounded-md bg-[var(--signal-bg-accent-muted)] px-2 py-0.5 text-xs font-medium text-[var(--signal-fg-accent)] ring-1 ring-inset ring-[var(--signal-border-accent-muted)]"
              >
                {v}
                <button
                  onClick={() => removeTag(v)}
                  className="ml-0.5 rounded-sm hover:bg-[var(--signal-bg-accent)]/20"
                  aria-label={`Remove ${v}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder={placeholder}
            className="flex-1 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] px-3 py-1.5 text-sm text-[var(--signal-fg-primary)] placeholder:text-[var(--signal-fg-tertiary)] focus:border-[var(--signal-fg-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--signal-fg-accent)]/30"
          />
          <Button variant="secondary" size="sm" onClick={addTag} type="button">
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Props ─────────────────────────────────────────────────────────────────

interface PolicyFormProps {
  open: boolean;
  onClose: () => void;
  onCreated: (policy: Policy) => void;
}

// ─── Form ──────────────────────────────────────────────────────────────────

export function PolicyForm({ open, onClose, onCreated }: PolicyFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState(10);
  const [effect, setEffect] = useState<PolicyEffect>("deny");
  const [scope, setScope] = useState<PolicyScope>({});
  const [rules, setRules] = useState<PolicyRule[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const resetForm = () => {
    setName("");
    setDescription("");
    setPriority(10);
    setEffect("deny");
    setScope({});
    setRules([]);
    setErrors({});
    setShowAdvanced(false);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = "Policy name is required";
    }
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      if (!rule.expression.trim()) {
        newErrors[`rule_${i}_expression`] = "CEL expression is required";
      }
      if (!rule.message.trim()) {
        newErrors[`rule_${i}_message`] = "Failure message is required";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const body: CreatePolicyRequest = {
        name: name.trim(),
        description: description.trim() || undefined,
        priority,
        effect,
        scope: Object.keys(scope).length > 0 ? scope : undefined,
        rules: rules.length > 0 ? rules : undefined,
      };
      const created = await apiPost<Policy>("/v1/policies", body);
      resetForm();
      onCreated(created);
    } catch (err) {
      if (err instanceof Error) {
        setErrors({ form: err.message });
      } else {
        setErrors({ form: "Failed to create policy. Please try again." });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const addRule = () => {
    setRules([
      ...rules,
      { name: "", description: "", expression: "", message: "" },
    ]);
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, field: keyof PolicyRule, value: string) => {
    setRules(
      rules.map((rule, i) =>
        i === index ? { ...rule, [field]: value } : rule,
      ),
    );
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--signal-bg-accent-muted)]">
              <Gavel className="h-5 w-5 text-[var(--signal-fg-accent)]" />
            </div>
            <div>
              <DialogTitle>Create Policy</DialogTitle>
              <DialogDescription>
                Define a new governance rule for feature changes.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-5">
            {/* Form-level error */}
            {errors.form && (
              <div className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                <span>{errors.form}</span>
              </div>
            )}

            {/* Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="policy-name"
                className="text-xs font-medium text-[var(--signal-fg-tertiary)] uppercase tracking-wide"
              >
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="policy-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Require Approval for Production"
                className="w-full rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] px-3 py-2 text-sm text-[var(--signal-fg-primary)] placeholder:text-[var(--signal-fg-tertiary)] focus:border-[var(--signal-fg-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--signal-fg-accent)]/30"
              />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label
                htmlFor="policy-description"
                className="text-xs font-medium text-[var(--signal-fg-tertiary)] uppercase tracking-wide"
              >
                Description
              </label>
              <textarea
                id="policy-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Explain what this policy enforces and why..."
                className="w-full rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] px-3 py-2 text-sm text-[var(--signal-fg-primary)] placeholder:text-[var(--signal-fg-tertiary)] focus:border-[var(--signal-fg-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--signal-fg-accent)]/30"
              />
            </div>

            {/* Priority + Effect row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="policy-priority"
                  className="text-xs font-medium text-[var(--signal-fg-tertiary)] uppercase tracking-wide"
                >
                  Priority
                </label>
                <input
                  id="policy-priority"
                  type="number"
                  value={priority}
                  onChange={(e) =>
                    setPriority(
                      Math.max(0, Math.min(1000, Number(e.target.value))),
                    )
                  }
                  min={0}
                  max={1000}
                  className="w-full rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] px-3 py-2 text-sm text-[var(--signal-fg-primary)] focus:border-[var(--signal-fg-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--signal-fg-accent)]/30"
                />
                <p className="text-[10px] text-[var(--signal-fg-tertiary)]">
                  Lower = higher priority. Range: 0–1000.
                </p>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="policy-effect"
                  className="text-xs font-medium text-[var(--signal-fg-tertiary)] uppercase tracking-wide"
                >
                  Effect
                </label>
                <select
                  id="policy-effect"
                  value={effect}
                  onChange={(e) => setEffect(e.target.value as PolicyEffect)}
                  className="w-full rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] px-3 py-2 text-sm text-[var(--signal-fg-primary)] focus:border-[var(--signal-fg-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--signal-fg-accent)]/30"
                >
                  <option value="deny">Deny — Block the action</option>
                  <option value="require_human">
                    Require Human — Escalate for approval
                  </option>
                  <option value="warn">Warn — Allow but log a warning</option>
                  <option value="audit">
                    Audit — Allow but create audit entry
                  </option>
                </select>
              </div>
            </div>

            {/* Rules section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[var(--signal-fg-tertiary)] uppercase tracking-wide">
                  Rules
                </label>
                <Button variant="secondary" size="sm" onClick={addRule}>
                  <Plus className="mr-1 h-3 w-3" />
                  Add Rule
                </Button>
              </div>

              {rules.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[var(--signal-border-default)] p-4 text-center">
                  <p className="text-sm text-[var(--signal-fg-tertiary)]">
                    No rules yet. A policy without rules is always active within
                    its scope.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {rules.map((rule, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-[var(--signal-border-default)] p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-semibold text-[var(--signal-fg-tertiary)] uppercase tracking-wide">
                          Rule {index + 1}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeRule(index)}
                          aria-label={`Remove rule ${index + 1}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <input
                        type="text"
                        value={rule.name}
                        onChange={(e) =>
                          updateRule(index, "name", e.target.value)
                        }
                        placeholder="Rule name (optional)"
                        className="w-full rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] px-3 py-1.5 text-sm text-[var(--signal-fg-primary)] placeholder:text-[var(--signal-fg-tertiary)] focus:border-[var(--signal-fg-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--signal-fg-accent)]/30"
                      />

                      <div className="space-y-1">
                        <textarea
                          value={rule.expression}
                          onChange={(e) =>
                            updateRule(index, "expression", e.target.value)
                          }
                          rows={2}
                          placeholder="CEL expression (e.g., 'action.decision.confidence >= 0.8')"
                          className="w-full rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] px-3 py-1.5 font-mono text-sm text-[var(--signal-fg-primary)] placeholder:text-[var(--signal-fg-tertiary)] focus:border-[var(--signal-fg-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--signal-fg-accent)]/30"
                        />
                        {errors[`rule_${index}_expression`] && (
                          <p className="text-xs text-red-500">
                            {errors[`rule_${index}_expression`]}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <input
                          type="text"
                          value={rule.message}
                          onChange={(e) =>
                            updateRule(index, "message", e.target.value)
                          }
                          placeholder='Failure message (e.g., "Agent confidence too low for this action")'
                          className="w-full rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] px-3 py-1.5 text-sm text-[var(--signal-fg-primary)] placeholder:text-[var(--signal-fg-tertiary)] focus:border-[var(--signal-fg-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--signal-fg-accent)]/30"
                        />
                        {errors[`rule_${index}_message`] && (
                          <p className="text-xs text-red-500">
                            {errors[`rule_${index}_message`]}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Advanced: Scope */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-[var(--signal-fg-secondary)] hover:bg-[var(--signal-bg-secondary)] transition-colors"
              >
                {showAdvanced ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                Advanced: Scope Constraints
                <span className="text-xs text-[var(--signal-fg-tertiary)] font-normal">
                  (optional — leave empty to apply to all)
                </span>
              </button>

              {showAdvanced && (
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <TagInput
                    label="Agent Types"
                    values={scope.agent_types ?? []}
                    onChange={(vals) =>
                      setScope({ ...scope, agent_types: vals })
                    }
                    placeholder="Add agent type..."
                  />
                  <TagInput
                    label="Agent IDs"
                    values={scope.agent_ids ?? []}
                    onChange={(vals) =>
                      setScope({ ...scope, agent_ids: vals })
                    }
                    placeholder="Add agent ID..."
                  />
                  <TagInput
                    label="Tool Names"
                    values={scope.tool_names ?? []}
                    onChange={(vals) =>
                      setScope({ ...scope, tool_names: vals })
                    }
                    placeholder="Add tool name..."
                  />
                  <TagInput
                    label="Environments"
                    values={scope.environments ?? []}
                    onChange={(vals) =>
                      setScope({ ...scope, environments: vals })
                    }
                    placeholder="Add environment ID..."
                  />
                  <div className="sm:col-span-2">
                    <TagInput
                      label="Projects"
                      values={scope.projects ?? []}
                      onChange={(vals) =>
                        setScope({ ...scope, projects: vals })
                      }
                      placeholder="Add project ID..."
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create Policy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
