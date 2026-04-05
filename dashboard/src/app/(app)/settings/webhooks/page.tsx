"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { toast } from "@/components/toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Link2, Trash2, ChevronDown, Check, X } from "lucide-react";

const EVENT_TYPES = [
  "flag.created",
  "flag.updated",
  "flag.deleted",
  "flag.toggled",
  "flag.promoted",
];

interface Webhook {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  enabled: boolean;
  created_at: string;
}

interface Delivery {
  id: string;
  event_type: string;
  response_status: number;
  success: boolean;
  delivered_at: string;
}

export default function WebhooksPage() {
  const token = useAppStore((s) => s.token);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", url: "", secret: "", events: [] as string[] });
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);

  function reload() {
    if (!token) return;
    api.listWebhooks(token).then((w) => setWebhooks(w ?? [])).catch(() => {});
  }

  useEffect(() => { reload(); }, [token]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    try {
      await api.createWebhook(token, form);
      setShowCreate(false);
      setForm({ name: "", url: "", secret: "", events: [] });
      toast("Webhook created", "success");
      reload();
    } catch (err: any) {
      toast(err.message || "Failed to create webhook", "error");
    }
  }

  async function handleDelete(webhookId: string) {
    if (!token) return;
    try {
      await api.deleteWebhook(token, webhookId);
      setDeleting(null);
      toast("Webhook deleted", "success");
      reload();
    } catch (err: any) {
      toast(err.message || "Failed to delete webhook", "error");
      setDeleting(null);
    }
  }

  async function toggleEnabled(wh: Webhook) {
    if (!token) return;
    await api.updateWebhook(token, wh.id, { enabled: !wh.enabled });
    reload();
  }

  function toggleEvent(event: string) {
    setForm((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  }

  async function loadDeliveries(webhookId: string) {
    if (!token) return;
    if (expandedId === webhookId) {
      setExpandedId(null);
      return;
    }
    const d = await api.listWebhookDeliveries(token, webhookId);
    setDeliveries(d ?? []);
    setExpandedId(webhookId);
  }

  return (
    <div className="space-y-6">
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Webhooks</h2>
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            Add Webhook
          </Button>
        </div>

        {showCreate && (
          <form onSubmit={handleCreate} className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Slack Notifications"
                  required
                  className="mt-1 py-1.5"
                />
              </div>
              <div>
                <Label className="text-xs">URL</Label>
                <Input
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://hooks.slack.com/..."
                  required
                  type="url"
                  className="mt-1 py-1.5"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Secret (for HMAC signature verification)</Label>
              <Input
                value={form.secret}
                onChange={(e) => setForm({ ...form, secret: e.target.value })}
                placeholder="Optional shared secret"
                className="mt-1 py-1.5"
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5">Events</Label>
              <div className="flex flex-wrap gap-2">
                {EVENT_TYPES.map((evt) => (
                  <button
                    key={evt}
                    type="button"
                    onClick={() => toggleEvent(evt)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors",
                      form.events.includes(evt)
                        ? "bg-indigo-50 text-indigo-700 ring-indigo-200"
                        : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50",
                    )}
                  >
                    {evt}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm">Create Webhook</Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {webhooks.length === 0 ? (
            <EmptyState
              icon={Link2}
              title="No webhooks configured"
              description="Add a webhook to receive flag change notifications."
              className="rounded-lg border border-dashed border-slate-300"
            />
          ) : (
            webhooks.map((wh) => (
              <div key={wh.id}>
                <div className="flex flex-col gap-2 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-100 transition-colors hover:bg-indigo-50/30 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 cursor-pointer flex-1 min-w-0" onClick={() => loadDeliveries(wh.id)}>
                    <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", wh.enabled ? "bg-emerald-500" : "bg-slate-300")} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700">{wh.name}</p>
                      <p className="text-xs text-slate-500 truncate">{wh.url}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0 ml-5 sm:ml-0">
                    <div className="flex flex-wrap gap-1">
                      {wh.events.map((e) => (
                        <Badge key={e} variant="primary" className="text-[10px]">
                          {e}
                        </Badge>
                      ))}
                    </div>
                    <button
                      onClick={() => toggleEnabled(wh)}
                      className={cn("relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0", wh.enabled ? "bg-emerald-500" : "bg-slate-300")}
                    >
                      <span className={cn("inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform", wh.enabled ? "translate-x-4" : "translate-x-0.5")} />
                    </button>
                    {deleting === wh.id ? (
                      <div className="flex items-center gap-1">
                        <Button variant="destructive-ghost" size="sm" onClick={() => handleDelete(wh.id)} className="h-auto px-2 py-1 text-xs">Confirm</Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleting(null)} className="h-auto px-2 py-1 text-xs">Cancel</Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleting(wh.id)}
                        className="text-slate-400 hover:text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", expandedId === wh.id && "rotate-180")} />
                  </div>
                </div>

                {expandedId === wh.id && (
                  <div className="ml-0 sm:ml-4 mt-1 mb-2 rounded-lg border border-slate-200 bg-white">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-semibold text-slate-600">Recent Deliveries</p>
                    </div>
                    {deliveries.length === 0 ? (
                      <div className="px-4 py-6 text-center">
                        <p className="text-xs text-slate-400">No deliveries yet.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 overflow-x-auto">
                        {deliveries.map((d) => (
                          <div key={d.id} className="flex flex-col gap-1 px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold shrink-0",
                                d.success ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700",
                              )}>
                                {d.success ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                              </span>
                              <span className="text-xs font-medium text-slate-700">{d.event_type}</span>
                              <Badge variant={d.success ? "success" : "danger"} className="text-[10px] font-mono">
                                {d.response_status || "err"}
                              </Badge>
                            </div>
                            <span className="text-[10px] text-slate-400 ml-7 sm:ml-0">
                              {new Date(d.delivered_at).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
