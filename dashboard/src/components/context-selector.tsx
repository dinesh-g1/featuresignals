"use client";

import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import type { Project, Environment } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  FolderOpen,
  Globe,
  Plus,
  Search,
  ChevronDown,
  X,
  Clock,
} from "lucide-react";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { CreateEnvironmentDialog } from "@/components/create-environment-dialog";

const MAX_RECENT = 5;

function getRecentProjects(): string[] {
  try {
    return JSON.parse(localStorage.getItem("fs:recent-projects") || "[]");
  } catch {
    return [];
  }
}

function setRecentProjects(ids: string[]) {
  localStorage.setItem(
    "fs:recent-projects",
    JSON.stringify(ids.slice(0, MAX_RECENT)),
  );
}

function getRecentEnvs(): string[] {
  try {
    return JSON.parse(localStorage.getItem("fs:recent-envs") || "[]");
  } catch {
    return [];
  }
}

function setRecentEnvs(ids: string[]) {
  localStorage.setItem(
    "fs:recent-envs",
    JSON.stringify(ids.slice(0, MAX_RECENT)),
  );
}

const ENV_COLORS: Record<string, string> = {
  production: "bg-red-100 text-red-700 border-red-200",
  staging: "bg-amber-100 text-amber-700 border-amber-200",
  development: "bg-blue-100 text-blue-700 border-blue-200",
  dev: "bg-blue-100 text-blue-700 border-blue-200",
  test: "bg-purple-100 text-purple-700 border-purple-200",
  qa: "bg-teal-100 text-teal-700 border-teal-200",
};

