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
    <div className="flex h-14 items-center border-b border-slate-200 bg-white px-4 md:hidden">
      <button
        onClick={open}
        className="rounded-md p-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>
      <span className="ml-3 text-lg font-bold tracking-tight text-indigo-600">
        FeatureSignals
      </span>
    </div>
  );
}

function TourGate() {
  const onboardingCompleted = useAppStore((s) => s.onboardingCompleted);
  const user = useAppStore((s) => s.user);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!onboardingCompleted && user && !user.tour_completed) {
      const timer = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [onboardingCompleted, user]);

  if (!show) return null;
  return <ProductTour onComplete={() => setShow(false)} />;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <TrialBanner />
      <UpgradeBanner />
      <VerificationBanner />
      <div className="flex h-screen flex-col bg-slate-50 md:flex-row">
        <Sidebar />
        <div className="flex min-h-0 flex-1 flex-col">
          <MobileHeader />
          <ContextBar />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
          <DashboardFooter />
        </div>
        <CommandPalette />
        <ToastContainer />
        <UpgradeRequiredListener />
        <TourGate />
      </div>
    </AuthGuard>
  );
}
