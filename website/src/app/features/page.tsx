"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  Cloud,
  Code,
  Flag,
  FlaskConical,
  Layers,
  Link2,
  Radio,
  Search,
  ShieldCheck,
  Tag,
  Users,
} from "lucide-react";
import { CodeTabs } from "@/components/code-tabs";
import { SectionReveal } from "@/components/section-reveal";

const FEATURES: {
  title: string;
  description: string;
  icon: LucideIcon;
  code: { lang: string; label: string; code: string }[];
}[] = [
  {
    title: "Flag Engine",
    description:
      "Boolean, string, number, JSON, and A/B flag types. Percentage rollouts with MurmurHash3 consistent hashing. User targeting with 13 operators. Segment-based rules with AND/OR logic.",
    icon: Flag,
    code: [
      {
        lang: "curl",
        label: "cURL",
        code: `curl -X POST https://api.featuresignals.com/v1/evaluate \\
  -H "X-API-Key: sdk-abc123" \\
  -d '{
    "flag_key": "checkout-redesign",
    "context": {
      "key": "user-42",
      "attributes": { "plan": "pro", "country": "IN" }
    }
  }'

# Response:
# { "key": "checkout-redesign", "value": true,
#   "reason": "TARGETING_MATCH", "variant": "on" }`,
      },
      {
        lang: "go",
        label: "Go",
        code: `client := fs.NewClient("YOUR_API_KEY")
defer client.Close()

enabled := client.IsEnabled("checkout-redesign",
    fs.User{Key: "user-42", Attributes: map[string]any{
        "plan": "pro", "country": "IN",
    }})

if enabled {
    renderNewCheckout()
}`,
      },
      {
        lang: "node",
        label: "Node.js",
        code: `import { FeatureSignals } from "@featuresignals/sdk";

const client = new FeatureSignals("YOUR_API_KEY");

const enabled = await client.isEnabled("checkout-redesign", {
  key: "user-42",
  attributes: { plan: "pro", country: "IN" },
});

if (enabled) renderNewCheckout();`,
      },
      {
        lang: "python",
        label: "Python",
        code: `from featuresignals import FeatureSignals

client = FeatureSignals("YOUR_API_KEY")

if client.is_enabled("checkout-redesign",
    {"key": "user-42", "plan": "pro", "country": "IN"}):
    render_new_checkout()`,
      },
    ],
  },
  {
    title: "A/B Experimentation",
    description:
      "Built-in variant assignment with weighted splits. Consistent hashing ensures the same user always sees the same variant. Impression tracking API for analytics. Per-environment variant weights.",
    icon: FlaskConical,
    code: [
      {
        lang: "node",
        label: "Node.js",
        code: `const variant = await client.getStringDetails(
  "pricing-experiment",
  "control",
  { key: "user-42" }
);

// variant.value  => "treatment-a" or "control"
// variant.reason => "SPLIT"

analytics.track("pricing_page_view", {
  variant: variant.value,
  flagKey: "pricing-experiment",
});`,
      },
      {
        lang: "react",
        label: "React",
        code: `import { useStringFlagDetails } from "@featuresignals/react";

function PricingPage() {
  const { value, reason } = useStringFlagDetails(
    "pricing-experiment", "control"
  );

  return value === "treatment-a"
    ? <NewPricing />
    : <CurrentPricing />;
}`,
      },
      {
        lang: "curl",
        label: "cURL",
        code: `# Track an impression
curl -X POST https://api.featuresignals.com/v1/track \\
  -H "X-API-Key: sdk-abc123" \\
  -d '{
    "flag_key": "pricing-experiment",
    "variant": "treatment-a",
    "context_key": "user-42",
    "event": "page_view"
  }'`,
      },
    ],
  },
  {
    title: "Mutual Exclusion Groups",
    description:
      "Prevent experiment interference by grouping flags that should never be active for the same user simultaneously. The evaluation engine deterministically selects a winner using consistent hashing.",
    icon: ArrowLeftRight,
    code: [
      {
        lang: "json",
        label: "API Response",
        code: `// POST /v1/evaluate with two mutually exclusive flags
// Only ONE will return "on" for any given user

{ "key": "banner-experiment",  "value": true,  "reason": "SPLIT" }
{ "key": "pricing-experiment", "value": false, "reason": "MUTUAL_EXCLUSION" }

// The hash ring guarantees deterministic, consistent
// assignment — same user always gets the same result.`,
      },
    ],
  },
  {
    title: "Multi-Environment",
    description:
      "Dev, staging, production, and custom environments. Per-environment flag states and targeting rules. Promote configurations between environments. Per-environment API keys.",
    icon: Layers,
    code: [
      {
        lang: "go",
        label: "Go",
        code: `// Different API keys per environment — same code, different config
devClient := fs.NewClient(os.Getenv("FS_DEV_KEY"))
prodClient := fs.NewClient(os.Getenv("FS_PROD_KEY"))

// Flag is ON in dev, 10% rollout in prod
devClient.IsEnabled("new-feature", user)  // true
prodClient.IsEnabled("new-feature", user) // depends on rollout`,
      },
      {
        lang: "promote",
        label: "Promote",
        code: `# Promote flag config from staging to production
curl -X POST https://api.featuresignals.com/v1/projects/proj-1/flags/new-feature/promote \\
  -H "Authorization: Bearer <token>" \\
  -d '{
    "source_env_id": "env-staging",
    "target_env_id": "env-production"
  }'`,
      },
    ],
  },
  {
    title: "SDKs for Every Stack",
    description:
      "Go, Node.js, Python, Java, C#, Ruby, React, and Vue SDKs. All implement OpenFeature providers for zero vendor lock-in. Local evaluation with zero-latency after init. SSE streaming for real-time updates.",
    icon: Code,
    code: [
      {
        lang: "go",
        label: "Go",
        code: `import fs "github.com/featuresignals/sdk-go"

client := fs.NewClient("YOUR_API_KEY")
defer client.Close()

if client.IsEnabled("dark-mode", fs.User{Key: "user-42"}) {
    enableDarkTheme()
}`,
      },
      {
        lang: "node",
        label: "Node.js",
        code: `import { FeatureSignals } from "@featuresignals/sdk";
const client = new FeatureSignals("YOUR_API_KEY");

if (await client.isEnabled("dark-mode", { key: "user-42" })) {
  enableDarkTheme();
}`,
      },
      {
        lang: "python",
        label: "Python",
        code: `from featuresignals import FeatureSignals
client = FeatureSignals("YOUR_API_KEY")

if client.is_enabled("dark-mode", {"key": "user-42"}):
    enable_dark_theme()`,
      },
      {
        lang: "react",
        label: "React",
        code: `import { FSProvider, useFlag } from "@featuresignals/react";

function App() {
  return (
    <FSProvider apiKey="YOUR_API_KEY" user={{ key: "user-42" }}>
      <ThemeSwitcher />
    </FSProvider>
  );
}

function ThemeSwitcher() {
  const darkMode = useFlag("dark-mode");
  return darkMode ? <DarkTheme /> : <LightTheme />;
}`,
      },
    ],
  },
  {
    title: "Relay Proxy",
    description:
      "A lightweight Go binary that caches flag values at the edge. Reduces latency, provides fault tolerance, and minimizes upstream API load. Syncs via SSE or polling.",
    icon: Radio,
    code: [
      {
        lang: "docker",
        label: "Docker",
        code: `docker run -d --name relay-proxy \\
  -p 8081:8081 \\
  -e FS_UPSTREAM=https://api.featuresignals.com \\
  -e FS_API_KEY=relay-key-abc123 \\
  -e FS_SYNC_MODE=sse \\
  featuresignals/relay-proxy:latest

# SDKs now connect to the relay instead of the API
# → Lower latency, offline resilience, reduced load`,
      },
      {
        lang: "sdk-config",
        label: "SDK Config",
        code: `const client = new FeatureSignals({
  apiKey: "YOUR_API_KEY",
  // Point to your relay proxy instead of the API
  baseUrl: "http://relay-proxy:8081",
});`,
      },
    ],
  },
  {
    title: "Enterprise Governance",
    description:
      "Tamper-evident audit logs with before/after diffs. Approval workflows for production changes. RBAC with owner/admin/developer/viewer roles. Per-environment toggle and rule-edit permissions.",
    icon: ShieldCheck,
    code: [
      {
        lang: "approval",
        label: "Approval Workflow",
        code: `# Request approval before enabling in production
curl -X POST https://api.featuresignals.com/v1/approvals \\
  -H "Authorization: Bearer <dev-token>" \\
  -d '{
    "flag_id": "flag-uuid",
    "env_id": "env-production",
    "change_type": "toggle",
    "payload": { "enabled": true }
  }'

# Admin reviews and approves
curl -X POST .../v1/approvals/{id}/review \\
  -H "Authorization: Bearer <admin-token>" \\
  -d '{ "action": "approve", "note": "LGTM" }'`,
      },
      {
        lang: "audit",
        label: "Audit Log",
        code: `{
  "action": "flag.state.updated",
  "actor": "dev@company.com",
  "timestamp": "2025-01-15T10:30:00Z",
  "before": { "enabled": false, "rollout": 0 },
  "after": { "enabled": true, "rollout": 10 },
  "flag_key": "new-checkout",
  "environment": "production"
}`,
      },
    ],
  },
  {
    title: "Kill Switch & Scheduling",
    description:
      "Emergency disable any flag with one click. Schedule flags to auto-enable or auto-disable at specific times. Background scheduler checks every 30 seconds with full audit trail.",
    icon: AlertTriangle,
    code: [
      {
        lang: "kill",
        label: "Kill Switch",
        code: `# Emergency disable — propagates to all SDKs in seconds
curl -X POST https://api.featuresignals.com/v1/projects/proj-1/flags/risky-feature/kill \\
  -H "Authorization: Bearer <token>" \\
  -d '{ "env_id": "env-production" }'

# Response: { "status": "killed", "flag_key": "risky-feature" }`,
      },
      {
        lang: "schedule",
        label: "Scheduled Toggle",
        code: `// PUT /v1/projects/{id}/flags/{key}/environments/{envId}
{
  "enabled": true,
  "schedule": {
    "enable_at": "2025-03-01T09:00:00Z",
    "disable_at": "2025-03-15T23:59:59Z"
  }
}
// Flag auto-enables on March 1 and auto-disables on March 15`,
      },
    ],
  },
  {
    title: "Webhooks & Integrations",
    description:
      "HTTP webhooks with HMAC-SHA256 signatures. Event filtering by type. Exponential retry with delivery logging. Integrate with Slack, CI/CD pipelines, or any HTTP endpoint.",
    icon: Link2,
    code: [
      {
        lang: "payload",
        label: "Webhook Payload",
        code: `{
  "event": "flag.state.updated",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "flag_key": "new-checkout",
    "environment": "production",
    "enabled": true,
    "rollout_percentage": 50,
    "actor": "admin@company.com"
  }
}
// Delivered with X-Signature: sha256=<hmac>`,
      },
      {
        lang: "create",
        label: "Create Webhook",
        code: `curl -X POST https://api.featuresignals.com/v1/webhooks \\
  -H "Authorization: Bearer <token>" \\
  -d '{
    "name": "Slack Notifications",
    "url": "https://hooks.slack.com/services/T.../B.../xxx",
    "events": ["flag.state.updated", "flag.created"],
    "secret": "whsec_my_secret_key"
  }'`,
      },
    ],
  },
  {
    title: "Stale Flag Scanner",
    description:
      "CLI tool that scans your codebase for flag references and reports stale (unused) flags. Integrates with CI/CD via --ci mode (exit code 1 on stale flags found). JSON and table output.",
    icon: Search,
    code: [
      {
        lang: "cli",
        label: "CLI Usage",
        code: `# Scan your codebase for stale flags
featuresignals scan --dir ./src --api-key $FS_API_KEY

# Output:
# FLAG KEY            STATUS    LAST EVALUATED
# old-banner          STALE     45 days ago
# checkout-v1         STALE     90 days ago
# dark-mode           ACTIVE    2 hours ago

# CI/CD mode — fails the build if stale flags exist
featuresignals scan --dir ./src --ci --api-key $FS_API_KEY`,
      },
    ],
  },
  {
    title: "Deploy Anywhere",
    description:
      "Docker Compose for quick start. Self-host on Hetzner, DigitalOcean, OVH, Vultr, or any VPS. Kubernetes-ready. Caddy for automatic HTTPS. Single Go binary with zero external dependencies beyond PostgreSQL.",
    icon: Cloud,
    code: [
      {
        lang: "compose",
        label: "Docker Compose",
        code: `# Clone and start in under 2 minutes
git clone https://github.com/dinesh-g1/featuresignals
cd featuresignals
docker compose up -d

# Services: API (8080), Flag Engine (3000), PostgreSQL (5432)
# Caddy reverse proxy with automatic HTTPS`,
      },
      {
        lang: "binary",
        label: "Single Binary",
        code: `# Or run the Go binary directly
export DATABASE_URL="postgres://user:pass@localhost/featuresignals"
export JWT_SECRET="your-secret"
./featuresignals-server

# Server starts on :8080
# Swagger at /docs, health at /health`,
      },
    ],
  },
  {
    title: "Toggle Categories & Lifecycle",
    description:
      "Classify flags as release, experiment, ops, or permission. Each category has tailored lifecycle management with category-aware staleness thresholds. Track status through active → rolled_out → deprecated → archived.",
    icon: Tag,
    code: [
      {
        lang: "create-cat",
        label: "Create with Category",
        code: `curl -X POST https://api.featuresignals.com/v1/projects/proj-1/flags \\
  -H "Authorization: Bearer <token>" \\
  -d '{
    "key": "circuit-breaker-payments",
    "name": "Payment Circuit Breaker",
    "flag_type": "boolean",
    "default_value": "true",
    "category": "ops",
    "status": "active"
  }'

# Categories: release, experiment, ops, permission
# Staleness thresholds: 14d, 30d, 90d, 90d respectively`,
      },
      {
        lang: "flag-resp",
        label: "Flag Response",
        code: `{
  "id": "flag-uuid",
  "key": "circuit-breaker-payments",
  "name": "Payment Circuit Breaker",
  "flag_type": "boolean",
  "category": "ops",
  "status": "active",
  "default_value": "true",
  "created_at": "2026-04-03T10:00:00Z"
}`,
      },
    ],
  },
  {
    title: "Environment Comparison & Sync",
    description:
      "Compare flag states across environments side-by-side. Spot configuration drift between staging and production instantly. Bulk-sync selected flags from one environment to another with full audit trail.",
    icon: ArrowLeftRight,
    code: [
      {
        lang: "compare-env",
        label: "Compare",
        code: `# Compare flag states between staging and production
curl "https://api.featuresignals.com/v1/projects/proj-1/flags/compare-environments\\
?source_env_id=env-staging&target_env_id=env-production" \\
  -H "Authorization: Bearer <token>"

# Returns flags with different enabled states between environments`,
      },
      {
        lang: "sync-env",
        label: "Sync",
        code: `# Bulk-sync selected flags from staging to production
curl -X POST https://api.featuresignals.com/v1/projects/proj-1/flags/sync-environments \\
  -H "Authorization: Bearer <token>" \\
  -d '{
    "source_env_id": "env-staging",
    "target_env_id": "env-production",
    "flag_keys": ["new-checkout", "dark-mode"]
  }'`,
      },
    ],
  },
  {
    title: "Entity Inspector & Comparison",
    description:
      "See exactly what a specific user experiences across all flags. Compare two users side-by-side to verify targeting rules, permission gating, and rollout percentages are working correctly.",
    icon: Users,
    code: [
      {
        lang: "inspect",
        label: "Inspect Entity",
        code: `# See all flag evaluations for a specific user
curl -X POST https://api.featuresignals.com/v1/projects/proj-1/environments/env-prod/inspect-entity \\
  -H "Authorization: Bearer <token>" \\
  -d '{
    "entity_key": "user-42",
    "attributes": { "plan": "enterprise", "country": "US" }
  }'

# Returns: flag_key, value, reason, individually_targeted for every flag`,
      },
      {
        lang: "compare-entities",
        label: "Compare Entities",
        code: `# Compare what two different users see
curl -X POST https://api.featuresignals.com/v1/projects/proj-1/environments/env-prod/compare-entities \\
  -H "Authorization: Bearer <token>" \\
  -d '{
    "entity_a": { "key": "user-42", "attributes": { "plan": "free" } },
    "entity_b": { "key": "user-99", "attributes": { "plan": "enterprise" } }
  }'`,
      },
    ],
  },
  {
    title: "Usage Insights & Metrics",
    description:
      "In-memory counters tracking evaluations per flag, environment, and reason. Value distribution insights showing true/false percentages. Flag Engine visualization with top-flags bar chart and reason breakdown.",
    icon: BarChart3,
    code: [
      {
        lang: "flag-insights",
        label: "Flag Insights",
        code: `# Get value distribution for all flags in an environment
curl "https://api.featuresignals.com/v1/projects/proj-1/environments/env-prod/flag-insights" \\
  -H "Authorization: Bearer <token>"

# [
#   { "flag_key": "new-checkout", "true_count": 7520, "false_count": 2480,
#     "true_pct": 75.2, "false_pct": 24.8 },
#   { "flag_key": "dark-mode", "true_count": 4100, "false_count": 5900,
#     "true_pct": 41.0, "false_pct": 59.0 }
# ]`,
      },
      {
        lang: "eval-metrics",
        label: "Eval Metrics",
        code: `curl https://api.featuresignals.com/v1/metrics/evaluations \\
  -H "Authorization: Bearer <token>"

# {
#   "total_evaluations": 142857,
#   "counters": [
#     { "flag_key": "checkout-redesign", "count": 52310, "reason": "TARGETING_MATCH" },
#     { "flag_key": "dark-mode", "count": 38200, "reason": "DEFAULT" }
#   ]
# }`,
      },
    ],
  },
];

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Everything you need to manage feature flags
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
          A complete, open-source feature management platform built for
          engineering teams that value speed, control, and transparency.
        </p>
      </header>

      <div className="mt-12 space-y-8">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          const id = slugify(feature.title);
          return (
            <SectionReveal key={feature.title}>
              <article className="rounded-xl border border-slate-200 bg-white p-4 transition-all duration-200 hover:border-slate-300 hover:shadow-lg sm:p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <h2 className="mt-4 text-xl font-bold text-slate-900 sm:text-2xl">
                  {feature.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
                  {feature.description}
                </p>
                <CodeTabs tabs={feature.code} id={id} />
              </article>
            </SectionReveal>
          );
        })}
      </div>

      <SectionReveal>
        <div className="mt-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 px-6 py-12 text-center sm:px-10 sm:py-14">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            See every feature in action
          </h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="https://app.featuresignals.com/register"
              className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-sm font-semibold text-indigo-600 shadow-sm transition-colors hover:bg-indigo-50"
            >
              Start Free Trial
            </Link>
            <Link
              href="https://app.featuresignals.com/register"
              className="inline-flex items-center justify-center rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Sign Up Free
            </Link>
            <Link
              href="https://docs.featuresignals.com/getting-started/quickstart"
              className="inline-flex items-center justify-center rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Quickstart Guide
            </Link>
          </div>
        </div>
      </SectionReveal>
    </div>
  );
}
