import type { Metadata } from "next";
import Link from "next/link";
import {
  RocketIcon,
  CodeIcon,
  KeyIcon,
  LightBulbIcon,
  GitBranchIcon,
  ServerIcon,
  BookIcon,
  ShieldCheckIcon,
  BeakerIcon,
  GraphIcon,
  WorkflowIcon,
  ArrowRightIcon,
} from "@primer/octicons-react";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "FeatureSignals documentation — learn about feature flags, SDKs, API reference, AI Janitor, deployment, and compliance.",
};

const quickLinks = [
  {
    title: "Getting Started",
    description: "Get FeatureSignals running locally in under 5 minutes.",
    href: "/docs/getting-started/quickstart",
    icon: RocketIcon,
  },
  {
    title: "SDK Overview",
    description: "Integrate with Go, Node.js, Python, Java, .NET, Ruby, React, or Vue.",
    href: "/docs/sdks/overview",
    icon: CodeIcon,
  },
  {
    title: "API Reference",
    description: "REST API for flag management, evaluation, webhooks, and administration.",
    href: "/docs/api-reference/overview",
    icon: KeyIcon,
  },
  {
    title: "AI Janitor",
    description: "Automatically detect and clean up stale feature flags with AI.",
    href: "/docs/advanced/ai-janitor",
    icon: LightBulbIcon,
  },
  {
    title: "Migration Guide",
    description: "Import from LaunchDarkly, ConfigCat, Flagsmith, or Unleash.",
    href: "/docs/platform/migration",
    icon: GitBranchIcon,
  },
  {
    title: "Deployment",
    description: "Deploy via Docker Compose, self-host, or configure for production.",
    href: "/docs/deployment/docker-compose",
    icon: ServerIcon,
  },
];

const popularTopics = [
  { label: "Create Your First Flag", href: "/docs/getting-started/create-your-first-flag" },
  { label: "Feature Flag Concepts", href: "/docs/core-concepts/feature-flags" },
  { label: "Toggle Categories", href: "/docs/core-concepts/toggle-categories" },
  { label: "Targeting & Segments", href: "/docs/core-concepts/targeting-and-segments" },
  { label: "Percentage Rollouts", href: "/docs/core-concepts/percentage-rollouts" },
  { label: "A/B Experimentation", href: "/docs/core-concepts/ab-experimentation" },
  { label: "Flag Lifecycle", href: "/docs/core-concepts/flag-lifecycle" },
  { label: "OpenFeature Support", href: "/docs/sdks/openfeature" },
  { label: "Authentication", href: "/docs/api-reference/authentication" },
  { label: "Webhooks", href: "/docs/platform/webhooks" },
  { label: "Audit Logging", href: "/docs/platform/audit-logging" },
  { label: "RBAC", href: "/docs/platform/rbac" },
  { label: "Self-Hosting Guide", href: "/docs/deployment/self-hosting" },
  { label: "Configuration Reference", href: "/docs/deployment/configuration" },
  { label: "Security Overview", href: "/docs/compliance/security-overview" },
  { label: "GDPR Compliance", href: "/docs/compliance/gdpr" },
];

export default function DocsPage() {
  return (
    <div>
      {/* Hero */}
      <div className="mb-12">
        <h1
          id="docs-main-heading"
          className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--fgColor-default)] mb-4"
        >
          Documentation
        </h1>
        <p className="text-lg text-[var(--fgColor-muted)] max-w-2xl leading-relaxed">
          FeatureSignals is an <strong>open-source, AI-powered feature flag management platform</strong>{" "}
          built for modern engineering teams. Ship features safely with targeted rollouts, run
          data-driven A/B experiments, clean stale flags automatically with AI, and recover from
          incidents in seconds — all without vendor lock-in or surprise bills.
        </p>
      </div>

      {/* Quick Links Grid */}
      <section className="mb-14" aria-labelledby="quick-links-heading">
        <h2
          id="quick-links-heading"
          className="text-xl font-semibold text-[var(--fgColor-default)] mb-6"
        >
          Quick Links
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex flex-col p-5 rounded-lg border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] hover:border-[var(--borderColor-accent-emphasis)] hover:shadow-[var(--shadow-resting-medium)] transition-all duration-200"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="flex items-center justify-center w-9 h-9 rounded-md bg-[var(--bgColor-accent-muted)] text-[var(--fgColor-accent)]">
                  <link.icon size={18} />
                </span>
                <h3 className="font-semibold text-[var(--fgColor-default)] group-hover:text-[var(--fgColor-accent)] transition-colors">
                  {link.title}
                </h3>
              </div>
              <p className="text-sm text-[var(--fgColor-muted)] leading-relaxed">
                {link.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Popular Topics */}
      <section aria-labelledby="popular-topics-heading">
        <h2
          id="popular-topics-heading"
          className="text-xl font-semibold text-[var(--fgColor-default)] mb-6"
        >
          Popular Topics
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {popularTopics.map((topic) => (
            <Link
              key={topic.href}
              href={topic.href}
              className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm text-[var(--fgColor-default)] hover:bg-[var(--bgColor-inset)] hover:text-[var(--fgColor-accent)] transition-colors group"
            >
              <ArrowRightIcon
                size={14}
                className="text-[var(--fgColor-muted)] group-hover:text-[var(--fgColor-accent)] transition-colors shrink-0"
              />
              <span>{topic.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Help footer */}
      <div className="mt-16 p-6 rounded-lg border border-[var(--borderColor-default)] bg-[var(--bgColor-inset)]">
        <div className="flex items-start gap-3">
          <BookIcon size={20} className="text-[var(--fgColor-accent)] mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold text-[var(--fgColor-default)] mb-1">
              Can&apos;t find what you&apos;re looking for?
            </h3>
            <p className="text-sm text-[var(--fgColor-muted)] mb-3">
              Ask the community on GitHub Discussions, or{" "}
              <a
                href="https://github.com/dinesh-g1/featuresignals/issues/new"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--fgColor-accent)] hover:underline"
              >
                open an issue
              </a>{" "}
              on GitHub.
            </p>
            <a
              href="https://github.com/dinesh-g1/featuresignals/discussions"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--fgColor-accent)] hover:underline"
            >
              <span>Browse Discussions</span>
              <ArrowRightIcon size={14} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
