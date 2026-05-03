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
import { BuildingIcon } from "@/components/icons/nav-icons";
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
      <DialogContent className="sm:max-w-md !p-0 overflow-hidden">
        {/* Gradient icon header */}
        <div className="relative px-6 pt-8 pb-6 bg-gradient-to-b from-[var(--bgColor-accent-muted)]/40 to-transparent">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-[var(--borderColor-default)]">
            <BuildingIcon className="h-7 w-7 text-[var(--fgColor-accent)]" />
          </div>
        </div>

        <DialogHeader className="text-center !border-b-0 px-6 !pt-0 !pb-2">
          <DialogTitle className="text-lg">Create project</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5">
          <div className="max-w-sm mx-auto w-full">
            <Label
              htmlFor="create-project-name"
              className="text-sm font-semibold"
            >
              Project name
            </Label>
            <Input
              id="create-project-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFieldError("");
              }}
              placeholder="e.g. My Awesome App"
              className="mt-2 h-11 text-[15px]"
              autoFocus
            />
            {fieldError && (
              <p className="mt-2 text-xs font-medium text-[var(--fgColor-danger)]">
                {fieldError}
              </p>
            )}
            <p className="mt-2 text-xs leading-relaxed text-[var(--fgColor-muted)]">
              Projects group your flags, environments, and segments together.
              Choose a name that reflects your application or team.
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
              Create project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
