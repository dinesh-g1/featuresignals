import Link from "next/link";
import type { Metadata } from "next";
import {
  Sparkles,
  ArrowRight,
  Rocket,
  Bug,
  Zap,
  Shield,
  Star,
  GitBranch,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Changelog",
  description:
    "Release history and feature announcements for FeatureSignals. Track new features, improvements, and bug fixes.",
};

const releases = [
  {
    version: "1.5.0",
    date: "January 15, 2026",
    type: "major",
    title: "Multi-IaC Provider Support + AI Janitor GA",
    changes: [
      {
        type: "feature",
        text: "Terraform provider: new resources for projects, environments, segments, webhooks, and API keys",
      },
      {
        type: "feature",
        text: "Pulumi provider: TypeScript-based infrastructure-as-code for FeatureSignals resources",
      },
      {
        type: "feature",
        text: "Ansible collection: manage feature flags via playbooks and roles",
      },
      {
        type: "feature",
        text: "Crossplane provider: Kubernetes-native feature flag management (alpha)",
      },
      {
        type: "feature",
        text: "AI Janitor now generally available: automated stale flag detection and cleanup PR generation",
      },
      {
        type: "feature",
        text: "Git provider support: GitHub, GitLab, Bitbucket, and Azure DevOps for Janitor PR generation",
      },
      {
        type: "feature",
        text: "Migration system: import from Unleash and Flagsmith (in addition to LaunchDarkly)",
      },
      {
        type: "improvement",
        text: "Migration wizard revamped with 4-step guided flow and IaC export options",
      },
      {
        type: "improvement",
        text: "Dashboard color scheme updated to teal/accent design system",
      },
      {
        type: "improvement",
        text: "Sidebar icons updated to Lucide icon set for consistent premium look",
      },
    ],
  },
  {
    version: "1.4.0",
    date: "December 20, 2025",
    type: "minor",
    title: "Approval Workflows & SSO",
    changes: [
      {
        type: "feature",
        text: "Custom Approval Board (CAB) workflows for production flag changes",
      },
      {
        type: "feature",
        text: "Single Sign-On support: SAML 2.0 and OIDC providers",
      },
      {
        type: "feature",
        text: "Multi-factor authentication (TOTP) for enhanced account security",
      },
      {
        type: "feature",
        text: "SCIM provisioning for automated user management",
      },
    ],
  },
  {
    version: "1.3.0",
    date: "December 1, 2025",
    type: "minor",
    title: "A/B Experimentation & Analytics",
    changes: [
      {
        type: "feature",
        text: "Built-in A/B experimentation engine with statistical significance",
      },
      {
        type: "feature",
        text: "Flag-level analytics dashboard with evaluation metrics",
      },
      {
        type: "feature",
        text: "Impression tracking for experiment event collection",
      },
      {
        type: "feature",
        text: "Usage insights with flag evaluation patterns and trends",
      },
    ],
  },
  {
    version: "1.2.0",
    date: "November 15, 2025",
    type: "minor",
    title: "Environment Comparison & Target Inspector",
    changes: [
      {
        type: "feature",
        text: "Environment comparison tool: side-by-side flag state views",
      },
      {
        type: "feature",
        text: "Target inspector: simulate flag evaluation for specific users",
      },
      { type: "feature", text: "Flag history viewer with change timeline" },
      { type: "feature", text: "Segment rules editor with real-time preview" },
    ],
  },
  {
    version: "1.1.0",
    date: "October 20, 2025",
    type: "minor",
    title: "OpenFeature SDK & Webhook Enhancements",
    changes: [
      {
        type: "feature",
        text: "OpenFeature provider SDK for provider-agnostic flag evaluation",
      },
      { type: "feature", text: "Webhook delivery logs with retry history" },
      {
        type: "feature",
        text: "Custom roles API for fine-grained access control",
      },
      {
        type: "feature",
        text: "Data export: JSON/CSV export of flag configurations",
      },
    ],
  },
  {
    version: "1.0.0",
    date: "October 1, 2025",
    type: "major",
    title: "First Public Release",
    changes: [
      {
        type: "feature",
        text: "Feature flag management with boolean, string, number, and JSON types",
      },
      {
        type: "feature",
        text: "Multi-environment support (development, staging, production)",
      },
      {
        type: "feature",
        text: "User segmentation with AND/OR targeting rules",
      },
      {
        type: "feature",
        text: "Percentage-based rollouts with consistent hashing",
      },
      { type: "feature", text: "LaunchDarkly migration importer" },
      { type: "feature", text: "REST API with OpenAPI documentation" },
      {
        type: "feature",
        text: "8 language SDKs (JavaScript, Go, Python, Ruby, Java, .NET, PHP, Rust)",
      },
      {
        type: "feature",
        text: "Teams and role-based access control (Admin, Developer, Viewer)",
      },
      { type: "feature", text: "Audit log with 90-day retention" },
      {
        type: "feature",
        text: "Webhook integrations with Slack, Datadog, and custom endpoints",
      },
      { type: "feature", text: "Terraform provider (flag resource)" },
    ],
  },
];

