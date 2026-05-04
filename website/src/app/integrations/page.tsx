"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  CodeIcon,
  ServerIcon,
  RocketIcon,
  ShieldLockIcon,
  GraphIcon,
  CommentDiscussionIcon,
  GitBranchIcon,
  OrganizationIcon,
  PackageIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  GlobeIcon,
  KeyIcon,
  PeopleIcon,
  WorkflowIcon,
  ContainerIcon,
  CloudIcon,
  BellIcon,
  MegaphoneIcon,
  BroadcastIcon,
} from "@primer/octicons-react";
import { cn } from "@/lib/utils";

/* ==========================================================================
   Data
   ========================================================================== */

type Integration = {
  name: string;
  description: string;
  href: string;
  external?: boolean;
};

type IntegrationCategory = {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  items: Integration[];
};

const categories: IntegrationCategory[] = [
  {
    id: "sdks",
    label: "SDKs",
    icon: CodeIcon,
    items: [
      {
        name: "Go",
        description:
          "Native Go SDK with sub-microsecond overhead. OpenFeature-compliant provider. Ideal for high-performance microservices.",
        href: "/docs/sdks/go",
      },
      {
        name: "Node.js",
        description:
          "First-class TypeScript support. Works with Express, Fastify, Next.js, and any Node runtime. OpenFeature provider included.",
        href: "/docs/sdks/nodejs",
      },
      {
        name: "Python",
        description:
          "Async support with asyncio. Django, Flask, FastAPI integrations. Zero-copy evaluation for hot paths.",
        href: "/docs/sdks/python",
      },
      {
        name: "Java",
        description:
          "JVM-native with no reflection overhead. Spring Boot autoconfiguration. GraalVM native image compatible.",
        href: "/docs/sdks/java",
      },
      {
        name: ".NET",
        description:
          "Native AOT compatible. Minimal allocations on the hot path. ASP.NET Core middleware included.",
        href: "/docs/sdks/dotnet",
      },
      {
        name: "Ruby",
        description:
          "Rack middleware for Rails and Sinatra. Fiber-safe evaluation. Built-in caching with configurable TTL.",
        href: "/docs/sdks/ruby",
      },
      {
        name: "React",
        description:
          "Hooks-based API with automatic context propagation. Suspense-compatible. Works with Next.js App Router and Pages Router.",
        href: "/docs/sdks/react",
      },
      {
        name: "Vue",
        description:
          "Composition API plugin. Reactive flag evaluation with automatic stale-while-revalidate caching.",
        href: "/docs/sdks/vue",
      },
      {
        name: "OpenFeature",
        description:
          "All 8 SDKs are OpenFeature-compliant. Use the OpenFeature unified API. Switch providers with one line of code. Zero vendor lock-in.",
        href: "/integrations#openfeature",
      },
    ],
  },
  {
    id: "iac",
    label: "Infrastructure as Code",
    icon: ServerIcon,
    items: [
      {
        name: "Terraform",
        description:
          "Manage flags, environments, and targeting rules as code. Full CRUD provider with import support. Plan before apply.",
        href: "/integrations#iac",
      },
      {
        name: "Pulumi",
        description:
          "Define feature flags in TypeScript, Python, Go, or C#. Same Infrastructure as Code workflow you already use.",
        href: "/integrations#iac",
      },
      {
        name: "Ansible",
        description:
          "Declarative flag management in your existing Ansible playbooks. Idempotent modules for every resource.",
        href: "/integrations#iac",
      },
      {
        name: "Crossplane",
        description:
          "Kubernetes-native feature flag management. Compose flags as part of your platform API with Crossplane providers.",
        href: "/integrations#iac",
      },
    ],
  },
  {
    id: "cicd",
    label: "CI/CD",
    icon: RocketIcon,
    items: [
      {
        name: "GitHub Actions",
        description:
          "Validate flag configurations in CI. Block PRs that reference stale flags. Automate flag creation from feature branches.",
        href: "/integrations#cicd",
      },
      {
        name: "GitLab CI",
        description:
          "Native GitLab CI integration. Flag validation in merge request pipelines. Automated cleanup suggestions.",
        href: "/integrations#cicd",
      },
      {
        name: "Jenkins",
        description:
          "Pipeline plugin for flag lifecycle management. Toggle flags during canary deployments. Rollback automation.",
        href: "/integrations#cicd",
      },
      {
        name: "CircleCI",
        description:
          "Orb for flag operations. Validate, create, and archive flags from your CircleCI pipelines.",
        href: "/integrations#cicd",
      },
      {
        name: "ArgoCD",
        description:
          "GitOps-native flag management. Sync flag state alongside application state. Declarative rollouts and rollbacks.",
        href: "/integrations#cicd",
      },
    ],
  },
  {
    id: "sso",
    label: "Identity Providers",
    icon: ShieldLockIcon,
    items: [
      {
        name: "Okta",
        description:
          "SAML and OIDC SSO. SCIM provisioning for automated user lifecycle management. Just-in-time provisioning.",
        href: "/integrations#sso",
      },
      {
        name: "Azure AD",
        description:
          "Microsoft Entra ID (Azure AD) integration. Group-based access control. Conditional access policies.",
        href: "/integrations#sso",
      },
      {
        name: "Google Workspace",
        description:
          "OIDC SSO for Google Workspace organizations. Domain-restricted sign-in. Automatic user provisioning.",
        href: "/integrations#sso",
      },
      {
        name: "GitHub",
        description:
          "OAuth SSO via GitHub. Map GitHub teams to FeatureSignals roles. Enforce 2FA requirements.",
        href: "/integrations#sso",
      },
      {
        name: "GitLab",
        description:
          "OIDC SSO for GitLab.com and self-managed instances. Group-based access mapping.",
        href: "/integrations#sso",
      },
      {
        name: "Custom OIDC",
        description:
          "Bring your own OIDC provider. Standard-compliant integration with any identity platform. SCIM 2.0 support.",
        href: "/integrations#sso",
      },
    ],
  },
  {
    id: "monitoring",
    label: "Monitoring & Logging",
    icon: GraphIcon,
    items: [
      {
        name: "Datadog",
        description:
          "Stream flag change events to Datadog. Correlate flag toggles with performance metrics. Built-in dashboard widgets.",
        href: "/integrations#monitoring",
      },
      {
        name: "Grafana",
        description:
          "Pre-built Grafana dashboards for flag evaluation metrics. Alert on flag change events. Prometheus metrics endpoint.",
        href: "/integrations#monitoring",
      },
      {
        name: "Prometheus",
        description:
          "Native Prometheus metrics endpoint. Histograms for evaluation latency. Counters for flag evaluations by status.",
        href: "/integrations#monitoring",
      },
      {
        name: "SigNoz",
        description:
          "OpenTelemetry-native observability. Flag changes appear in distributed traces. Correlate releases with errors.",
        href: "/integrations#monitoring",
      },
    ],
  },
  {
    id: "communication",
    label: "Communication",
    icon: CommentDiscussionIcon,
    items: [
      {
        name: "Slack",
        description:
          "Real-time flag change notifications. Flag creation and toggle from Slack. Approval workflows in-channel.",
        href: "/integrations#communication",
      },
      {
        name: "Discord",
        description:
          "Webhook-based notifications to Discord channels. Flag events, audit log streaming, and deployment alerts.",
        href: "/integrations#communication",
      },
      {
        name: "Microsoft Teams",
        description:
          "Adaptive Cards for flag change notifications. Incoming webhook integration. Approval workflows.",
        href: "/integrations#communication",
      },
      {
        name: "PagerDuty",
        description:
          "Route critical flag incidents to on-call engineers. Flag kill-switch alerts. Incident correlation.",
        href: "/integrations#communication",
      },
    ],
  },
  {
    id: "git",
    label: "Git Providers",
    icon: GitBranchIcon,
    items: [
      {
        name: "GitHub",
        description:
          "AI Janitor scans your repositories for stale flag references. Automated PRs to remove dead flag code. Branch protection aware.",
        href: "/integrations#git",
      },
      {
        name: "GitLab",
        description:
          "Merge request integration for stale flag removal. GitLab CI pipeline for flag validation. Repository mirroring support.",
        href: "/integrations#git",
      },
      {
        name: "Bitbucket",
        description:
          "Bitbucket Cloud and Data Center support. Pull request automation for flag cleanup. Pipeline integration.",
        href: "/integrations#git",
      },
      {
        name: "Azure DevOps",
        description:
          "Azure Repos integration. Pull request annotations for stale flag detection. Work item linking.",
        href: "/integrations#git",
      },
    ],
  },
  {
    id: "openfeature",
    label: "OpenFeature",
    icon: OrganizationIcon,
    items: [
      {
        name: "OpenFeature Native",
        description:
          "All 8 FeatureSignals SDKs are OpenFeature-compliant providers. Write against the OpenFeature API. Switch from any vendor in minutes — not months.",
        href: "/integrations#openfeature",
      },
      {
        name: "Zero Vendor Lock-In",
        description:
          "Your application code depends on the OpenFeature standard, not FeatureSignals. Switch providers by changing one configuration line. No code rewrites.",
        href: "/integrations#openfeature",
      },
      {
        name: "Multi-Provider Support",
        description:
          "Run multiple feature flag providers simultaneously. Use FeatureSignals for release flags and another provider for experiments. OpenFeature makes it possible.",
        href: "/integrations#openfeature",
      },
      {
        name: "Community Standard",
        description:
          "OpenFeature is a CNCF project with contributors from Google, Microsoft, Dynatrace, and more. FeatureSignals is a proud early adopter and contributor.",
        href: "/integrations#openfeature",
      },
    ],
  },
];

