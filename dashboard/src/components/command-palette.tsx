"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import type { Flag, Segment } from "@/lib/types";
import { DOCS_LINKS } from "@/components/docs-link";
import { CommandIcon } from "@/components/icons/nav-icons";

// Shared open state for external triggers
let externalOpenSetter: ((open: boolean) => void) | null = null;

export function openCommandPalette() {
  externalOpenSetter?.(true);
}

interface PaletteItem {
  id: string;
  label: string;
  description?: string;
  category: "flag" | "segment" | "navigation" | "create" | "help" | "docs";
  href: string;
  external?: boolean;
  action?: () => void;
}

const NAV_ITEMS: PaletteItem[] = [
  {
    id: "nav-dashboard",
    label: "Dashboard",
    category: "navigation",
    href: "/dashboard",
  },
  { id: "nav-flags", label: "Flags", category: "navigation", href: "/flags" },
  {
    id: "nav-segments",
    label: "Segments",
    category: "navigation",
    href: "/segments",
  },
  {
    id: "nav-environments",
    label: "Environment Config",
    category: "navigation",
    href: "/environments",
  },
  {
    id: "nav-api-keys",
    label: "API Keys",
    category: "navigation",
    href: "/api-keys",
  },
  {
    id: "nav-webhooks",
    label: "Webhooks",
    category: "navigation",
    href: "/webhooks",
  },
  {
    id: "nav-approvals",
    label: "Approvals",
    category: "navigation",
    href: "/approvals",
  },
  { id: "nav-usage", label: "Usage", category: "navigation", href: "/usage" },
  {
    id: "nav-activity",
    label: "Activity",
    category: "navigation",
    href: "/activity",
  },
  { id: "nav-team", label: "Team", category: "navigation", href: "/team" },
  {
    id: "nav-billing",
    label: "Billing",
    category: "navigation",
    href: "/settings/billing",
  },
  {
    id: "nav-settings",
    label: "Settings",
    category: "navigation",
    href: "/settings/general",
  },
  {
    id: "nav-janitor",
    label: "AI Janitor",
    category: "navigation",
    href: "/janitor",
  },
  {
    id: "nav-env-comparison",
    label: "Env Comparison",
    category: "navigation",
    href: "/env-comparison",
  },
  {
    id: "nav-target-inspector",
    label: "Target Inspector",
    category: "navigation",
    href: "/target-inspector",
  },
  {
    id: "nav-target-comparison",
    label: "Target Compare",
    category: "navigation",
    href: "/target-comparison",
  },
  {
    id: "nav-analytics",
    label: "Analytics",
    category: "navigation",
    href: "/analytics",
  },
  {
    id: "nav-metrics",
    label: "Metrics",
    category: "navigation",
    href: "/metrics",
  },
  {
    id: "nav-health",
    label: "Health",
    category: "navigation",
    href: "/health",
  },
];

const CREATE_ITEMS: PaletteItem[] = [
  {
    id: "create-flag",
    label: "Create Flag",
    description: "Create a new feature flag",
    category: "create",
    href: "/flags?create=true",
  },
  {
    id: "create-segment",
    label: "Create Segment",
    description: "Create a new user segment",
    category: "create",
    href: "/segments?create=true",
  },
  {
    id: "create-project",
    label: "Create Project",
    description: "Set up a new project",
    category: "create",
    href: "/onboarding",
  },
  {
    id: "create-api-key",
    label: "Create API Key",
    description: "Generate a new API key",
    category: "create",
    href: "/api-keys",
  },
  {
    id: "create-webhook",
    label: "Create Webhook",
    description: "Set up a new webhook endpoint",
    category: "create",
    href: "/webhooks",
  },
  {
    id: "invite-member",
    label: "Invite Team Member",
    description: "Add someone to your team",
    category: "create",
    href: "/team",
  },
];

const HELP_ITEMS: PaletteItem[] = [
  {
    id: "help-tour",
    label: "Replay Product Tour",
    description: "Walk through the dashboard features again",
    category: "help",
    href: "",
    action: () => {
      useAppStore.getState().requestTour();
      window.dispatchEvent(new Event("fs:replay-tour"));
    },
  },
  {
    id: "help-quickstart",
    label: "Quickstart Guide",
    description: "Get up and running in 5 minutes",
    category: "help",
    href: DOCS_LINKS.quickstart,
    external: true,
  },
  {
    id: "help-sdks",
    label: "SDK Documentation",
    description: "Go, Node, Python, Java, React, Vue...",
    category: "help",
    href: DOCS_LINKS.sdks,
    external: true,
  },
  {
    id: "help-api",
    label: "API Reference",
    description: "Full REST API documentation",
    category: "help",
    href: DOCS_LINKS.apiReference,
    external: true,
  },
  {
    id: "help-targeting",
    label: "Targeting Rules",
    description: "How to target users with flag rules",
    category: "help",
    href: DOCS_LINKS.targeting,
    external: true,
  },
  {
    id: "help-segments",
    label: "Segments Guide",
    description: "Create reusable user segments",
    category: "help",
    href: DOCS_LINKS.segments,
    external: true,
  },
  {
    id: "help-experiments",
    label: "A/B Experiments",
    description: "Set up A/B tests with variants",
    category: "help",
    href: DOCS_LINKS.abExperiments,
    external: true,
  },
  {
    id: "help-approvals",
    label: "Approval Workflows",
    description: "Require reviews for production changes",
    category: "help",
    href: DOCS_LINKS.approvals,
    external: true,
  },
  {
    id: "help-webhooks",
    label: "Webhooks Guide",
    description: "Set up event notifications",
    category: "help",
    href: DOCS_LINKS.webhooks,
    external: true,
  },
  {
    id: "help-rbac",
    label: "Roles & Permissions",
    description: "RBAC with environment-level control",
    category: "help",
    href: DOCS_LINKS.rbac,
    external: true,
  },
  {
    id: "help-deploy",
    label: "Deployment Guide",
    description: "Docker, Kubernetes, self-hosted setup",
    category: "help",
    href: DOCS_LINKS.deployment,
    external: true,
  },
  {
    id: "help-support",
    label: "Contact Support",
    description: "Email support@featuresignals.com",
    category: "help",
    href: "mailto:support@featuresignals.com",
    external: true,
  },
];

