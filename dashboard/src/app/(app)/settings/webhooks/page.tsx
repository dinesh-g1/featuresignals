"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { toast } from "@/components/toast";

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
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Webhooks</h2>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-all hover:bg-indigo-700"
          >
            Add Webhook
          </button>
        </div>

        {showCreate && (
          <form onSubmit={handleCreate} className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Slack Notifications"
                  required
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">URL</label>
                <input
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://hooks.slack.com/..."
                  required
                  type="url"
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Secret (for HMAC signature verification)</label>
              <input
                value={form.secret}
                onChange={(e) => setForm({ ...form, secret: e.target.value })}
                placeholder="Optional shared secret"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Events</label>
              <div className="flex flex-wrap gap-2">
                {EVENT_TYPES.map((evt) => (
                  <button
                    key={evt}
                    type="button"
                    onClick={() => toggleEvent(evt)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors ${
                      form.events.includes(evt)
                        ? "bg-indigo-50 text-indigo-700 ring-indigo-200"
                        : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {evt}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
                Create Webhook
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-white">
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {webhooks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 px-6 py-8 text-center">
              <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.06a4.5 4.5 0 00-6.364-6.364L4.5 8.121" />
              </svg>
              <p className="mt-3 text-sm font-medium text-slate-500">No webhooks configured</p>
              <p className="mt-1 text-xs text-slate-400">Add a webhook to receive flag change notifications.</p>
            </div>
          ) : (
            webhooks.map((wh) => (
              <div key={wh.id}>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 ring-1 ring-slate-100 transition-colors hover:bg-indigo-50/30">
                  <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => loadDeliveries(wh.id)}>
                    <div className={`h-2.5 w-2.5 rounded-full ${wh.enabled ? "bg-emerald-500" : "bg-slate-300"}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700">{wh.name}</p>
                      <p className="text-xs text-slate-500 truncate max-w-md">{wh.url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex flex-wrap gap-1">
                      {wh.events.map((e) => (
                        <span key={e} className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600 ring-1 ring-indigo-100">
                          {e}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => toggleEnabled(wh)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${wh.enabled ? "bg-emerald-500" : "bg-slate-300"}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${wh.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                    {deleting === wh.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete(wh.id)} className="rounded px-2 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100">Confirm</button>
                        <button onClick={() => setDeleting(null)} className="rounded px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100">Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleting(wh.id)}
                        className="rounded p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    )}
                    <svg className={`h-4 w-4 text-slate-400 transition-transform ${expandedId === wh.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                </div>

                {expandedId === wh.id && (
                  <div className="ml-4 mt-1 mb-2 rounded-lg border border-slate-200 bg-white">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-semibold text-slate-600">Recent Deliveries</p>
                    </div>
                    {deliveries.length === 0 ? (
                      <div className="px-4 py-6 text-center">
                        <p className="text-xs text-slate-400">No deliveries yet.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {deliveries.map((d) => (
                          <div key={d.id} className="flex items-center justify-between px-4 py-2">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${d.success ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                                {d.success ? "\u2713" : "\u2717"}
                              </span>
                              <span className="text-xs font-medium text-slate-700">{d.event_type}</span>
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
                                {d.response_status || "err"}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400">
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
      </div>
    </div>
  );
}
