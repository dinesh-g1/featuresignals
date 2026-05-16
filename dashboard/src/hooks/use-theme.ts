"use client";

/**
 * useTheme — Manages light/dark/system theme for the FeatureSignals Console.
 *
 * Reads initial preference from localStorage, falls back to system
 * `prefers-color-scheme`. Applies `data-theme` attribute on <html>.
 * Changes persist to localStorage and update the DOM immediately.
 *
 * Design tokens defined in signal.css (`[data-theme="dark"]` block).
 */

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";

// ─── Types ───────────────────────────────────────────────────────────

export type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "fs-theme";

// ─── Helpers ─────────────────────────────────────────────────────────

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // localStorage unavailable
  }
  return "system";
}

function setStoredTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // localStorage unavailable
  }
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === "system") return getSystemTheme();
  return theme;
}

function applyTheme(resolved: ResolvedTheme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (resolved === "dark") {
    root.setAttribute("data-theme", "dark");
  } else {
    root.removeAttribute("data-theme");
  }
}

// ─── Module-level state (for external reads without hook) ────────────

let currentTheme: Theme = "system";
const listeners: Array<() => void> = [];

function notifyListeners(): void {
  for (const fn of listeners) {
    fn();
  }
}

// ─── Hook ────────────────────────────────────────────────────────────

export function useTheme() {
  // Initialize on first render
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);

  // Subscribe to system preference changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    function handleSystemChange(): void {
      if (getStoredTheme() === "system") {
        // Force re-render by re-reading from localStorage
        setThemeState("system");
        applyTheme(getSystemTheme());
      }
    }

    mq.addEventListener("change", handleSystemChange);
    return () => mq.removeEventListener("change", handleSystemChange);
  }, []);

  // Apply theme on mount and on change
  useEffect(() => {
    const resolved = resolveTheme(theme);
    applyTheme(resolved);
  }, [theme]);

  // Sync module-level state
  useEffect(() => {
    currentTheme = theme;
    notifyListeners();
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setStoredTheme(newTheme);
    setThemeState(newTheme);
  }, []);

  const resolvedTheme = resolveTheme(theme);

  return {
    theme,
    resolvedTheme,
    setTheme,
    isDark: resolvedTheme === "dark",
    isLight: resolvedTheme === "light",
    isSystem: theme === "system",
  } as const;
}

/**
 * Non-hook getter for the current theme. Useful in store actions
 * or places where React hooks can't be called.
 */
export function getCurrentTheme(): Theme {
  if (typeof window === "undefined") return "system";
  return getStoredTheme();
}

/**
 * Get the resolved theme (light or dark) without using a hook.
 */
export function getResolvedTheme(): ResolvedTheme {
  return resolveTheme(getCurrentTheme());
}
