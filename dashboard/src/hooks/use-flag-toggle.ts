"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "@/components/toast";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";

// ─── Types ──────────────────────────────────────────────────────────

interface ToggleContext {
  flagKey: string;
  flagName: string;
  /** The environment's name (e.g., "Production") */
  envName: string;
  /** Is this a production environment? */
  isProduction: boolean;
}

interface UseFlagToggleReturn {
  /** Initiate a toggle. If production, gate opens; otherwise toggles immediately. */
  toggle: (ctx: ToggleContext) => Promise<void>;
  /** Whether a production safety gate is currently open */
  gateOpen: boolean;
  /** Close the gate (cancel) */
  closeGate: () => void;
  /** Gate context (flag info for the dialog) */
  gateContext: ToggleContext | null;
  /** Gate action direction */
  gateAction: "enable" | "disable";
  /** Confirm the gate action (performs the toggle) */
  handleGateConfirm: () => Promise<void>;
}

// ─── Hook ───────────────────────────────────────────────────────────

export function useFlagToggle(
  projectId: string | null,
  envId: string | null,
  /** Called after a successful toggle, e.g., to refetch state */
  onToggled?: () => void,
): UseFlagToggleReturn {
  const token = useAppStore((s) => s.token);

  const [gateOpen, setGateOpen] = useState(false);
  const [gateContext, setGateContext] = useState<ToggleContext | null>(null);
  const [gateAction, setGateAction] = useState<"enable" | "disable">("enable");

  // Keep a ref to the latest `onToggled` so we don't cause re-renders
  const onToggledRef = useRef(onToggled);
  onToggledRef.current = onToggled;

  /** Actually perform the toggle API call */
  const performToggle = useCallback(
    async (ctx: ToggleContext) => {
      if (!token || !projectId || !envId) {
        toast("Cannot activate/pause feature — no environment selected", "error");
        return;
      }

      // Read current state to determine target enabled state
      let currentEnabled = false;
      try {
        const state = await api.getFlagState(
          token,
          projectId,
          ctx.flagKey,
          envId,
        );
        currentEnabled = state?.enabled ?? false;
      } catch {
        // If we can't read, assume off. The API will error if needed.
      }

      const nextEnabled = !currentEnabled;
      const actionLabel = nextEnabled ? "enable" : "disable";

      try {
        await api.updateFlagState(token, projectId, ctx.flagKey, envId, {
          enabled: nextEnabled,
        });

        // Show undo toast
        toast(
          `Flag "${ctx.flagName}" ${nextEnabled ? "enabled" : "disabled"}`,
          "success",
          {
            label: "Undo",
            onClick: async () => {
              try {
                await api.updateFlagState(
                  token,
                  projectId,
                  ctx.flagKey,
                  envId,
                  { enabled: currentEnabled },
                );
                toast(
                  `Reverted — "${ctx.flagName}" is now ${currentEnabled ? "enabled" : "disabled"}`,
                  "info",
                );
                onToggledRef.current?.();
              } catch {
                toast("Failed to undo — please toggle manually", "error");
              }
            },
          },
        );

        onToggledRef.current?.();
      } catch {
        toast(`Failed to ${actionLabel} flag "${ctx.flagName}"`, "error");
      }
    },
    [token, projectId, envId],
  );

  /** Public toggle method */
  const toggle = useCallback(
    async (ctx: ToggleContext) => {
      if (ctx.isProduction) {
        // Read current state to determine action direction
        if (!token || !projectId || !envId) {
          toast("Cannot activate/pause feature — no environment selected", "error");
          return;
        }
        try {
          const state = await api.getFlagState(
            token,
            projectId,
            ctx.flagKey,
            envId,
          );
          setGateAction(state?.enabled ? "disable" : "enable");
        } catch {
          setGateAction("enable");
        }
        setGateContext(ctx);
        setGateOpen(true);
      } else {
        await performToggle(ctx);
      }
    },
    [token, projectId, envId, performToggle],
  );

  const closeGate = useCallback(() => setGateOpen(false), []);

  const handleGateConfirm = useCallback(async () => {
    if (gateContext) {
      await performToggle(gateContext);
      setGateOpen(false);
    }
  }, [gateContext, performToggle]);

  return {
    toggle,
    gateOpen,
    closeGate,
    gateContext,
    gateAction,
    handleGateConfirm,
  };
}
