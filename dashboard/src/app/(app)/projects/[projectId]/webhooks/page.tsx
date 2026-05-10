"use client";

import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { usePageData } from "@/hooks/use-page-data";
import { toast } from "@/components/toast";
import { cn, timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SkeletonList } from "@/components/loading-skeletons";
import { PageHeader } from "@/components/page-header";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  PlusIcon,
} from "@/components/icons/nav-icons";
import { DOCS_LINKS } from "@/components/docs-link";
import { WebhookHealth } from "@/components/webhook-health";
import type { Webhook, WebhookDelivery } from "@/lib/types";

// ─── Constants ─────────────────────────────────────────────────────

const EVENT_TYPES = [
  "flag.created",
  "flag.updated",
  "flag.deleted",
  "flag.toggled",
  "flag.promoted",
] as const;

const URL_REGEX = /^https?:\/\/.+/;

const SAMPLE_PAYLOADS: Record<string, Record<string, unknown>> = {
  "flag.created": {
    event: "flag.created",
    timestamp: "2025-04-13T10:30:00Z",
    data: {
      flag_key: "dark_mode",
      flag_name: "Dark Mode",
      description: "Enable dark mode for the application",
      flag_type: "boolean",
      project_slug: "my-app",
      created_by: "admin@example.com",
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
      updated_by: "admin@example.com",
    },
  },
  "flag.deleted": {
    event: "flag.deleted",
    timestamp: "2025-04-13T10:30:00Z",
    data: {
      flag_key: "old_feature",
      flag_name: "Old Feature",
      project_slug: "my-app",
      deleted_by: "admin@example.com",
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
      toggled_by: "admin@example.com",
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
      promoted_by: "admin@example.com",
    },
  },
};

// ─── Helpers ────────────────────────────────────────────────────────

function statusCodeColor(status: number): string {
  if (status >= 200 && status < 300) return "text-[var(--signal-fg-success)]";
  if (status >= 400 && status < 500) return "text-amber-600";
  if (status >= 500) return "text-red-600";
  return "text-[var(--signal-fg-secondary)]";
}

function statusCodeBadge(status: number): string {
  if (status >= 200 && status < 300)
    return "bg-[var(--signal-bg-success-muted)] text-emerald-700";
  if (status >= 400 && status < 500) return "bg-amber-100 text-amber-700";
  if (status >= 500) return "bg-red-100 text-red-700";
  return "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-secondary)]";
}

// ─── Create / Edit Dialog ───────────────────────────────────────────

interface WebhookFormData {
  name: string;
  url: string;
  secret: string;
  events: string[];
}

interface WebhookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Webhook | null;
  onSaved: () => void;
}

