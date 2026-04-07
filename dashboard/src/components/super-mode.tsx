/**
 * Super Mode -- Internal developer tools panel.
 *
 * **Activation** is server-controlled via environment variables on the API server.
 * No database changes needed — the server injects `tier: "internal"` in the login
 * response for matching users. This is invisible and inaccessible to all other users.
 *
 * Set one or both env vars on the server:
 *   SUPER_MODE_DOMAIN=featuresignals.com    (all @featuresignals.com emails get access)
 *   SUPER_MODE_EMAILS=dev@gmail.com,qa@corp.co  (explicit allowlist for non-domain emails)
 *
 * After setting the env var and restarting the server, log out and back in.
 * A purple bug icon appears at the bottom-left of the dashboard.
 *
 * **Features:**
 * - Plan Simulation: Switch between free/trial/pro/enterprise to test gating, nudges, billing UI.
 * - Feature Gate Overrides: Force-enable Pro/Enterprise features (approvals, SSO, etc.).
 * - A/B Experiments: Override variant assignments for dashboard experiments.
 * - Reset Onboarding: Re-test the first-time user flow via POST /v1/internal/reset-onboarding.
 *
 * All overrides are stored in `sessionStorage` and do not affect other users or the database.
 * The panel is invisible when `user.tier !== "internal"` (returns null).
 */
"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { toast } from "@/components/toast";
import { cn } from "@/lib/utils";
import {
  Bug, ChevronDown, ChevronUp, Eye, FlaskConical, Beaker,
  RotateCcw, Sparkles, ToggleLeft, X,
} from "lucide-react";

const PLANS = ["free", "trial", "pro", "enterprise"] as const;

