"use client";

import {
  useState,
  useRef,
  useEffect,
} from "react";
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
      keywords: ["target", "rule", "condition", "segment", "percentage", "rollout"],
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
      description:
        "RBAC with environment-level control for team members.",
      href: DOCS_LINKS.rbac,
      keywords: ["role", "permission", "team", "member", "rbac", "access"],
    },
  ],
  "/janitor": [
    {
      title: "AI Janitor",
      description:
        "Automatically detect and remove stale feature flags from your codebase.",
      href: DOCS_LINKS.janitor,
      keywords: ["janitor", "ai", "stale", "cleanup", "tech debt"],
    },
    {
      title: "AI Janitor Quickstart",
      description: "Get started with the AI Janitor in under 5 minutes.",
      href: DOCS_LINKS.janitorQuickstart,
      keywords: ["janitor", "quickstart", "setup"],
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
    keywords: ["sdk", "client", "library", "go", "node", "python", "java", "react"],
  },
  {
    title: "API Reference",
    description: "Full REST API documentation with interactive playground.",
    href: DOCS_LINKS.apiReference,
    keywords: ["api", "rest", "reference", "endpoint"],
  },
  {
    title: "Deployment Guide",
    description: "Docker, Kubernetes, self-hosted setup instructions.",
    href: DOCS_LINKS.deployment,
    keywords: ["deploy", "docker", "kubernetes", "self-hosted", "install"],
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
}

export function DocsPanel({ open, onClose }: DocsPanelProps) {
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

  let filteredDocs = uniqueDocs;
  if (query.trim()) {
    const scored = uniqueDocs
      .map((d) => ({ doc: d, score: fuzzyMatch(query, d) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);
    filteredDocs = scored.map(({ doc }) => doc);
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
              {filteredDocs.map((doc) => (
                <li key={doc.href}>
                  <a
                    href={doc.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "block rounded-lg border border-transparent p-3 transition-colors",
                      "hover:border-[var(--signal-border-default)] hover:bg-[var(--signal-bg-secondary)]",
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
              ))}
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

let globalPanelSetter: ((open: boolean) => void) | null = null;

export function openDocsPanel() {
  globalPanelSetter?.(true);
}

export function DocsPanelTrigger() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    globalPanelSetter = setOpen;
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
      <DocsPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
