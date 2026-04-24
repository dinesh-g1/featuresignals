"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { ContextBar } from "@/components/context-bar";
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
import { Menu } from "lucide-react";
import { Logo } from "@/components/logo";

// ─── Upgrade Required Event Listener ─────────────────────────────────

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

// ─── Mobile Header ──────────────────────────────────────────────────

function MobileHeader() {
  const open = useSidebarStore((s) => s.open);
  return (
    <div className="flex h-14 items-center border-b border-stone-200/60 bg-white/90 backdrop-blur-md px-4 md:hidden sticky top-0 z-40">
      <button
        onClick={open}
        className="rounded-md p-1.5 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800"
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" strokeWidth={1.5} />
      </button>
      <Logo size="sm" variant="minimal" className="ml-2" />
    </div>
  );
}

// ─── Product Tour Gate ──────────────────────────────────────────────

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

// ─── Main App Layout ────────────────────────────────────────────────

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      {/* Global Banners */}
      <TrialBanner />
      <UpgradeBanner />
      <VerificationBanner />

      {/* Main shell: sidebar + content */}
      <div className="flex h-screen flex-col md:flex-row bg-stone-50">
        {/* Sidebar */}
        <Sidebar />

        {/* Right panel: context bar + main content + footer */}
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Mobile header (visible below md) */}
          <MobileHeader />

          {/* Context bar with Project/Env selectors + OmniSearch */}
          <ContextBar />

          {/* Main scrollable content area */}
          <main
            data-tour="main-content"
            className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6"
          >
            {children}
          </main>

          {/* Footer */}
          <DashboardFooter />
        </div>
      </div>

      {/* Global overlays */}
      <CommandPalette />
      <ToastContainer />
      <UpgradeRequiredListener />
      <TourGate />
      <FeedbackWidget />
      <SuperMode />
    </AuthGuard>
  );
}