export function SuperMode() {
  const user = useAppStore((s) => s.user);
  const token = useAppStore((s) => s.token);
  const organization = useAppStore((s) => s.organization);
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [simulatedPlan, setSimulatedPlan] = useState<string | null>(null);
  const [featureOverrides, setFeatureOverrides] = useState<Record<string, boolean>>({});

  const isInternal = user?.tier === "internal";

  useEffect(() => {
    if (!isInternal) return;
    const stored = sessionStorage.getItem("fs-super-mode-plan");
    if (stored) setSimulatedPlan(stored);
    const overrides = sessionStorage.getItem("fs-super-mode-overrides");
    if (overrides) {
      try { setFeatureOverrides(JSON.parse(overrides)); } catch { /* ignore */ }
    }
  }, [isInternal]);

  if (!isInternal) return null;

  const handlePlanSimulation = (plan: string) => {
    if (simulatedPlan === plan) {
      setSimulatedPlan(null);
      sessionStorage.removeItem("fs-super-mode-plan");
      toast("Plan simulation cleared", "success");
    } else {
      setSimulatedPlan(plan);
      sessionStorage.setItem("fs-super-mode-plan", plan);
      toast(`Simulating ${plan} plan. Refresh to see changes.`, "success");
    }
  };

  const handleOnboardingReset = async () => {
    if (!token) return;
    try {
      await api.resetOnboarding(token);
      toast("Onboarding reset. Refresh the page.", "success");
    } catch {
      toast("Failed to reset onboarding", "error");
    }
  };

  const toggleFeatureOverride = (feature: string) => {
    const next = { ...featureOverrides };
    if (next[feature] !== undefined) {
      delete next[feature];
    } else {
      next[feature] = true;
    }
    setFeatureOverrides(next);
    sessionStorage.setItem("fs-super-mode-overrides", JSON.stringify(next));
    toast(`Feature override ${next[feature] !== undefined ? "enabled" : "cleared"}: ${feature}`, "success");
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-16 left-4 z-50 flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-white shadow-lg transition-all hover:bg-purple-700 sm:bottom-6"
        aria-label="Open Super Mode (Internal)"
      >
        <Bug className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-16 left-4 z-50 w-72 rounded-xl border border-purple-200 bg-white shadow-2xl sm:bottom-6">
      <div className="flex items-center justify-between border-b border-purple-100 bg-purple-50 px-3 py-2 rounded-t-xl">
        <div className="flex items-center gap-2">
          <Bug className="h-3.5 w-3.5 text-purple-600" />
          <span className="text-xs font-semibold text-purple-800">Super Mode</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setMinimized(!minimized)} className="p-0.5 text-purple-400 hover:text-purple-600" aria-label={minimized ? "Expand panel" : "Minimize panel"}>
            {minimized ? <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>
          <button onClick={() => setOpen(false)} className="p-0.5 text-purple-400 hover:text-purple-600" aria-label="Close Super Mode">
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {!minimized && (
        <div className="max-h-80 overflow-y-auto p-3 space-y-4">
          {/* Current State */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Current State</p>
            <div className="space-y-1 text-xs text-slate-600">
              <p>Plan: <span className="font-semibold text-slate-800">{organization?.plan ?? "unknown"}</span></p>
              <p>User: <span className="font-mono text-slate-800">{user?.email}</span></p>
              <p>Tier: <span className="font-semibold text-purple-600">{user?.tier ?? "standard"}</span></p>
            </div>
          </div>

          {/* Plan Simulation */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              <Eye className="inline h-3 w-3 mr-0.5" /> Plan Simulation
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PLANS.map((plan) => (
                <button
                  key={plan}
                  onClick={() => handlePlanSimulation(plan)}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                    simulatedPlan === plan
                      ? "bg-purple-100 text-purple-700 ring-1 ring-purple-300"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                  )}
                >
                  {plan}
                </button>
              ))}
            </div>
            {simulatedPlan && (
              <p className="mt-1 text-[10px] text-amber-600">
                Simulating <span className="font-semibold">{simulatedPlan}</span> plan
              </p>
            )}
          </div>

          {/* Feature Gate Overrides */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              <ToggleLeft className="inline h-3 w-3 mr-0.5" /> Feature Overrides
            </p>
            <div className="space-y-1">
              {["approvals", "webhooks", "sso", "scheduling", "ab_experiments", "relay_proxy"].map((feat) => (
                <button
                  key={feat}
                  onClick={() => toggleFeatureOverride(feat)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2 py-1 text-xs transition-colors",
                    featureOverrides[feat] !== undefined
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100",
                  )}
                >
                  <span>{feat}</span>
                  <span className="text-[10px]">{featureOverrides[feat] !== undefined ? "ON" : "off"}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              <FlaskConical className="inline h-3 w-3 mr-0.5" /> Actions
            </p>
            <div className="space-y-1.5">
              <button
                onClick={handleOnboardingReset}
                className="flex w-full items-center gap-2 rounded-md bg-slate-100 px-2 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200"
              >
                <RotateCcw className="h-3 w-3" />
                Reset Onboarding
              </button>
              <button
                onClick={() => {
                  sessionStorage.removeItem("fs-super-mode-plan");
                  sessionStorage.removeItem("fs-super-mode-overrides");
                  setSimulatedPlan(null);
                  setFeatureOverrides({});
                  toast("All super mode state cleared", "success");
                }}
                className="flex w-full items-center gap-2 rounded-md bg-red-50 px-2 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
              >
                <X className="h-3 w-3" />
                Clear All Overrides
              </button>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              <Beaker className="inline h-3 w-3 mr-0.5" /> A/B Experiments
            </p>
            <div className="space-y-2">
              {["onboarding_flow", "dashboard_layout", "upgrade_cta_copy", "empty_state_style"].map((expName) => (
                <div key={expName} className="text-xs">
                  <span className="font-medium text-slate-600">{expName}</span>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {["control", "variant_a", "variant_b"].map((v) => (
                      <button
                        key={v}
                        onClick={() => {
                          const expKey = `exp_${expName}`;
                          sessionStorage.setItem(`fs-exp-${expKey}`, v);
                          toast(`Experiment ${expName} → ${v}`, "success");
                        }}
                        className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 hover:bg-purple-100 hover:text-purple-700"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