/* ==========================================================================
   Filter Tabs
   ========================================================================== */

type FilterTab = {
  id: string;
  label: string;
};

const filterTabs: FilterTab[] = [
  { id: "all", label: "All" },
  { id: "sdks", label: "SDKs" },
  { id: "iac", label: "IaC" },
  { id: "sso", label: "Identity" },
  { id: "cicd", label: "CI/CD" },
  { id: "monitoring", label: "Monitoring" },
];

/* ==========================================================================
   Animation Presets
   ========================================================================== */

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-64px" },
  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
};

/* ==========================================================================
   Page
   ========================================================================== */

export default function IntegrationsPage() {
  const [activeFilter, setActiveFilter] = useState("all");

  const filteredCategories = useMemo(() => {
    if (activeFilter === "all") return categories;
    return categories.filter((c) => c.id === activeFilter);
  }, [activeFilter]);

  return (
    <>
      <HeroSection />
      <FilterBar activeFilter={activeFilter} onChange={setActiveFilter} />
      <IntegrationsContent categories={filteredCategories} />
      <OpenFeatureHighlight />
    </>
  );
}

/* ==========================================================================
   Hero
   ========================================================================== */

function HeroSection() {
  return (
    <section
      id="hero"
      className="py-20 sm:py-28 bg-[var(--bgColor-default)]"
      aria-labelledby="integrations-hero-heading"
    >
      <div className="mx-auto max-w-3xl px-6 text-center">
        <motion.p
          className="text-xs font-semibold text-[var(--fgColor-accent)] uppercase tracking-wider mb-4"
          {...fadeUp}
        >
          Integrations
        </motion.p>
        <motion.h1
          id="integrations-hero-heading"
          className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--fgColor-default)] tracking-tight mb-4"
          {...fadeUp}
        >
          Works with your stack
        </motion.h1>
        <motion.p
          className="text-lg text-[var(--fgColor-muted)] max-w-xl mx-auto"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-64px" }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          FeatureSignals integrates with the tools your team already uses. Open
          standards. No lock-in.
        </motion.p>
      </div>
    </section>
  );
}

