"use client";

import { useState, useCallback } from "react";
import { useAppStore } from "@/stores/app-store";
import { useConsoleStore } from "@/stores/console-store";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Flag, Check, Copy } from "lucide-react";
import type { FeatureCardData } from "@/lib/console-types";

// ─── Flag Type Options ──────────────────────────────────────────────

const FLAG_TYPES = [
  { value: "boolean", label: "Boolean", description: "Simple on/off toggle" },
  {
    value: "multivariate",
    label: "Multivariate",
    description: "Multiple variants (A/B/C)",
  },
  {
    value: "experiment",
    label: "Experiment",
    description: "A/B test with metrics",
  },
  {
    value: "permission",
    label: "Permission",
    description: "Access control gating",
  },
  { value: "ops", label: "Ops", description: "Kill switch / circuit breaker" },
] as const;

// ─── Props ──────────────────────────────────────────────────────────

interface CreateFlagDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (flag: FeatureCardData) => void;
}

// ─── Component ──────────────────────────────────────────────────────

export function CreateFlagDialog({
  open,
  onClose,
  onCreated,
}: CreateFlagDialogProps) {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const selectedEnvironment = useConsoleStore((s) => s.selectedEnvironment);

  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [flagType, setFlagType] = useState("boolean");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // After successful creation, show the key and option to copy
  const [createdFlag, setCreatedFlag] = useState<{
    key: string;
    name: string;
  } | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);

  // ── Reset on close ──────────────────────────────────────────────

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        setTimeout(() => {
          setName("");
          setKey("");
          setDescription("");
          setFlagType("boolean");
          setError("");
          setCreatedFlag(null);
          setKeyCopied(false);
          onClose();
        }, 150);
      }
    },
    [onClose],
  );

  // ── Auto-generate key from name ────────────────────────────────

  const handleNameChange = (value: string) => {
    setName(value);
    if (!key || key === nameToKey(name)) {
      setKey(nameToKey(value));
    }
  };

  function nameToKey(n: string): string {
    return n
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  // ── Copy key to clipboard ─────────────────────────────────────

  const handleCopyKey = async () => {
    if (!createdFlag) return;
    try {
      await navigator.clipboard.writeText(createdFlag.key);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    } catch {
      // Clipboard API unavailable
    }
  };

  // ── Submit ────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!name.trim() || !key.trim()) return;
    if (!token) {
      setError("Please sign in to create a feature flag.");
      return;
    }
    if (!projectId) {
      setError("No project selected. Please select a project first.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const flag = await api.createFlag(token, projectId, {
        name: name.trim(),
        key: key.trim().toLowerCase(),
        description: description.trim() || undefined,
        flag_type: flagType,
        status: "active",
      });

      setCreatedFlag({ key: flag.key, name: flag.name });

      const featureCard: FeatureCardData = {
        key: flag.key,
        name: flag.name,
        description: flag.description ?? "",
        stage: "flag",
        status: "scheduled",
        environment: selectedEnvironment,
        environmentName:
          selectedEnvironment === "production"
            ? "Production"
            : selectedEnvironment === "staging"
              ? "Staging"
              : "Development",
        type: flag.flag_type ?? "boolean",
        evalVolume: 0,
        evalTrend: 0,
        rolloutPercent: 0,
        healthScore: 100,
        lastAction: "Created",
        lastActionAt: new Date().toISOString(),
        lastActionBy: "You",
      };

      onCreated(featureCard);

      setTimeout(() => {
        handleOpenChange(false);
      }, 2500);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create feature flag",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = name.trim().length > 0 && key.trim().length > 0 && !submitting;

  // ── Render ────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-[var(--signal-fg-accent)]" />
            {createdFlag ? "Feature flag created" : "Create feature flag"}
          </DialogTitle>
          {!createdFlag && (
            <DialogDescription>
              Create a new feature flag to control feature rollout
            </DialogDescription>
          )}
        </DialogHeader>

        {createdFlag ? (
          <DialogBody>
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--signal-bg-success-muted)]">
                <Check className="h-6 w-6 text-[var(--signal-fg-success)]" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-[var(--signal-fg-primary)]">
                  &ldquo;{createdFlag.name}&rdquo; is ready
                </p>
                <p className="text-xs text-[var(--signal-fg-secondary)] mt-1">
                  Use the flag key in your SDK to control this feature
                </p>
              </div>

              <div className="flex items-center gap-2 w-full mt-2">
                <code
                  className={cn(
                    "flex-1 px-3 py-2 rounded-md text-sm font-mono",
                    "bg-[var(--signal-bg-secondary)]",
                    "border border-[var(--signal-border-subtle)]",
                    "text-[var(--signal-fg-primary)]",
                    "select-all",
                  )}
                >
                  {createdFlag.key}
                </code>
                <button
                  type="button"
                  onClick={handleCopyKey}
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-2 rounded-md",
                    "text-xs font-medium",
                    "bg-[var(--signal-bg-secondary)]",
                    "border border-[var(--signal-border-subtle)]",
                    "text-[var(--signal-fg-secondary)]",
                    "hover:bg-[var(--signal-bg-primary)] hover:text-[var(--signal-fg-primary)]",
                    "transition-colors duration-[var(--signal-duration-fast)]",
                  )}
                >
                  {keyCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-[var(--signal-fg-success)]" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>
          </DialogBody>
        ) : (
          <>
            <DialogBody>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="flag-name">Feature name</Label>
                  <Input
                    id="flag-name"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Dark Mode"
                    autoComplete="off"
                    autoFocus
                  />
                  <p className="text-[11px] text-[var(--signal-fg-tertiary)]">
                    A human-readable name describing what the flag controls
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="flag-key">Flag key</Label>
                  <Input
                    id="flag-key"
                    value={key}
                    onChange={(e) =>
                      setKey(
                        e.target.value
                          .toLowerCase()
                          .replace(/\s+/g, "-")
                          .replace(/[^a-z0-9-]/g, ""),
                      )
                    }
                    placeholder="dark-mode"
                    className="font-mono"
                    autoComplete="off"
                  />
                  <p className="text-[11px] text-[var(--signal-fg-tertiary)]">
                    Used in SDK calls:{" "}
                    <code className="text-[var(--signal-fg-accent)]">
                      client.isEnabled(&quot;{key || "flag-key"}&quot;)
                    </code>
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="flag-desc">Description (optional)</Label>
                  <Input
                    id="flag-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enable dark mode across the dashboard"
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Flag type</Label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {FLAG_TYPES.map((ft) => (
                      <button
                        key={ft.value}
                        type="button"
                        onClick={() => setFlagType(ft.value)}
                        className={cn(
                          "flex items-start gap-2 px-3 py-2 rounded-md text-left",
                          "border transition-all duration-[var(--signal-duration-fast)]",
                          flagType === ft.value
                            ? "border-[var(--signal-border-accent-emphasis)] bg-[var(--signal-bg-accent-muted)]"
                            : "border-[var(--signal-border-subtle)] hover:border-[var(--signal-border-default)]",
                        )}
                      >
                        <span
                          className={cn(
                            "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full mt-0.5",
                            "border-2",
                            flagType === ft.value
                              ? "border-[var(--signal-fg-accent)]"
                              : "border-[var(--signal-border-default)]",
                          )}
                        >
                          {flagType === ft.value && (
                            <span className="h-2 w-2 rounded-full bg-[var(--signal-fg-accent)]" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <span
                            className={cn(
                              "text-sm font-medium",
                              flagType === ft.value
                                ? "text-[var(--signal-fg-accent)]"
                                : "text-[var(--signal-fg-primary)]",
                            )}
                          >
                            {ft.label}
                          </span>
                          <p className="text-[11px] text-[var(--signal-fg-tertiary)] leading-snug">
                            {ft.description}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-[var(--signal-fg-danger)] bg-[var(--signal-bg-danger-muted)] px-3 py-2 rounded-md border border-[var(--signal-border-danger-muted)]">
                    {error}
                  </p>
                )}
              </div>
            </DialogBody>

            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => handleOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={!canSubmit}
                loading={submitting}
              >
                {submitting ? "Creating..." : "Create flag"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
