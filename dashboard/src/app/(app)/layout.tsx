"use client";

import { Sidebar } from "@/components/sidebar";
import { AuthGuard } from "@/components/auth-guard";
import { CommandPalette } from "@/components/command-palette";
import { ToastContainer } from "@/components/toast";
import { VerificationBanner } from "@/components/verification-banner";
import { TrialBanner } from "@/components/trial-banner";
import { useSidebarStore } from "@/stores/sidebar-store";
import { Menu } from "lucide-react";

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

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <TrialBanner />
      <VerificationBanner />
      <div className="flex h-screen flex-col bg-slate-50 md:flex-row">
        <Sidebar />
        <div className="flex min-h-0 flex-1 flex-col">
          <MobileHeader />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
        <CommandPalette />
        <ToastContainer />
      </div>
    </AuthGuard>
  );
}
