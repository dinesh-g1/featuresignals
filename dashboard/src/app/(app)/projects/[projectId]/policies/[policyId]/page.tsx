"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPatch, apiDelete } from "@/lib/api";
import type {
  Policy,
  UpdatePolicyRequest,
  PolicyRule,
  PolicyScope,
  PolicyEffect,
} from "@/lib/policy-types";
import {
  POLICY_EFFECT_LABELS,
  POLICY_EFFECT_VARIANTS,
} from "@/lib/policy-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ErrorDisplay } from "@/components/ui/error-display";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  ArrowLeft,
  Trash2,
  Gavel,
  Hash,
  AlignStartVertical,
  Calendar,
  Code,
  AlertTriangle,
  Plus,
  X,
  Pencil,
  Check,
  Globe,
  Box,
  Wrench,
  User,
  Shield,
} from "lucide-react";

// ─── Effect Badge ──────────────────────────────────────────────────────────

function EffectBadge({ effect }: { effect: PolicyEffect }) {
  const variant = POLICY_EFFECT_VARIANTS[effect] ?? "default";
  const label = POLICY_EFFECT_LABELS[effect] ?? effect;
  return <Badge variant={variant}>{label}</Badge>;
}

// ─── Status Badge ──────────────────────────────────────────────────────────

function StatusBadge({ enabled }: { enabled: boolean }) {
  if (enabled) {
    return <Badge variant="success">Active</Badge>;
  }
  return <Badge variant="default">Inactive</Badge>;
}

// ─── Chip List ─────────────────────────────────────────────────────────────

