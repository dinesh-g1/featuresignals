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
  Check,
  X as XIcon,
  Minus,
} from "lucide-react";
import { CodeTabs } from "@/components/code-tabs";
import { SectionReveal } from "@/components/section-reveal";

interface Feature {
  title: string;
  description: string;
  icon: LucideIcon;
  code: { lang: string; label: string; code: string }[];
}

interface FeatureGroup {
  label: string;
  tagline: string;
  features: Feature[];
}

const featureGroups: FeatureGroup[] = [
  {
    label: "Ship with Confidence",
    tagline: "Deploy daily, release strategically",
    features: [
      {
        title: "Flag Engine",
        description:
          "Boolean, string, number, JSON, and A/B flag types. Percentage rollouts with MurmurHash3 consistent hashing. User targeting with 13 operators. Segment-based rules with AND/OR logic.",
        icon: Flag,
        code: [
          { lang: "go", label: "Go", code: `client := fs.NewClient("YOUR_API_KEY")\ndefer client.Close()\n\nenabled := client.IsEnabled("checkout-redesign",\n    fs.User{Key: "user-42", Attributes: map[string]any{\n        "plan": "pro", "country": "IN",\n    }})\n\nif enabled {\n    renderNewCheckout()\n}` },
          { lang: "node", label: "Node.js", code: `import { FeatureSignals } from "@featuresignals/sdk";\n\nconst client = new FeatureSignals("YOUR_API_KEY");\n\nconst enabled = await client.isEnabled("checkout-redesign", {\n  key: "user-42",\n  attributes: { plan: "pro", country: "IN" },\n});\n\nif (enabled) renderNewCheckout();` },
          { lang: "python", label: "Python", code: `from featuresignals import FeatureSignals\n\nclient = FeatureSignals("YOUR_API_KEY")\n\nif client.is_enabled("checkout-redesign",\n    {"key": "user-42", "plan": "pro", "country": "IN"}):\n    render_new_checkout()` },
        ],
      },
      {
        title: "Multi-Environment",
        description:
          "Dev, staging, production, and custom environments. Per-environment flag states and targeting rules. Promote configurations between environments. Per-environment API keys.",
        icon: Layers,
        code: [
          { lang: "go", label: "Go", code: `// Different API keys per environment — same code, different config\ndevClient := fs.NewClient(os.Getenv("FS_DEV_KEY"))\nprodClient := fs.NewClient(os.Getenv("FS_PROD_KEY"))\n\n// Flag is ON in dev, 10% rollout in prod\ndevClient.IsEnabled("new-feature", user)  // true\nprodClient.IsEnabled("new-feature", user) // depends on rollout` },
          { lang: "promote", label: "Promote", code: `# Promote flag config from staging to production\ncurl -X POST https://api.featuresignals.com/v1/projects/proj-1/flags/new-feature/promote \\\n  -H "Authorization: Bearer <token>" \\\n  -d '{\n    "source_env_id": "env-staging",\n    "target_env_id": "env-production"\n  }'` },
        ],
      },
      {
        title: "Kill Switch & Scheduling",
        description:
          "Emergency disable any flag with one click. Schedule flags to auto-enable or auto-disable at specific times. Background scheduler checks every 30 seconds with full audit trail.",
        icon: AlertTriangle,
        code: [
          { lang: "kill", label: "Kill Switch", code: `# Emergency disable — propagates to all SDKs in seconds\ncurl -X POST https://api.featuresignals.com/v1/projects/proj-1/flags/risky-feature/kill \\\n  -H "Authorization: Bearer <token>" \\\n  -d '{ "env_id": "env-production" }'\n\n# Response: { "status": "killed", "flag_key": "risky-feature" }` },
          { lang: "schedule", label: "Scheduled", code: `// PUT /v1/projects/{id}/flags/{key}/environments/{envId}\n{\n  "enabled": true,\n  "schedule": {\n    "enable_at": "2025-03-01T09:00:00Z",\n    "disable_at": "2025-03-15T23:59:59Z"\n  }\n}\n// Flag auto-enables on March 1 and auto-disables on March 15` },
        ],
      },
    ],
  },
  {
    label: "Experiment & Measure",
    tagline: "Data-driven decisions, not guesses",
    features: [
      {
        title: "A/B Experimentation",
        description:
          "Built-in variant assignment with weighted splits. Consistent hashing ensures the same user always sees the same variant. Impression tracking API for analytics.",
        icon: FlaskConical,
        code: [
          { lang: "react", label: "React", code: `import { useStringFlagDetails } from "@featuresignals/react";\n\nfunction PricingPage() {\n  const { value, reason } = useStringFlagDetails(\n    "pricing-experiment", "control"\n  );\n\n  return value === "treatment-a"\n    ? <NewPricing />\n    : <CurrentPricing />;\n}` },
          { lang: "node", label: "Node.js", code: `const variant = await client.getStringDetails(\n  "pricing-experiment",\n  "control",\n  { key: "user-42" }\n);\n\n// variant.value  => "treatment-a" or "control"\n// variant.reason => "SPLIT"\n\nanalytics.track("pricing_page_view", {\n  variant: variant.value,\n});` },
        ],
      },
      {
        title: "Mutual Exclusion Groups",
        description:
          "Prevent experiment interference by grouping flags that should never be active for the same user simultaneously. Deterministic winner selection using consistent hashing.",
        icon: ArrowLeftRight,
        code: [
          { lang: "json", label: "API Response", code: `// POST /v1/evaluate with two mutually exclusive flags\n// Only ONE will return "on" for any given user\n\n{ "key": "banner-experiment",  "value": true,  "reason": "SPLIT" }\n{ "key": "pricing-experiment", "value": false, "reason": "MUTUAL_EXCLUSION" }` },
        ],
      },
      {
        title: "Usage Insights & Metrics",
        description:
          "In-memory counters tracking evaluations per flag, environment, and reason. Value distribution insights showing true/false percentages. Dashboard visualization with top-flags chart.",
        icon: BarChart3,
        code: [
          { lang: "flag-insights", label: "Insights", code: `curl "https://api.featuresignals.com/v1/projects/proj-1/environments/env-prod/flag-insights" \\\n  -H "Authorization: Bearer <token>"\n\n# [\n#   { "flag_key": "new-checkout", "true_pct": 75.2, "false_pct": 24.8 },\n#   { "flag_key": "dark-mode", "true_pct": 41.0, "false_pct": 59.0 }\n# ]` },
        ],
      },
    ],
  },
  {
    label: "Debug & Troubleshoot",
    tagline: "See exactly what every user experiences",
    features: [
      {
        title: "Target Inspector & Comparison",
        description:
          "See all flag evaluations for a specific user. Compare two users side-by-side to verify targeting rules, permission gating, and rollout percentages are working correctly.",
        icon: Users,
        code: [
          { lang: "inspect", label: "Inspect", code: `curl -X POST .../inspect-entity \\\n  -H "Authorization: Bearer <token>" \\\n  -d '{\n    "key": "user-42",\n    "attributes": { "plan": "enterprise", "country": "US" }\n  }'\n\n# Returns: flag_key, value, reason for every flag` },
          { lang: "compare", label: "Compare", code: `curl -X POST .../compare-entities \\\n  -H "Authorization: Bearer <token>" \\\n  -d '{\n    "entity_a": { "key": "user-42", "attributes": { "plan": "free" } },\n    "entity_b": { "key": "user-99", "attributes": { "plan": "enterprise" } }\n  }'` },
        ],
      },
      {
        title: "Environment Comparison & Sync",
        description:
          "Compare flag states across environments side-by-side. Spot configuration drift instantly. Bulk-sync selected flags from one environment to another with full audit trail.",
        icon: ArrowLeftRight,
        code: [
          { lang: "compare-env", label: "Compare", code: `curl "https://api.featuresignals.com/v1/projects/proj-1/flags/compare-environments\\\n?source_env_id=env-staging&target_env_id=env-production" \\\n  -H "Authorization: Bearer <token>"` },
        ],
      },
      {
        title: "Stale Flag Scanner",
        description:
          "CLI tool that scans your codebase for flag references and reports stale flags. CI/CD mode exits with code 1 on stale flags found. JSON and table output.",
        icon: Search,
        code: [
          { lang: "cli", label: "CLI", code: `# Scan for stale flags\nfeaturesignals scan --dir ./src --api-key $FS_API_KEY\n\n# CI mode — fails the build if stale flags exist\nfeaturesignals scan --dir ./src --ci --api-key $FS_API_KEY` },
        ],
      },
    ],
  },
  {
    label: "Govern & Comply",
    tagline: "Enterprise-grade control and auditability",
    features: [
      {
        title: "Enterprise Governance",
        description:
          "Tamper-evident audit logs with before/after diffs. Approval workflows for production changes. RBAC with owner/admin/developer/viewer roles. Per-environment permissions.",
        icon: ShieldCheck,
        code: [
          { lang: "approval", label: "Approvals", code: `# Request approval before enabling in production\ncurl -X POST .../v1/approvals \\\n  -H "Authorization: Bearer <dev-token>" \\\n  -d '{\n    "flag_id": "flag-uuid",\n    "change_type": "toggle",\n    "payload": { "enabled": true }\n  }'\n\n# Admin approves\ncurl -X POST .../v1/approvals/{id}/review \\\n  -d '{ "action": "approve", "note": "LGTM" }'` },
        ],
      },
      {
        title: "Toggle Categories & Lifecycle",
        description:
          "Classify flags as release, experiment, ops, or permission. Category-aware staleness thresholds (14d, 30d, 90d, 90d). Track status through active → rolled_out → deprecated → archived.",
        icon: Tag,
        code: [
          { lang: "json", label: "Categories", code: `{\n  "key": "circuit-breaker-payments",\n  "category": "ops",\n  "status": "active"\n}\n\n// Staleness thresholds:\n// release: 14 days, experiment: 30 days\n// ops: 90 days, permission: never` },
        ],
      },
      {
        title: "Webhooks & Integrations",
        description:
          "HTTP webhooks with HMAC-SHA256 signatures. Event filtering by type. Exponential retry with delivery logging. Integrate with Slack, CI/CD, or any HTTP endpoint.",
        icon: Link2,
        code: [
          { lang: "payload", label: "Webhook", code: `{\n  "event": "flag.state.updated",\n  "data": {\n    "flag_key": "new-checkout",\n    "environment": "production",\n    "enabled": true,\n    "actor": "admin@company.com"\n  }\n}\n// Delivered with X-Signature: sha256=<hmac>` },
        ],
      },
    ],
  },
  {
    label: "Deploy Your Way",
    tagline: "Self-host, cloud, or hybrid — you choose",
    features: [
      {
        title: "SDKs for Every Stack",
        description:
          "Go, Node.js, Python, Java, C#, Ruby, React, and Vue SDKs. All implement OpenFeature providers for zero vendor lock-in. Local evaluation. SSE streaming for real-time updates.",
        icon: Code,
        code: [
          { lang: "go", label: "Go", code: `import fs "github.com/featuresignals/sdk-go"\n\nclient := fs.NewClient("YOUR_API_KEY")\ndefer client.Close()\n\nif client.IsEnabled("dark-mode", fs.User{Key: "user-42"}) {\n    enableDarkTheme()\n}` },
          { lang: "react", label: "React", code: `import { FSProvider, useFlag } from "@featuresignals/react";\n\nfunction App() {\n  return (\n    <FSProvider apiKey="YOUR_API_KEY" user={{ key: "user-42" }}>\n      <ThemeSwitcher />\n    </FSProvider>\n  );\n}\n\nfunction ThemeSwitcher() {\n  const darkMode = useFlag("dark-mode");\n  return darkMode ? <DarkTheme /> : <LightTheme />;\n}` },
        ],
      },
      {
        title: "Relay Proxy",
        description:
          "Lightweight Go binary caching flags at the edge. Reduces latency, provides fault tolerance, and minimizes upstream API load. Syncs via SSE or polling.",
        icon: Radio,
        code: [
          { lang: "docker", label: "Docker", code: `docker run -d --name relay-proxy \\\n  -p 8081:8081 \\\n  -e FS_UPSTREAM=https://api.featuresignals.com \\\n  -e FS_API_KEY=relay-key-abc123 \\\n  -e FS_SYNC_MODE=sse \\\n  featuresignals/relay-proxy:latest\n\n# SDKs connect to relay → lower latency, offline resilience` },
        ],
      },
      {
        title: "Deploy Anywhere",
        description:
          "Docker Compose for quick start. Self-host on any VPS. Kubernetes-ready. Caddy for automatic HTTPS. Single Go binary with zero external dependencies beyond PostgreSQL.",
        icon: Cloud,
        code: [
          { lang: "compose", label: "Docker Compose", code: `git clone https://github.com/dinesh-g1/featuresignals\ncd featuresignals\ndocker compose up -d\n\n# Services: API (8080), Dashboard (3000), PostgreSQL (5432)` },
        ],
      },
    ],
  },
];

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

