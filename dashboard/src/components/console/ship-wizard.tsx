"use client";

/**
 * ShipWizard — Slide-over panel for rolling out a feature flag to
 * production. Opens when the user clicks "Ship feature" from the
 * FeatureDetailPanel.
 *
 * Steps:
 *   1. Select rollout percentage (slider)
 *   2. Hold-to-confirm (environment-aware duration)
 *
 * Loads the selected feature from the Console store (selectedFeature).
 * Calls api.console.shipFlag on confirm. Handles loading, error, and
 * success states.
 *
 * Signal UI tokens only. Zero hardcoded hex colors. Zero `any`.
 */

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Sliders, AlertTriangle, CheckCircle, ArrowLeft } from "lucide-react";
import { useConsoleStore } from "@/stores/console-store";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { HoldToConfirm } from "@/components/console/hold-to-confirm";
import { showUndoToast } from "@/components/console/undo-toast";
import { ENV_COLORS } from "@/lib/console-constants";
import type { FeatureStatus } from "@/lib/console-types";

// ─── Quick Rollout Presets ────────────────────────────────────────────

const ROLLOUT_PRESETS = [
  { label: "1%", value: 1 },
  { label: "5%", value: 5 },
  { label: "10%", value: 10 },
  { label: "25%", value: 25 },
  { label: "50%", value: 50 },
  { label: "100%", value: 100 },
];

// ─── Component ───────────────────────────────────────────────────────

