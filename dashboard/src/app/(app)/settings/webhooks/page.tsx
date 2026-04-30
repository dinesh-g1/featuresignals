"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { toast } from "@/components/toast";
import { cn, timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  LinkIcon, TrashIcon, ChevronDownIcon, CheckIcon, XIcon, SendIcon, LoaderIcon, EyeIcon, EyeOffIcon, CopyIcon
} from "@/components/icons/nav-icons";
import { DOCS_LINKS } from "@/components/docs-link";
import type { Webhook, WebhookDelivery } from "@/lib/types";

const EVENT_TYPES = [
  "flag.created",
  "flag.updated",
  "flag.deleted",
  "flag.toggled",
  "flag.promoted",
];

const URL_REGEX = /^https?:\/\/.+/;

const SAMPLE_PAYLOADS: Record<string, unknown> = {
  "flag.created": {
    event: "flag.created",
    timestamp: "2025-04-13T10:30:00Z",
    data: {
      flag_key: "dark_mode",
      flag_name: "Dark Mode",
      description: "Enable dark mode for the application",
      flag_type: "boolean",
      project_slug: "my-app",
      created_by: "admin @example.com",
    },
  },
  "flag.updated": {
    event: "flag.updated",
    timestamp: "2025-04-13T10:30:00Z",
    data: {
      flag_key: "dark_mode",
      flag_name: "Dark Mode",
      changes: {
        description: {
          old: "Enable dark mode",
          new: "Enable dark mode for the application",
        },
      },
      project_slug: "my-app",
      updated_by: "admin @example.com",
    },
  },
  "flag.deleted": {
    event: "flag.deleted",
    timestamp: "2025-04-13T10:30:00Z",
    data: {
      flag_key: "old_feature",
      flag_name: "Old Feature",
      project_slug: "my-app",
      deleted_by: "admin @example.com",
    },
  },
  "flag.toggled": {
    event: "flag.toggled",
    timestamp: "2025-04-13T10:30:00Z",
    data: {
      flag_key: "dark_mode",
      flag_name: "Dark Mode",
      environment: "production",
      previous_value: false,
      new_value: true,
      toggled_by: "admin @example.com",
    },
  },
  "flag.promoted": {
    event: "flag.promoted",
    timestamp: "2025-04-13T10:30:00Z",
    data: {
      flag_key: "dark_mode",
      flag_name: "Dark Mode",
      source_environment: "staging",
      target_environment: "production",
      promoted_by: "admin @example.com",
    },
  },
};

