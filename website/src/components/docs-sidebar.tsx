"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  Menu,
  X,
  Book,
  Rocket,
  Lightbulb,
  Code,
  Key,
  ShieldCheck,
  Server,
  Workflow,
  Package,
  Zap,
  Terminal,
  FileText,
  LifeBuoy,
  Building2,
  Globe,
  GitBranch,
  Puzzle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import apiCategories from "@/data/api-endpoints";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface NavLink {
  label: string;
  href: string;
  badge?: string;
}

interface NavGroup {
  label: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  links: NavLink[];
  collapsed?: boolean; // if true, collapsed by default
  badge?: string; // optional badge ("New", "Try It")
}

interface NavTier {
  label: string; // Tier label: "Concepts", "Guides", "Reference"
  groups: NavGroup[];
  collapsed: boolean; // Tier-level collapse default
}

/* ------------------------------------------------------------------ */
/*  Navigation Data — 3-Tier Progressive Disclosure                    */
/* ------------------------------------------------------------------ */

/**
 * Tier 1: CONCEPTS — "I want to understand"
 *
 * Builds the mental model. All sections open by default so
 * first-time learners see the full conceptual landscape.
 */
const tier1Concepts: NavTier = {
  label: "Concepts",
  collapsed: false,
  groups: [
    {
      label: "Introduction",
      icon: Book,
      links: [
        { label: "What is FeatureSignals?", href: "/docs/intro" },
        { label: "Quickstart", href: "/docs/getting-started/quickstart" },
        {
          label: "Installation",
          href: "/docs/getting-started/installation",
        },
      ],
    },
    {
      label: "Core Concepts",
      icon: Lightbulb,
      links: [
        {
          label: "Feature Flags",
          href: "/docs/core-concepts/feature-flags",
        },
        {
          label: "Toggle Categories",
          href: "/docs/core-concepts/toggle-categories",
        },
        {
          label: "Projects & Environments",
          href: "/docs/core-concepts/projects-and-environments",
        },
        {
          label: "Targeting & Segments",
          href: "/docs/core-concepts/targeting-and-segments",
        },
        {
          label: "Implementation Patterns",
          href: "/docs/core-concepts/implementation-patterns",
        },
        {
          label: "Percentage Rollouts",
          href: "/docs/core-concepts/percentage-rollouts",
        },
        {
          label: "A/B Experimentation",
          href: "/docs/core-concepts/ab-experimentation",
        },
        {
          label: "Mutual Exclusion",
          href: "/docs/core-concepts/mutual-exclusion",
        },
        {
          label: "Prerequisites",
          href: "/docs/core-concepts/prerequisites",
        },
        {
          label: "Flag Lifecycle",
          href: "/docs/core-concepts/flag-lifecycle",
        },
      ],
    },
    {
      label: "Architecture",
      icon: Package,
      links: [
        { label: "Overview", href: "/docs/architecture/overview" },
        {
          label: "Evaluation Engine",
          href: "/docs/architecture/evaluation-engine",
        },
        {
          label: "Real-Time Updates",
          href: "/docs/architecture/real-time-updates",
        },
      ],
    },
  ],
};

/**
 * Tier 2: GUIDES — "I want to do something"
 *
 * Activity-centered. Sections open by default so users can
 * scan all available guides.
 */
