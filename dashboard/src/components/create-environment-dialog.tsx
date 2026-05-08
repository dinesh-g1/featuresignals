"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldHelp } from "@/components/field-help";
import { GlobeIcon } from "@/components/icons/nav-icons";
import { cn } from "@/lib/utils";
import { EVENTS, ENVIRONMENT_COLORS } from "@/lib/constants";
import { EventBus } from "@/lib/event-bus";
import { useAppStore } from "@/stores/app-store";
import type { Environment } from "@/lib/types";

interface CreateEnvironmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (env: Environment) => void;
}

const COLOR_MAP: Record<string, { bg: string; ring: string; label: string }> = {
  "#22c55e": {
    bg: "bg-emerald-500",
    ring: "ring-emerald-500",
    label: "Emerald",
  },
  "#f59e0b": {
    bg: "bg-amber-500",
    ring: "ring-amber-500",
    label: "Amber",
  },
  "#ef4444": { bg: "bg-red-500", ring: "ring-red-500", label: "Red" },
  "#3b82f6": {
    bg: "bg-blue-500",
    ring: "ring-blue-500",
    label: "Blue",
  },
  "#8b5cf6": {
    bg: "bg-violet-500",
    ring: "ring-violet-500",
    label: "Violet",
  },
  "#14b8a6": {
    bg: "bg-teal-500",
    ring: "ring-teal-500",
    label: "Teal",
  },
  "#64748b": {
    bg: "bg-slate-500",
    ring: "ring-slate-500",
    label: "Slate",
  },
};

export function CreateEnvironmentDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateEnvironmentDialogProps) {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const [name, setName] = useState("");
  const [colorVal, setColorVal] = useState("#64748b");
  const [creating, setCreating] = useState(false);
  const [fieldError, setFieldError] = useState("");

  function handleClose() {
    if (creating) return;
    setName("");
    setColorVal("#64748b");
    setFieldError("");
    onOpenChange(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setFieldError("Environment name is required");
      return;
    }
    if (!token || !projectId) return;

    setCreating(true);
    setFieldError("");
    try {
      const created = await api.createEnvironment(token, projectId, {
        name: trimmed,
        color: colorVal,
      });
      EventBus.dispatch(EVENTS.ENVIRONMENTS_CHANGED);
      setName("");
      setColorVal("#64748b");
      onCreated(created);
      onOpenChange(false);
    } catch {
      // Error handled by parent via toast
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!creating) onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md !p-0 overflow-hidden">
        {/* Gradient icon header */}
        <div className="relative px-6 pt-8 pb-6 bg-gradient-to-b from-[var(--signal-bg-accent-muted)]/40 to-transparent">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-[var(--signal-border-default)]">
            <GlobeIcon className="h-7 w-7 text-[var(--signal-fg-accent)]" />
          </div>
        </div>

        <DialogHeader className="text-center !border-b-0 px-6 !pt-0 !pb-2">
          <DialogTitle className="text-lg">Create environment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5">
          {/* Name */}
          <div className="max-w-sm mx-auto w-full">
            <div className="flex items-center gap-1.5">
              <Label
                htmlFor="create-env-name"
                className="text-sm font-semibold"
              >
                Environment name
              </Label>
              <FieldHelp docsKey="environments" label="environments" />
            </div>
            <Input
              id="create-env-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFieldError("");
              }}
              placeholder="e.g. Staging, QA, Canary"
              className="mt-2 h-11 text-[15px]"
              autoFocus
            />
            {fieldError && (
              <p className="mt-2 text-xs font-medium text-[var(--signal-fg-danger)]">
                {fieldError}
              </p>
            )}
            <p className="mt-2 text-xs leading-relaxed text-[var(--signal-fg-secondary)]">
              Manage separate flag configurations for dev, staging, and
              production environments.
            </p>
          </div>

          {/* Color picker */}
          <div className="max-w-sm mx-auto w-full">
            <Label className="text-sm font-semibold">Color label</Label>
            <div className="mt-3 flex flex-wrap gap-2.5">
              {ENVIRONMENT_COLORS.map((c) => {
                const styles = COLOR_MAP[c.value] || {
                  bg: "bg-slate-500",
                  ring: "ring-slate-500",
                  label: "Slate",
                };
                const isSelected = colorVal === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColorVal(c.value)}
                    title={styles.label}
                    className={cn(
                      "h-9 w-9 rounded-xl transition-all duration-200 relative",
                      styles.bg,
                      isSelected
                        ? `ring-[3px] ring-offset-2 ${styles.ring} scale-110 shadow-md`
                        : "opacity-50 hover:opacity-80 hover:scale-105",
                    )}
                  >
                    {isSelected && (
                      <svg
                        className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow-sm"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[var(--signal-fg-secondary)]">
              Choose a color to visually identify this environment across the
              dashboard.
            </p>
          </div>

          <DialogFooter className="!justify-between !border-t-0 !px-0 !pt-0 max-w-sm mx-auto w-full">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={creating}
              size="lg"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={creating || !name.trim()}
              variant="primary"
              size="lg"
              loading={creating}
            >
              Create environment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
