"use client";

/**
 * Settings → Integrations — LD importer, Terraform, Edge Relay, API keys.
 *
 * Console design language. Signal UI tokens only.
 */

import { useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/stores/app-store";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "@/components/toast";
import {
  ArrowLeftRightIcon,
  CloudIcon,
  ServerIcon,
  CheckCircleFillIcon,
  ExternalLinkIcon,
  CopyIcon,
  ChevronRightIcon,
  AlertIcon,
  GitPullRequestIcon,
  CheckIcon,
  KeyIcon,
  GlobeIcon,
  LoaderIcon,
} from "@/components/icons/nav-icons";

// ─── Copy Button ──────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="shrink-0 rounded-lg bg-[var(--signal-bg-secondary)] p-1.5 text-[var(--signal-fg-tertiary)] hover:text-[var(--signal-fg-secondary)] transition-all"
      title="Copy to clipboard"
    >
      {copied ? <CheckIcon className="h-3.5 w-3.5 text-[var(--signal-fg-success)]" /> : <CopyIcon className="h-3.5 w-3.5" />}
    </button>
  );
}

// ─── Code Block ────────────────────────────────────────────────────────

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  return (
    <div className="group relative rounded-xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-inverse)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--signal-border-default)]/20 bg-[var(--signal-bg-inverse)]/50">
        <span className="text-[10px] font-mono font-medium text-[var(--signal-fg-tertiary)] uppercase tracking-wider">{language}</span>
        <CopyButton text={code} />
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
        <code className="font-mono text-[var(--signal-fg-on-emphasis)]">{code}</code>
      </pre>
    </div>
  );
}

// ─── LD Importer ──────────────────────────────────────────────────────

