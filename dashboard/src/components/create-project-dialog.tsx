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
import { BuildingIcon, LoaderIcon } from "@/components/icons/nav-icons";
import { EVENTS } from "@/lib/constants";
import { EventBus } from "@/lib/event-bus";
import { useAppStore } from "@/stores/app-store";
import type { Project } from "@/lib/types";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (project: Project) => void;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateProjectDialogProps) {
  const token = useAppStore((s) => s.token);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [fieldError, setFieldError] = useState("");

  function handleClose() {
    if (creating) return;
    setName("");
    setFieldError("");
    onOpenChange(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!token) return;

    if (!trimmed) {
      setFieldError("Project name is required");
      return;
    }

    setCreating(true);
    setFieldError("");
    try {
      const created = await api.createProject(token, { name: trimmed });
      EventBus.dispatch(EVENTS.PROJECTS_CHANGED);
      setName("");
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
          <BuildingIcon className="h-6 w-6 text-[var(--fgColor-accent)]" />
        </div>

        <DialogHeader className="text-center">
          <DialogTitle>Create project</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="create-project-name">Project name</Label>
            <Input
              id="create-project-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFieldError("");
              }}
              placeholder="My Awesome App"
              className="mt-1.5"
              autoFocus
            />
            {fieldError && (
              <p className="mt-1.5 text-xs text-[var(--fgColor-danger)]">
                {fieldError}
              </p>
            )}
            <p className="mt-1.5 text-xs text-[var(--fgColor-muted)]">
              Projects group your flags, environments, and segments together.
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
                "Create project"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
