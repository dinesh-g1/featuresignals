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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import apiCategories from "@/data/api-endpoints";

/* ------------------------------------------------------------------ */
/*  Navigation Data                                                    */
/* ------------------------------------------------------------------ */

interface NavLink {
  label: string;
  href: string;
  badge?: string;
}

interface NavSection {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  links: NavLink[];
}

const docsNavigation: NavSection[] = [
  {
    label: "Getting Started",
    icon: Rocket,
    links: [
      { label: "Quickstart", href: "/docs/getting-started/quickstart" },
      { label: "Installation", href: "/docs/getting-started/installation" },
      {
        label: "Create Your First Flag",
        href: "/docs/getting-started/create-your-first-flag",
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
        label: "Percentage Rollouts",
        href: "/docs/core-concepts/percentage-rollouts",
      },
      {
        label: "A/B Experimentation",
        href: "/docs/core-concepts/ab-experimentation",
      },
      {
        label: "Flag Lifecycle",
        href: "/docs/core-concepts/flag-lifecycle",
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
    label: "Platform",
    icon: Workflow,
    links: [
      {
        label: "AI Janitor",
        href: "/docs/advanced/ai-janitor",
        badge: "New",
      },
      {
        label: "Migration Engine",
        href: "/docs/advanced/migration",
      },
      { label: "Webhooks", href: "/docs/advanced/webhooks" },
      {
        label: "Audit Logging",
        href: "/docs/advanced/audit-logging",
      },
      { label: "RBAC", href: "/docs/advanced/rbac" },
      {
        label: "Scheduling",
        href: "/docs/advanced/scheduling",
      },
      {
        label: "Approval Workflows",
        href: "/docs/advanced/approval-workflows",
      },
      {
        label: "Relay Proxy",
        href: "/docs/advanced/relay-proxy",
      },
    ],
  },
  {
    label: "Architecture",
    icon: Package,
    links: [
      {
        label: "Overview",
        href: "/docs/architecture",
      },
      {
        label: "Evaluation Engine",
        href: "/docs/architecture/evaluation-engine",
      },
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
      {
        label: "Self-Hosting",
        href: "/docs/deployment/self-hosting",
      },
      {
        label: "Configuration",
        href: "/docs/deployment/configuration",
      },
    ],
  },
  {
    label: "Compliance",
    icon: ShieldCheck,
    links: [
      {
        label: "Security Overview",
        href: "/docs/compliance/security-overview",
      },
      { label: "GDPR", href: "/docs/compliance/gdpr" },
      { label: "SOC 2", href: "/docs/compliance/soc2" },
      { label: "HIPAA", href: "/docs/compliance/hipaa" },
    ],
  },
  {
    label: "Tutorials",
    icon: Rocket,
    links: [
      {
        label: "Feature Flag a Checkout",
        href: "/docs/tutorials/feature-flag-checkout",
      },
      {
        label: "A/B Testing in React",
        href: "/docs/tutorials/ab-testing-react",
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Sidebar Component                                                   */
/* ------------------------------------------------------------------ */

export function DocsSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close mobile sidebar on escape
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

  const isSectionActive = useCallback(
    (section: NavSection) => {
      return section.links.some((link) => isActive(link.href));
    },
    [isActive],
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        className="lg:hidden fixed bottom-6 right-6 z-50 flex items-center justify-center w-12 h-12 rounded-full bg-[var(--signal-bg-accent-emphasis)] text-white shadow-[var(--signal-shadow-lg)] hover:bg-[var(--color-accent-dark)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
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

      {/* Sidebar — desktop: sticky within grid; mobile: slide-over drawer */}
      <aside
        aria-label="Documentation sidebar"
        className={cn(
          // Desktop: sticky sidebar within grid, scrolls with page
          "lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto",
          "lg:flex lg:flex-col lg:z-20",
          "lg:border-r lg:border-[var(--signal-border-default)]",
          "lg:bg-[var(--signal-bg-primary)]",
          // Mobile: slide-over
          "fixed inset-y-0 left-0 z-50 w-[300px] max-w-[85vw]",
          "bg-[var(--signal-bg-primary)] border-r border-[var(--signal-border-default)]",
          "shadow-[var(--shadow-floating-large)]",
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

          {/* Sections */}
          {docsNavigation.map((section) => (
            <SidebarSection
              key={section.label}
              section={section}
              isActive={isActive}
              isSectionActive={isSectionActive}
              defaultExpanded={isSectionActive(section)}
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
            <Package size={14} />
            <span>Ask the community on GitHub Discussions</span>
          </a>
        </div>
      </aside>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Sidebar Section (expandable)                                       */
/* ------------------------------------------------------------------ */

function SidebarSection({
  section,
  isActive,
  isSectionActive,
  defaultExpanded,
}: {
  section: NavSection;
  isActive: (href: string) => boolean;
  isSectionActive: (section: NavSection) => boolean;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const sectionActive = isSectionActive(section);
  const Icon = section.icon;

  return (
    <div className="mb-1">
      {/* Section header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex items-center justify-between w-full px-3 py-2 text-left rounded-md transition-colors",
          "text-xs font-semibold uppercase tracking-widest",
          sectionActive
            ? "text-[var(--signal-fg-accent)]"
            : "text-[var(--signal-fg-secondary)] hover:text-[var(--signal-fg-primary)]",
        )}
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2">
          <Icon size={14} />
          <span>{section.label}</span>
        </span>
        <ChevronRight
          size={14}
          className={cn(
            "transition-transform duration-200",
            expanded && "rotate-90",
          )}
        />
      </button>

      {/* Links list */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
            role="list"
          >
            {section.links.map((link) => {
              const active = isActive(link.href);
              return (
                <li key={link.href} role="listitem">
                  <Link
                    href={link.href}
                    className={cn(
                      "flex items-center gap-2 pl-10 pr-3 py-1.5 text-sm rounded-md transition-colors",
                      active
                        ? "bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)] font-medium"
                        : "text-[var(--signal-fg-secondary)] hover:text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-secondary)]",
                    )}
                  >
                    <span className="truncate">{link.label}</span>
                    {link.badge && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)] leading-none">
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