const tier2Guides: NavTier = {
  label: "Guides",
  collapsed: false,
  groups: [
    {
      label: "Quick Start",
      icon: Rocket,
      links: [
        { label: "Quickstart", href: "/docs/getting-started/quickstart" },
        {
          label: "Installation",
          href: "/docs/getting-started/installation",
        },
        {
          label: "Create Your First Flag",
          href: "/docs/getting-started/create-your-first-flag",
        },
      ],
    },
    {
      label: "Feature Flag Lifecycle",
      icon: GitBranch,
      collapsed: true,
      links: [
        {
          label: "Create a Flag",
          href: "/docs/core-concepts/feature-flags",
        },
        {
          label: "Target Users",
          href: "/docs/core-concepts/targeting-and-segments",
        },
        {
          label: "Roll Out Gradually",
          href: "/docs/core-concepts/percentage-rollouts",
        },
        {
          label: "Monitor Impact",
          href: "/docs/dashboard/evaluation-metrics",
        },
        {
          label: "Clean Up Stale Flags",
          href: "/docs/advanced/ai-janitor",
        },
        {
          label: "Migrate from Another Platform",
          href: "/docs/getting-started/migration-overview",
        },
      ],
    },
    {
      label: "Tutorials",
      icon: Zap,
      links: [
        {
          label: "Feature Flag a Checkout",
          href: "/docs/tutorials/feature-flag-checkout",
        },
        {
          label: "A/B Testing in React",
          href: "/docs/tutorials/ab-testing-react",
        },
        {
          label: "Progressive Rollout",
          href: "/docs/tutorials/progressive-rollout",
        },
        {
          label: "Kill Switch Pattern",
          href: "/docs/tutorials/kill-switch",
        },
      ],
    },
    {
      label: "FlagEngine Guides",
      icon: Terminal,
      links: [
        {
          label: "Dashboard Overview",
          href: "/docs/dashboard/overview",
        },
        {
          label: "Managing Flags",
          href: "/docs/dashboard/managing-flags",
        },
        {
          label: "Environment Comparison",
          href: "/docs/dashboard/env-comparison",
        },
        {
          label: "Target Inspector",
          href: "/docs/dashboard/target-inspector",
        },
        {
          label: "Target Comparison",
          href: "/docs/dashboard/target-comparison",
        },
        {
          label: "Evaluation Metrics",
          href: "/docs/dashboard/evaluation-metrics",
        },
        {
          label: "Flag Health",
          href: "/docs/dashboard/flag-health",
        },
        {
          label: "Usage Insights",
          href: "/docs/dashboard/usage-insights",
        },
      ],
    },
    {
      label: "AI Janitor",
      icon: Zap,
      badge: "New",
      links: [
        { label: "Overview", href: "/docs/advanced/ai-janitor" },
        {
          label: "Quickstart",
          href: "/docs/advanced/ai-janitor-quickstart",
        },
        {
          label: "Git Providers",
          href: "/docs/advanced/ai-janitor-git-providers",
        },
        {
          label: "Configuration",
          href: "/docs/advanced/ai-janitor-configuration",
        },
        {
          label: "PR Workflow",
          href: "/docs/advanced/ai-janitor-pr-workflow",
        },
        {
          label: "LLM Integration",
          href: "/docs/advanced/ai-janitor-llm-integration",
        },
        {
          label: "Troubleshooting",
          href: "/docs/advanced/ai-janitor-troubleshooting",
        },
      ],
    },
    {
      label: "Platform",
      icon: Workflow,
      links: [
        { label: "Relay Proxy", href: "/docs/advanced/relay-proxy" },
        { label: "Scheduling", href: "/docs/advanced/scheduling" },
        { label: "Kill Switch", href: "/docs/advanced/kill-switch" },
        {
          label: "Approval Workflows",
          href: "/docs/advanced/approval-workflows",
        },
        { label: "Webhooks", href: "/docs/advanced/webhooks" },
        { label: "Audit Logging", href: "/docs/advanced/audit-logging" },
        { label: "RBAC", href: "/docs/advanced/rbac" },
      ],
    },
    {
      label: "Infrastructure as Code",
      icon: Code,
      links: [
        { label: "Overview", href: "/docs/iac/overview" },
        { label: "Terraform", href: "/docs/iac/terraform" },
        { label: "Pulumi", href: "/docs/iac/pulumi" },
        { label: "Ansible", href: "/docs/iac/ansible" },
      ],
    },
    {
      label: "Deployment",
      icon: Server,
      links: [
        {
          label: "Docker Compose",
          href: "/docs/deployment/docker-compose",
        },
        { label: "Self-Hosting", href: "/docs/deployment/self-hosting" },
        { label: "On-Premises", href: "/docs/deployment/on-premises" },
        { label: "Configuration", href: "/docs/deployment/configuration" },
        {
          label: "Onboarding Guide",
          href: "/docs/self-hosting/onboarding-guide",
        },
      ],
    },
  ],
};

/**
 * Tier 3: REFERENCE — "I want the details"
 *
 * Deep reference material. Collapsed by default to keep the
 * sidebar scannable; power users expand as needed.
 */
