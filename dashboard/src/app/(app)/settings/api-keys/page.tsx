"use client";

/**
 * Settings → API Keys — Create, list, revoke API keys per environment.
 *
 * Console design language. Signal UI tokens only.
 * Already partially console-ified — polished with consistent tokens, states, and patterns.
 */

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import {
  KeyIcon,
  CopyIcon,
  LoaderIcon,
  AlertIcon,
  PlusIcon,
} from "@/components/icons/nav-icons";
import { cn } from "@/lib/utils";
import type { APIKey, APIKeyCreateResponse, Environment } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────

const KEY_TYPE_OPTIONS = [
  { value: "server", label: "Server" },
  { value: "client", label: "Client" },
];

// ─── Helpers ──────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

function keyStatusBadge(key: APIKey) {
  if (key.revoked_at) {
    return {
      label: "Revoked",
      cls: "bg-[var(--signal-bg-danger-muted)] text-[var(--signal-fg-danger)]",
    };
  }
  if (key.expires_at && new Date(key.expires_at) < new Date()) {
    return {
      label: "Expired",
      cls: "bg-[var(--signal-bg-warning-muted)] text-[var(--signal-fg-warning)]",
    };
  }
  return {
    label: "Active",
    cls: "bg-[var(--signal-bg-success-muted)] text-[var(--signal-fg-success)]",
  };
}

// ─── Skeleton ─────────────────────────────────────────────────────────

function APIKeysSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="h-9 w-48 rounded-lg bg-[var(--signal-bg-secondary)] animate-pulse" />
      </div>
      <Card className="p-4 sm:p-6">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 rounded bg-[var(--signal-bg-secondary)] animate-pulse"
            />
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────

