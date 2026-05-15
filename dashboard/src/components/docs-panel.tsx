"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { DOCS_LINKS } from "@/components/docs-link";
import {
  SearchIcon,
  XIcon,
  ExternalLinkIcon,
  BookIcon,
} from "@/components/icons/nav-icons";

// ─── Types ───────────────────────────────────────────────────────────────

interface DocsSection {
  title: string;
  description: string;
  href: string;
  keywords: string[];
}

/** Page-path → most-relevant docs mapping */
const PAGE_DOCS_MAP: Record<string, DocsSection[]> = {
  "/flags": [
    {
      title: "Feature Flags",
      description:
        "Learn how to create, manage, and organize feature flags across environments.",
      href: DOCS_LINKS.flags,
      keywords: ["flag", "feature", "toggle", "boolean", "multivariate"],
    },
    {
      title: "Targeting Rules",
      description:
        "Define who sees what with rules, segments, and percentage rollouts.",
      href: DOCS_LINKS.targeting,
      keywords: [
        "target",
        "rule",
        "condition",
        "segment",
        "percentage",
        "rollout",
      ],
    },
    {
      title: "A/B Experiments",
      description:
        "Run A/B tests with variant flags and measure conversion impact.",
      href: DOCS_LINKS.abExperiments,
      keywords: ["a/b", "experiment", "variant", "conversion", "test"],
    },
  ],
  "/segments": [
    {
      title: "Segments Guide",
      description:
        "Create reusable user segments to target across multiple flags.",
      href: DOCS_LINKS.segments,
      keywords: ["segment", "audience", "targeting", "user", "group"],
    },
    {
      title: "Targeting & Segments",
      description: "How targeting rules and segments work together.",
      href: DOCS_LINKS.targeting,
      keywords: ["target", "rule", "condition"],
    },
  ],
  "/environments": [
    {
      title: "Environments",
      description:
        "Set up dev, staging, and production environments for your flags.",
      href: DOCS_LINKS.environments,
      keywords: ["environment", "env", "dev", "staging", "production"],
    },
  ],
  "/api-keys": [
    {
      title: "API Keys",
      description:
        "Manage authentication keys for SDK evaluation and management API.",
      href: DOCS_LINKS.apiKeys,
      keywords: ["api", "key", "sdk", "authentication", "token"],
    },
  ],
  "/webhooks": [
    {
      title: "Webhooks Guide",
      description:
        "Set up event-driven notifications for flag changes and approvals.",
      href: DOCS_LINKS.webhooks,
      keywords: ["webhook", "event", "notification", "change"],
    },
  ],
  "/approvals": [
    {
      title: "Approval Workflows",
      description:
        "Require reviews for production changes with approval workflows.",
      href: DOCS_LINKS.approvals,
      keywords: ["approval", "review", "workflow", "change", "request"],
    },
  ],
  "/activity": [
    {
      title: "Audit Logging",
      description:
        "Every change is recorded with integrity-verified hash chains for compliance.",
      href: DOCS_LINKS.audit,
      keywords: ["audit", "log", "change", "compliance", "history"],
    },
  ],
  "/team": [
    {
      title: "Roles & Permissions",
      description: "RBAC with environment-level control for team members.",
      href: DOCS_LINKS.rbac,
      keywords: ["role", "permission", "team", "member", "rbac", "access"],
    },
  ],
  "/eval-events": [
    {
      title: "Evaluation Events",
      description:
        "Real-time analytics on feature evaluation volume, latency, and variant distribution.",
      href: DOCS_LINKS.evalEvents,
      keywords: ["eval", "event", "analytics", "volume", "latency", "variant"],
    },
    {
      title: "Understanding Eval Data",
      description:
        "How evaluation events are emitted, batched, and sampled. Includes latency percentiles (p50/p95/p99).",
      href: DOCS_LINKS.evalEvents,
      keywords: ["emission", "batch", "sample", "percentile", "latency"],
    },
    {
      title: "ClickHouse Analytics",
      description:
        "How evaluation data flows to ClickHouse for sub-millisecond query performance at scale.",
      href: DOCS_LINKS.evalEvents,
      keywords: ["clickhouse", "analytics", "materialized", "view", "scale"],
    },
  ],
  "/janitor": [
    {
      title: "AI Janitor",
      description:
        "Automatically detect and sweep stale feature flags from your codebase.",
      href: DOCS_LINKS.janitor,
      keywords: ["janitor", "ai", "stale", "sweep", "tech debt"],
    },
    {
      title: "AI Janitor Quickstart",
      description: "Get started with the AI Janitor in under 5 minutes.",
      href: DOCS_LINKS.janitorQuickstart,
      keywords: ["janitor", "quickstart", "setup"],
    },
  ],
  "/abm": [
    {
      title: "Agent Behavior Mesh",
      description:
        "Configure and manage AI agent behaviors — the runtime configuration that controls what your AI agents can do.",
      href: DOCS_LINKS.abm,
      keywords: ["abm", "agent", "behavior", "variant", "mesh", "ai"],
    },
    {
      title: "What is ABM?",
      description:
        "The Agent Behavior Mesh (ABM) is the agent equivalent of feature management. It lets you define behaviors, targeting rules, and variants for AI agents — enabling safe rollout, A/B testing, and instant pause for agent capabilities.",
      href: DOCS_LINKS.abm,
      keywords: ["abm", "concept", "overview"],
    },
    {
      title: "Creating a Behavior",
      description:
        "Define a behavior key, name, agent type, and variants. Each variant has a configuration that the agent receives at resolution time.",
      href: DOCS_LINKS.abm,
      keywords: ["behavior", "create", "variant", "configuration"],
    },
    {
      title: "Resolution",
      description:
        "When an agent requests a behavior, ABM evaluates targeting rules and rollout percentages to determine which variant to serve, returning the variant configuration.",
      href: DOCS_LINKS.abm,
      keywords: ["resolve", "resolution", "targeting", "rollout"],
    },
  ],
  "/agents": [
    {
      title: "Agent Registry",
      description:
        "Register and manage AI agents that interact with your FeatureSignals platform.",
      href: DOCS_LINKS.agents,
      keywords: ["agent", "registry", "register", "ai"],
    },
    {
      title: "Registering an Agent",
      description:
        "Register an agent with a unique ID, type, and allowed scopes. Agents authenticate with API keys rotated every 90 days.",
      href: DOCS_LINKS.agents,
      keywords: ["register", "api key", "scope"],
    },
    {
      title: "Maturity Levels",
      description:
        "Agents progress through 5 maturity levels (L1 Shadow → L5 Sentinel) based on accuracy, incidents, and override rate.",
      href: DOCS_LINKS.agents,
      keywords: ["maturity", "level", "shadow", "sentinel"],
    },
    {
      title: "Heartbeat Monitoring",
      description:
        "Agents send periodic heartbeats. If an agent misses heartbeats, it is marked as degraded or offline.",
      href: DOCS_LINKS.agents,
      keywords: ["heartbeat", "monitor", "health", "degraded", "offline"],
    },
  ],
  "/policies": [
    {
      title: "Governance Policies",
      description:
        "Define CEL-based policies that control what agents can do and under what conditions.",
      href: DOCS_LINKS.policies,
      keywords: ["policy", "governance", "cel", "rule"],
    },
    {
      title: "Policy Evaluation",
      description:
        "Policies are evaluated on every agent action. A policy can allow, block, warn, or require human approval.",
      href: DOCS_LINKS.policies,
      keywords: ["evaluate", "allow", "block", "warn", "approval"],
    },
    {
      title: "CEL Expressions",
      description:
        "Policies use Common Expression Language (CEL) for conditions. Example: agent.maturity >= 3 && action.scope != 'production'.",
      href: DOCS_LINKS.policies,
      keywords: ["cel", "expression", "condition", "syntax"],
    },
    {
      title: "Enforcement Modes",
      description:
        "Policies support four modes: allow (permit), block (deny), warn (allow with warning), and require_approval (human review).",
      href: DOCS_LINKS.policies,
      keywords: ["enforce", "mode", "block", "warn", "require_approval"],
    },
  ],
  "/dashboard": [
    {
      title: "Dashboard Overview",
      description:
        "Your organization home — quick stats, recent activity, and project overview.",
      href: DOCS_LINKS.dashboard,
      keywords: ["dashboard", "home", "overview", "stats"],
    },
  ],
  "/projects": [
    {
      title: "Projects & Environments",
      description:
        "Organize feature flags into projects and environments (dev, staging, production).",
      href: DOCS_LINKS.projects,
      keywords: ["project", "environment", "dev", "staging", "production"],
    },
  ],
  "/usage": [
    {
      title: "Usage & Metering",
      description:
        "Track evaluation volume, active flags, and billing meter consumption.",
      href: DOCS_LINKS.usage,
      keywords: ["usage", "billing", "meter", "evaluation", "consumption"],
    },
  ],
  "/limits": [
    {
      title: "Rate Limits",
      description:
        "Understand per-endpoint rate limits and how to handle 429 responses.",
      href: DOCS_LINKS.limits,
      keywords: ["rate", "limit", "429", "throttle", "retry"],
    },
  ],
  "/settings/general": [
    {
      title: "Organization Settings",
      description:
        "Configure your organization name, slug, billing details, and team defaults.",
      href: DOCS_LINKS.settings,
      keywords: ["settings", "organization", "configure", "billing"],
    },
  ],
  "/support": [
    {
      title: "Support",
      description:
        "Contact support, browse FAQs, and access the community forum.",
      href: DOCS_LINKS.support,
      keywords: ["support", "help", "faq", "contact", "community"],
    },
  ],
  "/analytics": [
    {
      title: "Flag Analytics",
      description:
        "Analyze evaluation trends, variant distribution, and latency across all flags.",
      href: DOCS_LINKS.evalEvents,
      keywords: ["analytics", "trend", "distribution", "chart"],
    },
  ],
  "/metrics": [
    {
      title: "Evaluation Metrics",
      description:
        "Observe evaluation counts, cache hit rates, and SDK health across environments.",
      href: DOCS_LINKS.metrics,
      keywords: ["metrics", "monitor", "cache", "sdk", "health"],
    },
  ],
  "/health": [
    {
      title: "Flag Health",
      description:
        "Identify stale flags, unused variants, and technical debt in your flag inventory.",
      href: DOCS_LINKS.health,
      keywords: ["health", "stale", "unused", "debt", "inventory"],
    },
  ],
  "/usage-insights": [
    {
      title: "Usage Insights",
      description:
        "Deep-dive into evaluation patterns, cost attribution, and optimization opportunities.",
      href: DOCS_LINKS.usageInsights,
      keywords: ["insights", "cost", "optimization", "pattern"],
    },
  ],
  "/env-comparison": [
    {
      title: "Environment Comparison",
      description:
        "Compare flag configurations side-by-side across environments to catch drift.",
      href: DOCS_LINKS.envComparison,
      keywords: ["compare", "environment", "drift", "diff"],
    },
  ],
  "/target-inspector": [
    {
      title: "Target Inspector",
      description:
        "Analyze and debug targeting rules — see exactly which users match which rules.",
      href: DOCS_LINKS.targetInspector,
      keywords: ["target", "inspect", "debug", "rule", "match"],
    },
  ],
  "/workflows": [
    {
      title: "Workflow Orchestration",
      description:
        "Automate multi-step agent tasks with DAG-based workflows — define nodes, edges, and execution order.",
      href: DOCS_LINKS.agents,
      keywords: ["workflow", "dag", "orchestration", "automation", "pipeline"],
    },
    {
      title: "Workflow Runs",
      description:
        "Track workflow execution — view node states, retries, and results across all runs.",
      href: DOCS_LINKS.agents,
      keywords: ["run", "execution", "node", "state", "retry"],
    },
  ],
};

