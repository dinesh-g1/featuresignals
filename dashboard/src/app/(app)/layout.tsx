"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { NavList } from "@/components/nav-list";
import { ContextBar } from "@/components/context-bar";
import { TabBar } from "@/components/tab-bar";
import { AuthGuard } from "@/components/auth-guard";
import { CommandPalette } from "@/components/command-palette";
import { toast, ToastContainer } from "@/components/toast";
import { VerificationBanner } from "@/components/verification-banner";
import { TrialBanner } from "@/components/trial-banner";
import { UpgradeBanner } from "@/components/upgrade-banner";
import { ProductTour } from "@/components/product-tour";
import { DashboardFooter } from "@/components/dashboard-footer";
import { FeedbackWidget } from "@/components/feedback-widget";
import { SuperMode } from "@/components/super-mode";
import { useAppStore } from "@/stores/app-store";
import { useSidebarStore } from "@/stores/sidebar-store";
import { Logo } from "@/components/logo";

const PROJECT_ROUTE_RE = /^\/projects\/[^/]+\//;

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
  const pathname = usePathname();
  const isProjectRoute = pathname ? PROJECT_ROUTE_RE.test(pathname) : false;
  return (
    <div className="flex h-14 items-center border-b border-[var(--borderColor-muted)] bg-[var(--bgColor-default)]/90 backdrop-blur-md px-4 md:hidden sticky top-0 z-40">
      {isProjectRoute && (
        <button
          onClick={open}
          className="rounded-md p-1.5 text-[var(--fgColor-muted)] transition-colors hover:bg-[var(--bgColor-muted)] hover:text-[var(--fgColor-default)]"
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
      )}
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

  const isProjectRoute = pathname ? PROJECT_ROUTE_RE.test(pathname) : false;
  const isProjectsRoot = pathname === "/projects";
  const showSidebar = isProjectRoute;
  const showTabBar = !isProjectRoute || isProjectsRoot;

  // Redirect project-scoped pages when no project is selected
  useEffect(() => {
    if (!currentProjectId && isProjectRoute) {
      router.replace("/projects");
    }
  }, [currentProjectId, isProjectRoute, router]);

  return (
    <AuthGuard>
      <TrialBanner />
      <UpgradeBanner />
      <VerificationBanner />

      <div className="flex h-screen flex-col md:flex-row bg-[var(--bgColor-inset)]">
        {/* Sidebar: only on project-scoped routes */}
        {showSidebar && <NavList />}

        <div className="flex min-h-0 flex-1 flex-col">
          <MobileHeader />

          {/* Top bar: Logo + Project/Env + Search(Center) + User */}
          <ContextBar />

          {/* Tab bar: only on org-level pages */}
          {showTabBar && <TabBar />}

          <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
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
    </AuthGuard>
  );
}
