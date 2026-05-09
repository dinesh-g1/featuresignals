import type { Metadata } from "next";
import Link from "next/link";
import { Book, Rocket, Lightbulb, Code, Key, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Learn how to use FeatureSignals to ship faster, break nothing, and pay less than lunch.",
  openGraph: {
    title: "FeatureSignals Documentation",
    description:
      "The control plane for software delivery. Sub-millisecond feature flags, AI-powered stale flag detection, and OpenFeature-native SDKs.",
  },
};

const quickLinks = [
  {
    icon: Rocket,
    title: "Getting Started",
    description:
      "Install FeatureSignals in 5 minutes and create your first feature flag.",
    href: "/docs/getting-started/quickstart",
  },
  {
    icon: Lightbulb,
    title: "Core Concepts",
    description:
      "Understand feature flags, toggle categories, targeting, rollouts, and A/B experimentation.",
    href: "/docs/core-concepts/feature-flags",
  },
  {
    icon: Code,
    title: "SDKs",
    description:
      "Integrate with Go, Node.js, Python, Java, .NET, Ruby, React, Vue, or OpenFeature.",
    href: "/docs/sdks/overview",
  },
  {
    icon: Key,
    title: "API Reference",
    description:
      "Full REST API documentation with interactive playground for every endpoint.",
    href: "/docs/api-reference/overview",
  },
];

export default function DocsHomePage() {
  return (
    <div>
      {/* Hero */}
      <div className="mb-10">
        <h1
          id="docs-main-heading"
          className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
        >
          Documentation
        </h1>
        <p className="text-lg text-[var(--signal-fg-secondary)] max-w-2xl leading-relaxed">
          Learn how to use FeatureSignals to ship faster, break nothing, and pay
          less than lunch. Everything you need to go from zero to production
          with feature flags — no PhD required.
        </p>
      </div>

      {/* Quick-link cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="group block p-5 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] hover:border-[var(--signal-border-accent-muted)] hover:shadow-[var(--signal-shadow-md)] transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-[var(--signal-bg-accent-muted)] shrink-0">
                  <Icon size={20} className="text-[var(--signal-fg-accent)]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mb-1 group-hover:text-[var(--signal-fg-accent)] transition-colors">
                    {link.title}
                  </h3>
                  <p className="text-sm text-[var(--signal-fg-secondary)] leading-relaxed">
                    {link.description}
                  </p>
                </div>
                <ArrowRight
                  size={16}
                  className="text-[var(--signal-fg-tertiary)] group-hover:text-[var(--signal-fg-accent)] group-hover:translate-x-0.5 transition-all mt-1 shrink-0"
                />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Browse all sections */}
      <div className="border-t border-[var(--signal-border-default)] pt-8">
        <h2 className="text-lg font-semibold text-[var(--signal-fg-primary)] mb-4">
          Browse by Section
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "Introduction", href: "/docs/intro" },
            {
              label: "Core Concepts",
              href: "/docs/core-concepts/feature-flags",
            },
            { label: "Architecture", href: "/docs/architecture/overview" },
            {
              label: "Getting Started",
              href: "/docs/getting-started/quickstart",
            },
            {
              label: "Tutorials",
              href: "/docs/tutorials/feature-flag-checkout",
            },
            { label: "FlagEngine Guides", href: "/docs/dashboard/overview" },
            { label: "AI Janitor", href: "/docs/advanced/ai-janitor" },
            { label: "Platform", href: "/docs/advanced/relay-proxy" },
            { label: "IaC", href: "/docs/iac/overview" },
            { label: "Deployment", href: "/docs/deployment/docker-compose" },
            { label: "SDKs", href: "/docs/sdks/overview" },
            { label: "API Reference", href: "/docs/api-reference/overview" },
            {
              label: "Security & Compliance",
              href: "/docs/compliance/security-overview",
            },
            { label: "Enterprise", href: "/docs/enterprise/overview" },
            { label: "Glossary", href: "/docs/GLOSSARY" },
          ].map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-[var(--signal-fg-secondary)] hover:text-[var(--signal-fg-accent)] hover:bg-[var(--signal-bg-accent-muted)] transition-colors"
            >
              <Book size={14} className="shrink-0" />
              <span>{section.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