const tier3Reference: NavTier = {
  label: "Reference",
  collapsed: true,
  groups: [
    {
      label: "API Reference",
      icon: Key,
      links: [
        { label: "Overview", href: "/docs/api-reference/overview" },
        ...apiCategories.map((cat) => ({
          label: cat.name,
          href: `/docs/api-reference/${cat.slug}`,
        })),
        {
          label: "Playground",
          href: "/docs/api-reference/playground",
          badge: "Try It",
        },
      ],
    },
    {
      label: "SDKs",
      icon: Code,
      links: [
        { label: "Overview", href: "/docs/sdks/overview" },
        { label: "Go", href: "/docs/sdks/go" },
        { label: "Node.js", href: "/docs/sdks/nodejs" },
        { label: "Python", href: "/docs/sdks/python" },
        { label: "Java", href: "/docs/sdks/java" },
        { label: ".NET", href: "/docs/sdks/dotnet" },
        { label: "Ruby", href: "/docs/sdks/ruby" },
        { label: "React", href: "/docs/sdks/react" },
        { label: "Vue", href: "/docs/sdks/vue" },
        { label: "OpenFeature", href: "/docs/sdks/openfeature" },
      ],
    },
    {
      label: "Security & Compliance",
      icon: ShieldCheck,
      links: [
        {
          label: "Security Overview",
          href: "/docs/compliance/security-overview",
        },
        { label: "GDPR", href: "/docs/compliance/privacy-policy" },
        { label: "SOC 2", href: "/docs/compliance/soc2/controls-matrix" },
        { label: "CCPA / CPRA", href: "/docs/compliance/ccpa-cpra" },
        { label: "HIPAA", href: "/docs/compliance/hipaa" },
        { label: "DORA", href: "/docs/compliance/dora" },
        { label: "CSA STAR", href: "/docs/compliance/csa-star" },
        {
          label: "Data Privacy Framework",
          href: "/docs/compliance/data-privacy-framework",
        },
        {
          label: "ISO 27001",
          href: "/docs/compliance/iso27001/isms-overview",
        },
        {
          label: "ISO 27701",
          href: "/docs/compliance/iso27701/pims-overview",
        },
      ],
    },
    {
      label: "Enterprise",
      icon: Building2,
      links: [
        { label: "Overview", href: "/docs/enterprise/overview" },
        { label: "Onboarding", href: "/docs/enterprise/onboarding" },
      ],
    },
    {
      label: "Operations",
      icon: LifeBuoy,
      links: [
        {
          label: "Incident Runbook",
          href: "/docs/operations/incident-runbook",
        },
        {
          label: "Disaster Recovery",
          href: "/docs/operations/disaster-recovery",
        },
      ],
    },
    {
      label: "Migration",
      icon: Globe,
      links: [
        {
          label: "Overview",
          href: "/docs/getting-started/migration-overview",
        },
        {
          label: "From LaunchDarkly",
          href: "/docs/getting-started/migrate-from-launchdarkly",
        },
        {
          label: "From Flagsmith",
          href: "/docs/getting-started/migrate-from-flagsmith",
        },
        {
          label: "From Unleash",
          href: "/docs/getting-started/migrate-from-unleash",
        },
        {
          label: "IaC Export",
          href: "/docs/getting-started/migration-iac-export",
        },
        {
          label: "Troubleshooting",
          href: "/docs/getting-started/migration-troubleshooting",
        },
      ],
    },
    {
      label: "Glossary",
      icon: FileText,
      links: [{ label: "Glossary", href: "/docs/GLOSSARY" }],
    },
  ],
};

/** All tiers in display order. */
const NAV_TIERS: NavTier[] = [tier1Concepts, tier2Guides, tier3Reference];

/* ------------------------------------------------------------------ */
/*  DocsSidebar Component                                              */
/* ------------------------------------------------------------------ */