function LDImporterCard() {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.current_project_id);
  const [apiToken, setApiToken] = useState("");
  const [project, setProject] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

  async function handleImport() {
    if (!token || !projectId) { toast("Select a project first", "error"); return; }
    if (!apiToken.trim() || !project.trim()) { toast("LaunchDarkly API token and project key are required", "error"); return; }

    setImporting(true);
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/v1/import/launchdarkly`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ project_id: projectId, ld_api_token: apiToken.trim(), ld_project_key: project.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setResult({ success: true, message: data.message || "Import completed successfully." });
      toast("Migration initiated — check the audit log for progress", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Import failed";
      setResult({ success: false, message: msg });
      toast(msg, "error");
    } finally { setImporting(false); }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--signal-bg-warning-muted)] shrink-0">
            <ArrowLeftRightIcon className="h-5 w-5 text-[var(--signal-fg-warning)]" />
          </div>
          <div>
            <CardTitle>LaunchDarkly Importer</CardTitle>
            <CardDescription>Migrate your flags, environments, segments, and targeting rules from LaunchDarkly in one click.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-[var(--signal-border-warning-muted)] bg-[var(--signal-bg-warning-muted)]/30 p-4">
          <div className="flex items-start gap-2.5">
            <AlertIcon className="h-4 w-4 text-[var(--signal-fg-warning)] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-[var(--signal-fg-primary)]">What gets imported</p>
              <ul className="mt-1 text-xs text-[var(--signal-fg-secondary)] space-y-0.5">
                <li>&bull; Feature flags with all variations and prerequisites</li>
                <li>&bull; Per-environment targeting rules and percentage rollouts</li>
                <li>&bull; Custom segments and user targeting conditions</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">LaunchDarkly API Token</label>
            <div className="relative">
              <KeyIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--signal-fg-tertiary)]" />
              <Input type="password" placeholder="api-XXXXXXXXXXXXXXXXXXXXX" value={apiToken} onChange={(e) => setApiToken(e.target.value)} className="pl-9" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">LaunchDarkly Project Key</label>
            <div className="relative">
              <GlobeIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--signal-fg-tertiary)]" />
              <Input type="text" placeholder="default" value={project} onChange={(e) => setProject(e.target.value)} className="pl-9" />
            </div>
          </div>
        </div>

        <Button onClick={handleImport} disabled={importing || !apiToken.trim() || !project.trim()} variant="primary" fullWidth>
          {importing ? <><LoaderIcon className="mr-2 h-4 w-4 animate-spin" />Importing...</> : "Start Migration"}
        </Button>

        {result && (
          <div className={cn("rounded-xl border p-4 text-sm", result.success ? "border-[var(--signal-border-success-muted)] bg-[var(--signal-bg-success-muted)] text-[var(--signal-fg-success)]" : "border-[var(--signal-border-danger-emphasis)]/30 bg-[var(--signal-bg-danger-muted)] text-[var(--signal-fg-danger)]")}>
            <div className="flex items-start gap-2.5">
              {result.success ? <CheckCircleFillIcon className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertIcon className="h-4 w-4 shrink-0 mt-0.5" />}
              <p>{result.message}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Terraform ─────────────────────────────────────────────────────────

function TerraformCard() {
  const projectId = useAppStore((s) => s.current_project_id);

  const terraformSnippet = `# provider.tf
terraform {
  required_providers {
    featuresignals = {
      source  = "registry.terraform.io/featuresignals/featuresignals"
      version = "~> 0.1.0"
    }
  }
}

provider "featuresignals" {
  api_key = var.featuresignals_api_key
  host    = "https://api.featuresignals.com"
}

resource "featuresignals_flag" "example" {
  project_id    = "${projectId || "proj_abc123"}"
  key           = "new-feature"
  name          = "New Feature"
  flag_type     = "boolean"
  default_value = "false"

  environments = [
    { key = "production", enabled = false },
    { key = "staging", enabled = true }
  ]
}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--signal-bg-accent-muted)] shrink-0">
            <CloudIcon className="h-5 w-5 text-[var(--signal-fg-accent)]" />
          </div>
          <div>
            <CardTitle>Terraform Provider</CardTitle>
            <CardDescription>Manage FeatureSignals flags as infrastructure code using HashiCorp Terraform.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {["featuresignals_flag", "featuresignals_flags (data source)", "v0.1.0", "Apache 2.0"].map((tag, i) => (
            <span key={tag} className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", i === 0 ? "bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)]" : i === 1 ? "bg-[var(--signal-bg-info-muted)] text-[var(--signal-fg-info)]" : i === 2 ? "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-secondary)]" : "bg-[var(--signal-bg-success-muted)] text-[var(--signal-fg-success)]")}>{tag}</span>
          ))}
        </div>
        <p className="text-sm text-[var(--signal-fg-secondary)] leading-relaxed">The official Terraform provider enables full GitOps workflows — manage flags, environments, and targeting rules alongside your infrastructure.</p>
        <CodeBlock code={terraformSnippet} language="hcl" />
        <div className="flex flex-wrap gap-2">
          <a href="https://registry.terraform.io/providers/featuresignals" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--signal-border-default)] px-3.5 py-2 text-sm font-semibold text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-secondary)] transition-colors"><ExternalLinkIcon className="h-3.5 w-3.5" />Terraform Registry</a>
          <a href="https://github.com/featuresignals/terraform-fs" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--signal-border-default)] px-3.5 py-2 text-sm font-semibold text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-secondary)] transition-colors"><GitPullRequestIcon className="h-3.5 w-3.5" />GitHub</a>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Edge Relay ────────────────────────────────────────────────────────

