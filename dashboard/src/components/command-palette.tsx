"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import type { Flag, Segment } from "@/lib/types";
import { DOCS_LINKS } from "@/components/docs-link";
import { CommandIcon } from "@/components/icons/nav-icons";

// ─── Global open trigger ─────────────────────────────────────────────────

let externalOpenSetter: ((open: boolean) => void) | null = null;

export function openCommandPalette() {
  externalOpenSetter?.(true);
}

// ─── Types ───────────────────────────────────────────────────────────────

interface PaletteItem {
  id: string;
  label: string;
  description?: string;
  category:
    | "flag"
    | "segment"
    | "navigation"
    | "create"
    | "help"
    | "docs"
    | "action"
    | "recent";
  href: string;
  external?: boolean;
  action?: () => void;
}

// ─── Fuzzy search ────────────────────────────────────────────────────────

/**
 * Simple fuzzy score — higher means better match.
 * Handles typos by rewarding contiguous character matches with gaps.
 */
function fuzzyScore(query: string, target: string): number {
  if (!query || !target) return 0;
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  // Exact match bonus
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 60;

  // Character-by-character matching with gap penalty
  let score = 0;
  let qIdx = 0;
  let consecutive = 0;
  let lastMatchIdx = -2;

  for (let i = 0; i < t.length && qIdx < q.length; i++) {
    if (t[i] === q[qIdx]) {
      qIdx++;
      if (i === lastMatchIdx + 1) {
        consecutive++;
        score += consecutive * 5; // Bonus for consecutive matches
      } else {
        consecutive = 1;
        score += 2;
      }
      lastMatchIdx = i;
    }
  }

  // Only return score if all query characters matched
  if (qIdx < q.length) return 0;
  return score;
}

function getDidYouMean(query: string, candidates: string[]): string | null {
  const q = query.toLowerCase().trim();
  if (!q || q.length < 2) return null;

  let best: { score: number; text: string } = { score: 0, text: "" };
  for (const c of candidates) {
    const score = fuzzyScore(q, c);
    if (score > best.score) {
      best = { score, text: c };
    }
  }
  return best.score >= 15 ? best.text : null;
}

// ─── Recent items tracking ───────────────────────────────────────────────

const RECENT_KEY = "fs_command_recent";
const MAX_RECENT = 5;

function getRecentItems(): PaletteItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addRecentItem(item: PaletteItem) {
  if (typeof window === "undefined") return;
  try {
    const recent = getRecentItems();
    // Remove duplicate by id
    const filtered = recent.filter((r) => r.id !== item.id);
    // Add to front
    filtered.unshift({ ...item, category: "recent" as const });
    // Cap
    sessionStorage.setItem(
      RECENT_KEY,
      JSON.stringify(filtered.slice(0, MAX_RECENT)),
    );
  } catch {
    // Silently ignore
  }
}

// ─── Static data ─────────────────────────────────────────────────────────

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
    id: "help-keyboard-shortcuts",
    label: "Keyboard Shortcuts",
    description: "View all keyboard shortcuts",
    category: "help",
    href: "",
    action: () => {
      window.dispatchEvent(new Event("fs:show-keyboard-shortcuts"));
    },
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

const SHORTCUT_ITEMS: PaletteItem[] = [
  {
    id: "shortcut-cmdk",
    label: "Cmd+K / Ctrl+K",
    description: "Open command palette",
    category: "help",
    href: "",
  },
  {
    id: "shortcut-?",
    label: "?",
    description: "Open documentation panel",
    category: "help",
    href: "",
  },
  {
    id: "shortcut-esc",
    label: "Escape",
    description: "Close modals, menus, and panels",
    category: "help",
    href: "",
  },
  {
    id: "shortcut-navigate",
    label: "↑ ↓",
    description: "Navigate items in lists and palette",
    category: "help",
    href: "",
  },
  {
    id: "shortcut-select",
    label: "Enter",
    description: "Select / confirm",
    category: "help",
    href: "",
  },
];

// ─── Category display config ─────────────────────────────────────────────

const categoryLabels: Record<string, string> = {
  navigation: "Go to",
  flag: "Flags",
  segment: "Segments",
  create: "Create",
  help: "Help & Docs",
  docs: "Documentation",
  action: "Quick Actions",
  recent: "Recent",
};

const categoryIcons: Record<string, string> = {
  navigation: "\u2192",
  flag: "\u2691",
  segment: "\u25A8",
  create: "+",
  help: "?",
  docs: "\u2139",
  action: "\u2699",
  recent: "\u21BA",
};

// ─── Helpers ─────────────────────────────────────────────────────────────

function getPlaceholder(query: string): string {
  if (query.startsWith("help:")) return "Search documentation and guides...";
  if (query.startsWith("create:")) return "What do you want to create?";
  if (query.startsWith("go:")) return "Search docs for...";
  return "Search flags, segments, or type help: / create: / go: ...";
}