export default function WebhooksPage() {
  const token = useAppStore((s) => s.token);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    url: "",
    secret: "",
    events: [] as string[],
  });
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    url?: string;
  }>({});
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);

  // Test webhook state
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<
    Record<string, { success: boolean; status: number; message?: string }>
  >({});

  // URL validation state
  const [urlTouched, setUrlTouched] = useState(false);
  const urlValid = form.url === "" || URL_REGEX.test(form.url);
  const urlShowError = urlTouched && form.url !== "" && !urlValid;

  // Payload preview state
  const [showPayloadPreview, setShowPayloadPreview] = useState(false);
  const [selectedPreviewEvent, setSelectedPreviewEvent] = useState(
    EVENT_TYPES[0],
  );

  function reload() {
    if (!token) return;
    api
      .listWebhooks(token)
      .then((w) => setWebhooks(w ?? []))
      .catch(() => {});
  }

  useEffect(() => {
    reload();
  }, [token]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const errors: { name?: string; url?: string } = {};
    if (!form.name.trim()) errors.name = "Name is required";
    if (!form.url.trim()) errors.url = "URL is required";
    else if (!URL_REGEX.test(form.url)) errors.url = "Invalid URL format";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    if (!token) return;
    try {
      await api.createWebhook(token, form);
      setShowCreate(false);
      setForm({ name: "", url: "", secret: "", events: [] });
      setUrlTouched(false);
      toast("Webhook created", "success");
      reload();
    } catch (err: unknown) {
      toast(
        err instanceof Error ? err.message : "Failed to create webhook",
        "error",
      );
    }
  }

  async function handleDelete(webhookId: string) {
    if (!token) return;
    try {
      await api.deleteWebhook(token, webhookId);
      setDeleting(null);
      toast("Webhook deleted", "success");
      reload();
    } catch (err: unknown) {
      toast(
        err instanceof Error ? err.message : "Failed to delete webhook",
        "error",
      );
      setDeleting(null);
    }
  }

  async function toggleEnabled(wh: Webhook) {
    if (!token) return;
    try {
      await api.updateWebhook(token, wh.id, { enabled: !wh.enabled });
      reload();
      toast(wh.enabled ? "Webhook disabled" : "Webhook enabled", "success");
    } catch {
      toast("Failed to update webhook", "error");
    }
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

  async function handleTest(wh: Webhook) {
    if (!token) return;
    setTestingId(wh.id);
    setTestResults((prev) => {
      const next = { ...prev };
      delete next[wh.id];
      return next;
    });
    try {
      const result = await api.testWebhook(token, wh.id);
      setTestResults((prev) => ({
        ...prev,
        [wh.id]: {
          success: result.success,
          status: result.response_status,
          message: result.message,
        },
      }));
      toast(result.success ? "Test sent successfully" : "Test failed", "info");
    } catch (err: unknown) {
      setTestResults((prev) => ({
        ...prev,
        [wh.id]: {
          success: false,
          status: 0,
          message: err instanceof Error ? err.message : "Failed to send test",
        },
      }));
      toast("Failed to test webhook", "error");
    } finally {
      setTestingId(null);
    }
  }

  function getStatusCodeColor(status: number) {
    if (status >= 200 && status < 300) return "text-[var(--fgColor-success)]";
    if (status >= 400 && status < 500) return "text-amber-600";
    if (status >= 500) return "text-red-600";
    return "text-[var(--fgColor-muted)]";
  }

  function getStatusCodeBg(status: number) {
    if (status >= 200 && status < 300) return "bg-[var(--bgColor-success-muted)] text-emerald-700";
    if (status >= 400 && status < 500) return "bg-amber-100 text-amber-700";
    if (status >= 500) return "bg-red-100 text-red-700";
    return "bg-[var(--bgColor-muted)] text-[var(--fgColor-muted)]";
  }

  function copyPayload() {
    const payload = SAMPLE_PAYLOADS[selectedPreviewEvent];
    if (payload) {
      navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      toast("Payload copied to clipboard", "success");
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--fgColor-default)]">Webhooks</h2>
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            Add Webhook
          </Button>
        </div>

        {showCreate && (
          <form
            onSubmit={handleCreate}
            noValidate
            className="mb-4 rounded-lg border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] p-4 space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value });
                    if (fieldErrors.name)
                      setFieldErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  placeholder="Slack Notifications"
                  required
                  aria-invalid={!!fieldErrors.name}
                  aria-describedby={fieldErrors.name ? "name-error" : undefined}
                  className="mt-1 py-1.5"
                />
                {fieldErrors.name && (
                  <p
                    className="text-xs text-red-500 mt-1"
                    role="alert"
                    id="name-error"
                  >
                    {fieldErrors.name}
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs">URL</Label>
                <Input
                  value={form.url}
                  onChange={(e) => {
                    setForm({ ...form, url: e.target.value });
                    if (fieldErrors.url)
                      setFieldErrors((prev) => ({ ...prev, url: undefined }));
                  }}
                  onBlur={() => setUrlTouched(true)}
                  placeholder="https://hooks.slack.com/..."
                  required
                  type="url"
                  aria-invalid={!!fieldErrors.url || urlShowError}
                  aria-describedby={
                    fieldErrors.url || urlShowError ? "url-error" : undefined
                  }
                  className={cn(
                    "mt-1 py-1.5",
                    urlShowError && "border-red-300 focus-visible:ring-red-400",
                  )}
                />
                {fieldErrors.url && (
                  <p
                    className="text-xs text-red-500 mt-1"
                    role="alert"
                    id="url-error"
                  >
                    {fieldErrors.url}
                  </p>
                )}
                {urlShowError && !fieldErrors.url && (
                  <p
                    className="text-xs text-red-500 mt-1"
                    role="alert"
                    id="url-error"
                  >
                    Invalid URL format
                  </p>
                )}
              </div>
            </div>
            <div>
              <Label className="text-xs">
                Secret (for HMAC signature verification)
              </Label>
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
                        ? "bg-[var(--bgColor-accent-muted)] text-[var(--fgColor-accent)] ring-[var(--borderColor-accent-muted)]"
                        : "bg-white text-[var(--fgColor-muted)] ring-[var(--borderColor-default)] hover:bg-[var(--bgColor-muted)]",
                    )}
                  >
                    {evt}
                  </button>
                ))}
              </div>
            </div>
            {/* Sample Payload Preview Button */}
            <div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowPayloadPreview(!showPayloadPreview)}
                className="text-xs"
              >
                {showPayloadPreview ? (
                  <>
                    <EyeOffIcon className="h-3.5 w-3.5 mr-1" />
                    Hide Sample Payload
                  </>
                ) : (
                  <>
                    <EyeIcon className="h-3.5 w-3.5 mr-1" />
                    View Sample Payload
                  </>
                )}
              </Button>
              {showPayloadPreview && (
                <div className="mt-3 rounded-lg border border-[var(--borderColor-default)] bg-white overflow-hidden">
                  <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-slate-100 bg-[var(--bgColor-muted)]">
                    {EVENT_TYPES.map((evt) => (
                      <button
                        key={evt}
                        type="button"
                        onClick={() => setSelectedPreviewEvent(evt)}
                        className={cn(
                          "rounded px-2 py-0.5 text-[10px] font-medium transition-colors",
                          selectedPreviewEvent === evt
                            ? "bg-[var(--bgColor-accent-muted)] text-[var(--fgColor-accent)]"
                            : "bg-white text-[var(--fgColor-muted)] hover:bg-[var(--bgColor-muted)]",
                        )}
                      >
                        {evt}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={copyPayload}
                      className="ml-auto rounded px-2 py-0.5 text-[10px] font-medium bg-white text-[var(--fgColor-muted)] hover:bg-[var(--bgColor-muted)] flex items-center gap-1"
                      title="Copy to clipboard"
                    >
                      <CopyIcon className="h-3 w-3" />
                      Copy
                    </button>
                  </div>
                  <pre className="p-3 text-xs text-[var(--fgColor-default)] overflow-x-auto max-h-64 overflow-y-auto text-[11px] leading-relaxed font-mono">
                    {JSON.stringify(
                      SAMPLE_PAYLOADS[selectedPreviewEvent],
                      null,
                      2,
                    )}
                  </pre>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm">
                Create Webhook
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowCreate(false);
                  setForm({ name: "", url: "", secret: "", events: [] });
                  setUrlTouched(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {webhooks.length === 0 ? (
            <EmptyState
              icon={LinkIcon}
              title="No webhooks configured"
              description="Webhooks send real-time HTTP notifications when flags change. Connect your CI/CD pipeline, Slack, or monitoring tools."
              docsUrl={DOCS_LINKS.webhooks}
              docsLabel="Webhook setup guide"
              className="rounded-lg border border-dashed border-[var(--borderColor-emphasis)]"
            />
          ) : (
            webhooks.map((wh) => {
              const testResult = testResults[wh.id];
              const isTesting = testingId === wh.id;

              return (
                <div key={wh.id}>
                  <div className="flex flex-col gap-2 rounded-lg bg-[var(--bgColor-muted)] p-3 ring-1 ring-slate-100 transition-colors hover:bg-[var(--bgColor-accent-emphasis)]-glass sm:flex-row sm:items-center sm:justify-between">
                    <div
                      className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                      onClick={() => loadDeliveries(wh.id)}
                    >
                      <div
                        className={cn(
                          "h-2.5 w-2.5 rounded-full shrink-0",
                          wh.enabled ? "bg-emerald-500" : "bg-slate-300",
                        )}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--fgColor-default)]">
                          {wh.name}
                        </p>
                        <p className="text-xs text-[var(--fgColor-muted)] truncate">
                          {wh.url}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0 ml-5 sm:ml-0">
                      <div className="flex flex-wrap gap-1">
                        {(wh.events ?? []).map((e) => (
                          <Badge
                            key={e}
                            variant="primary"
                            className="text-[10px]"
                          >
                            {e}
                          </Badge>
                        ))}
                      </div>

                      {/* Test button */}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleTest(wh)}
                        disabled={isTesting}
                        className="text-[var(--fgColor-subtle)] hover:text-[var(--fgColor-accent)] hover:bg-[var(--bgColor-accent-muted)]"
                        title="Test webhook"
                      >
                        {isTesting ? (
                          <LoaderIcon className="h-4 w-4 animate-spin" />
                        ) : (
                          <SendIcon className="h-4 w-4" />
                        )}
                      </Button>

                      <button
                        onClick={() => toggleEnabled(wh)}
                        className={cn(
                          "relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0",
                          wh.enabled ? "bg-emerald-500" : "bg-slate-300",
                        )}
                      >
                        <span
                          className={cn(
                            "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform",
                            wh.enabled ? "translate-x-4" : "translate-x-0.5",
                          )}
                        />
                      </button>
                      {deleting === wh.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="danger-ghost"
                            size="sm"
                            onClick={() => handleDelete(wh.id)}
                            className="h-auto px-2 py-1 text-xs"
                          >
                            Confirm
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleting(null)}
                            className="h-auto px-2 py-1 text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeleting(wh.id)}
                          className="text-[var(--fgColor-subtle)] hover:text-red-500 hover:bg-[var(--bgColor-danger-muted)]"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      )}
                      <ChevronDownIcon
                        className={cn(
                          "h-4 w-4 text-[var(--fgColor-subtle)] transition-transform",
                          expandedId === wh.id && "rotate-180",
                        )}
                      />
                    </div>

                    {/* Test result display */}
                    {testResult && (
                      <div className="px-3 py-2 rounded-lg border border-[var(--borderColor-default)] bg-white text-xs flex items-center gap-2">
                        {testResult.success ? (
                          <CheckIcon className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <XIcon className="h-3.5 w-3.5 text-red-500 shrink-0" />
                        )}
                        <span
                          className={cn(
                            "font-mono font-semibold",
                            getStatusCodeColor(testResult.status),
                          )}
                        >
                          {testResult.status || "ERR"}
                        </span>
                        <span className="text-[var(--fgColor-muted)] truncate">
                          {testResult.message ||
                            (testResult.success ? "OK" : "Failed")}
                        </span>
                      </div>
                    )}
                  </div>

                  {expandedId === wh.id && (
                    <div className="ml-0 sm:ml-4 mt-1 mb-2 rounded-lg border border-[var(--borderColor-default)] bg-white">
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-xs font-semibold text-[var(--fgColor-muted)]">
                          Recent Deliveries
                        </p>
                      </div>
                      {deliveries.length === 0 ? (
                        <div className="px-4 py-6 text-center">
                          <p className="text-xs text-[var(--fgColor-subtle)]">
                            No deliveries yet.
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100 overflow-x-auto">
                          {deliveries.map((d) => (
                            <div key={d.id} className="px-4 py-2.5">
                              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={cn(
                                      "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold shrink-0",
                                      d.success
                                        ? "bg-[var(--bgColor-success-muted)] text-emerald-700"
                                        : "bg-red-100 text-red-700",
                                    )}
                                  >
                                    {d.success ? (
                                      <CheckIcon className="h-3 w-3" />
                                    ) : (
                                      <XIcon className="h-3 w-3" />
                                    )}
                                  </span>
                                  <span className="text-xs font-medium text-[var(--fgColor-default)]">
                                    {d.event_type}
                                  </span>
                                  <span
                                    className={cn(
                                      "text-[10px] font-mono px-1.5 py-0.5 rounded font-medium",
                                      getStatusCodeBg(d.response_status),
                                    )}
                                  >
                                    {d.response_status || "err"}
                                  </span>
                                  <span className="text-[10px] text-[var(--fgColor-subtle)]">
                                    {d.attempt > 0
                                      ? `Retry ${d.attempt} of ${d.max_attempts}`
                                      : `Attempt 1 of ${d.max_attempts}`}
                                  </span>
                                </div>
                                <span className="text-[10px] text-[var(--fgColor-subtle)] ml-7 sm:ml-0">
                                  {timeAgo(d.delivered_at)}
                                </span>
                              </div>
                              {d.response_body && (
                                <details className="mt-2 ml-7">
                                  <summary className="text-[10px] text-[var(--fgColor-subtle)] cursor-pointer hover:text-[var(--fgColor-muted)]">
                                    Response body
                                  </summary>
                                  <pre className="mt-1 p-2 rounded bg-[var(--bgColor-muted)] border border-slate-100 text-[10px] font-mono text-[var(--fgColor-muted)] overflow-x-auto whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                                    {d.response_body}
                                  </pre>
                                </details>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