export function ShipWizard() {
  const selectedFeatureKey = useConsoleStore((s) => s.selectedFeature);
  const features = useConsoleStore((s) => s.features);
  const selectedEnvironment = useConsoleStore((s) => s.selectedEnvironment);
  const setActivePanel = useConsoleStore((s) => s.setActivePanel);
  const setFeatures = useConsoleStore((s) => s.setFeatures);
  const token = useAppStore((s) => s.token);

  const [targetPercent, setTargetPercent] = useState(100);
  const [shipping, setShipping] = useState(false);
  const [shipError, setShipError] = useState<string | null>(null);
  const [shipped, setShipped] = useState(false);

  // ── Find the selected feature ──────────────────────────────────────

  const feature = useMemo(() => {
    if (!selectedFeatureKey) return null;
    return features.find((f) => f.key === selectedFeatureKey) ?? null;
  }, [selectedFeatureKey, features]);

  // ── Derived values ─────────────────────────────────────────────────

  const envConfig = feature ? ENV_COLORS[feature.environment] : ENV_COLORS["development"];

  // ── Back to flag detail ────────────────────────────────────────────

  const handleBack = useCallback(() => {
    setActivePanel("flag-detail");
  }, [setActivePanel]);

  // ── Ship action ────────────────────────────────────────────────────

  const handleShip = useCallback(async () => {
    if (!feature || !token) return;

    setShipping(true);
    setShipError(null);

    try {
      const result = await api.console.shipFlag(token, feature.key, {
        target_percent: targetPercent,
        environment: selectedEnvironment,
      });

      // Optimistic update
      setFeatures(
        features.map((f) =>
          f.key === feature.key
            ? {
                ...f,
                status: "live" as FeatureStatus,
                rolloutPercent: targetPercent,
                lastAction: targetPercent >= 100 ? "Shipped" : `Rolled out to ${targetPercent}%`,
                lastActionAt: new Date().toISOString(),
                lastActionBy: "You",
              }
            : f,
        ),
        features.length,
      );

      setShipped(true);

      showUndoToast(
        targetPercent >= 100
          ? `"${feature.name}" is now LIVE`
          : `"${feature.name}" rolled out to ${targetPercent}%`,
        () => {
          // Revert optimistic update
          setFeatures(
            features.map((f) =>
              f.key === feature.key
                ? {
                    ...f,
                    status: feature.status,
                    rolloutPercent: feature.rolloutPercent,
                    lastAction: feature.lastAction,
                    lastActionAt: feature.lastActionAt,
                    lastActionBy: feature.lastActionBy,
                  }
                : f,
            ),
            features.length,
          );
        },
      );
    } catch (err) {
      setShipError(
        err instanceof Error ? err.message : "Failed to ship feature",
      );
    } finally {
      setShipping(false);
    }
  }, [
    feature,
    token,
    targetPercent,
    selectedEnvironment,
    features,
    setFeatures,
  ]);

  // ── Not found ──────────────────────────────────────────────────────

  if (!feature) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
        <AlertTriangle className="h-8 w-8 text-[var(--signal-fg-warning)]" />
        <p className="text-sm text-[var(--signal-fg-secondary)] text-center">
          No feature selected. Please select a feature first.
        </p>
        <Button variant="secondary" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to details
        </Button>
      </div>
    );
  }

  // ── Success state ──────────────────────────────────────────────────

  if (shipped) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <CheckCircle className="h-12 w-12 text-[var(--signal-fg-success)]" />
        </motion.div>
        <h3 className="text-lg font-semibold text-[var(--signal-fg-primary)]">
          Feature Shipped!
        </h3>
        <p className="text-sm text-[var(--signal-fg-secondary)] text-center">
          &quot;{feature.name}&quot; is now{" "}
          {targetPercent >= 100 ? "LIVE" : `at ${targetPercent}%`} in{" "}
          {envConfig.label}.
        </p>
        <Button variant="secondary" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to details
        </Button>
      </div>
    );
  }

  // ── Main wizard ────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* ── Feature Summary ─────────────────────────────────────── */}
        <div>
          <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)] truncate">
            {feature.name}
          </h3>
          <code className="text-xs font-mono text-[var(--signal-fg-tertiary)]">
            {feature.key}
          </code>
        </div>

        {/* ── Environment badge ───────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
            Environment
          </span>
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: envConfig.badge }}
            aria-hidden="true"
          />
          <span className="text-sm text-[var(--signal-fg-primary)]">
            {envConfig.label}
          </span>
        </div>

        {/* ── Current Rollout ─────────────────────────────────────── */}
        <div className="p-3 rounded-md bg-[var(--signal-bg-secondary)] border border-[var(--signal-border-subtle)]">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
            Current Rollout
          </span>
          <p className="text-2xl font-bold text-[var(--signal-fg-primary)] mt-1 font-mono tabular-nums">
            {feature.rolloutPercent}%
          </p>
        </div>

        {/* ── Target Rollout Slider ───────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
              Target Rollout
            </span>
            <span className="text-lg font-bold text-[var(--signal-fg-primary)] font-mono tabular-nums">
              {targetPercent}%
            </span>
          </div>

          {/* Presets */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {ROLLOUT_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setTargetPercent(preset.value)}
                className={cn(
                  "px-2.5 py-1 rounded text-xs font-medium",
                  "transition-colors duration-[var(--signal-duration-fast)]",
                  targetPercent === preset.value
                    ? "bg-[var(--signal-bg-accent-emphasis)] text-[var(--signal-fg-on-emphasis)]"
                    : "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-secondary)] hover:bg-[var(--signal-bg-accent-muted)]",
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Range slider */}
          <div className="relative">
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={targetPercent}
              onChange={(e) => setTargetPercent(Number(e.target.value))}
              className={cn(
                "w-full h-2 rounded-full appearance-none cursor-pointer",
                "bg-[var(--signal-border-subtle)]",
                "accent-[var(--signal-fg-accent)]",
                "[&::-webkit-slider-thumb]:appearance-none",
                "[&::-webkit-slider-thumb]:h-5",
                "[&::-webkit-slider-thumb]:w-5",
                "[&::-webkit-slider-thumb]:rounded-full",
                "[&::-webkit-slider-thumb]:bg-[var(--signal-fg-accent)]",
                "[&::-webkit-slider-thumb]:shadow-md",
                "[&::-webkit-slider-thumb]:cursor-pointer",
                "[&::-webkit-slider-thumb]:border-2",
                "[&::-webkit-slider-thumb]:border-white",
                "dark:[&::-webkit-slider-thumb]:border-[var(--signal-bg-primary)]",
              )}
              aria-label="Target rollout percentage"
              aria-valuenow={targetPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>

          {/* Tick marks */}
          <div className="flex justify-between mt-1 px-1">
            <span className="text-[9px] text-[var(--signal-fg-tertiary)]">
              0%
            </span>
            <span className="text-[9px] text-[var(--signal-fg-tertiary)]">
              25%
            </span>
            <span className="text-[9px] text-[var(--signal-fg-tertiary)]">
              50%
            </span>
            <span className="text-[9px] text-[var(--signal-fg-tertiary)]">
              75%
            </span>
            <span className="text-[9px] text-[var(--signal-fg-tertiary)]">
              100%
            </span>
          </div>
        </div>

        {/* ── Guard Metrics Placeholder ───────────────────────────── */}
        <div className="p-3 rounded-md border border-dashed border-[var(--signal-border-subtle)]">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-[var(--signal-fg-tertiary)]" />
            <span className="text-xs text-[var(--signal-fg-tertiary)]">
              Guard metrics (coming soon)
            </span>
          </div>
          <p className="text-xs text-[var(--signal-fg-tertiary)] mt-1">
            Auto-rollback will be triggered if guard metrics degrade below
            threshold.
          </p>
        </div>

        {/* ── Error ───────────────────────────────────────────────── */}
        {shipError && (
          <div
            className={cn(
              "p-3 rounded-md",
              "bg-[var(--signal-bg-danger-muted)]",
              "border border-[var(--signal-border-danger-emphasis)]",
              "text-sm text-[var(--signal-fg-danger)]",
            )}
            role="alert"
          >
            {shipError}
          </div>
        )}
      </div>

      {/* ── Footer Actions ──────────────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-[var(--signal-border-subtle)] space-y-2">
        {/* Back button */}
        <Button
          variant="secondary"
          fullWidth
          size="sm"
          onClick={handleBack}
          disabled={shipping}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to details
        </Button>

        {/* Hold to Ship */}
        <HoldToConfirm
          onConfirm={handleShip}
          label="Hold to Ship"
          description={
            targetPercent >= 100
              ? `Release "${feature.name}" to 100% of ${envConfig.label} traffic`
              : `Roll out "${feature.name}" to ${targetPercent}% of ${envConfig.label} traffic`
          }
          environment={feature.environment}
          disabled={shipping}
        />
      </div>
    </div>
  );
}
