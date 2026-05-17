"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, usePathname } from "next/navigation";
import { path } from "@/lib/paths";
import { cn } from "@/lib/utils";
import { AuthGuard } from "@/components/auth-guard";
import { toast, ToastContainer } from "@/components/toast";
import { ActionFeedbackContainer } from "@/components/action-feedback";
import { VerificationBanner } from "@/components/verification-banner";
import { TrialBanner } from "@/components/trial-banner";
import { UpgradeBanner } from "@/components/upgrade-banner";
import { ProductTour } from "@/components/product-tour";
import { KeyboardShortcutsDialog } from "@/components/keyboard-shortcuts-dialog";
import { useAppStore } from "@/stores/app-store";
import { useAxe } from "@/lib/axe";

// ── Console-specific imports ────────────────────────────────────────
import { ConsoleTopBar } from "@/app/(app)/console/_client/console-top-bar";
import { ConsoleBottomBar } from "@/app/(app)/console/_client/console-bottom-bar";
import { ContextStrip } from "@/components/console/context-strip";
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

// ─── Console Connect Toggle Button ─────────────────────────────────

function ConnectToggle({
  expanded,
  onToggle,
}: {
  expanded: boolean;
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
        expanded ? "-right-3" : "-right-3",
      )}
      aria-label={expanded ? "Collapse Connect panel" : "Expand Connect panel"}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden="true"
        className={cn(
          "transition-transform duration-[var(--signal-duration-fast)]",
          expanded ? "rotate-0" : "rotate-180",
        )}
      >
        <path d="M10.78 3.97a.75.75 0 0 1 0 1.06L7.06 8.75l3.72 3.72a.75.75 0 1 1-1.06 1.06L5.47 9.28a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" />
      </svg>
    </button>
  );
}

// ─── Console Learn Toggle Button ───────────────────────────────────

function LearnToggle({
  expanded,
  onToggle,
}: {
  expanded: boolean;
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
        expanded ? "-left-3" : "-left-3",
      )}
      aria-label={expanded ? "Collapse Learn panel" : "Expand Learn panel"}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden="true"
        className={cn(
          "transition-transform duration-[var(--signal-duration-fast)]",
          expanded ? "rotate-0" : "rotate-180",
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

  // Console panel collapse state
  const [connectExpanded, setConnectExpanded] = useState(false);
  const [learnExpanded, setLearnExpanded] = useState(false);

  // Routes excluded from the Console Shell (use minimal layout)
  const isExcluded =
    pathname?.startsWith("/onboarding") ||
    pathname?.startsWith("/pricing") ||
    pathname?.startsWith("/support");

  const isConsoleRoute = pathname?.startsWith("/console");

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
            <Suspense fallback={<div className="p-6" />}>
              {children}
            </Suspense>
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

          <div className="flex flex-col h-screen overflow-hidden bg-[var(--signal-bg-secondary)]">
            {/* Top Bar (48px) */}
            <div className="h-12 shrink-0">
              <ConsoleTopBar />
            </div>

            {/* Context Strip (28px) */}
            <ContextStrip />

            {/* Main Area */}
            <div className="flex flex-1 overflow-hidden relative">
              {/* CONNECT Zone — collapsible left panel */}
              <div className="relative shrink-0">
                <div
                  className={cn(
                    "h-full overflow-hidden transition-all duration-[var(--signal-duration-normal)] ease-[cubic-bezier(0.16,1,0.3,1)]",
                    connectExpanded ? "w-[320px]" : "w-[56px]",
                  )}
                >
                  <ConnectZone />
                </div>
                <ConnectToggle
                  expanded={connectExpanded}
                  onToggle={() => setConnectExpanded((p) => !p)}
                />
              </div>

              {/* CENTER Zone — shows LifecycleZone for /console, {children} for other routes */}
              <div className="flex-1 min-w-0 overflow-hidden">
                {isConsoleRoute ? (
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

              {/* LEARN Zone — collapsible right panel */}
              <div className="relative shrink-0">
                <LearnToggle
                  expanded={learnExpanded}
                  onToggle={() => setLearnExpanded((p) => !p)}
                />
                <div
                  className={cn(
                    "h-full overflow-hidden transition-all duration-[var(--signal-duration-normal)] ease-[cubic-bezier(0.16,1,0.3,1)]",
                    learnExpanded ? "w-[380px]" : "w-[36px]",
                  )}
                >
                  <LearnZone />
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
          <HelpWidget />
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
