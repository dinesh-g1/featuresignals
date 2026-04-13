"use client";

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
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Trash2,
  Lock,
} from "lucide-react";

type ProviderType = "saml" | "oidc";

interface FormState {
  provider_type: ProviderType;
  // SAML
  metadata_url: string;
  metadata_xml: string;
  entity_id: string;
  acs_url: string;
  certificate: string;
  // OIDC
  issuer_url: string;
  client_id: string;
  client_secret: string;
  // Common
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

function SSOUpgradeGate() {
  const router = useRouter();
  const { minPlanFor } = useFeatures();
  const plan = minPlanFor("sso");
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
        <Lock className="h-8 w-8 text-amber-500" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">
        SSO requires {plan} plan
      </h2>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        Enterprise SSO with SAML/OIDC support is available on the {plan} plan
        and above.
      </p>
      <Button
        onClick={() => router.push("/settings/billing")}
        className="mt-6 bg-indigo-600 hover:bg-indigo-700"
      >
        Upgrade to {plan}
      </Button>
    </div>
  );
}

export default function SSOSettingsPage() {
  const token = useAppStore((s) => s.token);
  const { isEnabled } = useFeatures();

  // Enforce SSO gate at the page level — redirects locked users to billing
  if (!isEnabled("sso")) {
    return <SSOUpgradeGate />;
  }

  const [config, setConfig] = useState<SSOConfig | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<SSOTestResult | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
      if (e instanceof APIError && e.status === 404) {
        setConfig(null);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

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
    } catch (e) {
      setError(
        e instanceof APIError ? e.message : "Failed to save SSO configuration",
      );
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
    if (
      !token ||
      !confirm(
        "Remove SSO configuration? Users will need to use email/password login.",
      )
    )
      return;
    setError("");
    try {
      await api.deleteSSOConfig(token);
      setConfig(null);
      setForm(emptyForm);
      setSuccess("SSO configuration removed.");
      setTestResult(null);
    } catch (e) {
      setError(
        e instanceof APIError
          ? e.message
          : "Failed to delete SSO configuration",
      );
    }
  };

  const updateForm = (key: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSuccess("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Single Sign-On (SSO)
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Configure SAML 2.0 or OpenID Connect for your organization.
          </p>
        </div>
        {config && (
          <Button variant="ghost" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-1.5 h-4 w-4" />
            Remove
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <XCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      <Card className="p-5">
        <div className="space-y-5">
          {/* Provider type selection */}
          <div>
            <Label className="text-sm font-medium">
              Identity Provider Protocol
            </Label>
            <div className="mt-2 flex gap-3">
              {(["oidc", "saml"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => updateForm("provider_type", type)}
                  className={cn(
                    "flex-1 rounded-lg border-2 p-4 text-left transition-all",
                    form.provider_type === type
                      ? "border-indigo-500 bg-indigo-50/50"
                      : "border-slate-200 hover:border-slate-300",
                  )}
                >
                  <div className="text-sm font-semibold text-slate-900">
                    {type === "oidc" ? "OpenID Connect" : "SAML 2.0"}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {type === "oidc"
                      ? "Okta, Google Workspace, Azure AD, Auth0"
                      : "Okta, OneLogin, PingFederate, ADFS"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* OIDC fields */}
          {form.provider_type === "oidc" && (
            <>
              <div>
                <Label htmlFor="issuer_url">Issuer URL</Label>
                <Input
                  id="issuer_url"
                  placeholder="https://accounts.google.com or https://your-org.okta.com"
                  value={form.issuer_url}
                  onChange={(e) => updateForm("issuer_url", e.target.value)}
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-slate-400">
                  The OpenID Connect discovery endpoint
                  (/.well-known/openid-configuration will be appended)
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="client_id">Client ID</Label>
                  <Input
                    id="client_id"
                    value={form.client_id}
                    onChange={(e) => updateForm("client_id", e.target.value)}
                    className="mt-1"
                  />
                  {config?.has_client_secret && !form.client_secret && (
                    <p className="mt-1 text-xs text-slate-400">
                      Client ID is set
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="client_secret">Client Secret</Label>
                  <Input
                    id="client_secret"
                    type="password"
                    placeholder={config?.has_client_secret ? "••••••••" : ""}
                    value={form.client_secret}
                    onChange={(e) =>
                      updateForm("client_secret", e.target.value)
                    }
                    className="mt-1"
                  />
                  {config?.has_client_secret && !form.client_secret && (
                    <p className="mt-1 text-xs text-slate-400">
                      Leave blank to keep existing secret
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* SAML fields */}
          {form.provider_type === "saml" && (
            <>
              <div>
                <Label htmlFor="metadata_url">IdP Metadata URL</Label>
                <Input
                  id="metadata_url"
                  placeholder="https://idp.example.com/metadata"
                  value={form.metadata_url}
                  onChange={(e) => updateForm("metadata_url", e.target.value)}
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-slate-400">
                  URL to your IdP&apos;s SAML metadata. Alternatively, paste
                  metadata XML below.
                </p>
              </div>
              <div>
                <Label htmlFor="metadata_xml">
                  IdP Metadata XML (optional)
                </Label>
                <textarea
                  id="metadata_xml"
                  rows={4}
                  placeholder="Paste IdP metadata XML here..."
                  value={form.metadata_xml}
                  onChange={(e) => updateForm("metadata_xml", e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
                {config?.has_metadata_xml && !form.metadata_xml && (
                  <p className="mt-1 text-xs text-slate-400">
                    Metadata XML is already stored. Leave blank to keep.
                  </p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="entity_id">Entity ID</Label>
                  <Input
                    id="entity_id"
                    value={form.entity_id}
                    onChange={(e) => updateForm("entity_id", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="acs_url">SSO URL</Label>
                  <Input
                    id="acs_url"
                    value={form.acs_url}
                    onChange={(e) => updateForm("acs_url", e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="certificate">IdP Certificate (PEM)</Label>
                <textarea
                  id="certificate"
                  rows={3}
                  placeholder="-----BEGIN CERTIFICATE-----..."
                  value={form.certificate}
                  onChange={(e) => updateForm("certificate", e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
                {config?.has_certificate && !form.certificate && (
                  <p className="mt-1 text-xs text-slate-400">
                    Certificate is already stored. Leave blank to keep.
                  </p>
                )}
              </div>
            </>
          )}

          {/* Common settings */}
          <div className="border-t border-slate-200 pt-5">
            <h3 className="text-sm font-semibold text-slate-900">Settings</h3>
            <div className="mt-3 space-y-3">
              <div>
                <Label htmlFor="default_role">
                  Default Role for New SSO Users
                </Label>
                <select
                  id="default_role"
                  value={form.default_role}
                  onChange={(e) => updateForm("default_role", e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none sm:w-48"
                >
                  <option value="developer">Developer</option>
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                </select>
                <p className="mt-1 text-xs text-slate-400">
                  Role assigned to users who sign in via SSO for the first time.
                </p>
              </div>

              <label className="flex items-center gap-3 py-1">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => updateForm("enabled", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-sm font-medium text-slate-900">
                    Enable SSO
                  </span>
                  <p className="text-xs text-slate-400">
                    Allow team members to sign in via your identity provider.
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 py-1">
                <input
                  type="checkbox"
                  checked={form.enforce}
                  onChange={(e) => updateForm("enforce", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-sm font-medium text-slate-900">
                    Enforce SSO
                  </span>
                  <p className="text-xs text-slate-400">
                    Block email/password login for all members. Organization
                    owners can still use password login as a break-glass
                    mechanism.
                  </p>
                </div>
              </label>

              {form.enforce && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <p className="text-xs text-amber-800">
                    When enforcement is enabled, all non-owner members must use
                    SSO. Test your SSO configuration before enabling
                    enforcement.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Test result */}
          {testResult && (
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg border p-3 text-sm",
                testResult.success
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700",
              )}
            >
              {testResult.success ? (
                <CheckCircle className="h-4 w-4 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0" />
              )}
              {testResult.message}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 border-t border-slate-200 pt-5">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {config ? "Update Configuration" : "Save Configuration"}
            </Button>
            {config && (
              <Button
                variant="secondary"
                onClick={handleTest}
                disabled={testing}
              >
                {testing ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="mr-1.5 h-4 w-4" />
                )}
                Test Connection
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* SP info for admins configuring IdP */}
      {config && form.provider_type === "saml" && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-900">
            Service Provider Details
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Use these values when configuring FeatureSignals in your Identity
            Provider.
          </p>
          <div className="mt-3 space-y-2">
            <CopyField
              label="SP Entity ID / Metadata URL"
              value={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/v1/sso/saml/metadata/${useAppStore.getState().organization?.slug || "your-org"}`}
            />
            <CopyField
              label="ACS URL (Assertion Consumer Service)"
              value={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/v1/sso/saml/acs/${useAppStore.getState().organization?.slug || "your-org"}`}
            />
          </div>
        </Card>
      )}

      {config && form.provider_type === "oidc" && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-900">
            OIDC Redirect URI
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Add this redirect URI to your OIDC application settings.
          </p>
          <div className="mt-3">
            <CopyField
              label="Redirect URI"
              value={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/v1/sso/oidc/callback/${useAppStore.getState().organization?.slug || "your-org"}`}
            />
          </div>
        </Card>
      )}
    </div>
  );
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <code className="flex-1 rounded bg-slate-100 px-3 py-1.5 text-xs text-slate-700 select-all">
          {value}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
