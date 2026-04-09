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

function UpgradeRequiredListener() {
  const router = useRouter();
  useEffect(() => {
    function handleUpgradeRequired(e: Event) {
      const detail = (e as CustomEvent).detail;
      toast(detail?.message || "Plan limit reached. Upgrade to Pro.", "error");
      router.push("/settings/billing");
    }
    window.addEventListener("fs:upgrade-required", handleUpgradeRequired);
    return () => window.removeEventListener("fs:upgrade-required", handleUpgradeRequired);
  }, [router]);
  return null;
}

function MobileHeader() {
  const open = useSidebarStore((s) => s.open);
  return (
    <div className="flex h-14 items-center border-b border-slate-200/50 bg-white/80 backdrop-blur-md px-4 md:hidden">
      <button
        onClick={open}
        className="rounded-md p-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>
      <span className="ml-3 bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-lg font-bold tracking-tight text-transparent">
        FeatureSignals
      </span>
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
  return (
    <AuthGuard>
      <TrialBanner />
      <UpgradeBanner />
      <VerificationBanner />
      <div className="flex h-screen flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50 md:flex-row">
        <Sidebar />
        <div className="flex min-h-0 flex-1 flex-col">
          <MobileHeader />
          <ContextBar />
          <main data-tour="main-content" className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
          <DashboardFooter />
        </div>
        <CommandPalette />
        <ToastContainer />
        <UpgradeRequiredListener />
        <TourGate />
        <FeedbackWidget />
        <SuperMode />
      </div>
    </AuthGuard>
  );
}
