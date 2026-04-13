import type { Metadata } from "next";
import Link from "next/link";
import { appUrl } from "@/lib/urls";
import {
  ArrowRight,
  Flag,
  Layers,
  AlertTriangle,
  FlaskConical,
  ArrowLeftRight,
  BarChart3,
  Users,
  Search,
  Tag,
} from "lucide-react";
import { FeatureCard } from "@/components/feature-card";
import { SectionReveal } from "@/components/section-reveal";

export const metadata: Metadata = {
  title: "Core Features — Feature Flag Engine | FeatureSignals",
  description:
    "Feature flags with targeted rollouts, kill switches, A/B testing, and real-time updates. The core engine that powers safe deployments.",
};

const featureGroups: {
  id: string;
  label: string;
  tagline: string;
  features: {
    title: string;
    description: string;
    icon: React.ReactNode;
    features: string[];
    code?: { lang: string; label: string; code: string };
  }[];
}[] = [
  {
    id: "flag-engine",
    label: "Flag Engine",
    tagline: "Multi-type flags with precise targeting",
    features: [
      {
        title: "5 Flag Types",
        description:
          "Boolean, string, number, JSON, and A/B flags. Each type supports rich targeting rules, percentage rollouts, and environment-specific configurations.",
        icon: <Flag className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} />,
        features: [
          "Boolean, string, number, JSON, A/B types",
          "13 targeting operators (eq, neq, contains, in, regex...)",
          "AND/OR logic for complex rules",
          "Environment-specific configurations",
        ],
        code: {
          lang: "go",
          label: "Go SDK",
          code: `import fs "github.com/featuresignals/sdk-go"

client := fs.NewClient("YOUR_API_KEY")
defer client.Close()

enabled := client.IsEnabled("checkout-redesign",
    fs.User{Key: "user-42", Attributes: map[string]any{
        "plan": "pro", "country": "IN",
    }})

if enabled {
    renderNewCheckout()
}`,
        },
      },
      {
        title: "Percentage Rollouts",
        description:
          "Consistent hashing via MurmurHash3 ensures the same user always sees the same variant. Roll out to 0.01% granularity, safely scale to 100%.",
        icon: <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} />,
        features: [
          "MurmurHash3 consistent hashing",
          "0.01% granularity",
          "Same user always gets same variant",
          "Safe incremental rollouts",
        ],
        code: {
          lang: "curl",
          label: "API",
          code: `# Set 10% rollout in production
curl -X PUT https://api.featuresignals.com/v1/projects/proj-1/flags/new-checkout/environments/env-prod \\
  -H "Authorization: Bearer <token>" \\
  -d '{
    "enabled": true,
    "rollout_percentage": 10
  }'

# Increase when confident
curl -X PUT .../flags/new-checkout/environments/env-prod \\
  -H "Authorization: Bearer <token>" \\
  -d '{ "enabled": true, "rollout_percentage": 100 }'`,
        },
      },
    ],
  },
  {
    id: "environments",
    label: "Multi-Environment",
    tagline: "Dev, staging, production — isolated and organized",
    features: [
      {
        title: "Environment Isolation & Promotion",
        description:
          "Per-environment flag states, targeting rules, and API keys. Changes in dev never affect production. Promote configurations between environments with full audit trail.",
        icon: <Layers className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} />,
        features: [
          "Isolated flag states per environment",
          "Per-environment API keys",
          "Promote between environments",
          "Full audit trail on promotion",
        ],
        code: {
          lang: "curl",
          label: "Promote",
          code: `# Promote flag config from staging to production
curl -X POST https://api.featuresignals.com/v1/projects/proj-1/flags/new-feature/promote \\
  -H "Authorization: Bearer <token>" \\
  -d '{
    "source_env_id": "env-staging",
    "target_env_id": "env-production"
  }'`,
        },
      },
      {
        title: "Environment Comparison",
        description:
          "Compare flag states across environments side-by-side. Spot configuration drift instantly. Bulk-sync selected flags from one environment to another.",
        icon: (
          <ArrowLeftRight className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} />
        ),
        features: [
          "Side-by-side comparison",
          "Configuration drift detection",
          "Bulk-sync between environments",
          "Visual diff highlighting",
        ],
        code: {
          lang: "curl",
          label: "Compare",
          code: `curl "https://api.featuresignals.com/v1/projects/proj-1/flags/compare-environments?source_env_id=env-staging&target_env_id=env-production" \\
  -H "Authorization: Bearer <token>"

# Returns: flag_key, state, targeting diff`,
        },
      },
    ],
  },
  {
    id: "experimentation",
    label: "A/B Experimentation",
    tagline: "Data-driven decisions, not guesses",
    features: [
      {
        title: "Variant Assignment",
        description:
          "Weighted splits (50/50, 90/10, custom). Consistent hashing ensures stable user assignment. Impression tracking API for analytics integration.",
        icon: (
          <FlaskConical className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} />
        ),
        features: [
          "Weighted splits (50/50, 90/10, custom)",
          "Consistent hashing for stable assignment",
          "Impression tracking API",
          "Analytics integration ready",
        ],
        code: {
          lang: "react",
          label: "React SDK",
          code: `import { useStringFlagDetails } from "@featuresignals/react";

function PricingPage() {
  const { value, reason } = useStringFlagDetails(
    "pricing-experiment", "control"
  );

  useEffect(() => {
    analytics.track("pricing_impression", { variant: value });
  }, [value]);

  return value === "treatment-a"
    ? <NewPricing />
    : <CurrentPricing />;
}`,
        },
      },
      {
        title: "Mutual Exclusion Groups",
        description:
          "Prevent experiment interference. Flags in the same group never activate simultaneously for the same user. Deterministic winner selection via consistent hashing.",
        icon: (
          <ArrowLeftRight className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} />
        ),
        features: [
          "Prevent overlapping experiments",
          "Deterministic user assignment",
          "Consistent hashing",
          "Automatic exclusion enforcement",
        ],
        code: {
          lang: "json",
          label: "API Response",
          code: `// Only ONE will return "on" for any given user
{
  "key": "banner-experiment",
  "value": true,
  "reason": "SPLIT"
}
{
  "key": "pricing-experiment",
  "value": false,
  "reason": "MUTUAL_EXCLUSION"
}`,
        },
      },
    ],
  },
  {
    id: "control",
    label: "Kill Switch & Scheduling",
    tagline: "Emergency controls for production safety",
    features: [
      {
        title: "Kill Switch",
        description:
          "Emergency disable any flag with one click. Propagates to all connected SDKs in seconds via SSE. Full audit trail on every action.",
        icon: (
          <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} />
        ),
        features: [
          "One-click emergency disable",
          "Propagates via SSE in seconds",
          "Full audit trail",
          "Per-environment kill",
        ],
        code: {
          lang: "curl",
          label: "Kill Switch",
          code: `# Emergency disable — propagates to all SDKs in seconds
curl -X POST https://api.featuresignals.com/v1/projects/proj-1/flags/risky-feature/kill \\
  -H "Authorization: Bearer <token>" \\
  -d '{ "env_id": "env-production" }'

# Response: { "status": "killed", "flag_key": "risky-feature" }`,
        },
      },
      {
        title: "Scheduled Flags",
        description:
          "Auto-enable or auto-disable flags at specific times. Background scheduler checks every 30 seconds. Perfect for timed launches and maintenance windows.",
        icon: <Flag className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} />,
        features: [
          "Auto-enable at scheduled time",
          "Auto-disable at scheduled time",
          "30-second scheduler check",
          "Audit trail on scheduled actions",
        ],
        code: {
          lang: "json",
          label: "Scheduled Flag",
          code: `{
  "enabled": true,
  "schedule": {
    "enable_at": "2025-03-01T09:00:00Z",
    "disable_at": "2025-03-15T23:59:59Z"
  }
}
// Flag auto-enables on March 1 and auto-disables on March 15`,
        },
      },
    ],
  },
  {
    id: "lifecycle",
    label: "Flag Lifecycle",
    tagline: "Categorize, track, and clean up flags systematically",
    features: [
      {
        title: "Toggle Categories",
        description:
          "Classify flags as release, experiment, ops, or permission. Each category has tailored staleness thresholds (14d, 30d, 90d, never) and management guidance.",
        icon: <Tag className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} />,
        features: [
          "Release: 14-day staleness",
          "Experiment: 30-day staleness",
          "Ops: 90-day staleness",
          "Permission: never stale",
        ],
        code: {
          lang: "json",
          label: "Categories",
          code: `// Four categories with different lifecycles:
//
// RELEASE    → 14-day staleness threshold
// EXPERIMENT → 30-day staleness threshold
// OPS        → 90-day staleness threshold
// PERMISSION → 90-day staleness threshold

{
  "key": "circuit-breaker-payments",
  "category": "ops",
  "status": "active"
}`,
        },
      },
      {
        title: "Stale Flag Scanner",
        description:
          "CLI tool scans your codebase for flag references and reports stale flags. CI/CD mode exits with code 1 when stale flags found. JSON and table output.",
        icon: <Search className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} />,
        features: [
          "Codebase scanning",
          "Staleness detection",
          "CI/CD mode (fails build)",
          "JSON and table output",
        ],
        code: {
          lang: "cli",
          label: "CLI",
          code: `# Scan for stale flags
featuresignals scan --dir ./src --api-key $FS_API_KEY

# CI mode — fails the build if stale flags exist
featuresignals scan --dir ./src --ci --api-key $FS_API_KEY

# Output:
# ⚠  old-banner: STALE (last eval: 45 days ago)
# ✓ new-checkout: ACTIVE (last eval: 2 hours ago)`,
        },
      },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-12 text-center sm:px-6 sm:py-20">
        <SectionReveal>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-1.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100 sm:text-sm">
            <Flag className="h-3.5 w-3.5" />
            Core Feature Flag Engine
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
            Ship features safely with{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              precise control
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Multi-type flags, percentage rollouts, A/B experimentation, and
            emergency kill switches. The core engine that powers safe,
            data-driven deployments.
          </p>
        </SectionReveal>

        {/* Quick nav */}
        <SectionReveal>
          <nav
            className="mt-10 flex flex-wrap justify-center gap-2"
            aria-label="Feature categories"
          >
            {featureGroups.map((group) => (
              <a
                key={group.label}
                href={`#${group.id}`}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 sm:px-4 sm:text-sm"
              >
                {group.label}
              </a>
            ))}
          </nav>
        </SectionReveal>
      </section>

      {/* Flag Engine & Environments */}
      {featureGroups
        .filter((g) => g.id === "flag-engine" || g.id === "environments")
        .map((group) => (
          <section
            key={group.id}
            id={group.id}
            className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-16 scroll-mt-20"
          >
            <SectionReveal>
              <div className="mb-8 border-l-4 border-indigo-600 pl-4">
                <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                  {group.label}
                </h2>
                <p className="mt-1 text-sm text-slate-500">{group.tagline}</p>
              </div>
            </SectionReveal>

            <div className="space-y-6 sm:space-y-8">
              {group.features.map((feature) => (
                <SectionReveal key={feature.title}>
                  <FeatureCard
                    icon={feature.icon}
                    title={feature.title}
                    description={feature.description}
                    features={feature.features}
                    code={feature.code}
                  />
                </SectionReveal>
              ))}
            </div>
          </section>
        ))}

      {/* Mid-page CTA */}
      <SectionReveal>
        <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 px-6 py-10 text-center sm:px-10 sm:py-12">
            <h2 className="text-xl font-bold text-white sm:text-2xl">
              Ready to deploy features safely?
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-indigo-100 sm:text-base">
              Start free with full Pro features for 14 days, or self-host in
              under 5 minutes.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={appUrl.register}
                className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-indigo-600 shadow-sm transition-colors hover:bg-indigo-50"
              >
                Start Free
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-lg border border-white/30 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </section>
      </SectionReveal>

      {/* Experimentation, Control & Lifecycle */}
      {featureGroups
        .filter(
          (g) =>
            g.id === "experimentation" ||
            g.id === "control" ||
            g.id === "lifecycle",
        )
        .map((group) => (
          <section
            key={group.id}
            id={group.id}
            className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-16 scroll-mt-20"
          >
            <SectionReveal>
              <div className="mb-8 border-l-4 border-indigo-600 pl-4">
                <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                  {group.label}
                </h2>
                <p className="mt-1 text-sm text-slate-500">{group.tagline}</p>
              </div>
            </SectionReveal>

            <div className="space-y-6 sm:space-y-8">
              {group.features.map((feature) => (
                <SectionReveal key={feature.title}>
                  <FeatureCard
                    icon={feature.icon}
                    title={feature.title}
                    description={feature.description}
                    features={feature.features}
                    code={feature.code}
                  />
                </SectionReveal>
              ))}
            </div>
          </section>
        ))}

      {/* Related features */}
      <section className="border-t border-slate-100 bg-slate-50 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <SectionReveal>
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Explore more capabilities
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-500 sm:text-base">
              The core engine is just the beginning. Discover AI-powered
              cleanup, enterprise security, and 50+ integrations.
            </p>
          </SectionReveal>

          <SectionReveal>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {(
                [
                  {
                    title: "AI Capabilities",
                    description:
                      "AI flag cleanup, anomaly detection, and incident response",
                    href: "/features/ai",
                  },
                  {
                    title: "Security & Governance",
                    description:
                      "RBAC, audit logs, SSO, approvals, and compliance",
                    href: "/features/security",
                  },
                  {
                    title: "Integrations",
                    description: "Slack, GitHub, Jira, Datadog, and more",
                    href: "/features/integrations",
                  },
                ] as const
              ).map(({ title, description, href }) => (
                <Link
                  key={title}
                  href={href}
                  className="group rounded-xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
                >
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600">
                    {title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">{description}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-600">
                    Learn more
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* Final CTA */}
      <SectionReveal>
        <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 px-6 py-10 text-center sm:px-10 sm:py-12">
            <h2 className="text-xl font-bold text-white sm:text-2xl">
              See the engine in action
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-indigo-100 sm:text-base">
              Start free with full Pro features for 14 days, or self-host in
              under 5 minutes.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={appUrl.register}
                className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-indigo-600 shadow-sm transition-colors hover:bg-indigo-50"
              >
                Start Free
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-lg border border-white/30 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </section>
      </SectionReveal>
    </>
  );
}
