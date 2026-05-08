"use client";

import { useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/stores/app-store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/icons/nav-icons";

// ─── Copy Button ────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="shrink-0 rounded-lg bg-[var(--signal-bg-secondary)] hover:bg-[var(--signal-bg-secondary)] p-1.5 text-[var(--signal-fg-tertiary)] hover:text-[var(--signal-fg-secondary)] transition-all"
      title="Copy to clipboard"
    >
      {copied ? (
        <CheckIcon className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <CopyIcon className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

// ─── Code Block ──────────────────────────────────────────────────────

function CodeBlock({
  code,
  language = "bash",
}: {
  code: string;
  language?: string;
}) {
  return (
    <div className="group relative rounded-xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-inverse)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-stone-700/50 bg-stone-800/50">
        <span className="text-[10px] font-mono font-medium text-[var(--signal-fg-tertiary)] uppercase tracking-wider">
          {language}
        </span>
        <CopyButton text={code} />
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
        <code className="font-mono text-stone-200">{code}</code>
      </pre>
    </div>
  );
}

// ─── LD Importer Section ────────────────────────────────────────────

function LDImporterCard() {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const [apiToken, setApiToken] = useState("");
  const [project, setProject] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

  async function handleImport() {
    if (!token || !projectId) {
      toast("Select a project first", "error");
      return;
    }
    if (!apiToken.trim() || !project.trim()) {
      toast("LaunchDarkly API token and project key are required", "error");
      return;
    }

    setImporting(true);
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/v1/import/launchdarkly`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          project_id: projectId,
          ld_api_token: apiToken.trim(),
          ld_project_key: project.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setResult({
        success: true,
        message: data.message || "Import completed successfully.",
      });
      toast(
        "Migration initiated — check the audit log for progress",
        "success",
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Import failed";
      setResult({ success: false, message: msg });
      toast(msg, "error");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 shrink-0">
            <ArrowLeftRightIcon className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <CardTitle>LaunchDarkly Importer</CardTitle>
            <CardDescription>
              Migrate your flags, environments, segments, and targeting rules
              from LaunchDarkly in one click.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-2.5">
            <AlertIcon className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-800">
                What gets imported
              </p>
              <ul className="mt-1 text-xs text-amber-700 space-y-0.5">
                <li>• Feature flags with all variations and prerequisites</li>
                <li>
                  • Per-environment targeting rules and percentage rollouts
                </li>
                <li>• Custom segments and user targetting conditions</li>
                <li className="font-medium text-amber-800">
                  Note: SDK usage metrics and audit history are not migrated.
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
              LaunchDarkly API Token
            </label>
            <div className="relative">
              <KeyIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--signal-fg-tertiary)]" />
              <Input
                type="password"
                placeholder="api-XXXXXXXXXXXXXXXXXXXXX"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                className="pl-9"
              />
            </div>
            <p className="text-xs text-[var(--signal-fg-tertiary)] mt-1">
              Generate a <strong>Service Token</strong> from LaunchDarkly
              Settings &rarr; Authorizations.
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
              LaunchDarkly Project Key
            </label>
            <div className="relative">
              <GlobeIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--signal-fg-tertiary)]" />
              <Input
                type="text"
                placeholder="default"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="pl-9"
              />
            </div>
            <p className="text-xs text-[var(--signal-fg-tertiary)] mt-1">
              Found in LaunchDarkly Project Settings under the
              &ldquo;KeyIcon&rdquo;ldquo;Key&ldquo;KeyIcon&rdquo;rdquo; field.
            </p>
          </div>
        </div>

        <Button
          onClick={handleImport}
          disabled={importing || !apiToken.trim() || !project.trim()}
          loading={importing}
          className="h-11"
          fullWidth
        >
          {importing ? "Importing..." : "Start Migration"}
        </Button>

        {result && (
          <div
            className={cn(
              "rounded-xl border p-4 text-sm",
              result.success
                ? "border-[var(--signal-border-success-muted)] bg-emerald-50 text-[var(--signal-fg-success)]"
                : "border-red-200 bg-[var(--signal-bg-danger-muted)] text-red-700",
            )}
          >
            <div className="flex items-start gap-2.5">
              {result.success ? (
                <CheckCircleFillIcon className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
              ) : (
                <AlertIcon className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
              )}
              <p>{result.message}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Terraform Section ──────────────────────────────────────────────

function TerraformCard() {
  const projectId = useAppStore((s) => s.currentProjectId);

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
  description   = "Controls visibility of the new feature"
  flag_type     = "boolean"
  default_value = "false"
  tags          = ["team:frontend", "sprint:42"]

  environments = [
    {
      key     = "production"
      enabled = false
    },
    {
      key     = "staging"
      enabled = true
    }
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
            <CardDescription>
              Manage FeatureSignals flags as infrastructure code using HashiCorp
              Terraform.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="primary">featuresignals_flag</Badge>
          <Badge variant="info">featuresignals_flags (data source)</Badge>
          <Badge variant="default">v0.1.0</Badge>
          <Badge variant="success">Apache 2.0</Badge>
        </div>

        <p className="text-sm text-[var(--signal-fg-secondary)] leading-relaxed">
          The official Terraform provider enables full GitOps workflows — manage
          flags, environments, and targeting rules alongside your
          infrastructure. Supports import, drift detection, and JSON validation.
        </p>

        <CodeBlock code={terraformSnippet} language="hcl" />

        <div className="flex flex-wrap gap-2">
          <a
            href="https://registry.terraform.io/providers/featuresignals"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--signal-border-default)] px-3.5 py-2 text-sm font-semibold text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-primary)] transition-colors"
          >
            <ExternalLinkIcon className="h-3.5 w-3.5" />
            Terraform Registry
          </a>
          <a
            href="https://github.com/featuresignals/terraform-fs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--signal-border-default)] px-3.5 py-2 text-sm font-semibold text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-primary)] transition-colors"
          >
            <GitPullRequestIcon className="h-3.5 w-3.5" />
            GitHub
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Edge Relay Section ─────────────────────────────────────────────

function EdgeRelayCard() {
  const [status] = useState<"operational" | "degraded" | "offline">(
    "operational",
  );

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
            <CardDescription>
              Sub-millisecond flag evaluation via Redis stream replication
              across global edge nodes.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span
                  className={cn(
                    "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                    status === "operational" && "bg-emerald-400",
                    status === "degraded" && "bg-amber-400",
                    status === "offline" && "bg-red-400",
                  )}
                />
                <span
                  className={cn(
                    "relative inline-flex h-3 w-3 rounded-full",
                    status === "operational" && "bg-emerald-500",
                    status === "degraded" && "bg-amber-500",
                    status === "offline" && "bg-[var(--signal-bg-danger-muted)]0",
                  )}
                />
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--signal-fg-primary)] capitalize">
                  {status}
                </p>
                <p className="text-xs text-[var(--signal-fg-tertiary)]">
                  P99 latency:{" "}
                  <span className="font-mono text-[var(--signal-fg-success)] font-semibold">
                    &lt;1ms
                  </span>
                </p>
              </div>
            </div>
            <Badge variant="success">Active</Badge>
          </div>
        </div>

        <p className="text-sm text-[var(--signal-fg-secondary)] leading-relaxed">
          Edge Relay nodes cache feature flag rulesets in-memory and subscribe
          to real-time updates via Redis{" "}
          <code className="text-[var(--signal-fg-accent)] font-mono text-xs">
            LISTEN/NOTIFY
          </code>
          . No database dependency on the evaluation hot path — every evaluation
          is served from RAM.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[var(--signal-border-default)] bg-white p-3 text-center">
            <p className="text-lg font-bold text-[var(--signal-fg-success)]">
              0 ms
            </p>
            <p className="text-xs text-[var(--signal-fg-secondary)]">
              DB Hit Latency
            </p>
          </div>
          <div className="rounded-xl border border-[var(--signal-border-default)] bg-white p-3 text-center">
            <p className="text-lg font-bold text-[var(--signal-fg-accent)]">
              Redis
            </p>
            <p className="text-xs text-[var(--signal-fg-secondary)]">
              Stream Replication
            </p>
          </div>
        </div>

        <CodeBlock code={edgeSnippet} language="bash" />

        <a
          href="https://docs.featuresignals.com/architecture/edge-relay"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--signal-fg-accent)] hover:text-[var(--signal-fg-accent)] transition-colors"
        >
          Edge Relay Documentation
          <ExternalLinkIcon className="h-3.5 w-3.5" />
        </a>
      </CardContent>
    </Card>
  );
}

// ─── API Key Helper ─────────────────────────────────────────────────

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
            <CardDescription>
              API key, base URL, and SDK configuration for all integrations.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between rounded-lg bg-[var(--signal-bg-primary)] border border-[var(--signal-border-default)] px-3.5 py-2.5">
          <span className="text-xs font-semibold text-[var(--signal-fg-secondary)] uppercase tracking-wider">
            API Base URL
          </span>
          <div className="flex items-center gap-2">
            <code className="text-sm font-mono text-[var(--signal-fg-accent)]">
              https://api.featuresignals.com
            </code>
            <CopyButton text="https://api.featuresignals.com" />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-[var(--signal-bg-primary)] border border-[var(--signal-border-default)] px-3.5 py-2.5">
          <span className="text-xs font-semibold text-[var(--signal-fg-secondary)] uppercase tracking-wider">
            SDK Endpoint
          </span>
          <div className="flex items-center gap-2">
            <code className="text-sm font-mono text-[var(--signal-fg-accent)]">
              https://sdk.featuresignals.com
            </code>
            <CopyButton text="https://sdk.featuresignals.com" />
          </div>
        </div>
        <Link
          href="/api-keys"
          className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--signal-fg-accent)] hover:text-[var(--signal-fg-accent)] transition-colors mt-1"
        >
          Manage API keys
          <ChevronRightIcon className="h-3.5 w-3.5" />
        </Link>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────

export default function IntegrationsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--signal-fg-primary)] flex items-center gap-2">
          🧩 Integrations
        </h1>
        <p className="text-sm text-[var(--signal-fg-secondary)] mt-1 max-w-2xl leading-relaxed">
          Connect FeatureSignals with your existing toolchain — import from
          other providers, manage flags as code, or deploy edge nodes for
          sub-millisecond evaluation.
        </p>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 gap-6">
        {/* LaunchDarkly Importer */}
        <LDImporterCard />

        {/* Terraform Provider */}
        <TerraformCard />

        {/* Edge Data Plane */}
        <EdgeRelayCard />

        {/* Quick Access */}
        <APIKeyHelper />
      </div>
    </div>
  );
}
