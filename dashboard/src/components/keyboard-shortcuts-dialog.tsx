"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Shortcut {
  key: string;
  description: string;
  category: string;
}

const SHORTCUTS: Shortcut[] = [
  // Navigation
  { key: "⌘K / Ctrl+K", description: "Open command palette", category: "Navigation" },
  { key: "⌘P / Ctrl+P", description: "Quick project switcher", category: "Navigation" },
  { key: "⌘[ / Ctrl+[", description: "Go back", category: "Navigation" },
  { key: "⌘] / Ctrl+]", description: "Go forward", category: "Navigation" },
  { key: "H then D", description: "Go to dashboard", category: "Navigation" },
  { key: "H then F", description: "Go to flags", category: "Navigation" },
  { key: "H then E", description: "Go to environments", category: "Navigation" },
  { key: "H then S", description: "Go to segments", category: "Navigation" },

  // Flags
  { key: "N then F", description: "Create new flag", category: "Flags" },
  { key: "N then S", description: "Create new segment", category: "Flags" },
  { key: "⌘↵ / Ctrl+Enter", description: "Save current form", category: "Flags" },
  { key: "Esc", description: "Close modal / cancel edit", category: "Flags" },

  // Search & Filter
  { key: "/", description: "Focus search input", category: "Search" },
  { key: "F then A", description: "Filter active", category: "Search" },
  { key: "F then R", description: "Filter archived", category: "Search" },
  { key: "F then D", description: "Filter deprecated", category: "Search" },
  { key: "F then O", description: "Filter rolled out", category: "Search" },

  // General
  { key: "R", description: "Refresh current page data", category: "General" },
  { key: "?", description: "Show this help dialog", category: "General" },
  { key: "Esc", description: "Dismiss dialog / close panel", category: "General" },
];

const CATEGORY_ORDER = ["Navigation", "Flags", "Search", "General"];

export function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false);

  const handleOpen = useCallback(() => {
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  // Listen for the custom event from command palette
  useEffect(() => {
    const listener = () => handleOpen();
    window.addEventListener("fs:show-keyboard-shortcuts", listener);

    // Also listen for "?" key globally (when not in input)
    const keyListener = (e: KeyboardEvent) => {
      if (
        e.key === "?" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA" &&
        document.activeElement?.getAttribute("contenteditable") !== "true"
      ) {
        e.preventDefault();
        handleOpen();
      }
    };
    window.addEventListener("keydown", keyListener);

    return () => {
      window.removeEventListener("fs:show-keyboard-shortcuts", listener);
      window.removeEventListener("keydown", keyListener);
    };
  }, [handleOpen]);

  const grouped = CATEGORY_ORDER.reduce<Record<string, Shortcut[]>>((acc, cat) => {
    acc[cat] = SHORTCUTS.filter((s) => s.category === cat);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate and manage your feature flags faster.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-4 max-h-[50vh] overflow-y-auto">
            {Object.entries(grouped).map(([category, shortcuts]) => (
              <div key={category}>
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)] mb-2 px-1">
                  {category}
                </h4>
                <div className="space-y-1">
                  {shortcuts.map((shortcut) => (
                    <div
                      key={shortcut.key}
                      className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-[var(--signal-bg-secondary)] transition-colors"
                    >
                      <span className="text-xs text-[var(--signal-fg-secondary)]">
                        {shortcut.description}
                      </span>
                      <kbd className="rounded border border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)] px-2 py-0.5 text-[11px] font-medium text-[var(--signal-fg-primary)] whitespace-nowrap">
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="secondary" size="sm" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
