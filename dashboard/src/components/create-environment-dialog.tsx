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
import { GlobeIcon, LoaderIcon } from "@/components/icons/nav-icons";
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

const COLOR_MAP: Record<string, { bg: string; ring: string }> = {
  "#64748b": { bg: "bg-slate-500", ring: "ring-slate-500" },
  "#ef4444": { bg: "bg-red-500", ring: "ring-red-500" },
  "#f97316": { bg: "bg-orange-500", ring: "ring-orange-500" },
  "#eab308": { bg: "bg-yellow-500", ring: "ring-yellow-500" },
  "#22c55e": { bg: "bg-green-500", ring: "ring-green-500" },
  "#06b6d4": { bg: "bg-cyan-500", ring: "ring-cyan-500" },
  "#3b82f6": { bg: "bg-blue-500", ring: "ring-blue-500" },
  "#8b5cf6": { bg: "bg-violet-500", ring: "ring-violet-500" },
  "#ec4899": { bg: "bg-pink-500", ring: "ring-pink-500" },
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
      <DialogContent className="sm:max-w-md">
        {/* Icon header */}
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--bgColor-accent-muted)]">
          <GlobeIcon className="h-6 w-6 text-[var(--fgColor-accent)]" />
        </div>

        <DialogHeader className="text-center">
          <DialogTitle>Create environment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <Label htmlFor="create-env-name">Environment name</Label>
            <Input
              id="create-env-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFieldError("");
              }}
              placeholder="e.g. Staging, QA, Canary"
              className="mt-1.5"
              autoFocus
            />
            {fieldError && (
              <p className="mt-1.5 text-xs text-[var(--fgColor-danger)]">
                {fieldError}
              </p>
            )}
            <p className="mt-1.5 text-xs text-[var(--fgColor-muted)]">
              Manage separate flag configurations for dev, staging, and
              production.
            </p>
          </div>

          {/* Color picker */}
          <div>
            <Label>Color label</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {ENVIRONMENT_COLORS.map((c) => {
                const styles = COLOR_MAP[c.value] || {
                  bg: "bg-slate-500",
                  ring: "ring-slate-500",
                };
                const isSelected = colorVal === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColorVal(c.value)}
                    title={c.label}
                    className={cn(
                      "h-7 w-7 rounded-full transition-all duration-150",
                      styles.bg,
                      isSelected
                        ? `ring-2 ring-offset-2 ${styles.ring} scale-110`
                        : "opacity-60 hover:opacity-100 hover:scale-105",
                    )}
                  />
                );
              })}
            </div>
            <p className="mt-1.5 text-xs text-[var(--fgColor-muted)]">
              Choose a color to visually identify this environment.
            </p>
          </div>

          <DialogFooter className="!justify-between">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={creating || !name.trim()}
              variant="primary"
            >
              {creating ? (
                <>
                  <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create environment"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
