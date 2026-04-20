"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { EVENTS, ENVIRONMENT_COLORS } from "@/lib/constants";
import { EventBus } from "@/lib/event-bus";
import { useAppStore } from "@/stores/app-store";
import type { Environment } from "@/lib/types";

interface CreateEnvironmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (env: Environment) => void;
}

export function CreateEnvironmentDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateEnvironmentDialogProps) {
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#64748b");
  const [creating, setCreating] = useState(false);
  const [fieldError, setFieldError] = useState("");

  function handleClose() {
    if (creating) return;
    setName("");
    setColor("#64748b");
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
        color,
      });
      EventBus.dispatch(EVENTS.ENVIRONMENTS_CHANGED);
      setName("");
      setColor("#64748b");
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Environment</DialogTitle>
          <DialogDescription>
            Environments let you manage separate flag configurations for
            development, staging, production, etc.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div>
            <Label htmlFor="create-env-name">Environment Name</Label>
            <Input
              id="create-env-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFieldError("");
              }}
              placeholder="e.g. QA, Canary, Preview"
              className="mt-1"
              autoFocus
            />
            {fieldError && (
              <p className="text-xs text-red-500 mt-1">{fieldError}</p>
            )}
          </div>
          <div>
            <Label>Color</Label>
            <div className="mt-2 flex gap-2">
              {ENVIRONMENT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`h-8 w-8 rounded-full transition-all ${color === c.value ? "ring-2 ring-offset-2 ring-indigo-500 scale-110" : "hover:scale-105"} bg-[${c.value}]`}
                  title={c.label}
                />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={creating || !name.trim()}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Environment"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