const GLOBAL_DOCS: DocsSection[] = [
  {
    title: "Quickstart Guide",
    description: "Get up and running with FeatureSignals in 5 minutes.",
    href: DOCS_LINKS.quickstart,
    keywords: ["quickstart", "getting started", "setup", "install"],
  },
  {
    title: "SDK Overview",
    description: "Go, Node, Python, Java, React, Vue — all supported SDKs.",
    href: DOCS_LINKS.sdks,
    keywords: [
      "sdk",
      "client",
      "library",
      "go",
      "node",
      "python",
      "java",
      "react",
    ],
  },
  {
    title: "API Reference",
    description: "Full REST API documentation with interactive playground.",
    href: DOCS_LINKS.apiReference,
    keywords: ["api", "rest", "reference", "endpoint"],
  },
  {
    title: "Shipping Guide",
    description: "Docker, Kubernetes, self-hosted setup instructions.",
    href: DOCS_LINKS.deployment,
    keywords: ["ship", "docker", "kubernetes", "self-hosted", "install"],
  },
  {
    title: "Relay Proxy",
    description: "Edge caching proxy for ultra-low-latency flag evaluation.",
    href: DOCS_LINKS.relayProxy,
    keywords: ["relay", "proxy", "edge", "cache", "latency"],
  },
  {
    title: "Evaluation Engine",
    description: "How the flag evaluation engine resolves rules at runtime.",
    href: DOCS_LINKS.evalEngine,
    keywords: ["evaluation", "engine", "resolve", "rule", "runtime"],
  },
  {
    title: "OpenFeature",
    description: "Vendor-neutral flag evaluation with OpenFeature SDKs.",
    href: DOCS_LINKS.openFeature,
    keywords: ["openfeature", "vendor", "neutral", "standard"],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────

function getCurrentPageBase(pathname: string): string {
  const knownPaths = Object.keys(PAGE_DOCS_MAP).sort(
    (a, b) => b.length - a.length,
  );
  for (const p of knownPaths) {
    if (pathname.startsWith(p)) return p;
  }
  return "";
}

function fuzzyMatch(query: string, section: DocsSection): number {
  const q = query.toLowerCase();
  let score = 0;

  if (section.title.toLowerCase().includes(q)) score += 10;
  if (section.title.toLowerCase() === q) score += 20;

  if (section.description.toLowerCase().includes(q)) score += 5;

  for (const keyword of section.keywords) {
    if (keyword === q) score += 15;
    else if (keyword.startsWith(q)) score += 8;
    else if (keyword.includes(q)) score += 3;
  }

  return score;
}

// ─── Component ───────────────────────────────────────────────────────────

interface DocsPanelProps {
  open: boolean;
  onClose: () => void;
  /** Optional URL to highlight — the matching doc will be shown at the top */
  highlightedUrl?: string;
}

export function DocsPanel({ open, onClose, highlightedUrl }: DocsPanelProps) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      const id = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(id);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (document.activeElement === inputRef.current && query) {
          setQuery("");
          return;
        }
        onClose();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose, query]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (panelRef.current && !panelRef.current.contains(target)) {
        onClose();
      }
    }
    const id = setTimeout(() => {
      window.addEventListener("mousedown", handleClick);
    }, 100);
    return () => {
      clearTimeout(id);
      window.removeEventListener("mousedown", handleClick);
    };
  }, [open, onClose]);

  const currentPageBase = getCurrentPageBase(pathname);
  const pageDocs = PAGE_DOCS_MAP[currentPageBase] ?? [];
  const allDocs = [...pageDocs, ...GLOBAL_DOCS];

  const seenUrls = new Set<string>();
  const uniqueDocs = allDocs.filter((d) => {
    if (seenUrls.has(d.href)) return false;
    seenUrls.add(d.href);
    return true;
  });

  // Find the highlighted doc (if any) to show at the top
  const highlightedDoc = highlightedUrl
    ? uniqueDocs.find((d) => d.href === highlightedUrl)
    : undefined;

  let filteredDocs = uniqueDocs;
  if (query.trim()) {
    const scored = uniqueDocs
      .map((d) => ({ doc: d, score: fuzzyMatch(query, d) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);
    filteredDocs = scored.map(({ doc }) => doc);
  } else if (highlightedDoc) {
    // Move highlighted doc to the top, keep the rest
    const rest = uniqueDocs.filter((d) => d.href !== highlightedDoc.href);
    filteredDocs = [highlightedDoc, ...rest];
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Documentation panel"
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-full max-w-md",
          "border-l border-[var(--signal-border-default)]",
          "bg-[var(--signal-bg-primary)] shadow-2xl",
          "animate-slide-in-right flex flex-col",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--signal-border-default)] px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--signal-fg-primary)]">
            <BookIcon className="h-4 w-4 text-[var(--signal-fg-accent)]" />
            Documentation
          </h2>
          <button
            onClick={onClose}
            className={cn(
              "rounded-md p-1.5 text-[var(--signal-fg-tertiary)] transition-colors",
              "hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)]",
            )}
            aria-label="Close documentation panel"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-[var(--signal-border-default)] px-4 py-3">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--signal-fg-tertiary)]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documentation..."
              aria-label="Search documentation"
              className={cn(
                "w-full rounded-md border border-[var(--signal-border-default)]",
                "bg-[var(--signal-bg-primary)] py-2 pl-8 pr-3 text-sm",
                "text-[var(--signal-fg-primary)] placeholder-[var(--signal-fg-tertiary)]",
                "focus:border-[var(--signal-fg-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--signal-fg-accent)]",
              )}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {query.trim() && filteredDocs.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-[var(--signal-fg-tertiary)]">
                No documentation found for &ldquo;{query}&rdquo;.
              </p>
              <p className="mt-1 text-xs text-[var(--signal-fg-tertiary)]">
                Try a different search term or browse the topics below.
              </p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-[var(--signal-fg-tertiary)]">
                Select a page to see relevant documentation, or use search.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {filteredDocs.map((doc, idx) => {
                const isHighlighted =
                  highlightedDoc &&
                  doc.href === highlightedDoc.href &&
                  idx === 0;
                return (
                  <li key={doc.href}>
                    <a
                      href={doc.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "block rounded-lg border p-3 transition-colors",
                        isHighlighted
                          ? "border-[var(--signal-border-accent-muted)] bg-[var(--signal-bg-accent-muted)] ring-1 ring-[var(--signal-border-accent-muted)]"
                          : "border-transparent hover:border-[var(--signal-border-default)] hover:bg-[var(--signal-bg-secondary)]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-medium text-[var(--signal-fg-primary)]">
                          {doc.title}
                        </h3>
                        <ExternalLinkIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--signal-fg-tertiary)]" />
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--signal-fg-tertiary)]">
                        {doc.description}
                      </p>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--signal-border-default)] px-4 py-2.5">
          <a
            href={DOCS_LINKS.quickstart}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-medium",
              "text-[var(--signal-fg-accent)] hover:underline underline-offset-2",
            )}
          >
            Browse all documentation
            <ExternalLinkIcon className="h-3 w-3" />
          </a>
        </div>
      </div>
    </>
  );
}

