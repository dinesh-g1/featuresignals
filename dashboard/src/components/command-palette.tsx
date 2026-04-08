"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import type { Flag, Segment } from "@/lib/types";

interface PaletteItem {
  id: string;
  label: string;
  description?: string;
  category: "flag" | "segment" | "navigation" | "create" | "help" | "docs";
  href: string;
  external?: boolean;
}

const NAV_ITEMS: PaletteItem[] = [
  { id: "nav-overview", label: "Overview", category: "navigation", href: "/dashboard" },
  { id: "nav-flags", label: "Flags", category: "navigation", href: "/flags" },
  { id: "nav-segments", label: "Segments", category: "navigation", href: "/segments" },
  { id: "nav-env-comparison", label: "Env Comparison", category: "navigation", href: "/env-comparison" },
  { id: "nav-target-inspector", label: "Target Inspector", category: "navigation", href: "/target-inspector" },
  { id: "nav-target-comparison", label: "Target Comparison", category: "navigation", href: "/target-comparison" },
  { id: "nav-metrics", label: "Metrics", category: "navigation", href: "/metrics" },
  { id: "nav-usage-insights", label: "Usage Insights", category: "navigation", href: "/usage-insights" },
  { id: "nav-health", label: "Flag Health", category: "navigation", href: "/health" },
  { id: "nav-audit", label: "Audit Log", category: "navigation", href: "/audit" },
  { id: "nav-approvals", label: "Approvals", category: "navigation", href: "/approvals" },
  { id: "nav-settings", label: "Settings", category: "navigation", href: "/settings/general" },
  { id: "nav-team", label: "Team", category: "navigation", href: "/settings/team" },
  { id: "nav-api-keys", label: "API Keys", category: "navigation", href: "/settings/api-keys" },
  { id: "nav-webhooks", label: "Webhooks", category: "navigation", href: "/settings/webhooks" },
  { id: "nav-billing", label: "Billing", category: "navigation", href: "/settings/billing" },
  { id: "nav-notifications", label: "Notifications", category: "navigation", href: "/settings/notifications" },
  { id: "nav-sso", label: "SSO", category: "navigation", href: "/settings/sso" },
];

const CREATE_ITEMS: PaletteItem[] = [
  { id: "create-flag", label: "Create Flag", description: "Create a new feature flag", category: "create", href: "/flags?create=true" },
  { id: "create-segment", label: "Create Segment", description: "Create a new user segment", category: "create", href: "/segments?create=true" },
  { id: "create-project", label: "Create Project", description: "Set up a new project", category: "create", href: "/onboarding" },
  { id: "create-api-key", label: "Create API Key", description: "Generate a new API key", category: "create", href: "/settings/api-keys" },
  { id: "create-webhook", label: "Create Webhook", description: "Set up a new webhook endpoint", category: "create", href: "/settings/webhooks" },
  { id: "invite-member", label: "Invite Team Member", description: "Add someone to your team", category: "create", href: "/settings/team" },
];

const HELP_ITEMS: PaletteItem[] = [
  { id: "help-quickstart", label: "Quickstart Guide", description: "Get up and running in 5 minutes", category: "help", href: "https://docs.featuresignals.com/getting-started/quickstart", external: true },
  { id: "help-sdks", label: "SDK Documentation", description: "Go, Node, Python, Java, React, Vue...", category: "help", href: "https://docs.featuresignals.com/sdks/overview", external: true },
  { id: "help-api", label: "API Reference", description: "Full REST API documentation", category: "help", href: "https://docs.featuresignals.com/api-playground", external: true },
  { id: "help-targeting", label: "Targeting Rules", description: "How to target users with flag rules", category: "help", href: "https://docs.featuresignals.com/core-concepts/targeting-and-segments", external: true },
  { id: "help-segments", label: "Segments Guide", description: "Create reusable user segments", category: "help", href: "https://docs.featuresignals.com/core-concepts/targeting-and-segments", external: true },
  { id: "help-experiments", label: "A/B Experiments", description: "Set up A/B tests with variants", category: "help", href: "https://docs.featuresignals.com/core-concepts/ab-experimentation", external: true },
  { id: "help-approvals", label: "Approval Workflows", description: "Require reviews for production changes", category: "help", href: "https://docs.featuresignals.com/advanced/approval-workflows", external: true },
  { id: "help-webhooks", label: "Webhooks Guide", description: "Set up event notifications", category: "help", href: "https://docs.featuresignals.com/advanced/webhooks", external: true },
  { id: "help-rbac", label: "Roles & Permissions", description: "RBAC with environment-level control", category: "help", href: "https://docs.featuresignals.com/advanced/rbac", external: true },
  { id: "help-deploy", label: "Deployment Guide", description: "Docker, Kubernetes, self-hosted setup", category: "help", href: "https://docs.featuresignals.com/deployment/self-hosting", external: true },
  { id: "help-support", label: "Contact Support", description: "Email support@featuresignals.com", category: "help", href: "mailto:support@featuresignals.com", external: true },
];

