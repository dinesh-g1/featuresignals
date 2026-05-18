"use client";

/**
 * Settings → Webhooks — Create, test, toggle, delete webhook endpoints.
 *
 * Console design language. Signal UI tokens only. Every state handled:
 * loading (skeleton), empty, error, success.
 */

import { useCallback, useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { toast } from "@/components/toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import {
  LinkIcon,
  TrashIcon,
  ChevronDownIcon,
  CheckIcon,
  XIcon,
  SendIcon,
  LoaderIcon,
  EyeIcon,
  EyeOffIcon,
  CopyIcon,
  AlertIcon,
  PlusIcon,
} from "@/components/icons/nav-icons";
import type { Webhook, WebhookDelivery } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────

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
    data: { flag_key: "dark_mode", flag_name: "Dark Mode" },
  },
  "flag.updated": {
    event: "flag.updated",
    timestamp: "2025-04-13T10:30:00Z",
    data: {
      flag_key: "dark_mode",
      changes: { description: { old: "Old", new: "New" } },
    },
  },
  "flag.deleted": {
    event: "flag.deleted",
    timestamp: "2025-04-13T10:30:00Z",
    data: { flag_key: "old_feature" },
  },
  "flag.toggled": {
    event: "flag.toggled",
    timestamp: "2025-04-13T10:30:00Z",
    data: { flag_key: "dark_mode", environment: "production", new_value: true },
  },
  "flag.promoted": {
    event: "flag.promoted",
    timestamp: "2025-04-13T10:30:00Z",
    data: {
      flag_key: "dark_mode",
      source_environment: "staging",
      target_environment: "production",
    },
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────

function statusColor(status: number) {
  if (status >= 200 && status < 300) return "text-[var(--signal-fg-success)]";
  if (status >= 400 && status < 500) return "text-[var(--signal-fg-warning)]";
  if (status >= 500) return "text-[var(--signal-fg-danger)]";
  return "text-[var(--signal-fg-secondary)]";
}

function statusBg(status: number) {
  if (status >= 200 && status < 300)
    return "bg-[var(--signal-bg-success-muted)] text-[var(--signal-fg-success)]";
  if (status >= 400 && status < 500)
    return "bg-[var(--signal-bg-warning-muted)] text-[var(--signal-fg-warning)]";
  if (status >= 500)
    return "bg-[var(--signal-bg-danger-muted)] text-[var(--signal-fg-danger)]";
  return "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-secondary)]";
}

function WebhooksSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="p-4 sm:p-6">
        <div className="flex justify-between mb-4">
          <div className="h-6 w-24 rounded bg-[var(--signal-bg-secondary)] animate-pulse" />
          <div className="h-8 w-28 rounded-lg bg-[var(--signal-bg-secondary)] animate-pulse" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 rounded-lg bg-[var(--signal-bg-secondary)] animate-pulse"
            />
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────

export default function WebhooksPage() {
  const token = useAppStore((s) => s.token);
  const searchParams = useSearchParams();

  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Pagination
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");
  const total = webhooks.length;

  const paginatedWebhooks = useMemo(() => {
    if (offset >= webhooks.length) return [];
    const end = offset + limit;
    return webhooks.slice(
      offset,
      end > webhooks.length ? webhooks.length : end,
    );
  }, [webhooks, limit, offset]);

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
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<
    Record<string, { success: boolean; status: number; message?: string }>
  >({});
  const [urlTouched, setUrlTouched] = useState(false);
  const urlValid = form.url === "" || URL_REGEX.test(form.url);
  const urlShowError = urlTouched && form.url !== "" && !urlValid;
  const [showPayloadPreview, setShowPayloadPreview] = useState(false);
  const [selectedPreviewEvent, setSelectedPreviewEvent] = useState(
    EVENT_TYPES[0],
  );

  // Load data
  const loadData = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setLoadError(null);
    api
      .listWebhooks(token)
      .then((w) => setWebhooks(w.data))
      .catch((err) =>
        setLoadError(
          err instanceof Error ? err.message : "Failed to load webhooks",
        ),
      )
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    if (!token) return;
    try {
      setSubmitting(true);
      setFieldErrors({});
      await api.createWebhook(token, form);
      setShowCreate(false);
      setForm({ name: "", url: "", secret: "", events: [] });
      setUrlTouched(false);
      toast("Webhook created", "success");
      loadData();
    } catch (err: unknown) {
      toast(
        err instanceof Error ? err.message : "Failed to create webhook",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(webhookId: string) {
    if (!token) return;
    try {
      await api.deleteWebhook(token, webhookId);
      setDeleting(null);
      toast("Webhook deleted", "success");
      loadData();
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
      loadData();
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
    setDeliveries(d.data);
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
          message: err instanceof Error ? err.message : "Failed",
        },
      }));
      toast("Failed to test webhook", "error");
    } finally {
      setTestingId(null);
    }
  }

  function copyPayload() {
    const payload = SAMPLE_PAYLOADS[selectedPreviewEvent];
    if (payload) {
      navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      toast("Payload copied to clipboard", "success");
    }
  }

  // ── Loading / Error ────────────────────────────────────────────────

  if (loading && webhooks.length === 0) return <WebhooksSkeleton />;

  if (loadError) {
    return (
      <div className="flex items-center justify-center py-20 animate-fade-in">
        <Card className="border-[var(--signal-border-danger-emphasis)]/30 bg-[var(--signal-bg-danger-muted)] p-6 text-center max-w-md">
          <AlertIcon className="mx-auto h-8 w-8 text-[var(--signal-fg-danger)] mb-3" />
          <h2 className="text-lg font-semibold text-[var(--signal-fg-danger)] mb-1">
            Failed to load webhooks
          </h2>
          <p className="text-sm text-[var(--signal-fg-secondary)] mb-4">
            {loadError}
          </p>
          <Button variant="secondary" onClick={loadData}>
            <LoaderIcon className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────

  return (
    <Suspense fallback={<WebhooksSkeleton />}>
      <div className="space-y-6 animate-fade-in">
        <Card className="p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
            <h2 className="text-lg font-semibold text-[var(--signal-fg-primary)]">
              Webhooks
            </h2>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setShowCreate(!showCreate)}
            >
              <PlusIcon className="mr-1.5 h-4 w-4" />
              Add Webhook
            </Button>
          </div>

          {/* Create Form */}
          {showCreate && (
            <form
              onSubmit={handleCreate}
              noValidate
              className="mb-5 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)] p-4 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium">Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => {
                      setForm({ ...form, name: e.target.value });
                      if (fieldErrors.name)
                        setFieldErrors((prev) => ({
                          ...prev,
                          name: undefined,
                        }));
                    }}
                    placeholder="Slack Notifications"
                    required
                    className="mt-1.5"
                    error={!!fieldErrors.name}
                  />
                  {fieldErrors.name && (
                    <p
                      className="text-xs text-[var(--signal-fg-danger)] mt-1"
                      role="alert"
                    >
                      {fieldErrors.name}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-xs font-medium">URL</Label>
                  <Input
                    value={form.url}
                    onChange={(e) => {
                      setForm({ ...form, url: e.target.value });
                      if (fieldErrors.url)
                        setFieldErrors((prev) => ({ ...prev, url: undefined }));
                    }}
                    onBlur={() => setUrlTouched(true)}
                    placeholder="https://hooks.slack.com/..."
                    type="url"
                    className={cn(
                      "mt-1.5",
                      urlShowError &&
                        "border-[var(--signal-border-danger-emphasis)]",
                    )}
                    error={!!fieldErrors.url || urlShowError}
                  />
                  {fieldErrors.url && (
                    <p
                      className="text-xs text-[var(--signal-fg-danger)] mt-1"
                      role="alert"
                    >
                      {fieldErrors.url}
                    </p>
                  )}
                  {urlShowError && !fieldErrors.url && (
                    <p
                      className="text-xs text-[var(--signal-fg-danger)] mt-1"
                      role="alert"
                    >
                      Invalid URL format
                    </p>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium">
                  Secret (for HMAC signature verification)
                </Label>
                <Input
                  value={form.secret}
                  onChange={(e) => setForm({ ...form, secret: e.target.value })}
                  placeholder="Optional shared secret"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1.5">Events</Label>
                <div className="flex flex-wrap gap-2">
                  {EVENT_TYPES.map((evt) => (
                    <button
                      key={evt}
                      type="button"
                      onClick={() => toggleEvent(evt)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors",
                        form.events.includes(evt)
                          ? "bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)] ring-[var(--signal-border-accent-muted)]"
                          : "bg-[var(--signal-bg-primary)] text-[var(--signal-fg-secondary)] ring-[var(--signal-border-default)] hover:bg-[var(--signal-bg-secondary)]",
                      )}
                    >
                      {evt}
                    </button>
                  ))}
                </div>
              </div>
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
                  <div className="mt-3 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] overflow-hidden">
                    <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-[var(--signal-border-subtle)] bg-[var(--signal-bg-secondary)]">
                      {EVENT_TYPES.map((evt) => (
                        <button
                          key={evt}
                          type="button"
                          onClick={() => setSelectedPreviewEvent(evt)}
                          className={cn(
                            "rounded px-2 py-0.5 text-[10px] font-medium transition-colors",
                            selectedPreviewEvent === evt
                              ? "bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)]"
                              : "bg-[var(--signal-bg-primary)] text-[var(--signal-fg-secondary)] hover:bg-[var(--signal-bg-secondary)]",
                          )}
                        >
                          {evt}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={copyPayload}
                        className="ml-auto rounded px-2 py-0.5 text-[10px] font-medium bg-[var(--signal-bg-primary)] text-[var(--signal-fg-secondary)] hover:bg-[var(--signal-bg-secondary)] flex items-center gap-1"
                      >
                        <CopyIcon className="h-3 w-3" />
                        Copy
                      </button>
                    </div>
                    <pre className="p-3 text-xs text-[var(--signal-fg-primary)] overflow-x-auto max-h-64 overflow-y-auto font-mono">
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
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <LoaderIcon className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Webhook"
                  )}
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

          {/* Webhook List */}
          {total === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-[var(--signal-border-default)] rounded-xl">
              <LinkIcon className="h-10 w-10 text-[var(--signal-fg-tertiary)] mb-3" />
              <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
                No webhooks configured
              </h3>
              <p className="text-sm text-[var(--signal-fg-tertiary)] max-w-sm mb-4">
                Webhooks send real-time HTTP notifications when flags change.
              </p>
              <Button
                size="sm"
                variant="primary"
                onClick={() => setShowCreate(true)}
              >
                <PlusIcon className="mr-1.5 h-4 w-4" />
                Add Webhook
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {paginatedWebhooks.map((wh) => {
                const testResult = testResults[wh.id];
                const isTesting = testingId === wh.id;
                return (
                  <div key={wh.id}>
                    <div className="flex flex-col gap-2 rounded-lg bg-[var(--signal-bg-secondary)] p-3 transition-colors sm:flex-row sm:items-center sm:justify-between">
                      <div
                        className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                        onClick={() => loadDeliveries(wh.id)}
                      >
                        <div
                          className={cn(
                            "h-2.5 w-2.5 rounded-full shrink-0",
                            wh.enabled
                              ? "bg-[var(--signal-fg-success)]"
                              : "bg-[var(--signal-fg-tertiary)]",
                          )}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--signal-fg-primary)]">
                            {wh.name}
                          </p>
                          <p className="text-xs text-[var(--signal-fg-secondary)] truncate">
                            {wh.url}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0 ml-5 sm:ml-0">
                        <div className="flex flex-wrap gap-1">
                          {(wh.events ?? []).map((e) => (
                            <span
                              key={e}
                              className="inline-flex items-center rounded-full bg-[var(--signal-bg-accent-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--signal-fg-accent)]"
                            >
                              {e}
                            </span>
                          ))}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleTest(wh)}
                          disabled={isTesting}
                          className="text-[var(--signal-fg-tertiary)] hover:text-[var(--signal-fg-accent)] hover:bg-[var(--signal-bg-accent-muted)]"
                          title="Test webhook"
                        >
                          {isTesting ? (
                            <LoaderIcon className="h-4 w-4 animate-spin" />
                          ) : (
                            <SendIcon className="h-4 w-4" />
                          )}
                        </Button>
                        <button
                          type="button"
                          onClick={() => toggleEnabled(wh)}
                          className={cn(
                            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0",
                            wh.enabled
                              ? "bg-[var(--signal-bg-success-emphasis)]"
                              : "bg-[var(--signal-bg-secondary)]",
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
                            className="text-[var(--signal-fg-tertiary)] hover:text-[var(--signal-fg-danger)] hover:bg-[var(--signal-bg-danger-muted)]"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        )}
                        <ChevronDownIcon
                          className={cn(
                            "h-4 w-4 text-[var(--signal-fg-tertiary)] transition-transform duration-[var(--signal-duration-fast)]",
                            expandedId === wh.id && "rotate-180",
                          )}
                        />
                      </div>
                      {testResult && (
                        <div className="px-3 py-2 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] text-xs flex items-center gap-2 w-full">
                          {testResult.success ? (
                            <CheckIcon className="h-3.5 w-3.5 text-[var(--signal-fg-success)] shrink-0" />
                          ) : (
                            <XIcon className="h-3.5 w-3.5 text-[var(--signal-fg-danger)] shrink-0" />
                          )}
                          <span
                            className={cn(
                              "font-mono font-semibold",
                              statusColor(testResult.status),
                            )}
                          >
                            {testResult.status || "ERR"}
                          </span>
                          <span className="text-[var(--signal-fg-secondary)] truncate">
                            {testResult.message ||
                              (testResult.success ? "OK" : "Failed")}
                          </span>
                        </div>
                      )}
                    </div>

                    {expandedId === wh.id && (
                      <div className="ml-0 sm:ml-4 mt-1 mb-2 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] animate-fade-in">
                        <div className="px-4 py-2 border-b border-[var(--signal-border-subtle)]">
                          <p className="text-xs font-semibold text-[var(--signal-fg-secondary)]">
                            Recent Deliveries
                          </p>
                        </div>
                        {deliveries.length === 0 ? (
                          <div className="px-4 py-6 text-center">
                            <p className="text-xs text-[var(--signal-fg-tertiary)]">
                              No deliveries yet.
                            </p>
                          </div>
                        ) : (
                          <div className="divide-y divide-[var(--signal-border-subtle)] overflow-x-auto">
                            {deliveries.map((d) => (
                              <div key={d.id} className="px-4 py-2.5">
                                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                      className={cn(
                                        "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold shrink-0",
                                        d.success
                                          ? "bg-[var(--signal-bg-success-muted)] text-[var(--signal-fg-success)]"
                                          : "bg-[var(--signal-bg-danger-muted)] text-[var(--signal-fg-danger)]",
                                      )}
                                    >
                                      {d.success ? (
                                        <CheckIcon className="h-3 w-3" />
                                      ) : (
                                        <XIcon className="h-3 w-3" />
                                      )}
                                    </span>
                                    <span className="text-xs font-medium text-[var(--signal-fg-primary)]">
                                      {d.event_type}
                                    </span>
                                    <span
                                      className={cn(
                                        "text-[10px] font-mono px-1.5 py-0.5 rounded font-medium",
                                        statusBg(d.response_status),
                                      )}
                                    >
                                      {d.response_status || "err"}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-[var(--signal-fg-tertiary)]">
                                    {d.delivered_at
                                      ? new Date(
                                          d.delivered_at,
                                        ).toLocaleString()
                                      : "pending"}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {total > 0 && <Pagination total={total} />}
        </Card>
      </div>
    </Suspense>
  );
}
