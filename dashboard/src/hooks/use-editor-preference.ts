"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "featuresignals.editor-preference";
type EditorMode = "visual" | "simple";

// ── External store for localStorage ────────────────────────────────────────

function getSnapshot(): EditorMode {
  if (typeof window === "undefined") return "simple";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "simple" || stored === "visual") return stored;
  } catch {
    // localStorage unavailable (e.g., private browsing in some browsers)
  }
  return "simple";
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useEditorPreference() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setMode = useCallback((next: EditorMode) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
      // Dispatch a storage event for same-tab updates (useSyncExternalStore
      // only listens to cross-tab storage events by default)
      window.dispatchEvent(
        new StorageEvent("storage", { key: STORAGE_KEY, newValue: next }),
      );
    } catch {
      // Silently fail — the preference is a nice-to-have
    }
  }, []);

  return { editorMode: mode, setEditorMode: setMode };
}
