"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";

interface PaletteItem {
  id: string;
  label: string;
  description?: string;
  category: "flag" | "segment" | "navigation";
  href: string;
}

const NAV_ITEMS: PaletteItem[] = [
  { id: "nav-dashboard", label: "Dashboard", category: "navigation", href: "/dashboard" },
  { id: "nav-flags", label: "Flags", category: "navigation", href: "/flags" },
  { id: "nav-segments", label: "Segments", category: "navigation", href: "/segments" },
  { id: "nav-audit", label: "Audit Log", category: "navigation", href: "/audit" },
  { id: "nav-settings", label: "Settings", category: "navigation", href: "/settings/general" },
  { id: "nav-team", label: "Team", category: "navigation", href: "/settings/team" },
  { id: "nav-api-keys", label: "API Keys", category: "navigation", href: "/settings/api-keys" },
  { id: "nav-webhooks", label: "Webhooks", category: "navigation", href: "/settings/webhooks" },
];

const categoryLabels: Record<string, string> = {
  navigation: "Go to",
  flag: "Flags",
  segment: "Segments",
};

const categoryIcons: Record<string, string> = {
  navigation: "\u2192",
  flag: "\u2691",
  segment: "\u25A8",
};

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
        (flags || []).forEach((f: any) => {
          results.push({
            id: `flag-${f.key}`,
            label: f.key,
            description: f.name,
            category: "flag",
            href: `/flags/${f.key}`,
          });
        });
        (segments || []).forEach((s: any) => {
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

  const filtered = items.filter(
    (item) =>
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      item.description?.toLowerCase().includes(query.toLowerCase()),
  );

  const grouped = filtered.reduce<Record<string, PaletteItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const flatFiltered = Object.values(grouped).flat();

  function handleSelect(item: PaletteItem) {
    setOpen(false);
    router.push(item.href);
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center border-b border-slate-200 px-4">
          <svg className="h-5 w-5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search flags, segments, or navigate..."
            className="flex-1 border-0 bg-transparent px-3 py-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          <kbd className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">ESC</kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {flatFiltered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400">No results found.</div>
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