/* ==========================================================================
   Filter Bar
   ========================================================================== */

function FilterBar({
  activeFilter,
  onChange,
}: {
  activeFilter: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="sticky top-[72px] z-30 bg-[var(--bgColor-default)] border-b border-[var(--borderColor-default)]">
      <div className="mx-auto max-w-7xl px-6">
        <div
          className="flex items-center gap-1 py-3 overflow-x-auto scrollbar-hide"
          role="tablist"
          aria-label="Integration categories"
        >
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeFilter === tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                "shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150",
                activeFilter === tab.id
                  ? "bg-[var(--bgColor-accent-emphasis)] text-[var(--fgColor-onEmphasis)]"
                  : "text-[var(--fgColor-muted)] hover:text-[var(--fgColor-default)] hover:bg-[var(--bgColor-muted)]",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   Integrations Grid
   ========================================================================== */

function IntegrationsContent({
  categories: filteredCategories,
}: {
  categories: IntegrationCategory[];
}) {
  return (
    <div className="py-16 sm:py-20 bg-[var(--bgColor-inset)]">
      <div className="mx-auto max-w-7xl px-6">
        {filteredCategories.map((category, catIndex) => (
          <motion.section
            key={category.id}
            id={category.id}
            className={cn(catIndex > 0 && "mt-16")}
            aria-labelledby={`category-${category.id}`}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{
              duration: 0.4,
              delay: catIndex * 0.05,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-lg bg-[var(--bgColor-accent-muted)] flex items-center justify-center">
                <category.icon
                  size={18}
                  className="text-[var(--fgColor-accent)]"
                />
              </div>
              <h2
                id={`category-${category.id}`}
                className="text-xl font-semibold text-[var(--fgColor-default)]"
              >
                {category.label}
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.items.map((item, itemIndex) => (
                <motion.div
                  key={item.name}
                  className="group rounded-xl border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] p-5 hover:border-[var(--borderColor-accent-muted)] hover:shadow-[var(--shadow-resting-medium)] transition-all duration-200"
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-20px" }}
                  transition={{
                    duration: 0.35,
                    delay: itemIndex * 0.04,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <h3 className="text-sm font-semibold text-[var(--fgColor-default)] mb-1.5">
                    {item.name}
                  </h3>
                  <p className="text-sm text-[var(--fgColor-muted)] leading-relaxed mb-3">
                    {item.description}
                  </p>
                  {item.external ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-[var(--fgColor-accent)] hover:underline"
                    >
                      Learn more
                      <ArrowRightIcon size={12} />
                    </a>
                  ) : (
                    <Link
                      href={item.href}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[var(--fgColor-accent)] hover:underline"
                    >
                      Learn more
                      <ArrowRightIcon size={12} />
                    </Link>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.section>
        ))}
      </div>
    </div>
  );
}

/* ==========================================================================
   OpenFeature Highlight
   ========================================================================== */

function OpenFeatureHighlight() {
  return (
    <section
      id="openfeature"
      className="py-20 sm:py-28 bg-[var(--bgColor-default)]"
      aria-labelledby="openfeature-heading"
    >
      <div className="mx-auto max-w-7xl px-6">
        <motion.div className="text-center max-w-2xl mx-auto" {...fadeUp}>
          <div className="w-14 h-14 rounded-2xl bg-[var(--bgColor-done-muted)] flex items-center justify-center mx-auto mb-6">
            <OrganizationIcon
              size={28}
              className="text-[var(--fgColor-done)]"
            />
          </div>
          <h2
            id="openfeature-heading"
            className="text-2xl sm:text-3xl font-bold text-[var(--fgColor-default)] tracking-tight mb-3"
          >
            OpenFeature Native. Zero vendor lock-in.
          </h2>
          <p className="text-base text-[var(--fgColor-muted)] max-w-lg mx-auto mb-10">
            All 8 FeatureSignals SDKs are OpenFeature-compliant providers. Your
            application code depends on the OpenFeature standard — not on us.
            Switch providers with one line of configuration.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
          {[
            {
              icon: CodeIcon,
              title: "One API",
              description:
                "Write against the OpenFeature unified API. Works across 8 languages. Consistent evaluation semantics everywhere.",
            },
            {
              icon: WorkflowIcon,
              title: "Swap Anytime",
              description:
                "Change your feature flag provider by updating one configuration line. No code rewrites. No migration projects.",
            },
            {
              icon: CheckCircleIcon,
              title: "CNCF Standard",
              description:
                "OpenFeature is a CNCF incubating project. Backed by Google, Microsoft, Dynatrace, and more.",
            },
            {
              icon: ContainerIcon,
              title: "Multi-Provider",
              description:
                "Run FeatureSignals alongside another provider. Use each for what it does best. OpenFeature makes it seamless.",
            },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                duration: 0.4,
                delay: i * 0.08,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <div className="w-10 h-10 rounded-lg bg-[var(--bgColor-done-muted)] flex items-center justify-center mx-auto mb-3">
                <item.icon
                  size={20}
                  className="text-[var(--fgColor-done)]"
                />
              </div>
              <h3 className="text-sm font-semibold text-[var(--fgColor-default)] mb-1.5">
                {item.title}
              </h3>
              <p className="text-xs text-[var(--fgColor-muted)] leading-relaxed">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.p
          className="text-center mt-10"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-30px" }}
          transition={{ duration: 0.4, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link
            href="/docs/sdks"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--fgColor-done)] hover:underline"
          >
            Explore OpenFeature SDKs
            <ArrowRightIcon size={14} />
          </Link>
        </motion.p>
      </div>
    </section>
  );
}
