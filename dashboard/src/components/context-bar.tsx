"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { ContextHierarchy } from "@/components/context-hierarchy";
import { Breadcrumb } from "@/components/breadcrumb";
import { CommandPaletteButton } from "@/components/command-palette";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { CreateEnvironmentDialog } from "@/components/create-environment-dialog";
import { useAppStore } from "@/stores/app-store";

export function ContextBar() {
  const pathname = usePathname();
  const token = useAppStore((s) => s.token);
  const currentProjectId = useAppStore((s) => s.currentProjectId);

  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [showEnvDialog, setShowEnvDialog] = useState(false);

  // Hide context selectors on org-level pages
  const isOrgPage =
    pathname?.startsWith("/settings/billing") ||
    pathname?.startsWith("/settings/sso") ||
    pathname?.startsWith("/audit") ||
    pathname?.startsWith("/approvals");

  return (
    <div className="shrink-0 border-b border-slate-200/40 bg-white/80 backdrop-blur-xl relative z-[50]">
      {/* Hierarchical Context Indicator */}
      {!isOrgPage && (
        <ContextHierarchy
          onCreateProject={() => setShowProjectDialog(true)}
          onCreateEnvironment={() => setShowEnvDialog(true)}
        />
      )}

      {/* Breadcrumb + Actions Row */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 sm:px-5 lg:px-6">
        {/* Breadcrumb */}
        <Breadcrumb />

        {/* Command palette trigger */}
        <div className="ml-auto shrink-0">
          <CommandPaletteButton />
        </div>
      </div>

      {/* Create Project Dialog */}
      {token && (
        <CreateProjectDialog
          open={showProjectDialog}
          onOpenChange={setShowProjectDialog}
          onCreated={() => {
            // ContextHierarchy will auto-refresh via store update
          }}
        />
      )}

      {/* Create Environment Dialog */}
      {token && currentProjectId && (
        <CreateEnvironmentDialog
          open={showEnvDialog}
          onOpenChange={setShowEnvDialog}
          onCreated={() => {
            // ContextHierarchy will auto-refresh via store update
          }}
        />
      )}
    </div>
  );
}
