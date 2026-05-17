"use client";

/**
 * Settings → SSO — SAML 2.0 / OIDC configuration for Enterprise plans.
 *
 * Console design language. Signal UI tokens only. All states handled.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/stores/app-store";
import { useFeatures } from "@/hooks/use-features";
import { api, APIError } from "@/lib/api";
import type { SSOConfig, SSOTestResult } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ShieldIcon,
  CheckCircleFillIcon,
  XCircleFillIcon,
  AlertIcon,
  LoaderIcon,
  TrashIcon,
  LockIcon,
  CopyIcon,
  CheckIcon,
} from "@/components/icons/nav-icons";
import { toast } from "@/components/toast";

// ─── Types ────────────────────────────────────────────────────────────

type ProviderType = "saml" | "oidc";

interface FormState {
  provider_type: ProviderType;
  metadata_url: string;
  metadata_xml: string;
  entity_id: string;
  acs_url: string;
  certificate: string;
  issuer_url: string;
  client_id: string;
  client_secret: string;
  enabled: boolean;
  enforce: boolean;
  default_role: string;
}

const emptyForm: FormState = {
  provider_type: "oidc",
  metadata_url: "",
  metadata_xml: "",
  entity_id: "",
  acs_url: "",
  certificate: "",
  issuer_url: "",
  client_id: "",
  client_secret: "",
  enabled: false,
  enforce: false,
  default_role: "developer",
};

// ─── Sub-components ───────────────────────────────────────────────────

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)] p-3">
      <p className="text-xs font-medium text-[var(--signal-fg-secondary)] mb-1">
        {label}
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs font-mono text-[var(--signal-fg-primary)] break-all">
          {value}
        </code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="shrink-0 rounded p-1 text-[var(--signal-fg-tertiary)] hover:text-[var(--signal-fg-accent)] hover:bg-[var(--signal-bg-accent-muted)] transition-colors"
        >
          {copied ? (
            <CheckIcon className="h-3.5 w-3.5 text-[var(--signal-fg-success)]" />
          ) : (
            <CopyIcon className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

function SSOUpgradeGate() {
  const router = useRouter();
  const { minPlanFor } = useFeatures();
  const plan = minPlanFor("sso");

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--signal-bg-warning-muted)]">
        <LockIcon className="h-8 w-8 text-[var(--signal-fg-warning)]" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-[var(--signal-fg-primary)]">
        SSO requires {plan} plan
      </h2>
      <p className="mt-2 max-w-sm text-sm text-[var(--signal-fg-secondary)]">
        Enterprise SSO with SAML/OIDC support is available on the {plan} plan
        and above.
      </p>
      <Button
        variant="primary"
        onClick={() => router.push("/settings/billing")}
        className="mt-6"
      >
        Upgrade to {plan}
      </Button>
    </div>
  );
}

function SSOLoading() {
  return (
    <div className="flex items-center justify-center py-24 animate-fade-in">
      <LoaderIcon className="h-6 w-6 animate-spin text-[var(--signal-fg-tertiary)]" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────

export default function SSOSettingsPage() {
  const token = useAppStore((s) => s.token);
  const { isEnabled } = useFeatures();

  const [config, setConfig] = useState<SSOConfig | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<SSOTestResult | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!isEnabled("sso")) return <SSOUpgradeGate />;

  const loadConfig = useCallback(async () => {
    if (!token) return;
    try {
      const cfg = await api.getSSOConfig(token);
      setConfig(cfg);
      setForm({
        provider_type: cfg.provider_type,
        metadata_url: cfg.metadata_url || "",
        metadata_xml: "",
        entity_id: cfg.entity_id || "",
        acs_url: cfg.acs_url || "",
        certificate: "",
        issuer_url: cfg.issuer_url || "",
        client_id: cfg.client_id || "",
        client_secret: "",
        enabled: cfg.enabled,
        enforce: cfg.enforce,
        default_role: cfg.default_role || "developer",
      });
    } catch (e) {
      if (e instanceof APIError && e.status === 404) setConfig(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const updateForm = (key: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSuccess("");
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const body: Record<string, unknown> = {
        provider_type: form.provider_type,
        enabled: form.enabled,
        enforce: form.enforce,
        default_role: form.default_role,
      };

      if (form.provider_type === "saml") {
        body.metadata_url = form.metadata_url;
        if (form.metadata_xml) body.metadata_xml = form.metadata_xml;
        body.entity_id = form.entity_id;
        body.acs_url = form.acs_url;
        if (form.certificate) body.certificate = form.certificate;
      } else {
        body.issuer_url = form.issuer_url;
        body.client_id = form.client_id;
        if (form.client_secret) body.client_secret = form.client_secret;
      }

      const saved = await api.upsertSSOConfig(token, body);
      setConfig(saved);
      setSuccess("SSO configuration saved successfully.");
      setTestResult(null);
      toast("SSO configuration saved", "success");
    } catch (e) {
      const msg = e instanceof APIError ? e.message : "Failed to save SSO configuration";
      setError(msg);
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!token) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await api.testSSOConnection(token);
      setTestResult(result);
    } catch (e) {
      setTestResult({
        success: false,
        message: e instanceof APIError ? e.message : "Connection test failed",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !confirm("Remove SSO configuration? Users will need email/password login.")) return;
    setError("");
    try {
      await api.deleteSSOConfig(token);
      setConfig(null);
      setForm(emptyForm);
      setSuccess("SSO configuration removed.");
      setTestResult(null);
      toast("SSO configuration removed", "success");
    } catch (e) {
      const msg = e instanceof APIError ? e.message : "Failed to delete SSO configuration";
      setError(msg);
      toast(msg, "error");
    }
  };

  if (loading) return <SSOLoading />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--signal-fg-primary)]">
            Single Sign-On (SSO)
          </h2>
          <p className="mt-1 text-sm text-[var(--signal-fg-secondary)]">
            Configure SAML 2.0 or OpenID Connect for your organization.
          </p>
        </div>
        {config && (
          <Button variant="ghost" size="sm" onClick={handleDelete}>
            <TrashIcon className="mr-1.5 h-4 w-4" />
            Remove
          </Button>
        )}
      </div>

      {/* Status messages */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-[var(--signal-border-danger-emphasis)]/30 bg-[var(--signal-bg-danger-muted)] p-3 text-sm text-[var(--signal-fg-danger)]">
          <XCircleFillIcon className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-[var(--signal-border-success-muted)] bg-[var(--signal-bg-success-muted)] p-3 text-sm text-[var(--signal-fg-success)]">
          <CheckCircleFillIcon className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      <Card className="p-5">
        <div className="space-y-5">
          {/* Provider type */}
          <div>
            <Label className="text-sm font-medium">Identity Provider Protocol</Label>
            <div className="mt-2 flex gap-3">
              {(["oidc", "saml"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => updateForm("provider_type", type)}
                  className={cn(
                    "flex-1 rounded-lg border-2 p-4 text-left transition-all",
                    form.provider_type === type
                      ? "border-[var(--signal-fg-accent)] bg-[var(--signal-bg-accent-muted)]"
                      : "border-[var(--signal-border-default)] hover:border-[var(--signal-border-emphasis)]",
                  )}
                >
                  <div className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                    {type === "oidc" ? "OpenID Connect" : "SAML 2.0"}
                  </div>
                  <div className="mt-0.5 text-xs text-[var(--signal-fg-secondary)]">
                    {type === "oidc"
                      ? "Okta, Google Workspace, Azure AD, Auth0"
                      : "Okta, OneLogin, PingFederate, ADFS"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-4">
            {form.provider_type === "oidc" ? (
              <>
                <div>
                  <Label htmlFor="issuer_url">Issuer URL</Label>
                  <Input id="issuer_url" placeholder="https://accounts.google.com" value={form.issuer_url} onChange={(e) => updateForm("issuer_url", e.target.value)} className="mt-1.5" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="client_id">Client ID</Label>
                    <Input id="client_id" value={form.client_id} onChange={(e) => updateForm("client_id", e.target.value)} className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="client_secret">Client Secret</Label>
                    <Input id="client_secret" type="password" placeholder={config?.has_client_secret ? "••••••••" : ""} value={form.client_secret} onChange={(e) => updateForm("client_secret", e.target.value)} className="mt-1.5" />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label htmlFor="metadata_url">IdP Metadata URL</Label>
                  <Input id="metadata_url" placeholder="https://idp.example.com/metadata" value={form.metadata_url} onChange={(e) => updateForm("metadata_url", e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="metadata_xml">IdP Metadata XML (optional)</Label>
                  <textarea id="metadata_xml" rows={4} placeholder="Paste IdP metadata XML here..." value={form.metadata_xml} onChange={(e) => updateForm("metadata_xml", e.target.value)} className="mt-1.5 w-full rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] px-3 py-2 text-sm font-mono focus:border-[var(--signal-fg-accent)] focus:ring-1 focus:ring-[var(--signal-fg-accent)] focus:outline-none" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label htmlFor="entity_id">Entity ID</Label><Input id="entity_id" value={form.entity_id} onChange={(e) => updateForm("entity_id", e.target.value)} className="mt-1.5" /></div>
                  <div><Label htmlFor="acs_url">SSO URL (ACS)</Label><Input id="acs_url" value={form.acs_url} onChange={(e) => updateForm("acs_url", e.target.value)} className="mt-1.5" /></div>
                </div>
                <div>
                  <Label htmlFor="certificate">IdP Certificate (PEM)</Label>
                  <textarea id="certificate" rows={3} placeholder="-----BEGIN CERTIFICATE-----..." value={form.certificate} onChange={(e) => updateForm("certificate", e.target.value)} className="mt-1.5 w-full rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] px-3 py-2 text-sm font-mono focus:border-[var(--signal-fg-accent)] focus:ring-1 focus:ring-[var(--signal-fg-accent)] focus:outline-none" />
                </div>
              </>
            )}
          </div>

          {/* Common settings */}
          <div className="border-t border-[var(--signal-border-default)] pt-5">
            <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-3">Settings</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="default_role">Default Role for New SSO Users</Label>
                <select id="default_role" value={form.default_role} onChange={(e) => updateForm("default_role", e.target.value)} className="mt-1.5 w-full sm:w-48 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] px-3 py-2 text-sm focus:border-[var(--signal-fg-accent)] focus:ring-1 focus:ring-[var(--signal-fg-accent)] focus:outline-none">
                  <option value="developer">Developer</option>
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <label className="flex items-center gap-3 py-1 cursor-pointer">
                <input type="checkbox" checked={form.enabled} onChange={(e) => updateForm("enabled", e.target.checked)} className="h-4 w-4 rounded border-[var(--signal-border-default)] text-[var(--signal-fg-accent)] focus:ring-[var(--signal-fg-accent)]" />
                <div>
                  <span className="text-sm font-medium text-[var(--signal-fg-primary)]">Enable SSO</span>
                  <p className="text-xs text-[var(--signal-fg-tertiary)]">Allow team members to sign in via your identity provider.</p>
                </div>
              </label>

              <label className="flex items-center gap-3 py-1 cursor-pointer">
                <input type="checkbox" checked={form.enforce} onChange={(e) => updateForm("enforce", e.target.checked)} className="h-4 w-4 rounded border-[var(--signal-border-default)] text-[var(--signal-fg-accent)] focus:ring-[var(--signal-fg-accent)]" />
                <div>
                  <span className="text-sm font-medium text-[var(--signal-fg-primary)]">Enforce SSO</span>
                  <p className="text-xs text-[var(--signal-fg-tertiary)]">Block email/password login for all members. Owners retain break-glass access.</p>
                </div>
              </label>

              {form.enforce && (
                <div className="flex items-start gap-2 rounded-lg border border-[var(--signal-border-warning-muted)] bg-[var(--signal-bg-warning-muted)] p-3">
                  <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--signal-fg-warning)]" />
                  <p className="text-xs text-[var(--signal-fg-secondary)]">Test your SSO configuration before enabling enforcement.</p>
                </div>
              )}
            </div>
          </div>

          {/* Test result */}
          {testResult && (
            <div className={cn("flex items-center gap-2 rounded-lg border p-3 text-sm", testResult.success ? "border-[var(--signal-border-success-muted)] bg-[var(--signal-bg-success-muted)] text-[var(--signal-fg-success)]" : "border-[var(--signal-border-danger-emphasis)]/30 bg-[var(--signal-bg-danger-muted)] text-[var(--signal-fg-danger)]")}>
              {testResult.success ? <CheckCircleFillIcon className="h-4 w-4 shrink-0" /> : <XCircleFillIcon className="h-4 w-4 shrink-0" />}
              {testResult.message}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 border-t border-[var(--signal-border-default)] pt-5">
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving && <LoaderIcon className="mr-1.5 h-4 w-4 animate-spin" />}
              {config ? "Update Configuration" : "Save Configuration"}
            </Button>
            {config && (
              <Button variant="secondary" onClick={handleTest} disabled={testing}>
                {testing ? <LoaderIcon className="mr-1.5 h-4 w-4 animate-spin" /> : <ShieldIcon className="mr-1.5 h-4 w-4" />}
                Test Connection
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* SP Info */}
      {config && form.provider_type === "saml" && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)]">Service Provider Details</h3>
          <p className="mt-1 text-xs text-[var(--signal-fg-secondary)]">Use these values when configuring FeatureSignals in your IdP.</p>
          <div className="mt-3 space-y-2">
            <CopyField label="SP Entity ID / Metadata URL" value={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/v1/sso/saml/metadata/${useAppStore.getState().organization?.slug || "your-org"}`} />
            <CopyField label="ACS URL (Assertion Consumer Service)" value={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/v1/sso/saml/acs/${useAppStore.getState().organization?.slug || "your-org"}`} />
          </div>
        </Card>
      )}
    </div>
  );
}