interface ComparisonRow {
  feature: string;
  fs: "yes" | "no" | "partial";
  ld: "yes" | "no" | "partial";
  unleash: "yes" | "no" | "partial";
}

const comparisonData: ComparisonRow[] = [
  { feature: "Open-source (Apache 2.0)", fs: "yes", ld: "no", unleash: "yes" },
  { feature: "Self-hosted option", fs: "yes", ld: "no", unleash: "yes" },
  { feature: "A/B experimentation", fs: "yes", ld: "yes", unleash: "partial" },
  { feature: "Mutual exclusion groups", fs: "yes", ld: "yes", unleash: "no" },
  { feature: "OpenFeature SDKs", fs: "yes", ld: "partial", unleash: "yes" },
  { feature: "Real-time SSE streaming", fs: "yes", ld: "yes", unleash: "yes" },
  { feature: "Relay proxy", fs: "yes", ld: "yes", unleash: "yes" },
  { feature: "Approval workflows", fs: "yes", ld: "yes", unleash: "partial" },
  { feature: "Audit logs with diffs", fs: "yes", ld: "yes", unleash: "partial" },
  { feature: "Target inspector", fs: "yes", ld: "no", unleash: "no" },
  { feature: "Stale flag scanner", fs: "yes", ld: "no", unleash: "no" },
  { feature: "Flag scheduling", fs: "yes", ld: "yes", unleash: "yes" },
  { feature: "Environment comparison", fs: "yes", ld: "no", unleash: "no" },
  { feature: "Unlimited evaluations", fs: "yes", ld: "no", unleash: "yes" },
  { feature: "No per-seat pricing", fs: "yes", ld: "no", unleash: "partial" },
];

