"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { NavList } from "@/components/nav-list";
import { ContextBar } from "@/components/context-bar";
import { AuthGuard } from "@/components/auth-guard";
import { CommandPalette } from "@/components/command-palette";
import { toast, ToastContainer } from "@/components/toast";
import { EnvColorBar } from "@/components/env-color-bar";
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

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const currentProjectId = useAppStore((s) => s.currentProjectId);

  // Redirect project-scoped pages when no project is selected
  useEffect(() => {
    const isProjectRoute = pathname && /^\/projects\/[^/]+\//.test(pathname);
    if (!currentProjectId && isProjectRoute) {
      router.replace("/projects");
    }
  }, [currentProjectId, pathname, router]);

  return (
    <AuthGuard>
      <TrialBanner />
      <UpgradeBanner />
      <VerificationBanner />

      <div className="flex h-screen flex-col md:flex-row bg-[var(--signal-bg-secondary)]">
        {/* Sidebar — always visible, content adapts to context */}
        <NavList />

        <div className="flex min-h-0 flex-1 flex-col">
          <MobileHeader />

          {/* Top bar: Logo + Project/Env + Search + Bell + User — identical everywhere */}
          <ContextBar />

          <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
            <EnvColorBar />
            {children}
          </main>

          <DashboardFooter />
        </div>
      </div>

      <CommandPalette />
      <ToastContainer />
      <UpgradeRequiredListener />
      <TourGate />
      <FeedbackWidget />
      <SuperMode />
      <KeyboardShortcutsDialog />
    </AuthGuard>
  );
}
