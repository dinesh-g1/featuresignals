"use client";

/**
 * CommandPalette — Global Cmd+K overlay for the FeatureSignals Console.
 *
 * Provides natural-language command parsing, fuzzy feature search,
 * lifecycle stage navigation, and quick actions — all without an LLM.
 *
 * Opens on Cmd+K (Mac) / Ctrl+K (Windows/Linux). Closes on Escape
 * or click-outside. Arrow keys navigate results; Enter executes.
 *
 * Design tokens only. Zero hardcoded colors. Zero `any`.
 *
 * @see CONSOLE_REDESIGN.md §3.2
 * @see console-types.ts → ParsedIntent
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Rocket,
  Flag,
  BookOpen,
  Monitor,
  BarChart3,
  Settings,
  HelpCircle,
  ToggleLeft,
  ToggleRight,
  PlusCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useConsoleStore } from "@/stores/console-store";
import { STAGE_BY_ID, LIFECYCLE_STAGES } from "@/lib/console-constants";
import type {
  ParsedIntent,
  LifecycleStage,
  FeatureCardData,
  StageDefinition,
} from "@/lib/console-types";

// ─── Types ───────────────────────────────────────────────────────────

interface PaletteItem {
  id: string;
  section: "action" | "feature" | "navigate" | "help";
  label: string;
  description?: string;
  shortcut?: string;
  icon: LucideIcon;
  intent: ParsedIntent;
  feature?: FeatureCardData;
  stage?: StageDefinition;
}

// ─── Status dot colors ───────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  live: "var(--signal-fg-success)",
  partial: "var(--signal-fg-warning)",
  paused: "var(--signal-fg-tertiary)",
  retired: "var(--signal-fg-tertiary)",
  scheduled: "var(--signal-fg-info)",
  needs_attention: "var(--signal-fg-danger)",
};

const STATUS_LABEL: Record<string, string> = {
  live: "LIVE",
  partial: "PARTIAL",
  paused: "PAUSED",
  retired: "RETIRED",
  scheduled: "SCHEDULED",
  needs_attention: "NEEDS ATTENTION",
};

// ─── Regex Patterns ──────────────────────────────────────────────────

const PATTERNS = {
  ship: /^ship\s+(.+?)\s+to\s+(\d+)%(\s+in\s+(production|staging|development))?$/i,
  toggle:
    /^(?:toggle|turn)\s+(on|off)\s+(.+?)(\s+in\s+(production|staging|development))?$/i,
  navigate: /^(?:go\s+to|navigate\s+to|open)\s+(.+)$/i,
  create: /^(?:create|new)\s+(flag|segment|environment)$/i,
  help: /^(?:help|how\s+(?:do|can|to))\s+(.+)$/i,
};

// ─── Intent Parser ───────────────────────────────────────────────────

function parseIntent(input: string): ParsedIntent {
  const trimmed = input.trim();
  if (!trimmed) return { type: "unknown", raw: "" };

  // Ship: "ship dark-mode to 50%" or "ship dark-mode to 50% in production"
  const shipMatch = trimmed.match(PATTERNS.ship);
  if (shipMatch) {
    return {
      type: "ship",
      featureName: shipMatch[1].trim(),
      percent: parseInt(shipMatch[2], 10),
      environment: shipMatch[4]?.toLowerCase(),
    };
  }

  // Toggle: "toggle on dark-mode" or "turn off dark-mode in staging"
  const toggleMatch = trimmed.match(PATTERNS.toggle);
  if (toggleMatch) {
    return {
      type: "toggle",
      action: toggleMatch[1].toLowerCase() as "on" | "off",
      featureName: toggleMatch[2].trim(),
      environment: toggleMatch[4]?.toLowerCase(),
    };
  }

  // Navigate: "go to monitor" or "navigate to settings"
  const navMatch = trimmed.match(PATTERNS.navigate);
  if (navMatch) {
    const target = navMatch[1].trim().toLowerCase();
    return {
      type: "navigate",
      target: target as LifecycleStage | "settings" | "connect" | "learn",
    };
  }

  // Create: "create flag" or "new segment"
  const createMatch = trimmed.match(PATTERNS.create);
  if (createMatch) {
    return {
      type: "create",
      entity: createMatch[1].toLowerCase() as
        | "flag"
        | "segment"
        | "environment",
    };
  }

  // Help: "help I can't ship" or "how do I create a flag"
  const helpMatch = trimmed.match(PATTERNS.help);
  if (helpMatch) {
    return { type: "help", query: helpMatch[1].trim() };
  }

  // Default: search
  return { type: "search", query: trimmed };
}

// ─── Fuzzy Match ─────────────────────────────────────────────────────

function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t === q) return 1;
  if (t.startsWith(q)) return 0.9;
  if (t.includes(q)) return 0.7;

  // Subsequence match
  let qi = 0;
  let consecutive = 0;
  let maxConsecutive = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      qi++;
      consecutive++;
      maxConsecutive = Math.max(maxConsecutive, consecutive);
    } else {
      consecutive = 0;
    }
  }
  if (qi === q.length) {
    return 0.5 + (maxConsecutive / q.length) * 0.4;
  }

  return 0;
}

function sortByFuzzy<T>(
  items: T[],
  query: string,
  keyFn: (item: T) => string,
): T[] {
  const scored = items.map((item) => ({
    item,
    score: fuzzyScore(query, keyFn(item)),
  }));
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.item);
}

// ─── Stage label normalize ───────────────────────────────────────────

function normalizeStageTarget(raw: string): string | null {
  const lower = raw.toLowerCase();
  // Direct stage ID match
  if (STAGE_BY_ID[lower as LifecycleStage]) return lower;
  // Label match (e.g. "monitor" matches Monitor stage)
  for (const [id, def] of Object.entries(STAGE_BY_ID) as [
    string,
    StageDefinition,
  ][]) {
    if (def.label.toLowerCase() === lower) return id;
  }
  // Special targets
  if (["settings", "connect", "learn"].includes(lower)) return lower;
  return null;
}

// ─── Feature fuzzy filter ────────────────────────────────────────────

function fuzzyFilterFeatures(
  features: FeatureCardData[],
  query: string,
): FeatureCardData[] {
  if (!query) return features.slice(0, 8);
  return sortByFuzzy(features, query, (f) => `${f.name} ${f.key}`).slice(0, 8);
}

// ─── Section headers map ──────────────────────────────────────────────

const SECTION_HEADERS: Record<string, string> = {
  action: "⚡ Actions",
  feature: "📍 Features",
  navigate: "🧭 Navigate",
  help: "💡 Help",
};

// ─── Component ───────────────────────────────────────────────────────

export function CommandPalette() {
  // ── Store ──────────────────────────────────────────────────────────
  const features = useConsoleStore((s) => s.features);
  const selectStage = useConsoleStore((s) => s.selectStage);
  const selectFeature = useConsoleStore((s) => s.selectFeature);
  const setSearchQuery = useConsoleStore((s) => s.setSearchQuery);
  const setHelpOpen = useConsoleStore((s) => s.setHelpOpen);
  const selectedEnvironment = useConsoleStore((s) => s.selectedEnvironment);
  const open = useConsoleStore((s) => s.commandPaletteOpen);
  const setOpen = useConsoleStore((s) => s.setCommandPaletteOpen);

  // ── Local State ────────────────────────────────────────────────────
  const [input, setInput] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // ── Parse Intent ───────────────────────────────────────────────────
  const intent = useMemo(() => parseIntent(input), [input]);

  // ── Build Items ────────────────────────────────────────────────────
  const items = useMemo<PaletteItem[]>(() => {
    const results: PaletteItem[] = [];

    // ── Actions section (when intent is parsed) ──────────────────────
    if (intent.type === "ship" && intent.featureName) {
      const matched = fuzzyFilterFeatures(features, intent.featureName);
      for (const f of matched.slice(0, 3)) {
        results.push({
          id: `ship-${f.key}`,
          section: "action",
          label: `Ship "${f.name}" to ${intent.percent ?? 50}%`,
          description: `Preflight · ${intent.environment ?? selectedEnvironment}`,
          icon: Rocket,
          intent: {
            type: "ship",
            featureName: f.key,
            percent: intent.percent,
            environment: intent.environment,
          },
          feature: f,
        });
      }
      if (results.length === 0 && intent.featureName.length > 1) {
        results.push({
          id: "ship-unknown",
          section: "action",
          label: `Ship "${intent.featureName}" to ${intent.percent ?? 50}%`,
          description: "Feature not found — try a different name",
          icon: Rocket,
          intent: {
            type: "ship",
            featureName: intent.featureName,
            percent: intent.percent,
            environment: intent.environment,
          },
        });
      }
    }

    if (intent.type === "toggle" && intent.featureName) {
      const matched = fuzzyFilterFeatures(features, intent.featureName);
      const ToggleIcon = intent.action === "on" ? ToggleRight : ToggleLeft;
      for (const f of matched.slice(0, 3)) {
        results.push({
          id: `toggle-${f.key}`,
          section: "action",
          label: `${intent.action === "on" ? "Turn ON" : "Turn OFF"} "${f.name}"`,
          description: `Toggle · ${intent.environment ?? selectedEnvironment}`,
          icon: ToggleIcon,
          intent: {
            type: "toggle",
            featureName: f.key,
            action: intent.action,
            environment: intent.environment,
          },
          feature: f,
        });
      }
    }

    if (intent.type === "create") {
      const entity = intent.entity;
      results.push({
        id: `create-${entity}`,
        section: "action",
        label:
          entity === "flag"
            ? "Create new flag"
            : entity === "segment"
              ? "Create new segment"
              : "Create new environment",
        description: `Opens create ${entity} dialog`,
        icon: PlusCircle,
        intent,
      });
    }

    // ── Features section (search mode) ───────────────────────────────
    if (
      intent.type === "search" ||
      intent.type === "ship" ||
      intent.type === "toggle"
    ) {
      const query = intent.type === "search" ? intent.query : "";
      const matched = fuzzyFilterFeatures(features, query);
      for (const f of matched) {
        // Avoid duplicates from action section
        if (!results.some((r) => r.feature?.key === f.key)) {
          results.push({
            id: `feature-${f.key}`,
            section: "feature",
            label: f.name,
            description: `${STAGE_BY_ID[f.stage]?.label ?? f.stage} stage · ${f.environment}`,
            icon: Flag,
            intent: { type: "navigate", target: f.stage },
            feature: f,
          });
        }
      }
    }

    // ── Navigate section ─────────────────────────────────────────────
    if (
      intent.type === "navigate" ||
      intent.type === "unknown" ||
      intent.type === "search"
    ) {
      const navTargets: Array<{ id: string; label: string; icon: LucideIcon }> =
        [];

      // If a specific target was parsed, only show matching stages
      if (intent.type === "navigate") {
        const normalized = normalizeStageTarget(intent.target);
        if (normalized && STAGE_BY_ID[normalized as LifecycleStage]) {
          const def = STAGE_BY_ID[normalized as LifecycleStage];
          navTargets.push({
            id: `nav-${def.id}`,
            label: `Go to ${def.label} stage`,
            icon: Monitor,
          });
        } else if (normalized === "settings") {
          navTargets.push({
            id: "nav-settings",
            label: "Go to Settings",
            icon: Settings,
          });
        } else if (normalized === "learn") {
          navTargets.push({
            id: "nav-learn",
            label: "Go to Learn zone",
            icon: BookOpen,
          });
        } else {
          // Unknown target — try fuzzy matching stage names
          for (const def of LIFECYCLE_STAGES) {
            if (fuzzyScore(intent.target, def.label) > 0.3) {
              navTargets.push({
                id: `nav-${def.id}`,
                label: `Go to ${def.label} stage`,
                icon: Monitor,
              });
            }
          }
        }
      } else if (
        intent.type === "unknown" ||
        (intent.type === "search" && !intent.query)
      ) {
        // Show popular navigation targets
        navTargets.push({
          id: "nav-monitor",
          label: "Go to Monitor stage",
          icon: BarChart3,
        });
        navTargets.push({
          id: "nav-analyze",
          label: "Go to Analyze stage",
          icon: Monitor,
        });
        navTargets.push({
          id: "nav-settings",
          label: "Go to Settings",
          icon: Settings,
        });
        navTargets.push({
          id: "nav-learn",
          label: "Go to Learn zone",
          icon: BookOpen,
        });
      }

      for (const t of navTargets) {
        if (!results.some((r) => r.id === t.id)) {
          const stageId = t.id.replace("nav-", "") as LifecycleStage;
          results.push({
            id: t.id,
            section: "navigate",
            label: t.label,
            icon: t.icon,
            intent: { type: "navigate", target: stageId },
            stage: STAGE_BY_ID[stageId],
          });
        }
      }
    }

    // ── Help section ─────────────────────────────────────────────────
    if (intent.type === "help") {
      results.push({
        id: "help-action",
        section: "help",
        label: "Get help with this",
        description: "Open help widget with your question",
        icon: HelpCircle,
        intent,
      });
    }

    return results;
  }, [intent, features, selectedEnvironment]);

  // ── Section grouping ────────────────────────────────────────────────
  const sections = useMemo(() => {
    const map = new Map<string, PaletteItem[]>();
    const order: string[] = [];

    for (const item of items) {
      if (!map.has(item.section)) {
        map.set(item.section, []);
        order.push(item.section);
      }
      map.get(item.section)!.push(item);
    }

    return order.map((key) => ({
      key,
      label: SECTION_HEADERS[key] ?? key,
      items: map.get(key)!,
    }));
  }, [items]);

  // ── Reset selection when items change ─────────────────────────────
  useEffect(() => {
    setSelectedIndex(0);
  }, [items.length]);

  // ── Keyboard listener ──────────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "k") {
        e.preventDefault();
        setOpen(!open);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ── Auto-focus input on open ───────────────────────────────────────
  useEffect(() => {
    if (open) {
      // Small delay to allow the animation to start
      const raf = requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setInput("");
      setSelectedIndex(0);
    }
  }, [open]);

  // ── Scroll selected item into view ─────────────────────────────────
  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.querySelector(
      `[data-palette-index="${selectedIndex}"]`,
    );
    if (selected) {
      selected.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  // ── Handlers ───────────────────────────────────────────────────────

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const execute = useCallback(
    (item: PaletteItem) => {
      const i = item.intent;

      switch (i.type) {
        case "ship": {
          if (i.featureName) {
            selectFeature(i.featureName);
            // Trigger ship wizard — this is handled by the lifecycle zone
            // detecting the selected feature and opening the ship wizard.
            // We also navigate to the ship stage for context.
            selectStage("ship");
          }
          break;
        }
        case "toggle": {
          if (i.featureName) {
            selectFeature(i.featureName);
            selectStage("configure");
          }
          break;
        }
        case "navigate": {
          const normalized = normalizeStageTarget(i.target);
          if (normalized && STAGE_BY_ID[normalized as LifecycleStage]) {
            selectStage(normalized as LifecycleStage);
          } else if (normalized === "settings") {
            // Navigate to settings — handled by the console
            selectStage(null);
          } else if (normalized === "learn") {
            selectStage("learn");
          }
          break;
        }
        case "create": {
          // Open create dialog — store could be extended to track this
          // For now, navigate to the flag stage for flag creation
          if (i.entity === "flag") {
            selectStage("flag");
          }
          break;
        }
        case "search": {
          setSearchQuery(i.query);
          // Find the most relevant stage for the first matching feature
          const matched = fuzzyFilterFeatures(features, i.query);
          if (matched.length > 0) {
            selectFeature(matched[0].key);
            selectStage(matched[0].stage);
          }
          break;
        }
        case "help": {
          setHelpOpen(true);
          break;
        }
        default:
          break;
      }

      close();
    },
    [selectStage, selectFeature, setSearchQuery, setHelpOpen, features, close],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          setSelectedIndex((prev) => {
            const max = items.length;
            if (max === 0) return 0;
            return prev >= max - 1 ? 0 : prev + 1;
          });
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          setSelectedIndex((prev) => {
            const max = items.length;
            if (max === 0) return 0;
            return prev <= 0 ? max - 1 : prev - 1;
          });
          break;
        }
        case "Enter": {
          e.preventDefault();
          if (items[selectedIndex]) {
            execute(items[selectedIndex]);
          }
          break;
        }
        case "Escape": {
          e.preventDefault();
          close();
          break;
        }
        default:
          break;
      }
    },
    [items, selectedIndex, execute, close],
  );

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) {
        close();
      }
    },
    [close],
  );

  // ── Compute flat index for each item across sections ───────────────
  let globalIndex = 0;
  const indexedItems = sections.flatMap((section) =>
    section.items.map((item) => {
      const idx = globalIndex++;
      return { item, index: idx };
    }),
  );

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={overlayRef}
          className={cn(
            "fixed inset-0 z-50",
            "flex items-start justify-center",
          )}
          style={{
            paddingTop: "20vh",
            backgroundColor: "rgba(0, 0, 0, 0.4)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={handleOverlayClick}
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          <motion.div
            className={cn(
              "flex flex-col w-full max-w-[560px] max-h-[480px]",
              "bg-[var(--signal-bg-primary)]",
              "border border-[var(--signal-border-default)]",
              "shadow-[var(--signal-shadow-xl)]",
              "rounded-[var(--signal-radius-lg)]",
              "overflow-hidden",
            )}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {/* ── Input ──────────────────────────────────────────── */}
            <div className="flex items-center gap-3 px-4 py-3">
              <Search
                className="h-5 w-5 shrink-0 text-[var(--signal-fg-tertiary)]"
                aria-hidden="true"
              />
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a command or search..."
                className={cn(
                  "flex-1 bg-transparent border-none outline-none",
                  "text-[18px] text-[var(--signal-fg-primary)]",
                  "placeholder:text-[var(--signal-fg-tertiary)]",
                  "leading-6",
                )}
                aria-label="Command input"
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            {/* ── Divider ────────────────────────────────────────── */}
            <div className="border-t border-[var(--signal-border-subtle)]" />

            {/* ── Results ────────────────────────────────────────── */}
            <div
              ref={listRef}
              className="flex-1 overflow-y-auto max-h-[340px]"
              role="listbox"
              aria-label="Command results"
            >
              {sections.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-[var(--signal-fg-tertiary)]">
                  {input.trim()
                    ? "No results found. Try a different search."
                    : "Start typing to search features or enter a command."}
                </div>
              )}

              {sections.map((section) => (
                <div key={section.key} role="group" aria-label={section.label}>
                  {/* Section header */}
                  <div
                    className={cn(
                      "px-4 pt-3 pb-1",
                      "text-xs font-semibold uppercase tracking-wider",
                      "text-[var(--signal-fg-tertiary)]",
                    )}
                  >
                    {section.label}
                  </div>

                  {/* Section items */}
                  {section.items.map((item) => {
                    const flat = indexedItems.find((x) => x.item === item);
                    const isSelected = flat
                      ? flat.index === selectedIndex
                      : false;

                    return (
                      <div
                        key={item.id}
                        data-palette-index={flat?.index}
                        role="option"
                        aria-selected={isSelected}
                        className={cn(
                          "flex items-start gap-3 px-4 py-2.5 cursor-pointer",
                          "transition-colors duration-[var(--signal-duration-fast)]",
                          isSelected
                            ? "bg-[var(--signal-bg-accent-muted)]"
                            : "hover:bg-[var(--signal-bg-secondary)]",
                        )}
                        onClick={() => execute(item)}
                        onMouseEnter={() => {
                          if (flat) setSelectedIndex(flat.index);
                        }}
                      >
                        {/* Icon */}
                        <item.icon
                          className="h-4 w-4 mt-0.5 shrink-0 text-[var(--signal-fg-secondary)]"
                          aria-hidden="true"
                        />

                        {/* Label + Description + Status */}
                        <div className="flex-1 min-w-0">
                          {/* Main row: label + optional status badge + shortcut */}
                          <div className="flex items-center gap-2">
                            {/* Health dot for features */}
                            {item.feature && (
                              <span
                                className="inline-block h-[6px] w-[6px] rounded-full shrink-0"
                                style={{
                                  backgroundColor:
                                    STATUS_DOT[item.feature.status] ??
                                    "var(--signal-fg-tertiary)",
                                }}
                                aria-hidden="true"
                              />
                            )}
                            <span className="text-sm font-medium text-[var(--signal-fg-primary)] truncate">
                              {item.label}
                            </span>
                            {item.feature && (
                              <span
                                className={cn(
                                  "ml-auto shrink-0",
                                  "text-[10px] font-semibold uppercase tracking-wider",
                                  "px-1.5 py-0.5 rounded-[var(--signal-radius-md)]",
                                )}
                                style={{
                                  color:
                                    STATUS_DOT[item.feature.status] ??
                                    "var(--signal-fg-tertiary)",
                                  backgroundColor: STATUS_DOT[
                                    item.feature.status
                                  ]
                                    ? `${STATUS_DOT[item.feature.status]}1A`
                                    : "var(--signal-bg-secondary)",
                                }}
                              >
                                {STATUS_LABEL[item.feature.status] ??
                                  item.feature.status}
                              </span>
                            )}
                            {item.shortcut && (
                              <span className="ml-auto shrink-0 text-[10px] text-[var(--signal-fg-tertiary)]">
                                {item.shortcut}
                              </span>
                            )}
                          </div>

                          {/* Description line */}
                          {item.description && (
                            <p className="text-xs text-[var(--signal-fg-secondary)] mt-0.5 truncate">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* ── Divider ────────────────────────────────────────── */}
            <div className="border-t border-[var(--signal-border-subtle)]" />

            {/* ── Footer ─────────────────────────────────────────── */}
            <div
              className={cn(
                "flex items-center justify-between gap-4 px-4 py-2",
                "text-xs text-[var(--signal-fg-tertiary)]",
              )}
            >
              <span>
                <kbd
                  className={cn(
                    "inline-flex items-center px-1 py-0.5 rounded",
                    "text-[10px] font-mono",
                    "bg-[var(--signal-bg-secondary)]",
                    "border border-[var(--signal-border-subtle)]",
                    "text-[var(--signal-fg-tertiary)]",
                  )}
                >
                  ↑↓
                </kbd>{" "}
                Navigate
              </span>
              <span>
                <kbd
                  className={cn(
                    "inline-flex items-center px-1 py-0.5 rounded",
                    "text-[10px] font-mono",
                    "bg-[var(--signal-bg-secondary)]",
                    "border border-[var(--signal-border-subtle)]",
                    "text-[var(--signal-fg-tertiary)]",
                  )}
                >
                  ↵
                </kbd>{" "}
                Select
              </span>
              <span>
                <kbd
                  className={cn(
                    "inline-flex items-center px-1 py-0.5 rounded",
                    "text-[10px] font-mono",
                    "bg-[var(--signal-bg-secondary)]",
                    "border border-[var(--signal-border-subtle)]",
                    "text-[var(--signal-fg-tertiary)]",
                  )}
                >
                  Esc
                </kbd>{" "}
                Close
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