// ─── Trigger ─────────────────────────────────────────────────────────────

let globalPanelSetter: ((open: boolean, targetUrl?: string) => void) | null =
  null;

/**
 * Programmatically open the documentation panel, optionally highlighting
 * a specific documentation URL.
 */
export function openDocsPanel(targetUrl?: string) {
  globalPanelSetter?.(true, targetUrl);
}

export function DocsPanelTrigger() {
  const [open, setOpen] = useState(false);
  const [targetUrl, setTargetUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    globalPanelSetter = (o: boolean, url?: string) => {
      setOpen(o);
      if (url) setTargetUrl(url);
      if (!o) setTargetUrl(undefined);
    };
    return () => {
      globalPanelSetter = null;
    };
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "group flex items-center gap-1 rounded-md px-2 py-1 text-xs",
          "text-[var(--signal-fg-tertiary)] transition-colors",
          "hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-secondary)]",
        )}
        aria-label="Open documentation"
        title="Documentation (press ?)"
      >
        <BookIcon className="h-3.5 w-3.5" />
        <span className="hidden lg:inline">Docs</span>
        <kbd className="hidden sm:inline rounded border border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)] px-1 py-0.5 text-[10px] font-medium text-[var(--signal-fg-tertiary)]">
          ?
        </kbd>
      </button>
      <DocsPanel
        open={open}
        onClose={() => {
          setOpen(false);
          setTargetUrl(undefined);
        }}
        highlightedUrl={targetUrl}
      />
    </>
  );
}