function EdgeRelayCard() {
  const [status] = useState<"operational" | "degraded" | "offline">("operational");

  const edgeSnippet = `# Start a relay node (Docker)
docker run -d \\
  --name fs-edge-relay \\
  -e FS_API_KEY="fs_api_xxxx" \\
  -e FS_REDIS_URL="redis://localhost:6379" \\
  -p 8081:8081 \\
  featuresignals/edge-relay:latest`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--signal-bg-success-muted)] shrink-0">
            <ServerIcon className="h-5 w-5 text-[var(--signal-fg-success)]" />
          </div>
          <div>
            <CardTitle>Edge Data Plane</CardTitle>
            <CardDescription>Sub-millisecond flag evaluation via Redis stream replication across global edge nodes.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", status === "operational" && "bg-[var(--signal-fg-success)]", status === "degraded" && "bg-[var(--signal-fg-warning)]", status === "offline" && "bg-[var(--signal-fg-danger)]")} />
                <span className={cn("relative inline-flex h-3 w-3 rounded-full", status === "operational" && "bg-[var(--signal-fg-success)]", status === "degraded" && "bg-[var(--signal-fg-warning)]", status === "offline" && "bg-[var(--signal-fg-danger)]")} />
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--signal-fg-primary)] capitalize">{status}</p>
                <p className="text-xs text-[var(--signal-fg-tertiary)]">P99 latency: <span className="font-mono text-[var(--signal-fg-success)] font-semibold">&lt;1ms</span></p>
              </div>
            </div>
            <span className="inline-flex items-center rounded-full bg-[var(--signal-bg-success-muted)] px-2.5 py-0.5 text-xs font-medium text-[var(--signal-fg-success)]">Active</span>
          </div>
        </div>
        <p className="text-sm text-[var(--signal-fg-secondary)] leading-relaxed">Edge Relay nodes cache feature flag rulesets in-memory and subscribe to real-time updates via Redis <code className="text-[var(--signal-fg-accent)] font-mono text-xs">LISTEN/NOTIFY</code>. No database dependency on the evaluation hot path.</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] p-3 text-center">
            <p className="text-lg font-bold text-[var(--signal-fg-success)]">0 ms</p>
            <p className="text-xs text-[var(--signal-fg-secondary)]">DB Hit Latency</p>
          </div>
          <div className="rounded-xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] p-3 text-center">
            <p className="text-lg font-bold text-[var(--signal-fg-accent)]">Redis</p>
            <p className="text-xs text-[var(--signal-fg-secondary)]">Stream Replication</p>
          </div>
        </div>
        <CodeBlock code={edgeSnippet} language="bash" />
        <a href="https://featuresignals.com/docs/architecture/edge-relay" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--signal-fg-accent)] hover:underline transition-colors">Edge Relay Documentation<ExternalLinkIcon className="h-3.5 w-3.5" /></a>
      </CardContent>
    </Card>
  );
}

// ─── API Key Helper ──────────────────────────────────────────────────

function APIKeyHelper() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--signal-bg-accent-muted)] shrink-0">
            <KeyIcon className="h-5 w-5 text-[var(--signal-fg-accent)]" />
          </div>
          <div>
            <CardTitle>Quick Access</CardTitle>
            <CardDescription>API key, base URL, and SDK configuration for all integrations.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {[
          { label: "API Base URL", value: "https://api.featuresignals.com" },
          { label: "SDK Endpoint", value: "https://sdk.featuresignals.com" },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between rounded-lg bg-[var(--signal-bg-primary)] border border-[var(--signal-border-default)] px-3.5 py-2.5">
            <span className="text-xs font-semibold text-[var(--signal-fg-secondary)] uppercase tracking-wider">{label}</span>
            <div className="flex items-center gap-2">
              <code className="text-sm font-mono text-[var(--signal-fg-accent)]">{value}</code>
              <CopyButton text={value} />
            </div>
          </div>
        ))}
        <Link href="/api-keys" className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--signal-fg-accent)] hover:underline transition-colors mt-1">Manage API keys<ChevronRightIcon className="h-3.5 w-3.5" /></Link>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────

export default function IntegrationsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--signal-fg-primary)]">
          Integrations
        </h1>
        <p className="text-sm text-[var(--signal-fg-secondary)] mt-1 max-w-2xl leading-relaxed">
          Connect FeatureSignals with your existing toolchain — import from other providers, manage flags as code, or ship edge nodes for sub-millisecond evaluation.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <LDImporterCard />
        <TerraformCard />
        <EdgeRelayCard />
        <APIKeyHelper />
      </div>
    </div>
  );
}
