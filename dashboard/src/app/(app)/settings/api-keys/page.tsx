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
  const [form, setForm] = useState({ name: "", type: "server" });
  const [revoking, setRevoking] = useState<string | null>(null);

  const envOptions = useMemo(() => envs.map((e) => ({ value: e.id, label: e.name })), [envs]);

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
    api.listAPIKeys(token, selectedEnv).then((k) => setKeys(k ?? [])).catch(() => {});
  }

  useEffect(() => { reloadKeys(); }, [token, selectedEnv]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !selectedEnv) {
      toast("Select an environment first", "error");
      return;
    }
    try {
      const result: APIKeyCreateResponse = await api.createAPIKey(token, selectedEnv, form);
      setNewKey(result.key ?? null);
      setForm({ name: "", type: "server" });
      toast("API key created", "success");
      reloadKeys();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to create API key", "error");
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
      toast(err instanceof Error ? err.message : "Failed to revoke API key", "error");
      setRevoking(null);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <Label>Environment:</Label>
        <div className="sm:w-auto">
          <Select value={selectedEnv} onValueChange={setSelectedEnv} options={envOptions} placeholder="Select environment…" />
        </div>
      </div>

      {newKey && (
        <Card className="border-emerald-200 bg-emerald-50 p-4 ring-1 ring-emerald-100">
          <p className="text-sm font-medium text-emerald-800">API key created. Copy it now — it won&apos;t be shown again.</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="flex-1 rounded-lg bg-emerald-100 p-3 text-xs font-mono text-emerald-900 ring-1 ring-emerald-200 break-all">{newKey}</code>
            <Button size="sm" onClick={() => copyToClipboard(newKey)} className="bg-emerald-600 hover:bg-emerald-700 shrink-0">
              <Copy className="h-3.5 w-3.5" />
              Copy
            </Button>
          </div>
          <button onClick={() => setNewKey(null)} className="mt-2 text-xs font-medium text-emerald-600 transition-colors hover:text-emerald-700">Dismiss</button>
        </Card>
      )}

      <form onSubmit={handleCreate} className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Key name"
          required
          className="flex-1"
        />
        <div className="sm:w-auto">
          <Select value={form.type} onValueChange={(val) => setForm({ ...form, type: val })} options={KEY_TYPE_OPTIONS} />
        </div>
        <Button type="submit" className="shrink-0">Create Key</Button>
      </form>

      <Card>
        <div className="divide-y divide-slate-100">
          {keys.length === 0 ? (
            <EmptyState
              icon={KeyRound}
              title="No API keys for this environment"
              description="API keys authenticate your SDK against this environment. Create a server key to start evaluating flags."
              docsUrl="https://docs.featuresignals.com/api-reference/api-keys"
              docsLabel="API key types explained"
            />
          ) : (
            keys.map((k) => (
              <div key={k.id} className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 transition-colors hover:bg-indigo-50/30">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{k.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{k.key_prefix}... &middot; {k.type}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={k.revoked_at ? "danger" : "success"} className="px-2.5 py-0.5 text-xs">
                    {k.revoked_at ? "Revoked" : "Active"}
                  </Badge>
                  {!k.revoked_at && (
                    revoking === k.id ? (
                      <div className="flex items-center gap-1">
                        <Button variant="destructive-ghost" size="sm" onClick={() => handleRevoke(k.id)} className="h-auto px-2 py-1 text-xs">Revoke</Button>
                        <Button variant="ghost" size="sm" onClick={() => setRevoking(null)} className="h-auto px-2 py-1 text-xs">Cancel</Button>
                      </div>
                    ) : (
                      <Button variant="destructive-ghost" size="sm" onClick={() => setRevoking(k.id)} className="h-auto px-2 py-1 text-xs">
                        Revoke
                      </Button>
                    )
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