const typeConfig = {
  feature: {
    label: "New Feature",
    icon: Sparkles,
    color: "text-accent bg-accent/10",
  },
  improvement: {
    label: "Improvement",
    icon: Zap,
    color: "text-blue-600 bg-blue-100",
  },
  bugfix: { label: "Bug Fix", icon: Bug, color: "text-amber-600 bg-amber-100" },
  security: {
    label: "Security",
    icon: Shield,
    color: "text-emerald-600 bg-emerald-100",
  },
};

function ChangeBadge({ type }: { type: string }) {
  const config =
    typeConfig[type as keyof typeof typeConfig] || typeConfig.improvement;
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${config.color}`}
    >
      <Icon className="h-3 w-3" strokeWidth={2.5} />
      {config.label}
    </span>
  );
}

export default function ChangelogPage() {
  return (
    <>
      {/* BreadcrumbList JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: "https://featuresignals.com",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Changelog",
                item: "https://featuresignals.com/changelog",
              },
            ],
          }),
        }}
      />
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-stone-200 bg-stone-50">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-1.5 text-xs font-semibold text-stone-500 mb-6">
              <Rocket className="h-3.5 w-3.5 text-accent" />
              Release history
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-stone-900 mb-6">
              What&apos;s new in{" "}
              <span className="text-accent">FeatureSignals</span>
            </h1>
            <p className="text-lg sm:text-xl text-stone-600 max-w-2xl mx-auto leading-relaxed">
              Track every release, feature, improvement, and bug fix. We ship
              regularly and transparently.
            </p>
          </div>
        </div>
      </section>

      {/* Releases */}
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
          <div className="space-y-12">
            {releases.map((release) => (
              <div
                key={release.version}
                className="relative pl-8 border-l-2 border-stone-200"
              >
                {/* Version dot */}
                <div
                  className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 ${
                    release.type === "major"
                      ? "border-accent bg-accent"
                      : "border-stone-300 bg-white"
                  }`}
                />

                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-xl font-bold text-stone-900">
                      v{release.version}
                    </h2>
                    <span
                      className={`text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        release.type === "major"
                          ? "bg-accent/10 text-accent"
                          : "bg-stone-100 text-stone-500"
                      }`}
                    >
                      {release.type === "major" ? "Major Release" : "Update"}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-stone-700 mb-1">
                    {release.title}
                  </h3>
                  <p className="text-sm text-stone-400">{release.date}</p>
                </div>

                <ul className="space-y-3">
                  {release.changes.map((change, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <ChangeBadge type={change.type} />
                      <span className="text-sm text-stone-600 leading-relaxed pt-0.5">
                        {change.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* RSS Feed */}
          <div className="mt-12 text-center">
            <p className="text-sm text-stone-500 mb-4">
              Subscribe to our changelog via RSS or follow us on GitHub for
              real-time updates.
            </p>
            <div className="flex items-center justify-center gap-4">
              <a
                href="/changelog/rss.xml"
                className="inline-flex items-center gap-2 rounded-xl border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-700 hover:border-accent hover:text-accent transition-colors"
              >
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M6.18 15.64a2.18 2.18 0 010 4.36 2.18 2.18 0 010-4.36M4 4.44A15.56 15.56 0 0119.56 20h-2.83A12.73 12.73 0 004 7.27V4.44m0 5.66a9.9 9.9 0 019.9 9.9h-2.83A7.07 7.07 0 004 12.93v-2.83z" />
                </svg>
                RSS Feed
              </a>
              <a
                href="https://github.com/dinesh-g1/featuresignals/releases"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-700 hover:border-accent hover:text-accent transition-colors"
              >
                <GitBranch className="h-4 w-4" />
                GitHub Releases
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-stone-900">
        <div className="mx-auto max-w-7xl px-6 py-16 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Try the latest release
          </h2>
          <p className="text-stone-400 max-w-xl mx-auto mb-8">
            Start free, no credit card required. Full Pro features for 14 days.
          </p>
          <Link
            href="https://app.featuresignals.com/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-8 py-3.5 text-sm font-bold text-white hover:bg-accent-dark transition-colors shadow-lg"
          >
            <Sparkles className="h-4 w-4" />
            Start Free Trial
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>
      </section>
    </>
  );
}
