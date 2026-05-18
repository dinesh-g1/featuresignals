"use client";

/**
 * ContextPanel — right-side slide-in detail panel (380px).
 *
 * Driven by `activePanel` from the Console store. When null the panel
 * is hidden (0px width, no render). When set to a panel key the matching
 * sub-component slides in from the right with a spring animation.
 *
 * Panel keys:
 *   "flag-detail" → FeatureDetailPanel (inspect/advance/ship a feature)
 *   "ship-wizard"  → ShipWizard (roll out a feature to production)
 *
 * Signal UI tokens only. Framer Motion for animations. Zero `any`.
 */

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useConsoleStore } from "@/stores/console-store";
import { useConsoleFeatures } from "@/hooks/use-console-data";
import { cn } from "@/lib/utils";
import { FeatureDetailPanel } from "@/components/console/feature-detail-panel";
import { ShipWizard } from "@/components/console/ship-wizard";
import { IncidentPanel } from "@/components/console/incident-panel";
import { PreflightPanel } from "@/components/console/preflight-panel";
import { JanitorPanel } from "@/components/console/janitor-panel";
import { ApprovalPanel } from "@/components/console/approval-panel";

// ─── Animation Variants ──────────────────────────────────────────────

const panelVariants = {
  hidden: {
    width: 0,
    borderLeftWidth: 0,
    opacity: 0,
    transition: {
      width: { duration: 0.2, ease: [0.4, 0, 0.2, 1] as const },
      opacity: { duration: 0.15 },
      borderLeftWidth: { duration: 0.2, ease: [0.4, 0, 0.2, 1] as const },
    },
  },
  visible: {
    width: 380,
    borderLeftWidth: 1,
    opacity: 1,
    transition: {
      width: { duration: 0.25, ease: [0.4, 0, 0.2, 1] as const },
      opacity: { duration: 0.15, delay: 0.05 },
      borderLeftWidth: { duration: 0.25, ease: [0.4, 0, 0.2, 1] as const },
    },
  },
  exit: {
    width: 0,
    borderLeftWidth: 0,
    opacity: 0,
    transition: {
      width: { duration: 0.2, ease: [0.4, 0, 1, 1] as const },
      opacity: { duration: 0.1 },
      borderLeftWidth: { duration: 0.2, ease: [0.4, 0, 1, 1] as const },
    },
  },
};

// ─── Panel Title Map ─────────────────────────────────────────────────

const PANEL_TITLES: Record<string, string> = {
  "flag-detail": "Feature details",
  "ship-wizard": "Ship feature",
  incident: "Incident monitor",
  preflight: "Preflight assessment",
  janitor: "Flag janitor",
  approval: "Approval review",
};

// ─── Component ──────────────────────────────────────────────────────

export function ContextPanel() {
  const activePanel = useConsoleStore((s) => s.activePanel);
  const setActivePanel = useConsoleStore((s) => s.setActivePanel);
  const selectedFeatureKey = useConsoleStore((s) => s.selectedFeature);
  const { data: featuresData } = useConsoleFeatures();
  const features = featuresData?.data ?? [];
  const selectedEnvironment = useConsoleStore((s) => s.selectedEnvironment);

  const feature = useMemo(() => {
    if (!selectedFeatureKey) return null;
    return features.find((f) => f.key === selectedFeatureKey) ?? null;
  }, [selectedFeatureKey, features]);

  const isOpen = activePanel !== null;

  const handleClose = () => {
    setActivePanel(null);
    // Keep the feature selected so the user can re-open the panel
    // without losing their context (Don Norman principle: don't destroy
    // state on close — closing a panel is not the same as deselecting).
  };

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          key="context-panel"
          variants={panelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={cn(
            "shrink-0 overflow-hidden",
            "border-l border-[var(--signal-border-subtle)]",
            "bg-[var(--signal-bg-primary)]",
            "flex flex-col",
            "shadow-[var(--signal-shadow-lg)]",
          )}
          role="complementary"
          aria-label={
            activePanel
              ? (PANEL_TITLES[activePanel] ?? "Context panel")
              : undefined
          }
        >
          {/* ── Header ──────────────────────────────────────────── */}
          <div className="flex items-center justify-between shrink-0 px-4 py-3 border-b border-[var(--signal-border-subtle)]">
            <span className="text-sm font-medium text-[var(--signal-fg-primary)]">
              {activePanel
                ? (PANEL_TITLES[activePanel] ?? "Context panel")
                : ""}
            </span>
            <button
              type="button"
              onClick={handleClose}
              className={cn(
                "p-1 rounded-md",
                "text-[var(--signal-fg-tertiary)]",
                "hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)]",
                "transition-colors duration-[var(--signal-duration-fast)]",
              )}
              aria-label="Close panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ── Body ────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto">
            {activePanel === "flag-detail" && <FeatureDetailPanel />}
            {activePanel === "ship-wizard" && <ShipWizard />}
            {activePanel === "incident" && feature && (
              <IncidentPanel
                flagKey={feature.key}
                flagName={feature.name}
                stage={feature.stage as "monitor" | "decide"}
                environment={selectedEnvironment}
              />
            )}
            {activePanel === "preflight" && feature && (
              <PreflightPanel
                flagKey={feature.key}
                flagName={feature.name}
                stage={feature.stage as "configure" | "approve"}
                environment={selectedEnvironment}
              />
            )}
            {activePanel === "janitor" && (
              <JanitorPanel
                flagKey={feature?.key}
                environment={selectedEnvironment}
              />
            )}
            {activePanel === "approval" && feature && (
              <ApprovalPanel
                flagKey={feature.key}
                flagName={feature.name}
                environment={selectedEnvironment}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