function getEnvBadgeClass(slug: string): string {
  const key = slug?.toLowerCase() || "";
  return ENV_COLORS[key] || "bg-slate-100 text-slate-600 border-slate-200";
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

interface ComboboxItem {
  value: string;
  label: string;
  badgeText?: string;
  badgeClass?: string;
}

interface ComboboxProps {
  items: ComboboxItem[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  icon: React.ReactNode;
  onCreate?: () => void;
  onEmptyAction?: () => void;
  emptyLabel?: string;
  recentIds?: string[];
}

function Combobox({
  items,
  value,
  onValueChange,
  placeholder,
  icon,
  onCreate,
  onEmptyAction,
  emptyLabel = "No items found",
  recentIds,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 150);
  const [highlighted, setHighlighted] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const recentItems = recentIds
    ? items.filter((i) => recentIds.includes(i.value))
    : [];
  const nonRecentItems = items.filter(
    (i) => !recentIds || !recentIds.includes(i.value),
  );

  const filteredItems = items.filter(
    (i) =>
      !debouncedQuery ||
      i.label.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
      i.value.toLowerCase().includes(debouncedQuery.toLowerCase()),
  );

  const displayItems = filteredItems;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlighted((prev) => Math.min(prev + 1, displayItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlighted((prev) => Math.max(prev - 1, 0));
      } else if (
        e.key === "Enter" &&
        highlighted >= 0 &&
        displayItems[highlighted]
      ) {
        e.preventDefault();
        onValueChange(displayItems[highlighted].value);
        setOpen(false);
        setQuery("");
      } else if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, displayItems, highlighted, onValueChange]);

  // Scroll highlighted into view
  useEffect(() => {
    if (highlighted < 0 || !listRef.current) return;
    const el = listRef.current.children[highlighted] as HTMLElement;
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [highlighted]);

  // Reset highlight when items change
  useEffect(() => {
    setTimeout(() => setHighlighted(-1), 0);
  }, [debouncedQuery]);

  const selectedItem = items.find((i) => i.value === value);

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger — minimal text+chevron */}
      <button
        onClick={() => {
          setOpen(!open);
          if (!open) setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="group flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="shrink-0 text-slate-400">{icon}</span>
        {selectedItem ? (
          <span className="flex items-center gap-1.5 truncate">
            <span className="truncate text-slate-700">
              {selectedItem.label}
            </span>
            {selectedItem.badgeText && (
              <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    selectedItem.badgeClass,
                  )}
                />
              </span>
            )}
          </span>
        ) : (
          <span className="text-slate-400">{placeholder}</span>
        )}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-0 z-[9999] w-56 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
          role="listbox"
          style={{ top: "calc(100% + 4px)" }}
        >
          {/* Search input */}
          <div className="flex items-center gap-2 border-b border-slate-100 px-2 py-1.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="flex-1 border-0 bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && filteredItems.length === 1) {
                  onValueChange(filteredItems[0].value);
                  setOpen(false);
                  setQuery("");
                }
              }}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="shrink-0 rounded p-0.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Items list */}
          <div ref={listRef} className="max-h-48 overflow-y-auto py-1">
            {recentItems.length > 0 && !debouncedQuery && (
              <div>
                <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Recent
                </p>
                {recentItems.map((item, idx) => (
                  <button
                    key={item.value}
                    onClick={() => {
                      onValueChange(item.value);
                      setOpen(false);
                      setQuery("");
                    }}
                    onMouseEnter={() => setHighlighted(idx)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors",
                      item.value === value
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-700 hover:bg-slate-50",
                    )}
                    role="option"
                    aria-selected={item.value === value}
                  >
                    <Clock className="h-3 w-3 shrink-0 text-slate-400" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.value === value && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {displayItems.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-400">
                {emptyLabel}
              </div>
            ) : (
              displayItems.map((item, idx) => {
                const globalIdx =
                  recentItems.length > 0 && !debouncedQuery
                    ? recentItems.indexOf(item) >= 0
                      ? recentItems.indexOf(item)
                      : recentItems.length + nonRecentItems.indexOf(item)
                    : idx;
                return (
                  <button
                    key={item.value}
                    onClick={() => {
                      onValueChange(item.value);
                      setOpen(false);
                      setQuery("");
                    }}
                    onMouseEnter={() => setHighlighted(globalIdx)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors",
                      highlighted === globalIdx
                        ? "bg-indigo-50 text-indigo-700"
                        : item.value === value
                          ? "bg-slate-50 text-slate-900"
                          : "text-slate-700 hover:bg-slate-50",
                    )}
                    role="option"
                    aria-selected={item.value === value}
                  >
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.value === value && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer actions */}
          {(onCreate || onEmptyAction) && (
            <div className="border-t border-slate-100 py-1">
              {onEmptyAction && items.length === 0 && (
                <button
                  onClick={() => {
                    onEmptyAction();
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 transition-colors hover:bg-slate-50"
                >
                  <Plus className="h-3 w-3" />
                  {emptyLabel.includes("Create") ? emptyLabel : `Create new`}
                </button>
              )}
              {onCreate && (
                <button
                  onClick={() => {
                    onCreate();
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 transition-colors hover:bg-slate-50"
                >
                  <Plus className="h-3 w-3" />
                  Create new…
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ContextSelector() {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const currentEnvId = useAppStore((s) => s.currentEnvId);
  const setCurrentEnv = useAppStore((s) => s.setCurrentEnv);

  const [projects, setProjects] = useState<Project[]>([]);
  const [envs, setEnvs] = useState<Environment[]>([]);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [envDialogOpen, setEnvDialogOpen] = useState(false);
  const [recentProjects, setRecentProjects] = useState<string[]>(() =>
    getRecentProjects(),
  );
  const [recentEnvs, setRecentEnvs] = useState<string[]>(() => getRecentEnvs());

  // Load projects
  useEffect(() => {
    if (!token) return;
    api
      .listProjects(token)
      .then((list) => {
        const sorted = (list ?? []).sort((a, b) =>
          a.name.localeCompare(b.name),
        );
        setProjects(sorted);
        if (sorted.length > 0 && !projectId) {
          setCurrentProject(sorted[0].id);
        }
      })
      .catch(() => {});
  }, [token, projectId, setCurrentProject]);

  // Load environments
  useEffect(() => {
    if (!token || !projectId) return;
    api
      .listEnvironments(token, projectId)
      .then((list) => {
        const sorted = (list ?? []).sort((a, b) =>
          a.name.localeCompare(b.name),
        );
        setEnvs(sorted);
        if (sorted.length > 0 && !currentEnvId) {
          setCurrentEnv(sorted[0].id);
        }
      })
      .catch(() => {
        setEnvs([]);
      });
  }, [token, projectId, currentEnvId, setCurrentEnv]);

  function handleProjectChange(id: string) {
    setCurrentProject(id);
    setCurrentEnv("");
    setRecentProjects((prev) => {
      const updated = [id, ...prev.filter((p) => p !== id)];
      return updated;
    });
  }

  function handleEnvChange(id: string) {
    setCurrentEnv(id);
    setRecentEnvs((prev) => {
      const updated = [id, ...prev.filter((e) => e !== id)];
      return updated;
    });
  }

  function handleProjectCreated(created: Project) {
    setProjects((prev) =>
      [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
    );
    handleProjectChange(created.id);
  }

  function handleEnvironmentCreated(created: Environment) {
    setEnvs((prev) =>
      [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
    );
    handleEnvChange(created.id);
  }

  const projectItems = projects.map((p) => ({ value: p.id, label: p.name }));
  const envItems = envs.map((e) => ({
    value: e.id,
    label: e.name,
    badgeText: e.slug,
    badgeClass: getEnvBadgeClass(e.slug),
  }));

  return (
    <>
      <div className="flex items-center">
        {/* Project selector */}
        <div>
          {projects.length === 0 ? (
            <button
              onClick={() => setProjectDialogOpen(true)}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-50"
            >
              <Plus className="h-4 w-4" />
              Create Project
            </button>
          ) : (
            <Combobox
              items={projectItems}
              value={projectId || ""}
              onValueChange={handleProjectChange}
              placeholder="Select project…"
              icon={<FolderOpen className="h-4 w-4" strokeWidth={1.5} />}
              onCreate={() => setProjectDialogOpen(true)}
              recentIds={recentProjects}
            />
          )}
        </div>

        {/* Separator */}
        {projects.length > 0 && projectId && (
          <span className="mx-1 text-slate-300">/</span>
        )}

        {/* Environment selector */}
        {projectId && (
          <div>
            {envs.length === 0 ? (
              <button
                onClick={() => setEnvDialogOpen(true)}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-50"
              >
                <Plus className="h-4 w-4" />
                Create Environment
              </button>
            ) : (
              <Combobox
                items={envItems}
                value={currentEnvId || ""}
                onValueChange={handleEnvChange}
                placeholder="Select environment…"
                icon={<Globe className="h-4 w-4" strokeWidth={1.5} />}
                onCreate={() => setEnvDialogOpen(true)}
                recentIds={recentEnvs}
              />
            )}
          </div>
        )}
      </div>

      <CreateProjectDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        onCreated={handleProjectCreated}
      />
      <CreateEnvironmentDialog
        open={envDialogOpen}
        onOpenChange={setEnvDialogOpen}
        onCreated={handleEnvironmentCreated}
      />
    </>
  );
}