// ─── Component ───────────────────────────────────────────────────────────

export function CommandPalette() {
  const router = useRouter();
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const currentEnvId = useAppStore((s) => s.currentEnvId);
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

    // Add quick actions that depend on project context
    if (projectId) {
      results.push({
        id: "action-copy-api-key",
        label: "Copy API Key",
        description: "Copy the current environment's SDK API key",
        category: "action",
        href: "",
        action: async () => {
          if (!token || !currentEnvId) return;
          try {
            const keys = await api.listAPIKeys(token, currentEnvId);
            const sdkKey = keys?.find(
              (k: { type: string }) => k.type === "sdk",
            );
            if (sdkKey?.key_prefix) {
              await navigator.clipboard.writeText(sdkKey.key_prefix);
            }
          } catch {
            // Silently fail — the API key may not be available
          }
        },
      });
    }

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
  }, [token, projectId, currentEnvId]);

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

  // ─── Compute filtered items ────────────────────────────────────────────

  const isShortcutQuery = query === "?" || query.toLowerCase() === "shortcuts";
  let searchQuery = query;
  let filteredItems: PaletteItem[] = [];
  let didYouMean: PaletteItem | null = null;

  // Shortcut reference
  if (isShortcutQuery) {
    filteredItems = SHORTCUT_ITEMS;
  } else if (query.startsWith("help:")) {
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
  } else if (query.startsWith("go:")) {
    // "go:" prefix — search docs
    searchQuery = query.slice(3).trim();
    if (searchQuery) {
      filteredItems = [...HELP_ITEMS, ...DOCS_ITEMS].filter(
        (item) =>
          item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }
  } else if (query.trim()) {
    // Fuzzy search across all items
    const allCandidates = [
      ...items,
      ...CREATE_ITEMS,
      ...HELP_ITEMS,
      ...DOCS_ITEMS,
    ];

    // Score and filter
    const scored = allCandidates
      .map((item) => ({
        item,
        score:
          fuzzyScore(query, item.label) * 2 +
          fuzzyScore(query, item.description ?? ""),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);

    filteredItems = scored.map(({ item }) => item);

    // "Did you mean?" — if fuzzy results are weak, suggest the best match
    if (filteredItems.length === 0 || scored[0]?.score < 30) {
      const allLabels = allCandidates
        .filter((item) => item.label)
        .map((item) => item.label);
      const suggestion = getDidYouMean(query, allLabels);
      if (suggestion) {
        const found = allCandidates.find(
          (item) => item.label.toLowerCase() === suggestion.toLowerCase(),
        );
        if (found) {
          didYouMean = found;
        }
      }
    }
  } else {
    // Empty query: show recent + quick actions + top nav items
    const recent = getRecentItems();
    if (recent.length > 0) {
      filteredItems = [
        ...recent,
        ...CREATE_ITEMS.slice(0, 3),
        ...items.slice(0, 10),
      ];
    } else {
      filteredItems = [...CREATE_ITEMS.slice(0, 3), ...items.slice(0, 10)];
    }
  }

  // Deduplicate by id
  const seenIds = new Set<string>();
  filteredItems = filteredItems.filter((item) => {
    if (seenIds.has(item.id)) return false;
    seenIds.add(item.id);
    return true;
  });

  const grouped = filteredItems.reduce<Record<string, PaletteItem[]>>(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    },
    {},
  );

  const flatFiltered = Object.values(grouped).flat();

  // ─── Handlers ───────────────────────────────────────────────────────────

  function handleSelect(item: PaletteItem) {
    // Track in recent items
    addRecentItem(item);
    setOpen(false);
    if (item.action) {
      item.action();
    } else if (item.external) {
      window.open(item.href, "_blank", "noopener,noreferrer");
    } else if (item.href) {
      router.push(item.href);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((prev) => (prev + 1) % (flatFiltered.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected(
        (prev) =>
          (prev - 1 + (flatFiltered.length || 1)) % (flatFiltered.length || 1),
      );
    } else if (e.key === "Enter" && flatFiltered[selected]) {
      handleSelect(flatFiltered[selected]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────

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
      <div className="relative w-full max-w-lg rounded-xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] shadow-2xl">
        {/* Search input */}
        <div className="flex items-center border-b border-[var(--signal-border-default)] px-4">
          <svg
            className="h-5 w-5 text-[var(--signal-fg-tertiary)] shrink-0"
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
            className="flex-1 border-0 bg-transparent px-3 py-3.5 text-sm text-[var(--signal-fg-primary)] placeholder-slate-400 focus:outline-none"
          />
          <kbd className="rounded bg-[var(--signal-bg-secondary)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--signal-fg-secondary)]">
            ESC
          </kbd>
        </div>

        {/* Prefix hints */}
        {!query && !isShortcutQuery && (
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2">
            <button
              onClick={() => {
                setQuery("create:");
                inputRef.current?.focus();
              }}
              className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
            >
              create:
            </button>
            <button
              onClick={() => {
                setQuery("help:");
                inputRef.current?.focus();
              }}
              className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
            >
              help:
            </button>
            <button
              onClick={() => {
                setQuery("go:");
                inputRef.current?.focus();
              }}
              className="rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 transition-colors hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50"
            >
              go:
            </button>
            <span className="text-[10px] text-[var(--signal-fg-tertiary)]">
              Type a prefix to filter
            </span>
          </div>
        )}

        {/* Keyboard shortcut hint when typing ? or "shortcuts" */}
        {isShortcutQuery && (
          <div className="border-b border-slate-100 px-4 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
              Keyboard Shortcuts
            </p>
          </div>
        )}

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {flatFiltered.length === 0 && !didYouMean ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-[var(--signal-fg-tertiary)]">
                {query.startsWith("help:")
                  ? "No matching docs found."
                  : query.trim()
                    ? `No results for '\u2018${query}\u2019'. Try a different search term.`
                    : "No items to show. Start typing to search."}
              </p>
            </div>
          ) : (
            <>
              {/* Did you mean? */}
              {didYouMean && (
                <div className="mb-1 px-2 py-1">
                  <p className="text-[10px] text-[var(--signal-fg-tertiary)]">
                    Did you mean{" "}
                    <button
                      onClick={() => {
                        setQuery(didYouMean!.label);
                        inputRef.current?.focus();
                      }}
                      className="font-medium text-[var(--signal-fg-accent)] underline underline-offset-2 hover:text-[var(--signal-fg-accent)]"
                    >
                      {didYouMean.label}
                    </button>
                    ?
                  </p>
                  <p className="mt-0.5 text-[10px] text-[var(--signal-fg-tertiary)]">
                    Still showing results for &lsquo;{query}&rsquo;:
                  </p>
                </div>
              )}

              {Object.entries(grouped).map(([category, categoryItems]) => (
                <div key={category} className="mb-1">
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
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
                            ? "bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)]"
                            : "text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-secondary)]"
                        }`}
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--signal-bg-secondary)] text-xs text-[var(--signal-fg-secondary)]">
                          {categoryIcons[item.category] || "#"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {item.label}
                          </p>
                          {item.description && (
                            <p className="text-xs text-[var(--signal-fg-tertiary)] truncate">
                              {item.description}
                            </p>
                          )}
                        </div>
                        {item.external && (
                          <span className="shrink-0 text-[10px] text-[var(--signal-fg-tertiary)]">
                            \u2197
                          </span>
                        )}
                        {selected === idx && (
                          <kbd className="rounded bg-[var(--signal-bg-accent-muted)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--signal-fg-accent)]">
                            &crarr;
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer with keyboard hints */}
        <div className="flex items-center gap-4 border-t border-[var(--signal-border-default)] px-4 py-2 text-[10px] text-[var(--signal-fg-tertiary)]">
          <span>
            <kbd className="rounded bg-[var(--signal-bg-secondary)] px-1 py-0.5 font-medium">
              &uarr;
            </kbd>{" "}
            <kbd className="rounded bg-[var(--signal-bg-secondary)] px-1 py-0.5 font-medium">
              &darr;
            </kbd>{" "}
            navigate
          </span>
          <span>
            <kbd className="rounded bg-[var(--signal-bg-secondary)] px-1 py-0.5 font-medium">
              &crarr;
            </kbd>{" "}
            select
          </span>
          <span>
            <kbd className="rounded bg-[var(--signal-bg-secondary)] px-1 py-0.5 font-medium">
              esc
            </kbd>{" "}
            close
          </span>
          <span className="ml-auto">
            <kbd className="rounded bg-[var(--signal-bg-secondary)] px-1 py-0.5 font-medium">
              ?
            </kbd>{" "}
            shortcuts
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Trigger Button ──────────────────────────────────────────────────────

export function CommandPaletteButton() {
  return (
    <button
      onClick={() => openCommandPalette()}
      className="group flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[var(--signal-fg-tertiary)] transition-colors hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-secondary)]"
      aria-label="Open command palette"
      title="Quick actions — navigate, create, search docs"
    >
      <CommandIcon className="h-3.5 w-3.5 transition-colors group-hover:text-[var(--signal-fg-accent)]" />
      <span className="hidden xl:inline transition-colors group-hover:text-[var(--signal-fg-accent)]">
        Quick actions
      </span>
      <span className="hidden lg:inline xl:hidden transition-colors group-hover:text-[var(--signal-fg-accent)]">
        Actions
      </span>
      <kbd className="rounded border border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--signal-fg-tertiary)]">
        K
      </kbd>
    </button>
  );
}