export default function APIKeysPage() {
  const token = useAppStore((s) => s.token);
  const currentEnvId = useAppStore((s) => s.current_env_id);
  const projectId = useAppStore((s) => s.current_project_id);
  const searchParams = useSearchParams();

  const [envs, setEnvs] = useState<Environment[]>([]);
  const [selectedEnv, setSelectedEnv] = useState(currentEnvId || "");
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");
  const total = keys.length;

  const paginatedKeys = useMemo(() => {
    if (offset >= keys.length) return [];
    const end = offset + limit;
    return keys.slice(offset, end > keys.length ? keys.length : end);
  }, [keys, limit, offset]);

  const [newKey, setNewKey] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", type: "server", expires_at: "" });
  const [submitting, setSubmitting] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string>("");

  const envOptions = useMemo(
    () => envs.map((e) => ({ value: e.id, label: e.name })),
    [envs],
  );

  // Load environments
  useEffect(() => {
    if (!token || !projectId) return;
    api.listEnvironments(token, projectId).then((e) => {
      const list = e ?? [];
      setEnvs(list);
      if (!selectedEnv && list.length > 0) setSelectedEnv(list[0].id);
    });
  }, [token, projectId, selectedEnv]);

  // Load keys
  function loadKeys() {
    if (!token || !selectedEnv) return;
    setLoading(true);
    setError(null);
    api
      .listAPIKeys(token, selectedEnv)
      .then((k) => setKeys(k ?? []))
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "Failed to load API keys",
        ),
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedEnv]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setFieldError("Key name is required");
      return;
    }
    if (!token || !selectedEnv) {
      toast("Select an environment first", "error");
      return;
    }

    try {
      setSubmitting(true);
      setFieldError("");
      const payload = {
        name: form.name.trim(),
        type: form.type,
        ...(form.expires_at ? { expires_at: form.expires_at } : {}),
      };
      const result: APIKeyCreateResponse = await api.createAPIKey(
        token,
        selectedEnv,
        payload,
      );
      setNewKey(result.key ?? null);
      setForm({ name: "", type: "server", expires_at: "" });
      toast("API key created", "success");
      loadKeys();
    } catch (err: unknown) {
      toast(
        err instanceof Error ? err.message : "Failed to create API key",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke(keyId: string) {
    if (!token) return;
    try {
      await api.revokeAPIKey(token, keyId);
      setRevoking(null);
      toast("API key revoked", "success");
      loadKeys();
    } catch (err: unknown) {
      toast(
        err instanceof Error ? err.message : "Failed to revoke API key",
        "error",
      );
      setRevoking(null);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast("API key copied to clipboard", "success");
  }

  // ── Loading ───────────────────────────────────────────────────────

  if (loading && keys.length === 0) {
    return <APIKeysSkeleton />;
  }

  // ── Error ─────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex items-center justify-center py-20 animate-fade-in">
        <Card className="border-[var(--signal-border-danger-emphasis)]/30 bg-[var(--signal-bg-danger-muted)] p-6 text-center max-w-md">
          <AlertIcon className="mx-auto h-8 w-8 text-[var(--signal-fg-danger)] mb-3" />
          <h2 className="text-lg font-semibold text-[var(--signal-fg-danger)] mb-1">
            Failed to load API keys
          </h2>
          <p className="text-sm text-[var(--signal-fg-secondary)] mb-4">
            {error}
          </p>
          <Button variant="secondary" onClick={loadKeys}>
            <LoaderIcon className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────

  return (
    <Suspense fallback={<APIKeysSkeleton />}>
      <div className="space-y-6 animate-fade-in">
        {/* Environment Selector */}
        <div className="flex items-center gap-3">
          <Label className="text-sm font-medium text-[var(--signal-fg-secondary)] shrink-0">
            Environment:
          </Label>
          <div className="w-48">
            <Select
              value={selectedEnv}
              onValueChange={setSelectedEnv}
              options={envOptions}
              placeholder="Select environment…"
            />
          </div>
        </div>

        {/* New Key Banner */}
        {newKey && (
          <Card className="border-[var(--signal-border-success-muted)] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--signal-bg-success-muted)]">
                <KeyIcon className="h-4 w-4 text-[var(--signal-fg-success)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--signal-fg-success)]">
                  API key created — copy it now. It won&apos;t be shown again.
                </p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <code className="flex-1 rounded-lg border border-[var(--signal-border-success-muted)] bg-[var(--signal-bg-success-muted)] p-3 text-xs font-mono text-[var(--signal-fg-primary)] break-all">
                    {newKey}
                  </code>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => copyToClipboard(newKey)}
                    className="shrink-0"
                  >
                    <CopyIcon className="mr-1.5 h-3.5 w-3.5" />
                    Copy
                  </Button>
                </div>
                <button
                  type="button"
                  onClick={() => setNewKey(null)}
                  className="mt-2 text-xs font-medium text-[var(--signal-fg-accent)] hover:underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* Create Form */}
        <Card className="p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-4">
            Create API Key
          </h3>
          <form onSubmit={handleCreate} noValidate className="space-y-4">
            <div>
              <Label htmlFor="key-name">Key Name</Label>
              <Input
                id="key-name"
                value={form.name}
                onChange={(e) => {
                  setFieldError("");
                  setForm({ ...form, name: e.target.value });
                }}
                placeholder='e.g. "Production Server", "CI/CD Pipeline"'
                className="mt-1.5"
                required
                error={!!fieldError}
              />
              {fieldError && (
                <p className="text-xs text-[var(--signal-fg-danger)] mt-1.5">
                  {fieldError}
                </p>
              )}
              <p className="text-xs text-[var(--signal-fg-tertiary)] mt-1">
                A human-readable name to identify this API key
              </p>
            </div>

            <div>
              <Label htmlFor="key-type">Key Type</Label>
              <div className="mt-1.5 w-48">
                <Select
                  value={form.type}
                  onValueChange={(val) => setForm({ ...form, type: val })}
                  options={KEY_TYPE_OPTIONS}
                />
              </div>
              <p className="text-xs text-[var(--signal-fg-tertiary)] mt-1">
                Server keys can evaluate all flags. Client keys are safe for
                browser use.
              </p>
            </div>

            <div>
              <Label htmlFor="key-expiry">Expiration (optional)</Label>
              <Input
                id="key-expiry"
                type="datetime-local"
                value={form.expires_at}
                onChange={(e) =>
                  setForm({ ...form, expires_at: e.target.value })
                }
                className="mt-1.5 w-64"
              />
              <p className="text-xs text-[var(--signal-fg-tertiary)] mt-1">
                Leave blank for a key that never expires
              </p>
            </div>

            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? (
                <>
                  <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Create Key
                </>
              )}
            </Button>
          </form>
        </Card>

        {/* Keys List */}
        <Card className="p-0 overflow-hidden">
          {total === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <KeyIcon className="h-10 w-10 text-[var(--signal-fg-tertiary)] mb-3" />
              <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
                No API keys for this environment
              </h3>
              <p className="text-sm text-[var(--signal-fg-tertiary)] max-w-sm">
                API keys authenticate your SDK against this environment. Create a
                server key to start evaluating flags.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--signal-border-subtle)]">
              {paginatedKeys.map((k) => {
                const isExpired = k.expires_at
                  ? new Date(k.expires_at) < new Date()
                  : false;
                const isRevoked = !!k.revoked_at;
                const isDisabled = isRevoked || isExpired;
                const status = keyStatusBadge(k);

                return (
                  <div
                    key={k.id}
                    className={cn(
                      "flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 transition-colors",
                      isDisabled
                        ? "opacity-50"
                        : "hover:bg-[var(--signal-bg-secondary)]",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-[var(--signal-fg-primary)]">
                          {k.name}
                        </p>
                      </div>
                      <p className="mt-0.5 text-xs text-[var(--signal-fg-secondary)]">
                        {k.key_prefix}... &middot; {k.type}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--signal-fg-tertiary)]">
                        {k.last_used_at ? (
                          <>Last used {formatRelativeTime(k.last_used_at)}</>
                        ) : (
                          <em>Never used</em>
                        )}
                        {k.expires_at && (
                          <>
                            {" \u00B7 "}
                            {isExpired
                              ? `Expired ${formatRelativeTime(k.expires_at)}`
                              : `Expires ${new Date(k.expires_at).toLocaleDateString()}`}
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          status.cls,
                        )}
                      >
                        {status.label}
                      </span>
                      {!isDisabled &&
                        (revoking === k.id ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="danger-ghost"
                              size="sm"
                              onClick={() => handleRevoke(k.id)}
                              className="h-auto px-2 py-1 text-xs"
                            >
                              Confirm
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setRevoking(null)}
                              className="h-auto px-2 py-1 text-xs"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="danger-ghost"
                            size="sm"
                            onClick={() => setRevoking(k.id)}
                            className="h-auto px-2 py-1 text-xs"
                          >
                            Revoke
                          </Button>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {total > 0 && <Pagination total={total} />}
      </div>
    </Suspense>
  );
}
