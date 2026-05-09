"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { DocsPanel } from "@/components/docs-panel";
import { DOCS_URL } from "@/lib/external-urls";

// ─── Types ───────────────────────────────────────────────────────────────

interface DocsContextValue {
  /** Open the docs panel to a specific doc slug, optionally scrolled to a section */
  openDoc: (slug: string, section?: string) => void;
  /** Close the docs panel */
  closeDoc: () => void;
  /** Whether the docs panel is currently open */
  isOpen: boolean;
  /** The currently displayed doc slug, or null if closed */
  currentSlug: string | null;
  /** The currently scrolled-to section heading, or null */
  currentSection: string | null;
}

// ─── Context ─────────────────────────────────────────────────────────────

const DocsContext = createContext<DocsContextValue | null>(null);

/**
 * useDocs — Access the docs panel context.
 *
 * Returns `null` when no DocsProvider is in the tree, allowing
 * graceful fallback (open in new tab) rather than crashing.
 */
export function useDocs(): DocsContextValue | null {
  return useContext(DocsContext);
}

// ─── Provider ────────────────────────────────────────────────────────────

interface DocsProviderProps {
  children: ReactNode;
}

/**
 * DocsProvider — Wraps the application and renders the docs slide-in panel.
 *
 * Place once in the root layout so that any descendent component can
 * call `openDoc(slug, section?)` to open context-aware documentation.
 *
 * The panel itself is rendered here so it floats above all page content;
 * no per-page wiring is needed.
 */
export function DocsProvider({ children }: DocsProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSlug, setCurrentSlug] = useState<string | null>(null);
  const [currentSection, setCurrentSection] = useState<string | null>(null);

  const openDoc = useCallback((slug: string, section?: string) => {
    setCurrentSlug(slug);
    setCurrentSection(section ?? null);
    setIsOpen(true);
  }, []);

  const closeDoc = useCallback(() => {
    setIsOpen(false);
    setCurrentSlug(null);
    setCurrentSection(null);
  }, []);

  // Build the highlighted URL from slug + optional section fragment
  const highlightedUrl = currentSlug
    ? `${DOCS_URL}/${currentSlug}${currentSection ? `#${currentSection}` : ""}`
    : undefined;

  return (
    <DocsContext.Provider
      value={{ openDoc, closeDoc, isOpen, currentSlug, currentSection }}
    >
      {children}
      <DocsPanel
        open={isOpen}
        onClose={closeDoc}
        highlightedUrl={highlightedUrl}
      />
    </DocsContext.Provider>
  );
}
