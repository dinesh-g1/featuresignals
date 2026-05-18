"use client";

import { useEffect, useState, Suspense, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { path } from "@/lib/paths";
import { cn } from "@/lib/utils";
import { AuthGuard } from "@/components/auth-guard";
import { toast, ToastContainer } from "@/components/toast";
import { ActionFeedbackContainer } from "@/components/action-feedback";
import { VerificationBanner } from "@/components/verification-banner";
import { RecoveryBanner } from "@/components/recovery-banner";
import { TrialBanner } from "@/components/trial-banner";
import { UpgradeBanner } from "@/components/upgrade-banner";
import { ProductTour } from "@/components/product-tour";
import { KeyboardShortcutsDialog } from "@/components/keyboard-shortcuts-dialog";
import { useAppStore } from "@/stores/app-store";
import { useAxe } from "@/lib/axe";
import {
  ConnectIconStrip,
  type ConnectSection,
} from "@/components/console/connect-icon-strip";
import {
  LearnIconStrip,
  type LearnSection,
} from "@/components/console/learn-icon-strip";

// ── Console-specific imports ────────────────────────────────────────
import { ConsoleTopBar } from "@/app/(app)/console/_client/console-top-bar";
import { ConsoleBottomBar } from "@/app/(app)/console/_client/console-bottom-bar";
import { ConnectZone } from "@/components/console/connect-zone";
import { LifecycleZone } from "@/app/(app)/console/_client/lifecycle-zone";
import { LearnZone } from "@/components/console/learn-zone";
import { ContextPanel } from "@/components/console/context-panel";
import { ConsoleDataLayer } from "@/components/console/console-data-layer";
import { CommandPalette as ConsoleCommandPalette } from "@/app/(app)/console/_client/command-palette";
import { HelpWidget } from "@/components/console/help-widget";
import { UndoToastContainer } from "@/components/console/undo-toast";

// ─── Upgrade Listener ──────────────────────────────────────────────

function UpgradeRequiredListener() {
  const router = useRouter();
  useEffect(() => {
    function handleUpgradeRequired(e: Event) {
      const detail = (e as CustomEvent).detail;
      toast(detail?.message || "Plan limit reached. Upgrade to Pro.", "error");
      router.push("/settings/billing");
    }
    window.addEventListener("fs:upgrade-required", handleUpgradeRequired);
    return () =>
      window.removeEventListener("fs:upgrade-required", handleUpgradeRequired);
  }, [router]);
  return null;
}

// ─── Tour Gate ─────────────────────────────────────────────────────

function TourGate() {
  const tourCompleted = useAppStore((s) => s.tour_completed);
  const user = useAppStore((s) => s.user);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!user || tourCompleted || user.tour_completed) return;
    const eligible = sessionStorage.getItem("fs-tour-eligible") === "true";
    if (!eligible) return;
    sessionStorage.removeItem("fs-tour-eligible");
    const timer = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(timer);
  }, [tourCompleted, user]);
  useEffect(() => {
    function handleReplay() {
      setShow(true);
    }
    window.addEventListener("fs:replay-tour", handleReplay);
    return () => window.removeEventListener("fs:replay-tour", handleReplay);
  }, []);
  if (!show) return null;
  return <ProductTour onComplete={() => setShow(false)} />;
}

// ─── Width Types ────────────────────────────────────────────────────

type ZoneWidth = "collapsed" | "normal" | "wide";

// ─── Zone Width Constants ───────────────────────────────────────────

const CONNECT_WIDTHS: Record<ZoneWidth, number> = {
  collapsed: 48,
  normal: 320,
  wide: 420,
};

const LEARN_WIDTHS: Record<ZoneWidth, number> = {
  collapsed: 48,
  normal: 380,
  wide: 480,
};

const _HOVER_EXPAND_DELAY = 0; // immediate expand on hover
const HOVER_COLLAPSE_DELAY = 300; // ms before collapsing after mouse leave

// ─── Console Connect Toggle Button ─────────────────────────────────

