"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { KeyRound, Copy } from "lucide-react";
import { DOCS_LINKS } from "@/components/docs-link";
import type { APIKey, APIKeyCreateResponse, Environment } from "@/lib/types";

const KEY_TYPE_OPTIONS = [
  { value: "server", label: "Server" },
  { value: "client", label: "Client" },
];

export default function APIKeysPage() {
  const token = useAppStore((s) => s.token);
  const currentEnvId = useAppStore((s) => s.currentEnvId);
  const projectId = useAppStore((s) => s.currentProjectId);
  const [envs, setEnvs] = useState<Environment[]>([]);
  const [selectedEnv, setSelectedEnv] = useState(currentEnvId || "");
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "server",
    expires_at: "",
  });
  const [revoking, setRevoking] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string>("");

  const envOptions = useMemo(
    () => envs.map((e) => ({ value: e.id, label: e.name })),
    [envs],
  );

  useEffect(() => {
    if (!token || !projectId) return;
    api.listEnvironments(token, projectId).then((e) => {
      const list = e ?? [];
      setEnvs(list);
      if (!selectedEnv && list.length > 0) setSelectedEnv(list[0].id);
    });
  }, [token, projectId, selectedEnv]);

  function reloadKeys() {
    if (!token || !selectedEnv) return;
    api
      .listAPIKeys(token, selectedEnv)
      .then((k) => setKeys(k ?? []))
      .catch(() => {});
  }

  useEffect(() => {
    reloadKeys();
  }, [token, selectedEnv]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setFieldError("Key name is required");
      return;
    }
    setFieldError("");
    if (!token || !selectedEnv) {
      toast("Select an environment first", "error");
      return;
    }
    try {
      const payload = {
        name: form.name,
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
      reloadKeys();
    } catch (err: unknown) {
      toast(
        err instanceof Error ? err.message : "Failed to create API key",
        "error",
      );
    }
  }

  async function handleRevoke(keyId: string) {
    if (!token) return;
    try {
      await api.revokeAPIKey(token, keyId);
      setRevoking(null);
      toast("API key revoked", "success");
      reloadKeys();
    } catch (err: unknown) {
      toast(
        err instanceof Error ? err.message : "Failed to revoke API key",
        "error",
      );
      setRevoking(null);
    }
  }

  function formatRelativeTime(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? "s" : ""} ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? "s" : ""} ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 30) return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
    const diffMo = Math.floor(diffDay / 30);
    if (diffMo < 12) return `${diffMo} month${diffMo > 1 ? "s" : ""} ago`;
    const diffYr = Math.floor(diffDay / 365);
    return `${diffYr} year${diffYr > 1 ? "s" : ""} ago`;
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast("API key copied to clipboard", "success");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <Label>Environment:</Label>
        <div className="sm:w-auto">
          <Select
            value={selectedEnv}
            onValueChange={setSelectedEnv}
            options={envOptions}
            placeholder="Select environment…"
          />
        </div>
      </div>

      {newKey && (
        <Card className="border-emerald-200 bg-emerald-50 p-4 ring-1 ring-emerald-100">
          <p className="text-sm font-medium text-emerald-800">
            API key created. Copy it now — it won&apos;t be shown again.
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="flex-1 rounded-lg bg-emerald-100 p-3 text-xs font-mono text-emerald-900 ring-1 ring-emerald-200 break-all">
              {newKey}
            </code>
            <Button
              size="sm"
              onClick={() => copyToClipboard(newKey)}
              className="bg-emerald-600 hover:bg-emerald-700 shrink-0"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </Button>
          </div>
          <button
            onClick={() => setNewKey(null)}
            className="mt-2 text-xs font-medium text-emerald-600 transition-colors hover:text-emerald-700"
          >
            Dismiss
          </button>
        </Card>
      )}

      <form
        onSubmit={handleCreate}
        noValidate
        className="flex flex-col gap-2 sm:flex-row"
      >
        <Input
          value={form.name}
          onChange={(e) => {
            setFieldError("");
            setForm({ ...form, name: e.target.value });
          }}
          placeholder="Key name"
          required
          aria-invalid={!!fieldError}
          aria-describedby={fieldError ? "api-key-name-error" : undefined}
          className="flex-1"
        />
        {fieldError && (
          <p
            className="text-xs text-red-500"
            role="alert"
            id="api-key-name-error"
          >
            {fieldError}
          </p>
        )}
        <div className="sm:w-auto">
          <Select
            value={form.type}
            onValueChange={(val) => setForm({ ...form, type: val })}
            options={KEY_TYPE_OPTIONS}
          />
        </div>
        <Input
          type="datetime-local"
          value={form.expires_at}
          onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
          placeholder="Expires (optional)"
          className="sm:w-auto"
        />
        <Button type="submit" className="shrink-0">
          Create Key
        </Button>
      </form>

      <Card>
        <div className="divide-y divide-slate-100">
          {keys.length === 0 ? (
            <EmptyState
              icon={KeyRound}
              title="No API keys for this environment"
              description="API keys authenticate your SDK against this environment. Create a server key to start evaluating flags."
              docsUrl={DOCS_LINKS.apiKeys}
              docsLabel="API key types explained"
            />
          ) : (
            keys.map((k) => {
              const isExpired = k.expires_at
                ? new Date(k.expires_at) < new Date()
                : false;
              const isRevoked = !!k.revoked_at;
              const isDisabled = isRevoked || isExpired;
              return (
                <div
                  key={k.id}
                  className={`flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 transition-colors${isDisabled ? " opacity-60" : " hover:bg-indigo-50/30"}`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-900">
                        {k.name}
                      </p>
                      {isExpired && !isRevoked && (
                        <Badge
                          variant="default"
                          className="px-2 py-0 text-[10px]"
                        >
                          Expired
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {k.key_prefix}... &middot; {k.type}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {k.last_used_at ? (
                        `Last used ${formatRelativeTime(k.last_used_at)}`
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
                    <Badge
                      variant={
                        isRevoked ? "danger" : isExpired ? "default" : "success"
                      }
                      className="px-2.5 py-0.5 text-xs"
                    >
                      {isRevoked ? "Revoked" : isExpired ? "Expired" : "Active"}
                    </Badge>
                    {!isDisabled &&
                      (revoking === k.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="destructive-ghost"
                            size="sm"
                            onClick={() => handleRevoke(k.id)}
                            className="h-auto px-2 py-1 text-xs"
                          >
                            Revoke
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
                          variant="destructive-ghost"
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
            })
          )}
        </div>
      </Card>
    </div>
  );
}