const DOCS_ITEMS: PaletteItem[] = [
  { id: "docs-flags", label: "Feature Flags", description: "Concepts: types, lifecycle, categories", category: "docs", href: "https://docs.featuresignals.com/core-concepts/feature-flags", external: true },
  { id: "docs-environments", label: "Environments", description: "Dev, staging, production setup", category: "docs", href: "https://docs.featuresignals.com/core-concepts/projects-and-environments", external: true },
  { id: "docs-eval-engine", label: "Evaluation Engine", description: "How flag evaluation works", category: "docs", href: "https://docs.featuresignals.com/architecture/evaluation-engine", external: true },
  { id: "docs-openfeature", label: "OpenFeature", description: "Vendor-neutral flag evaluation", category: "docs", href: "https://docs.featuresignals.com/sdks/openfeature", external: true },
  { id: "docs-relay-proxy", label: "Relay Proxy", description: "Edge caching for low latency", category: "docs", href: "https://docs.featuresignals.com/advanced/relay-proxy", external: true },
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
    const results: PaletteItem[] = [...NAV_ITEMS];
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
            category: "flag",
            href: `/flags/${f.key}`,
          });
        });
        (segments || []).forEach((s: Segment) => {
          results.push({
            id: `seg-${s.key}`,
            label: s.key,
            description: s.name,
            category: "segment",
            href: `/segments`,
          });
        });
      } catch { /* ignore */ }
    }
    setItems(results);
  }, [token, projectId]);

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

  const grouped = filteredItems.reduce<Record<string, PaletteItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const flatFiltered = Object.values(grouped).flat();

  function handleSelect(item: PaletteItem) {
    setOpen(false);
    if (item.external) {
      window.open(item.href, "_blank", "noopener,noreferrer");
    } else {
      router.push(item.href);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((prev) => Math.min(prev + 1, flatFiltered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && flatFiltered[selected]) {
      handleSelect(flatFiltered[selected]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  if (!open) return null;

  let flatIdx = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} role="presentation" />
      <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center border-b border-slate-200 px-4">
          <svg className="h-5 w-5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true" focusable="false">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder(query)}
            aria-label="Search commands, flags, and segments"
            className="flex-1 border-0 bg-transparent px-3 py-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          <kbd className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">ESC</kbd>
        </div>

        {/* Prefix hints */}
        {!query && (
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2">
            <button
              onClick={() => { setQuery("create:"); inputRef.current?.focus(); }}
              className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              create:
            </button>
            <button
              onClick={() => { setQuery("help:"); inputRef.current?.focus(); }}
              className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 transition-colors hover:bg-blue-100"
            >
              help:
            </button>
            <span className="text-[10px] text-slate-400">Type a prefix to filter</span>
          </div>
        )}

        <div className="max-h-80 overflow-y-auto p-2">
          {flatFiltered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400">
              {query.startsWith("help:") ? "No matching docs found." : "No results found."}
            </div>
          ) : (
            Object.entries(grouped).map(([category, categoryItems]) => (
              <div key={category} className="mb-1">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
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
                        selected === idx ? "bg-indigo-50 text-indigo-900" : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-xs text-slate-500">
                        {categoryIcons[item.category] || "#"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{item.label}</p>
                        {item.description && (
                          <p className="text-xs text-slate-400 truncate">{item.description}</p>
                        )}
                      </div>
                      {item.external && (
                        <span className="shrink-0 text-[10px] text-slate-400">\u2197</span>
                      )}
                      {selected === idx && (
                        <kbd className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600">
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

        <div className="flex items-center gap-4 border-t border-slate-200 px-4 py-2 text-[10px] text-slate-400">
          <span><kbd className="rounded bg-slate-100 px-1 py-0.5 font-medium">&uarr;</kbd> <kbd className="rounded bg-slate-100 px-1 py-0.5 font-medium">&darr;</kbd> navigate</span>
          <span><kbd className="rounded bg-slate-100 px-1 py-0.5 font-medium">&crarr;</kbd> select</span>
          <span><kbd className="rounded bg-slate-100 px-1 py-0.5 font-medium">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