function ConnectToggle({
  isCollapsed,
  onToggle,
}: {
  isCollapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "absolute top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full",
        "border border-[var(--signal-border-subtle)] bg-[var(--signal-bg-primary)]",
        "text-[var(--signal-fg-tertiary)] hover:text-[var(--signal-fg-primary)]",
        "shadow-sm transition-all duration-[var(--signal-duration-fast)]",
        "-right-3",
      )}
      aria-label={
        isCollapsed ? "Expand Connect panel" : "Collapse Connect panel"
      }
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden="true"
        className={cn(
          "transition-transform duration-[var(--signal-duration-fast)]",
          isCollapsed ? "rotate-180" : "rotate-0",
        )}
      >
        <path d="M10.78 3.97a.75.75 0 0 1 0 1.06L7.06 8.75l3.72 3.72a.75.75 0 1 1-1.06 1.06L5.47 9.28a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" />
      </svg>
    </button>
  );
}

// ─── Console Learn Toggle Button ───────────────────────────────────

function LearnToggle({
  isCollapsed,
  onToggle,
}: {
  isCollapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "absolute top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full",
        "border border-[var(--signal-border-subtle)] bg-[var(--signal-bg-primary)]",
        "text-[var(--signal-fg-tertiary)] hover:text-[var(--signal-fg-primary)]",
        "shadow-sm transition-all duration-[var(--signal-duration-fast)]",
        "-left-3",
      )}
      aria-label={isCollapsed ? "Expand Learn panel" : "Collapse Learn panel"}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden="true"
        className={cn(
          "transition-transform duration-[var(--signal-duration-fast)]",
          isCollapsed ? "rotate-180" : "rotate-0",
        )}
      >
        <path d="M5.22 3.97a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L8.94 8.75 5.22 5.03a.75.75 0 0 1 0-1.06Z" />
      </svg>
    </button>
  );
}

// ─── Main Layout ───────────────────────────────────────────────────