function WebhookDialog({ open, onOpenChange, editing, onSaved }: WebhookDialogProps) {
  const token = useAppStore((s) => s.token);

  const [form, setForm] = useState<WebhookFormData>({
    name: editing?.name ?? "",
    url: editing?.url ?? "",
    secret: "",
    events: editing?.events ?? [],
  });
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; url?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [urlTouched, setUrlTouched] = useState(false);
  const [showPayloadPreview, setShowPayloadPreview] = useState(false);
  const [selectedPreviewEvent, setSelectedPreviewEvent] = useState<string>(EVENT_TYPES[0]);

  const urlValid = form.url === "" || URL_REGEX.test(form.url);
  const urlShowError = urlTouched && form.url !== "" && !urlValid;

  // Reset form when dialog opens with new editing target
  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (next && editing) {
        setForm({
          name: editing.name,
          url: editing.url,
          secret: "",
          events: editing.events ?? [],
        });
      } else if (next && !editing) {
        setForm({ name: "", url: "", secret: "", events: [] });
      }
      setFieldErrors({});
      setUrlTouched(false);
      setSubmitting(false);
      setShowPayloadPreview(false);
      onOpenChange(next);
    },
    [editing, onOpenChange],
  );

  const toggleEvent = useCallback((event: string) => {
    setForm((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  }, []);

  const copyPayload = useCallback(() => {
    const payload = SAMPLE_PAYLOADS[selectedPreviewEvent];
    if (payload) {
      void navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      toast("Payload copied to clipboard", "success");
    }
  }, [selectedPreviewEvent]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
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
        setSubmitting(true);
        if (editing) {
          await api.updateWebhook(token, editing.id, form);
          toast("Webhook updated", "success");
        } else {
          await api.createWebhook(token, form);
          toast("Webhook created", "success");
        }
        onOpenChange(false);
        onSaved();
      } catch (err: unknown) {
        toast(
          err instanceof Error ? err.message : "Failed to save webhook",
          "error",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [form, token, editing, onOpenChange, onSaved],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--signal-bg-accent-muted)]">
          <LinkIcon className="h-6 w-6 text-[var(--signal-fg-accent)]" />
        </div>
        <DialogHeader className="text-center">
          <DialogTitle>
            {editing ? "Edit webhook" : "Create webhook"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the webhook configuration."
              : "Configure a new webhook endpoint to receive real-time event notifications."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="wh-name">Name</Label>
              <Input
                id="wh-name"
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  if (fieldErrors.name)
                    setFieldErrors((prev) => ({ ...prev, name: undefined }));
                }}
                placeholder="Slack Notifications"
                className="mt-1.5"
                autoFocus
                aria-invalid={!!fieldErrors.name}
              />
              {fieldErrors.name && (
                <p className="mt-1 text-xs text-red-500" role="alert">
                  {fieldErrors.name}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="wh-url">URL</Label>
              <Input
                id="wh-url"
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
                  urlShowError && "border-red-300 focus-visible:ring-red-400",
                )}
                aria-invalid={!!fieldErrors.url || urlShowError}
              />
              {fieldErrors.url ? (
                <p className="mt-1 text-xs text-red-500" role="alert">
                  {fieldErrors.url}
                </p>
              ) : urlShowError ? (
                <p className="mt-1 text-xs text-red-500" role="alert">
                  Invalid URL format
                </p>
              ) : null}
            </div>
          </div>
          <div>
            <Label htmlFor="wh-secret">
              Secret (for HMAC signature verification)
            </Label>
            <Input
              id="wh-secret"
              value={form.secret}
              onChange={(e) => setForm({ ...form, secret: e.target.value })}
              placeholder={editing ? "Leave blank to keep current" : "Optional shared secret"}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Events</Label>
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
                      : "bg-white text-[var(--signal-fg-secondary)] ring-[var(--signal-border-default)] hover:bg-[var(--signal-bg-secondary)]",
                  )}
                >
                  {evt}
                </button>
              ))}
            </div>
          </div>
          {/* Sample payload preview */}
          <div>
            <button
              type="button"
              onClick={() => setShowPayloadPreview(!showPayloadPreview)}
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--signal-fg-secondary)] hover:text-[var(--signal-fg-accent)] transition-colors"
            >
              {showPayloadPreview ? (
                <EyeOffIcon className="h-3.5 w-3.5" />
              ) : (
                <EyeIcon className="h-3.5 w-3.5" />
              )}
              {showPayloadPreview ? "Hide sample payload" : "View sample payload"}
            </button>
            {showPayloadPreview && (
              <div className="mt-2 rounded-lg border border-[var(--signal-border-default)] bg-white overflow-hidden">
                <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-slate-100 bg-[var(--signal-bg-secondary)]">
                  {EVENT_TYPES.map((evt) => (
                    <button
                      key={evt}
                      type="button"
                      onClick={() => setSelectedPreviewEvent(evt)}
                      className={cn(
                        "rounded px-2 py-0.5 text-[10px] font-medium transition-colors",
                        selectedPreviewEvent === evt
                          ? "bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)]"
                          : "bg-white text-[var(--signal-fg-secondary)] hover:bg-[var(--signal-bg-secondary)]",
                      )}
                    >
                      {evt}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={copyPayload}
                    className="ml-auto rounded px-2 py-0.5 text-[10px] font-medium bg-white text-[var(--signal-fg-secondary)] hover:bg-[var(--signal-bg-secondary)] flex items-center gap-1"
                    title="Copy to clipboard"
                  >
                    <CopyIcon className="h-3 w-3" />
                    Copy
                  </button>
                </div>
                <pre className="p-3 text-[11px] leading-relaxed font-mono text-[var(--signal-fg-primary)] overflow-x-auto max-h-48 overflow-y-auto">
                  {JSON.stringify(SAMPLE_PAYLOADS[selectedPreviewEvent], null, 2)}
                </pre>
              </div>
            )}
          </div>
          <DialogFooter className="!justify-between">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? (
                <>
                  <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : editing ? (
                "Save changes"
              ) : (
                "Create webhook"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────

export default function WebhooksPage() {
  const token = useAppStore((s) => s.token);

  const {
    data: webhooks,
    loading,
    error,
    reload,
  } = usePageData<Webhook[]>(
    () => api.listWebhooks(token!),
    [token],
    { enabled: !!token, initialData: [] },
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<
    Record<string, { success: boolean; status: number; message?: string }>
  >({});

  // ── Actions ──

  const handleDelete = useCallback(
    async (webhookId: string) => {
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
    },
    [token, reload],
  );

  const toggleEnabled = useCallback(
    async (wh: Webhook) => {
      if (!token) return;
      try {
        await api.updateWebhook(token, wh.id, { enabled: !wh.enabled });
        reload();
        toast(wh.enabled ? "Webhook disabled" : "Webhook enabled", "success");
      } catch {
        toast("Failed to update webhook", "error");
      }
    },
    [token, reload],
  );

  const loadDeliveries = useCallback(
    async (webhookId: string) => {
      if (!token) return;
      if (expandedId === webhookId) {
        setExpandedId(null);
        return;
      }
      const d = await api.listWebhookDeliveries(token, webhookId);
      setDeliveries(d ?? []);
      setExpandedId(webhookId);
    },
    [token, expandedId],
  );

  const handleTest = useCallback(
    async (wh: Webhook) => {
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
        toast(
          result.success ? "Test sent successfully" : "Test failed",
          "info",
        );
      } catch (err: unknown) {
        setTestResults((prev) => ({
          ...prev,
          [wh.id]: {
            success: false,
            status: 0,
            message:
              err instanceof Error ? err.message : "Failed to send test",
          },
        }));
        toast("Failed to test webhook", "error");
      } finally {
        setTestingId(null);
      }
    },
    [token],
  );

  const openCreate = useCallback(() => {
    setEditingWebhook(null);
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((wh: Webhook) => {
    setEditingWebhook(wh);
    setDialogOpen(true);
  }, []);

  const handleDialogSaved = useCallback(() => {
    reload();
  }, [reload]);

  const list = webhooks ?? [];

  // ── Loading ──
  if (loading) {
    return (
      <div className="space-y-6">
        <WebhookHealth />
        <Card className="p-4 sm:p-6">
          <PageHeader
            title="Webhooks"
            description="Configure webhook endpoints to receive real-time event notifications."
            primaryAction={
              <Button variant="primary" disabled>
                <PlusIcon className="h-4 w-4 mr-1.5" />
                Add Webhook
              </Button>
            }
          />
          <SkeletonList rows={4} />
        </Card>
      </div>
    );
  }

  // ── Error ──
  if (error && list.length === 0) {
    return (
      <div className="space-y-6">
        <WebhookHealth />
        <Card className="p-4 sm:p-6">
          <PageHeader
            title="Webhooks"
            description="Configure webhook endpoints to receive real-time event notifications."
          />
          <div className="flex flex-col items-center justify-center py-16">
            <div className="rounded-2xl border border-red-200 bg-[var(--signal-bg-danger-muted)] p-6 text-center max-w-md">
              <h2 className="text-lg font-bold text-red-800 mb-1">
                Failed to load webhooks
              </h2>
              <p className="text-sm text-red-600 mb-4">{error}</p>
              <Button onClick={reload} variant="secondary">
                Retry
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // ── Render ──
  return (
    <div className="space-y-6">
      <WebhookHealth />

      <Card className="p-4 sm:p-6">
        <PageHeader
          title="Webhooks"
          description="Configure webhook endpoints to receive real-time event notifications."
          primaryAction={
            <Button onClick={openCreate} variant="primary">
              <PlusIcon className="h-4 w-4 mr-1.5" />
              Add Webhook
            </Button>
          }
          statusBadge={
            list.length > 0 ? (
              <span className="inline-flex items-center rounded-full bg-[var(--signal-bg-secondary)] px-2.5 py-0.5 text-xs font-medium text-[var(--signal-fg-secondary)] ring-1 ring-inset ring-[var(--signal-border-default)]">
                {list.length} webhook{list.length !== 1 ? "s" : ""}
              </span>
            ) : undefined
          }
        />

        {/* ── Empty ── */}
        {list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--signal-bg-accent-muted)] to-[var(--signal-bg-accent-muted)]/50 ring-1 ring-[var(--signal-border-accent-muted)]/50 shadow-sm">
              <LinkIcon className="h-10 w-10 text-[var(--signal-fg-accent)]" />
            </div>
            <h2 className="text-xl font-bold text-[var(--signal-fg-primary)]">
              No webhooks yet
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--signal-fg-secondary)]">
              Webhooks send real-time HTTP notifications when flags change.
              Connect your CI/CD pipeline, Slack, or monitoring tools.
            </p>
            <div className="mt-8 flex items-center gap-3">
              <Button onClick={openCreate} variant="primary" size="lg">
                <PlusIcon className="h-5 w-5 mr-2" />
                Create your first webhook
              </Button>
              {DOCS_LINKS.webhooks && (
                <a
                  href={DOCS_LINKS.webhooks}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-[var(--signal-fg-accent)] hover:underline"
                >
                  Webhook setup guide →
                </a>
              )}
            </div>
          </div>
        ) : (
          /* ── Data ── */
          <div className="space-y-2">
            {list.map((wh) => {
              const testResult = testResults[wh.id];
              const isTesting = testingId === wh.id;

              return (
                <div key={wh.id}>
                  <div className="flex flex-col gap-2 rounded-lg bg-[var(--signal-bg-secondary)] p-3 ring-1 ring-slate-100 transition-colors hover:bg-[var(--signal-bg-accent-emphasis)]-glass sm:flex-row sm:items-center sm:justify-between">
                    <div
                      className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                      onClick={() => loadDeliveries(wh.id)}
                    >
                      <div
                        className={cn(
                          "h-2.5 w-2.5 rounded-full shrink-0",
                          wh.enabled ? "bg-emerald-500" : "bg-slate-300",
                        )}
                        title={wh.enabled ? "Enabled" : "Disabled"}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-[var(--signal-fg-primary)]">
                            {wh.name}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(wh);
                            }}
                            className="text-[var(--signal-fg-tertiary)] hover:text-[var(--signal-fg-accent)] transition-colors"
                            title="Edit webhook"
                          >
                            <svg
                              className="h-3.5 w-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                        </div>
                        <p className="text-xs text-[var(--signal-fg-secondary)] truncate">
                          {wh.url}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0 ml-5 sm:ml-0">
                      <div className="hidden sm:flex flex-wrap gap-1">
                        {(wh.events ?? []).slice(0, 3).map((e) => (
                          <Badge key={e} variant="primary" className="text-[10px]">
                            {e}
                          </Badge>
                        ))}
                        {(wh.events ?? []).length > 3 && (
                          <Badge variant="default" className="text-[10px]">
                            +{(wh.events ?? []).length - 3}
                          </Badge>
                        )}
                      </div>

                      {/* Test button */}
                      <button
                        onClick={() => handleTest(wh)}
                        disabled={isTesting}
                        className="rounded-md p-1.5 text-[var(--signal-fg-tertiary)] hover:text-[var(--signal-fg-accent)] hover:bg-[var(--signal-bg-accent-muted)] transition-colors disabled:opacity-50"
                        title="Test webhook"
                      >
                        {isTesting ? (
                          <LoaderIcon className="h-4 w-4 animate-spin" />
                        ) : (
                          <SendIcon className="h-4 w-4" />
                        )}
                      </button>

                      {/* Enable/disable toggle */}
                      <button
                        onClick={() => toggleEnabled(wh)}
                        className={cn(
                          "relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0",
                          wh.enabled ? "bg-emerald-500" : "bg-slate-300",
                        )}
                        role="switch"
                        aria-checked={wh.enabled}
                        title={wh.enabled ? "Disable webhook" : "Enable webhook"}
                      >
                        <span
                          className={cn(
                            "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform",
                            wh.enabled ? "translate-x-4" : "translate-x-0.5",
                          )}
                        />
                      </button>

                      {/* Delete */}
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
                        <button
                          onClick={() => setDeleting(wh.id)}
                          className="rounded-md p-1.5 text-[var(--signal-fg-tertiary)] hover:text-red-500 hover:bg-[var(--signal-bg-danger-muted)] transition-colors"
                          title="Delete webhook"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}

                      <ChevronDownIcon
                        className={cn(
                          "h-4 w-4 text-[var(--signal-fg-tertiary)] transition-transform",
                          expandedId === wh.id && "rotate-180",
                        )}
                      />
                    </div>

                    {/* Test result banner */}
                    {testResult && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--signal-border-default)] bg-white text-xs w-full sm:w-auto">
                        {testResult.success ? (
                          <CheckIcon className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <XIcon className="h-3.5 w-3.5 text-red-500 shrink-0" />
                        )}
                        <span
                          className={cn(
                            "font-mono font-semibold",
                            statusCodeColor(testResult.status),
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

                  {/* Delivery log expand */}
                  {expandedId === wh.id && (
                    <div className="ml-0 sm:ml-4 mt-1 mb-2 rounded-lg border border-[var(--signal-border-default)] bg-white animate-fade-in">
                      <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                        <p className="text-xs font-semibold text-[var(--signal-fg-secondary)]">
                          Recent Deliveries
                        </p>
                        <span className="text-[10px] text-[var(--signal-fg-tertiary)]">
                          {deliveries.length} delivery
                          {deliveries.length !== 1 ? "ies" : "y"}
                        </span>
                      </div>
                      {deliveries.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <SendIcon className="h-6 w-6 mx-auto mb-2 text-[var(--signal-fg-tertiary)]" />
                          <p className="text-xs text-[var(--signal-fg-tertiary)]">
                            No deliveries recorded yet
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
                                        ? "bg-[var(--signal-bg-success-muted)] text-emerald-700"
                                        : "bg-red-100 text-red-700",
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
                                      statusCodeBadge(d.response_status),
                                    )}
                                  >
                                    {d.response_status || "err"}
                                  </span>
                                  <span className="text-[10px] text-[var(--signal-fg-tertiary)]">
                                    {d.attempt === 0 && d.max_attempts <= 1
                                      ? "First attempt"
                                      : `Attempt ${d.attempt + 1} of ${d.max_attempts}`}
                                  </span>
                                </div>
                                <span className="text-[10px] text-[var(--signal-fg-tertiary)] ml-7 sm:ml-0">
                                  {timeAgo(d.delivered_at)}
                                </span>
                              </div>
                              {d.response_body && (
                                <details className="mt-2 ml-7">
                                  <summary className="text-[10px] text-[var(--signal-fg-tertiary)] cursor-pointer hover:text-[var(--signal-fg-secondary)]">
                                    Response body
                                  </summary>
                                  <pre className="mt-1 p-2 rounded bg-[var(--signal-bg-secondary)] border border-slate-100 text-[10px] font-mono text-[var(--signal-fg-secondary)] overflow-x-auto whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
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
            })}
          </div>
        )}
      </Card>

      {/* Create / Edit Dialog */}
      <WebhookDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editingWebhook}
        onSaved={handleDialogSaved}
      />
    </div>
  );
}