function ComparisonIcon({ value }: { value: "yes" | "no" | "partial" }) {
  if (value === "yes") return <Check className="mx-auto h-4 w-4 text-emerald-600" />;
  if (value === "partial") return <Minus className="mx-auto h-4 w-4 text-amber-500" />;
  return <XIcon className="mx-auto h-4 w-4 text-slate-300" />;
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

      {/* Quick nav */}
      <SectionReveal>
        <nav className="mt-10 flex flex-wrap justify-center gap-2" aria-label="Feature categories">
          {featureGroups.map((group) => (
            <a
              key={group.label}
              href={`#${slugify(group.label)}`}
              className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
            >
              {group.label}
            </a>
          ))}
          <a
            href="#comparison"
            className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
          >
            Compare
          </a>
        </nav>
      </SectionReveal>

      {/* Feature groups */}
      {featureGroups.map((group) => (
        <section key={group.label} id={slugify(group.label)} className="mt-16 scroll-mt-20">
          <SectionReveal>
            <div className="mb-6 border-l-4 border-indigo-600 pl-4">
              <h2 className="text-2xl font-bold text-slate-900">{group.label}</h2>
              <p className="mt-1 text-sm text-slate-500">{group.tagline}</p>
            </div>
          </SectionReveal>

          <div className="space-y-6">
            {group.features.map((feature) => {
              const Icon = feature.icon;
              const id = slugify(feature.title);
              return (
                <SectionReveal key={feature.title}>
                  <article className="rounded-xl border border-slate-200 bg-white p-4 transition-all duration-200 hover:border-slate-300 hover:shadow-lg sm:p-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                      <Icon className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                    <h3 className="mt-4 text-xl font-bold text-slate-900 sm:text-2xl">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
                      {feature.description}
                    </p>
                    <CodeTabs tabs={feature.code} id={id} />
                  </article>
                </SectionReveal>
              );
            })}
          </div>
        </section>
      ))}

      {/* Competitive Comparison */}
      <section id="comparison" className="mt-20 scroll-mt-20">
        <SectionReveal>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              How FeatureSignals Compares
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-500">
              Open-source with full feature parity. No per-seat pricing. No evaluation caps.
            </p>
          </div>
        </SectionReveal>

        <SectionReveal delay={0.05}>
          <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Feature</th>
                  <th className="px-4 py-3 text-center font-semibold text-indigo-700">FeatureSignals</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700">LaunchDarkly</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700">Unleash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comparisonData.map((row) => (
                  <tr key={row.feature} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 text-slate-700">{row.feature}</td>
                    <td className="px-4 py-2.5 text-center"><ComparisonIcon value={row.fs} /></td>
                    <td className="px-4 py-2.5 text-center"><ComparisonIcon value={row.ld} /></td>
                    <td className="px-4 py-2.5 text-center"><ComparisonIcon value={row.unleash} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-center text-xs text-slate-400">
            Data based on publicly available documentation as of April 2026.
          </p>
        </SectionReveal>
      </section>

      {/* CTA */}
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
              Start Free
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