export default function AppLayout({ children }: { children: React.ReactNode }) {
  useAxe();
  const router = useRouter();
  const pathname = usePathname();
  const currentProjectId = useAppStore((s) => s.current_project_id);

  // ── Console panel three-width state ─────────────────────────────
  const [connectWidth, setConnectWidth] = useState<ZoneWidth>("collapsed");
  const [connectLocked, setConnectLocked] = useState(false);
  const [connectHovered, setConnectHovered] = useState(false);

  const [learnWidth, setLearnWidth] = useState<ZoneWidth>("collapsed");
  const [learnLocked, setLearnLocked] = useState(false);
  const [learnHovered, setLearnHovered] = useState(false);

  // Refs for hover collapse delay timers
  const connectHoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const learnHoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Effective widths ────────────────────────────────────────────
  const effectiveConnectWidth: ZoneWidth = connectLocked
    ? connectWidth === "wide"
      ? "wide"
      : "normal"
    : connectHovered
      ? "normal"
      : "collapsed";

  const effectiveLearnWidth: ZoneWidth = learnLocked
    ? learnWidth === "wide"
      ? "wide"
      : "normal"
    : learnHovered
      ? "normal"
      : "collapsed";

  const isConnectCollapsed = effectiveConnectWidth === "collapsed";
  const isLearnCollapsed = effectiveLearnWidth === "collapsed";

  // ── Hover handlers ──────────────────────────────────────────────
  const handleConnectMouseEnter = useCallback(() => {
    if (connectHoverTimer.current) {
      clearTimeout(connectHoverTimer.current);
      connectHoverTimer.current = null;
    }
    setConnectHovered(true);
  }, []);

  const handleConnectMouseLeave = useCallback(() => {
    connectHoverTimer.current = setTimeout(() => {
      setConnectHovered(false);
    }, HOVER_COLLAPSE_DELAY);
  }, []);

  const handleLearnMouseEnter = useCallback(() => {
    if (learnHoverTimer.current) {
      clearTimeout(learnHoverTimer.current);
      learnHoverTimer.current = null;
    }
    setLearnHovered(true);
  }, []);

  const handleLearnMouseLeave = useCallback(() => {
    learnHoverTimer.current = setTimeout(() => {
      setLearnHovered(false);
    }, HOVER_COLLAPSE_DELAY);
  }, []);

  // ── Toggle handlers ─────────────────────────────────────────────
  const handleConnectToggle = useCallback(() => {
    if (connectLocked) {
      // Unlock and collapse
      setConnectLocked(false);
      setConnectWidth("collapsed");
      setConnectHovered(false);
    } else {
      // Lock in normal state
      setConnectLocked(true);
      setConnectWidth("normal");
    }
  }, [connectLocked]);

  const handleLearnToggle = useCallback(() => {
    if (learnLocked) {
      setLearnLocked(false);
      setLearnWidth("collapsed");
      setLearnHovered(false);
    } else {
      setLearnLocked(true);
      setLearnWidth("normal");
    }
  }, [learnLocked]);

  // ── Icon strip click: expand and scroll to section ──────────────
  const handleConnectIconClick = useCallback((section?: ConnectSection) => {
    setConnectLocked(true);
    setConnectWidth("normal");
    setConnectHovered(false);
    // Dispatch scroll event for ConnectZone to handle
    if (section) {
      window.dispatchEvent(
        new CustomEvent("fs:connect-scroll-to", { detail: { section } }),
      );
    }
  }, []);

  const handleLearnIconClick = useCallback((section?: LearnSection) => {
    setLearnLocked(true);
    setLearnWidth("normal");
    setLearnHovered(false);
    if (section) {
      window.dispatchEvent(
        new CustomEvent("fs:learn-scroll-to", { detail: { section } }),
      );
    }
  }, []);

  // ── Cross-zone event listeners ──────────────────────────────────
  useEffect(() => {
    function handleExpandConnect() {
      setConnectLocked(true);
      setConnectWidth("normal");
    }
    function handleConnectWide() {
      setConnectWidth("wide");
    }
    function handleConnectNormal() {
      setConnectWidth("normal");
    }
    window.addEventListener("fs:expand-connect", handleExpandConnect);
    window.addEventListener("fs:connect-wide", handleConnectWide);
    window.addEventListener("fs:connect-normal", handleConnectNormal);
    return () => {
      window.removeEventListener("fs:expand-connect", handleExpandConnect);
      window.removeEventListener("fs:connect-wide", handleConnectWide);
      window.removeEventListener("fs:connect-normal", handleConnectNormal);
    };
  }, []);

  useEffect(() => {
    function handleLearnWide() {
      setLearnWidth("wide");
    }
    function handleLearnNormal() {
      setLearnWidth("normal");
    }
    window.addEventListener("fs:learn-wide", handleLearnWide);
    window.addEventListener("fs:learn-normal", handleLearnNormal);
    return () => {
      window.removeEventListener("fs:learn-wide", handleLearnWide);
      window.removeEventListener("fs:learn-normal", handleLearnNormal);
    };
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (connectHoverTimer.current) clearTimeout(connectHoverTimer.current);
      if (learnHoverTimer.current) clearTimeout(learnHoverTimer.current);
    };
  }, []);

  // Routes excluded from the Console Shell (use minimal layout)
  const isExcluded =
    pathname?.startsWith("/onboarding") ||
    pathname?.startsWith("/pricing") ||
    pathname?.startsWith("/support");

  const _isConsoleRoute = pathname?.startsWith("/console");
  const isConsoleRoot = pathname === "/console";

  // Redirect project-scoped pages when no project is selected
  useEffect(() => {
    const isProjectRoute = pathname && /^\/projects\/[^/]+\//.test(pathname);
    if (!currentProjectId && isProjectRoute) {
      router.replace(path("/projects"));
    }
  }, [currentProjectId, pathname, router]);

  // ── Shared banners (all layouts) ─────────────────────────────────
  const sharedBanners = (
    <>
      <RecoveryBanner />
      <TrialBanner />
      <UpgradeBanner />
      <VerificationBanner />
    </>
  );

  return (
    <AuthGuard>
      {/* Skip to main content — WCAG 2.1 AA (C5) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--signal-bg-accent-emphasis)] focus:text-white focus:rounded-md"
      >
        Skip to main content
      </a>

      {isExcluded ? (
        // ═══════════════════════════════════════════════════════════
        // MINIMAL LAYOUT — onboarding, pricing, support
        // ═══════════════════════════════════════════════════════════
        <>
          {sharedBanners}

          <main
            id="main-content"
            tabIndex={-1}
            className="min-h-screen bg-[var(--signal-bg-secondary)]"
          >
            <Suspense fallback={<div className="p-6" />}>{children}</Suspense>
          </main>

          {/* Console overlays still available for support/help access */}
          <ConsoleCommandPalette />
          <HelpWidget />
        </>
      ) : (
        // ═══════════════════════════════════════════════════════════
        // CONSOLE SHELL — default layout for all authenticated routes
        // ═══════════════════════════════════════════════════════════
        <>
          {sharedBanners}

          <div className="flex flex-col h-screen bg-[var(--signal-bg-secondary)]">
            {/* Top Bar (48px) — z-30 ensures dropdowns paint above the main area */}
            <div className="h-12 shrink-0 relative z-30">
              <ConsoleTopBar />
            </div>

            {/* Main Area */}
            <div className="flex flex-1 overflow-hidden relative">
              {/* CONNECT Zone — collapsible left panel with hover-to-expand */}
              <div
                className="relative shrink-0"
                onMouseEnter={handleConnectMouseEnter}
                onMouseLeave={handleConnectMouseLeave}
              >
                <div
                  className={cn(
                    "h-full overflow-hidden transition-[width] duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
                  )}
                  style={{ width: CONNECT_WIDTHS[effectiveConnectWidth] }}
                >
                  {/* Collapsed: icon strip */}
                  <div
                    className={cn(
                      "h-full",
                      isConnectCollapsed ? "block" : "hidden",
                    )}
                  >
                    <ConnectIconStrip onExpand={handleConnectIconClick} />
                  </div>
                  {/* Expanded: full ConnectZone */}
                  <div
                    className={cn(
                      "h-full",
                      isConnectCollapsed ? "hidden" : "block",
                    )}
                  >
                    <ConnectZone />
                  </div>
                </div>
                <ConnectToggle
                  isCollapsed={isConnectCollapsed}
                  onToggle={handleConnectToggle}
                />
              </div>

              {/* CENTER Zone — shows LifecycleZone for /console root, {children} for sub-routes like /console/agents, /console/policies */}
              <div className="flex-1 min-w-0 overflow-hidden">
                {isConsoleRoot ? (
                  <LifecycleZone />
                ) : (
                  <div
                    id="main-content"
                    tabIndex={-1}
                    className="h-full overflow-y-auto"
                  >
                    <div className="p-6">
                      <Suspense fallback={<div className="p-6" />}>
                        {children}
                      </Suspense>
                    </div>
                  </div>
                )}
              </div>

              {/* ContextPanel — right slide-in overlay (380px), absolute so it doesn't crush LifecycleZone when LearnZone is open */}
              <div className="absolute right-0 top-0 bottom-0 z-20">
                <ContextPanel />
              </div>

              {/* LEARN Zone — collapsible right panel with hover-to-expand */}
              <div
                className="relative shrink-0"
                onMouseEnter={handleLearnMouseEnter}
                onMouseLeave={handleLearnMouseLeave}
              >
                <LearnToggle
                  isCollapsed={isLearnCollapsed}
                  onToggle={handleLearnToggle}
                />
                <div
                  className={cn(
                    "h-full overflow-hidden transition-[width] duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
                  )}
                  style={{ width: LEARN_WIDTHS[effectiveLearnWidth] }}
                >
                  {/* Collapsed: icon strip */}
                  <div
                    className={cn(
                      "h-full",
                      isLearnCollapsed ? "block" : "hidden",
                    )}
                  >
                    <LearnIconStrip onExpand={handleLearnIconClick} />
                  </div>
                  {/* Expanded: full LearnZone */}
                  <div
                    className={cn(
                      "h-full",
                      isLearnCollapsed ? "hidden" : "block",
                    )}
                  >
                    <LearnZone />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Bar (32px) */}
            <div className="h-8 shrink-0">
              <ConsoleBottomBar />
            </div>
          </div>

          {/* Data fetching layer — only active on console routes */}
          <ConsoleDataLayer />

          {/* Console overlays */}
          <ConsoleCommandPalette />
          <HelpWidget learnPanelExpanded={!isLearnCollapsed} />
          <UndoToastContainer />
        </>
      )}

      {/* ── Shared overlays (all layouts) ──────────────────────────── */}
      <ToastContainer />
      <ActionFeedbackContainer />
      <UpgradeRequiredListener />
      <TourGate />
      <KeyboardShortcutsDialog />
    </AuthGuard>
  );
}