export function DocsSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close mobile sidebar on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const isActive = useCallback(
    (href: string) => {
      if (href === "/docs") return pathname === "/docs";
      return pathname === href || pathname.startsWith(href + "#");
    },
    [pathname],
  );

  const isTierActive = useCallback(
    (tier: NavTier) => {
      return tier.groups.some((group) =>
        group.links.some((link) => isActive(link.href)),
      );
    },
    [isActive],
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        className="lg:hidden fixed bottom-6 right-6 z-50 flex items-center justify-center w-12 h-12 rounded-full bg-[var(--signal-bg-accent-emphasis)] text-white shadow-[var(--signal-shadow-lg)] hover:opacity-90 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={
          mobileOpen ? "Close documentation menu" : "Open documentation menu"
        }
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Sidebar — desktop: sticky; mobile: slide-over drawer */}
      <aside
        aria-label="Documentation sidebar"
        className={cn(
          // Desktop
          "lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto",
          "lg:flex lg:flex-col lg:z-20",
          "lg:border-r lg:border-[var(--signal-border-default)]",
          "lg:bg-[var(--signal-bg-primary)]",
          // Mobile
          "fixed inset-y-0 left-0 z-50 w-[300px] max-w-[85vw]",
          "bg-[var(--signal-bg-primary)] border-r border-[var(--signal-border-default)]",
          "shadow-[var(--signal-shadow-lg)]",
          "flex flex-col",
          "transition-transform duration-300 ease-in-out",
          "lg:transition-none",
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Sidebar header (mobile close) */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-[var(--signal-border-default)]">
          <Link
            href="/docs"
            className="flex items-center gap-2 font-semibold text-[var(--signal-fg-primary)]"
            onClick={() => setMobileOpen(false)}
          >
            <Book size={18} />
            <span>Documentation</span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-2 rounded-md hover:bg-[var(--signal-bg-secondary)] transition-colors"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav scroll area */}
        <nav className="flex-1 overflow-y-auto py-4 px-3" role="navigation">
          {/* Docs Home link */}
          <Link
            href="/docs"
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium mb-4 transition-colors",
              isActive("/docs")
                ? "bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)]"
                : "text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-secondary)]",
            )}
          >
            <Book size={16} />
            <span>Docs Home</span>
          </Link>

          {/* Three Tiers */}
          {NAV_TIERS.map((tier) => (
            <TierSection
              key={tier.label}
              tier={tier}
              isActive={isActive}
              isTierActive={isTierActive}
            />
          ))}
        </nav>

        {/* Bottom help */}
        <div className="border-t border-[var(--signal-border-default)] p-4">
          <a
            href="https://github.com/dinesh-g1/featuresignals/discussions"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-[var(--signal-fg-secondary)] hover:text-[var(--signal-fg-accent)] transition-colors"
          >
            <Puzzle size={14} />
            <span>Ask the community on GitHub Discussions</span>
          </a>
        </div>
      </aside>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Tier Section (expandable tier with groups)                         */
/* ------------------------------------------------------------------ */

function TierSection({
  tier,
  isActive,
  isTierActive,
}: {
  tier: NavTier;
  isActive: (href: string) => boolean;
  isTierActive: (tier: NavTier) => boolean;
}) {
  const tierActive = isTierActive(tier);
  const [expanded, setExpanded] = useState(!tier.collapsed || tierActive);

  return (
    <div className="mb-2">
      {/* Tier header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex items-center justify-between w-full px-3 py-2 text-left rounded-md transition-colors",
          "text-xs font-bold uppercase tracking-widest",
          tierActive
            ? "text-[var(--signal-fg-accent)]"
            : "text-[var(--signal-fg-secondary)] hover:text-[var(--signal-fg-primary)]",
        )}
        aria-expanded={expanded}
      >
        <span>{tier.label}</span>
        <ChevronRight
          size={14}
          className={cn(
            "transition-transform duration-200",
            expanded && "rotate-90",
          )}
        />
      </button>

      {/* Groups within tier */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {tier.groups.map((group) => (
              <SidebarGroup
                key={group.label}
                group={group}
                isActive={isActive}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sidebar Group (expandable group within a tier)                     */
/* ------------------------------------------------------------------ */

function SidebarGroup({
  group,
  isActive,
}: {
  group: NavGroup;
  isActive: (href: string) => boolean;
}) {
  const groupActive = group.links.some((link) => isActive(link.href));
  const defaultExpanded = group.collapsed === false || groupActive;
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasIcon = Boolean(group.icon);
  const Icon = group.icon;

  return (
    <div className="mb-0.5">
      {/* Group header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex items-center justify-between w-full px-3 py-1.5 text-left rounded-md transition-colors",
          "text-[13px] font-medium",
          groupActive
            ? "text-[var(--signal-fg-accent)]"
            : "text-[var(--signal-fg-secondary)] hover:text-[var(--signal-fg-primary)]",
        )}
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2 truncate">
          {hasIcon && Icon && <Icon size={14} />}
          <span>{group.label}</span>
          {"badge" in group && typeof group.badge === "string" && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)] leading-none">
              {(group as { badge?: string }).badge}
            </span>
          )}
        </span>
        <ChevronRight
          size={14}
          className={cn(
            "transition-transform duration-200 shrink-0",
            expanded && "rotate-90",
          )}
        />
      </button>

      {/* Links */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.ul
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="overflow-hidden"
            role="list"
          >
            {group.links.map((link) => {
              const active = isActive(link.href);
              return (
                <li key={link.href} role="listitem">
                  <Link
                    href={link.href}
                    className={cn(
                      "flex items-center gap-2 pl-9 pr-3 py-1.5 text-sm rounded-md transition-colors",
                      active
                        ? "bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)] font-medium"
                        : "text-[var(--signal-fg-secondary)] hover:text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-secondary)]",
                    )}
                  >
                    <span className="truncate">{link.label}</span>
                    {link.badge && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)] leading-none shrink-0">
                        {link.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
