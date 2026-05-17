"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, usePathname } from "next/navigation";
import { path } from "@/lib/paths";
import { cn } from "@/lib/utils";
import { NavList } from "@/components/nav-list";
import { ContextBar } from "@/components/context-bar";
import { AuthGuard } from "@/components/auth-guard";
import { CommandPalette as OldCommandPalette } from "@/components/command-palette";
import { toast, ToastContainer } from "@/components/toast";
import { ActionFeedbackContainer } from "@/components/action-feedback";
import { EnvColorBar } from "@/components/env-color-bar";
import { Breadcrumb } from "@/components/breadcrumb";
import { VerificationBanner } from "@/components/verification-banner";
import { TrialBanner } from "@/components/trial-banner";
import { UpgradeBanner } from "@/components/upgrade-banner";
import { ProductTour } from "@/components/product-tour";
import { DashboardFooter } from "@/components/dashboard-footer";
import { FeedbackWidget } from "@/components/feedback-widget";
import { SuperMode } from "@/components/super-mode";
import { KeyboardShortcutsDialog } from "@/components/keyboard-shortcuts-dialog";
import { useAppStore } from "@/stores/app-store";
import { useSidebarStore } from "@/stores/sidebar-store";
import { Logo } from "@/components/logo";
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

// ─── Mobile Header ─────────────────────────────────────────────────

function MobileHeader() {
  const open = useSidebarStore((s) => s.open);
  return (
    <div className="flex h-14 items-center border-b border-[var(--signal-border-subtle)] bg-[var(--signal-bg-primary)]/90 backdrop-blur-md px-4 md:hidden sticky top-0 z-40">
      <button
        onClick={open}
        className="rounded-md p-1.5 text-[var(--signal-fg-secondary)] transition-colors hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)]"
        aria-label="Open sidebar"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M1 2.75A.75.75 0 0 1 1.75 2h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 2.75Zm0 5A.75.75 0 0 1 1.75 7h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 7.75ZM1.75 12a.75.75 0 0 0 0 1.5h12.5a.75.75 0 0 0 0-1.5H1.75Z" />
        </svg>
      </button>
      <Logo size="sm" variant="minimal" className="ml-2" />
    </div>
  );
}

// ─── Tour Gate ─────────────────────────────────────────────────────

function TourGate() {
  const tourCompleted = useAppStore((s) => s.tourCompleted);
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
  const currentProjectId = useAppStore((s) => s.currentProjectId);

  // Console panel collapse state
  const [connectExpanded, setConnectExpanded] = useState(false);
  const [learnExpanded, setLearnExpanded] = useState(false);

  const isConsole = pathname?.startsWith("/console");

  // Redirect project-scoped pages when no project is selected
  useEffect(() => {
    const isProjectRoute = pathname && /^\/projects\/[^/]+\//.test(pathname);
    if (!currentProjectId && isProjectRoute) {
      router.replace(path("/projects"));
    }
  }, [currentProjectId, pathname, router]);

  // ── Shared banners (both layouts) ────────────────────────────────
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

      {isConsole ? (
        // ═══════════════════════════════════════════════════════════
        // CONSOLE SHELL — 3-zone layout with top/bottom bars
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

              {/* LIFECYCLE Zone — center canvas */}
              <div className="flex-1 min-w-0 overflow-hidden">
                <LifecycleZone />
              </div>

              {/* ContextPanel — right slide-in overlay (380px) */}
              <ContextPanel />

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

          {/* Data fetching layer — only active on console route */}
          <ConsoleDataLayer />

          {/* Console overlays */}
          <ConsoleCommandPalette />
          <HelpWidget />
          <UndoToastContainer />
        </>
      ) : (
        // ═══════════════════════════════════════════════════════════
        // SIDEBAR LAYOUT — classic dashboard for settings, billing, etc.
        // ═══════════════════════════════════════════════════════════
        <>
          {sharedBanners}

          <div className="flex h-screen flex-col md:flex-row bg-[var(--signal-bg-secondary)]">
            {/* Sidebar — always visible, content adapts to context */}
            <NavList />

            <div className="flex min-h-0 flex-1 flex-col">
              <MobileHeader />

              {/* Top bar: Logo + Project/Env + Search + Bell + User — identical everywhere */}
              <ContextBar />

              <main
                id="main-content"
                tabIndex={-1}
                className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6"
              >
                <EnvColorBar />
                {/* Breadcrumb — contextual hierarchy: Org > Project > Page */}
                <div className="mb-4">
                  <Breadcrumb />
                </div>
                <Suspense fallback={<div className="p-6" />}>
                  {children}
                </Suspense>
              </main>

              <DashboardFooter />
            </div>
          </div>

          {/* Old layout overlays */}
          <OldCommandPalette />
          <FeedbackWidget />
          <SuperMode />
        </>
      )}

      {/* ── Shared overlays (both layouts) ──────────────────────────── */}
      <ToastContainer />
      <ActionFeedbackContainer />
      <UpgradeRequiredListener />
      <TourGate />
      <KeyboardShortcutsDialog />
    </AuthGuard>
  );
}