const DOCS_ITEMS: PaletteItem[] = [
  {
    id: "docs-flags",
    label: "Feature Flags",
    description: "Concepts: types, lifecycle, categories",
    category: "docs",
    href: DOCS_LINKS.flags,
    external: true,
  },
  {
    id: "docs-environments",
    label: "Environments",
    description: "Dev, staging, production setup",
    category: "docs",
    href: DOCS_LINKS.environments,
    external: true,
  },
  {
    id: "docs-eval-engine",
    label: "Evaluation Engine",
    description: "How flag evaluation works",
    category: "docs",
    href: DOCS_LINKS.evalEngine,
    external: true,
  },
  {
    id: "docs-openfeature",
    label: "OpenFeature",
    description: "Vendor-neutral flag evaluation",
    category: "docs",
    href: DOCS_LINKS.openFeature,
    external: true,
  },
  {
    id: "docs-relay-proxy",
    label: "Relay Proxy",
    description: "Edge caching for low latency",
    category: "docs",
    href: DOCS_LINKS.relayProxy,
    external: true,
  },
];

const categoryLabels: Record<string, string> = {
  navigation: "Go to",
  flag: "Flags",
  segment: "Segments",
  create: "Create",
  help: "Help & Docs",
  docs: "Documentation",
};

const categoryIcons: Record<string, string> = {
  navigation: "\u2192",
  flag: "\u2691",
  segment: "\u25A8",
  create: "+",
  help: "?",
  docs: "\u2139",
};

function getPlaceholder(query: string): string {
  if (query.startsWith("help:")) return "Search documentation and guides...";
  if (query.startsWith("create:")) return "What do you want to create?";
  return "Search flags, segments, or type help: / create: ...";
}