function ChipList({
  items,
  emptyLabel,
}: {
  items: string[] | undefined;
  emptyLabel: string;
}) {
  if (!items || items.length === 0) {
    return (
      <span className="text-sm text-[var(--signal-fg-tertiary)] italic">
        {emptyLabel}
      </span>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="inline-flex items-center rounded-md bg-[var(--signal-bg-secondary)] px-2 py-0.5 text-xs font-medium text-[var(--signal-fg-secondary)] ring-1 ring-inset ring-[var(--signal-border-subtle)]"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

// ─── Tag Input ─────────────────────────────────────────────────────────────

function TagInput({
  values,
  onChange,
  placeholder,
}: {
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
    <div className="space-y-2">
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
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function PolicyDetailPage() {
  const params = useParams<{ projectId: string; policyId: string }>();
  const router = useRouter();
  const policyId = params.policyId;
  const projectId = params.projectId;

  const [policy, setPolicy] = useState<Policy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState(0);
  const [editEffect, setEditEffect] = useState<PolicyEffect>("deny");
  const [editScope, setEditScope] = useState<PolicyScope>({});
  const [editRules, setEditRules] = useState<PolicyRule[]>([]);

  const fetchPolicy = useCallback(async () => {
    if (!policyId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGet<Policy>(`/v1/policies/${policyId}`);
      setPolicy(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load policy details",
      );
    } finally {
      setIsLoading(false);
    }
  }, [policyId]);

  useEffect(() => {
    fetchPolicy();
  }, [fetchPolicy]);

  const startEditing = () => {
    if (!policy) return;
    setEditName(policy.name);
    setEditDescription(policy.description ?? "");
    setEditPriority(policy.priority);
    setEditEffect(policy.effect);
    setEditScope({ ...policy.scope });
    setEditRules(policy.rules.map((r) => ({ ...r })));
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!policy) return;
    setIsSaving(true);
    try {
      const body: UpdatePolicyRequest = {
        name: editName,
        description: editDescription,
        priority: editPriority,
        effect: editEffect,
        scope: editScope,
        rules: editRules,
      };
      const updated = await apiPatch<Policy>(`/v1/policies/${policyId}`, body);
      setPolicy(updated);
      setIsEditing(false);
    } catch {
      // silently handled
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await apiDelete(`/v1/policies/${policyId}`);
      router.push(`/projects/${projectId}/policies`);
    } catch {
      setIsDeleting(false);
      setIsDeleteOpen(false);
    }
  };

  const addRule = () => {
    setEditRules([
      ...editRules,
      { name: "", description: "", expression: "", message: "" },
    ]);
  };

  const removeRule = (index: number) => {
    setEditRules(editRules.filter((_, i) => i !== index));
  };

  const updateRule = (
    index: number,
    field: keyof PolicyRule,
    value: string,
  ) => {
    setEditRules(
      editRules.map((rule, i) =>
        i === index ? { ...rule, [field]: value } : rule,
      ),
    );
  };

  // ─── Loading ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-6 w-32" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─── Not Found ─────────────────────────────────────────────────────────

  if (!policy && !isLoading && !error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--signal-bg-secondary)] ring-1 ring-[var(--signal-border-default)]">
          <Gavel className="h-7 w-7 text-[var(--signal-fg-tertiary)]" />
        </div>
        <h2 className="mt-5 text-xl font-semibold text-[var(--signal-fg-primary)]">
          Policy Not Found
        </h2>
        <p className="mt-2 max-w-md text-sm text-[var(--signal-fg-secondary)]">
          This policy may have been deleted or moved.
        </p>
        <Link href={`/projects/${projectId}/policies`} className="mt-4">
          <Button variant="default">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Governance Policies
          </Button>
        </Link>
      </div>
    );
  }

  // ─── Error ───────────────────────────────────────────────────────────

  if (error && !policy) {
    return (
      <ErrorDisplay
        title="Could Not Load Policy"
        message={error}
        fullPage
        onRetry={fetchPolicy}
      />
    );
  }

  if (!policy) return null;

  // ─── Detail / Edit View ───────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/projects/${projectId}/policies`}>
          <Button variant="ghost" size="icon" aria-label="Back to policies">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--signal-fg-primary)] truncate">
            {isEditing ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full max-w-md rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] px-3 py-1 text-2xl font-bold text-[var(--signal-fg-primary)] focus:border-[var(--signal-fg-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--signal-fg-accent)]/30"
              />
            ) : (
              policy.name
            )}
          </h1>
          <p className="text-sm text-[var(--signal-fg-secondary)]">
            ID: <code className="text-xs">{policy.id}</code>
          </p>
        </div>
        <StatusBadge enabled={policy.enabled} />
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              <Button variant="secondary" size="sm" onClick={startEditing}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsDeleteOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={cancelEditing}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                loading={isSaving}
              >
                <Check className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Policy Information</CardTitle>
          <CardDescription>
            Core properties for this governance policy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            {/* Description */}
            <div className="sm:col-span-2 space-y-1">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-[var(--signal-fg-tertiary)] uppercase tracking-wide">
                <AlignStartVertical className="h-3 w-3" />
                Description
              </dt>
              <dd className="text-sm text-[var(--signal-fg-primary)]">
                {isEditing ? (
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] px-3 py-1.5 text-sm text-[var(--signal-fg-primary)] focus:border-[var(--signal-fg-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--signal-fg-accent)]/30"
                    placeholder="Describe what this policy enforces..."
                  />
                ) : (
                  policy.description || "—"
                )}
              </dd>
            </div>

            {/* Effect */}
            <div className="space-y-1">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-[var(--signal-fg-tertiary)] uppercase tracking-wide">
                <Shield className="h-3 w-3" />
                Effect
              </dt>
              <dd className="text-sm">
                {isEditing ? (
                  <select
                    value={editEffect}
                    onChange={(e) =>
                      setEditEffect(e.target.value as PolicyEffect)
                    }
                    className="w-full rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] px-3 py-1.5 text-sm text-[var(--signal-fg-primary)] focus:border-[var(--signal-fg-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--signal-fg-accent)]/30"
                  >
                    <option value="deny">Deny</option>
                    <option value="require_human">Require Human</option>
                    <option value="warn">Warn</option>
                    <option value="audit">Audit</option>
                  </select>
                ) : (
                  <EffectBadge effect={policy.effect} />
                )}
              </dd>
            </div>

            {/* Priority */}
            <div className="space-y-1">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-[var(--signal-fg-tertiary)] uppercase tracking-wide">
                <Hash className="h-3 w-3" />
                Priority
              </dt>
              <dd className="text-sm">
                {isEditing ? (
                  <input
                    type="number"
                    value={editPriority}
                    onChange={(e) =>
                      setEditPriority(
                        Math.max(0, Math.min(1000, Number(e.target.value))),
                      )
                    }
                    min={0}
                    max={1000}
                    className="w-full max-w-[120px] rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] px-3 py-1.5 text-sm text-[var(--signal-fg-primary)] focus:border-[var(--signal-fg-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--signal-fg-accent)]/30"
                  />
                ) : (
                  <span className="font-medium">{policy.priority}</span>
                )}
              </dd>
            </div>

            {/* Created */}
            <div className="space-y-1">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-[var(--signal-fg-tertiary)] uppercase tracking-wide">
                <Calendar className="h-3 w-3" />
                Created
              </dt>
              <dd className="text-sm text-[var(--signal-fg-primary)]">
                {new Date(policy.created_at).toLocaleString()}
              </dd>
            </div>

            {/* Updated */}
            <div className="space-y-1">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-[var(--signal-fg-tertiary)] uppercase tracking-wide">
                <Calendar className="h-3 w-3" />
                Updated
              </dt>
              <dd className="text-sm text-[var(--signal-fg-primary)]">
                {new Date(policy.updated_at).toLocaleString()}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Scope Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Scope
          </CardTitle>
          <CardDescription>
            Limits which agents and actions this policy applies to. Empty fields
            mean the policy applies to all.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-6 sm:grid-cols-2">
            {/* Agent Types */}
            <div className="space-y-1.5">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-[var(--signal-fg-tertiary)] uppercase tracking-wide">
                <Box className="h-3 w-3" />
                Agent Types
              </dt>
              <dd>
                {isEditing ? (
                  <TagInput
                    values={editScope.agent_types ?? []}
                    onChange={(vals) =>
                      setEditScope({ ...editScope, agent_types: vals })
                    }
                    placeholder="Add agent type..."
                  />
                ) : (
                  <ChipList
                    items={policy.scope.agent_types}
                    emptyLabel="All agent types"
                  />
                )}
              </dd>
            </div>

            {/* Agent IDs */}
            <div className="space-y-1.5">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-[var(--signal-fg-tertiary)] uppercase tracking-wide">
                <User className="h-3 w-3" />
                Agent IDs
              </dt>
              <dd>
                {isEditing ? (
                  <TagInput
                    values={editScope.agent_ids ?? []}
                    onChange={(vals) =>
                      setEditScope({ ...editScope, agent_ids: vals })
                    }
                    placeholder="Add agent ID..."
                  />
                ) : (
                  <ChipList
                    items={policy.scope.agent_ids}
                    emptyLabel="All agents"
                  />
                )}
              </dd>
            </div>

            {/* Tool Names */}
            <div className="space-y-1.5">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-[var(--signal-fg-tertiary)] uppercase tracking-wide">
                <Wrench className="h-3 w-3" />
                Tool Names
              </dt>
              <dd>
                {isEditing ? (
                  <TagInput
                    values={editScope.tool_names ?? []}
                    onChange={(vals) =>
                      setEditScope({ ...editScope, tool_names: vals })
                    }
                    placeholder="Add tool name..."
                  />
                ) : (
                  <ChipList
                    items={policy.scope.tool_names}
                    emptyLabel="All tools"
                  />
                )}
              </dd>
            </div>

            {/* Environments */}
            <div className="space-y-1.5">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-[var(--signal-fg-tertiary)] uppercase tracking-wide">
                <Globe className="h-3 w-3" />
                Environments
              </dt>
              <dd>
                {isEditing ? (
                  <TagInput
                    values={editScope.environments ?? []}
                    onChange={(vals) =>
                      setEditScope({ ...editScope, environments: vals })
                    }
                    placeholder="Add environment ID..."
                  />
                ) : (
                  <ChipList
                    items={policy.scope.environments}
                    emptyLabel="All environments"
                  />
                )}
              </dd>
            </div>

            {/* Projects */}
            <div className="space-y-1.5 sm:col-span-2">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-[var(--signal-fg-tertiary)] uppercase tracking-wide">
                <Box className="h-3 w-3" />
                Projects
              </dt>
              <dd>
                {isEditing ? (
                  <TagInput
                    values={editScope.projects ?? []}
                    onChange={(vals) =>
                      setEditScope({ ...editScope, projects: vals })
                    }
                    placeholder="Add project ID..."
                  />
                ) : (
                  <ChipList
                    items={policy.scope.projects}
                    emptyLabel="All projects"
                  />
                )}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Rules Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Rules
            </CardTitle>
            <CardDescription>
              CEL expressions that must evaluate to true for this policy to
              pass.
            </CardDescription>
          </div>
          {isEditing && (
            <Button variant="secondary" size="sm" onClick={addRule}>
              <Plus className="mr-1 h-4 w-4" />
              Add Rule
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-6">
              {editRules.map((rule, index) => (
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
                    onChange={(e) => updateRule(index, "name", e.target.value)}
                    placeholder="Rule name (e.g., 'Confidence Threshold')"
                    className="w-full rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] px-3 py-1.5 text-sm text-[var(--signal-fg-primary)] placeholder:text-[var(--signal-fg-tertiary)] focus:border-[var(--signal-fg-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--signal-fg-accent)]/30"
                  />
                  <input
                    type="text"
                    value={rule.description ?? ""}
                    onChange={(e) =>
                      updateRule(index, "description", e.target.value)
                    }
                    placeholder="Rule description (optional)"
                    className="w-full rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] px-3 py-1.5 text-sm text-[var(--signal-fg-primary)] placeholder:text-[var(--signal-fg-tertiary)] focus:border-[var(--signal-fg-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--signal-fg-accent)]/30"
                  />
                  <textarea
                    value={rule.expression}
                    onChange={(e) =>
                      updateRule(index, "expression", e.target.value)
                    }
                    rows={3}
                    placeholder="CEL expression (e.g., 'action.decision.confidence >= 0.8')"
                    className="w-full rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] px-3 py-1.5 font-mono text-sm text-[var(--signal-fg-primary)] placeholder:text-[var(--signal-fg-tertiary)] focus:border-[var(--signal-fg-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--signal-fg-accent)]/30"
                  />
                  <input
                    type="text"
                    value={rule.message}
                    onChange={(e) =>
                      updateRule(index, "message", e.target.value)
                    }
                    placeholder="Failure message shown when rule fails"
                    className="w-full rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] px-3 py-1.5 text-sm text-[var(--signal-fg-primary)] placeholder:text-[var(--signal-fg-tertiary)] focus:border-[var(--signal-fg-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--signal-fg-accent)]/30"
                  />
                </div>
              ))}
              {editRules.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <AlertTriangle className="h-8 w-8 text-[var(--signal-fg-tertiary)]" />
                  <p className="text-sm text-[var(--signal-fg-secondary)]">
                    No rules defined. A policy without rules always passes.
                  </p>
                  <Button variant="secondary" size="sm" onClick={addRule}>
                    <Plus className="mr-1 h-4 w-4" />
                    Add First Rule
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {policy.rules.length === 0 ? (
                <p className="text-sm text-[var(--signal-fg-tertiary)] italic">
                  No rules defined. This policy always passes within its scope.
                </p>
              ) : (
                policy.rules.map((rule, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-[var(--signal-border-default)] p-4 space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[var(--signal-fg-tertiary)] uppercase tracking-wide">
                        Rule {index + 1}
                      </span>
                      {rule.name && (
                        <span className="text-sm font-medium text-[var(--signal-fg-primary)]">
                          — {rule.name}
                        </span>
                      )}
                    </div>
                    {rule.description && (
                      <p className="text-sm text-[var(--signal-fg-secondary)]">
                        {rule.description}
                      </p>
                    )}
                    <pre className="overflow-x-auto rounded-lg bg-[var(--signal-bg-secondary)] p-3 font-mono text-xs text-[var(--signal-fg-primary)] border border-[var(--signal-border-subtle)]">
                      <code>{rule.expression}</code>
                    </pre>
                    {rule.message && (
                      <div className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                        <span>
                          <strong>On failure:</strong> {rule.message}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Policy"
        description={`Are you sure you want to delete "${policy.name}"? This action cannot be undone and will remove all governance rules associated with this policy.`}
        confirmLabel="Delete"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  );
}