export function CommandPalette() {
  const router = useRouter();
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<PaletteItem[]>([]);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadItems = useCallback(async () => {
    const orgLevelHrefs = new Set([
      "/usage",
      "/activity",
      "/settings/billing",
      "/settings/general",
    ]);
    const results: PaletteItem[] = NAV_ITEMS.map((item) => {
      if (orgLevelHrefs.has(item.href)) return item;
      return {
        ...item,
        href: projectId ? `/projects/${projectId}${item.href}` : item.href,
      };
    });
    if (token && projectId) {
      try {
        const [flags, segments] = await Promise.all([
          api.listFlags(token, projectId),
          api.listSegments(token, projectId),
        ]);
        (flags || []).forEach((f: Flag) => {
          results.push({
            id: `flag-${f.key}`,
            label: f.key,
            description: f.name,
            category: "flag" as const,
            href: `/projects/${projectId}/flags/${f.key}`,
          });
        });
        (segments || []).forEach((s: Segment) => {
          results.push({
            id: `seg-${s.key}`,
            label: s.key,
            description: s.name,
            category: "segment" as const,
            href: `/projects/${projectId}/segments`,
          });
        });
      } catch {
        /* ignore */
      }
    }
    setItems(results);
  }, [token, projectId]);

  useEffect(() => {
    externalOpenSetter = setOpen;
    return () => {
      externalOpenSetter = null;
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      loadItems();
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, loadItems]);

  let searchQuery = query;
  let filteredItems: PaletteItem[] = [];

  if (query.startsWith("help:")) {
    searchQuery = query.slice(5).trim();
    filteredItems = [...HELP_ITEMS, ...DOCS_ITEMS].filter(
      (item) =>
        !searchQuery ||
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  } else if (query.startsWith("create:")) {
    searchQuery = query.slice(7).trim();
    filteredItems = CREATE_ITEMS.filter(
      (item) =>
        !searchQuery ||
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  } else {
    filteredItems = items.filter(
      (item) =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        item.description?.toLowerCase().includes(query.toLowerCase()),
    );
    if (!query) {
      filteredItems = [...CREATE_ITEMS.slice(0, 3), ...filteredItems];
    }
  }

  const grouped = filteredItems.reduce<Record<string, PaletteItem[]>>(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    },
    {},
  );

  const flatFiltered = Object.values(grouped).flat();

  function handleSelect(item: PaletteItem) {
    setOpen(false);
    if (item.action) {
      item.action();
    } else if (item.external) {
      window.open(item.href, "_blank", "noopener,noreferrer");
    } else {
      router.push(item.href);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((prev) => (prev + 1) % flatFiltered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected(
        (prev) => (prev - 1 + flatFiltered.length) % flatFiltered.length,
      );
    } else if (e.key === "Enter" && flatFiltered[selected]) {
      handleSelect(flatFiltered[selected]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  if (!open) return null;

  let flatIdx = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        role="presentation"
      />
      <div className="relative w-full max-w-lg rounded-xl border border-[var(--borderColor-default)] bg-white shadow-2xl">
        <div className="flex items-center border-b border-[var(--borderColor-default)] px-4">
          <svg
            className="h-5 w-5 text-[var(--fgColor-subtle)] shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
            focusable="false"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder(query)}
            aria-label="Search commands, flags, and segments"
            className="flex-1 border-0 bg-transparent px-3 py-3.5 text-sm text-[var(--fgColor-default)] placeholder-slate-400 focus:outline-none"
          />
          <kbd className="rounded bg-[var(--bgColor-muted)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--fgColor-muted)]">
            ESC
          </kbd>
        </div>

        {/* Prefix hints */}
        {!query && (
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2">
            <button
              onClick={() => {
                setQuery("create:");
                inputRef.current?.focus();
              }}
              className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 transition-colors hover:bg-[var(--bgColor-success-muted)]"
            >
              create:
            </button>
            <button
              onClick={() => {
                setQuery("help:");
                inputRef.current?.focus();
              }}
              className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 transition-colors hover:bg-blue-100"
            >
              help:
            </button>
            <span className="text-[10px] text-[var(--fgColor-subtle)]">
              Type a prefix to filter
            </span>
          </div>
        )}

        <div className="max-h-80 overflow-y-auto p-2">
          {flatFiltered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--fgColor-subtle)]">
              {query.startsWith("help:")
                ? "No matching docs found."
                : "No results found."}
            </div>
          ) : (
            Object.entries(grouped).map(([category, categoryItems]) => (
              <div key={category} className="mb-1">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--fgColor-subtle)]">
                  {categoryLabels[category] || category}
                </p>
                {categoryItems.map((item) => {
                  const idx = flatIdx++;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelected(idx)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                        selected === idx
                          ? "bg-[var(--bgColor-accent-muted)] text-[var(--fgColor-accent)]"
                          : "text-[var(--fgColor-default)] hover:bg-[var(--bgColor-muted)]"
                      }`}
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--bgColor-muted)] text-xs text-[var(--fgColor-muted)]">
                        {categoryIcons[item.category] || "#"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {item.label}
                        </p>
                        {item.description && (
                          <p className="text-xs text-[var(--fgColor-subtle)] truncate">
                            {item.description}
                          </p>
                        )}
                      </div>
                      {item.external && (
                        <span className="shrink-0 text-[10px] text-[var(--fgColor-subtle)]">
                          \u2197
                        </span>
                      )}
                      {selected === idx && (
                        <kbd className="rounded bg-[var(--bgColor-accent-muted)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--fgColor-accent)]">
                          &crarr;
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-[var(--borderColor-default)] px-4 py-2 text-[10px] text-[var(--fgColor-subtle)]">
          <span>
            <kbd className="rounded bg-[var(--bgColor-muted)] px-1 py-0.5 font-medium">
              &uarr;
            </kbd>{" "}
            <kbd className="rounded bg-[var(--bgColor-muted)] px-1 py-0.5 font-medium">
              &darr;
            </kbd>{" "}
            navigate
          </span>
          <span>
            <kbd className="rounded bg-[var(--bgColor-muted)] px-1 py-0.5 font-medium">
              &crarr;
            </kbd>{" "}
            select
          </span>
          <span>
            <kbd className="rounded bg-[var(--bgColor-muted)] px-1 py-0.5 font-medium">
              esc
            </kbd>{" "}
            close
          </span>
        </div>
      </div>
    </div>
  );
}

export function CommandPaletteButton() {
  return (
    <button
      onClick={() => openCommandPalette()}
      className="group flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[var(--fgColor-subtle)] transition-colors hover:bg-[var(--bgColor-muted)] hover:text-[var(--fgColor-muted)]"
      aria-label="Open command palette"
      title="Quick actions — navigate, create, search docs"
    >
      <CommandIcon className="h-3.5 w-3.5 transition-colors group-hover:text-[var(--fgColor-accent)]" />
      <span className="hidden xl:inline transition-colors group-hover:text-[var(--fgColor-accent)]">
        Quick actions
      </span>
      <span className="hidden lg:inline xl:hidden transition-colors group-hover:text-[var(--fgColor-accent)]">
        Actions
      </span>
      <kbd className="rounded border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--fgColor-subtle)]">
        K
      </kbd>
    </button>
  );
}
