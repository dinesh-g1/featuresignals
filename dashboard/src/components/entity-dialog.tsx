"use client";

import { useState } from "react";
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
import { LoaderIcon } from "@/components/icons/nav-icons";
import { ENVIRONMENT_COLORS } from "@/lib/constants";
import type { Environment } from "@/lib/types";

const COLOR_MAP: Record<string, string> = {
  "#64748b": "bg-slate-500",
  "#ef4444": "bg-red-500",
  "#f97316": "bg-orange-500",
  "#eab308": "bg-yellow-500",
  "#22c55e": "bg-green-500",
  "#06b6d4": "bg-cyan-500",
  "#3b82f6": "bg-blue-500",
  "#8b5cf6": "bg-violet-500",
  "#ec4899": "bg-pink-500",
};

// ── Create Environment Dialog ──────────────────────────────────────────────

interface CreateEnvironmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: {
    name: string;
    slug?: string;
    color?: string;
  }) => Promise<Environment>;
  onSuccess: (env: Environment) => void;
}

export function CreateEnvironmentDialog({
  open,
  onOpenChange,
  onCreate,
  onSuccess,
}: CreateEnvironmentDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#64748b");
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [error, setError] = useState("");

  function reset() {
    setName("");
    setColor("#64748b");
    setFieldError("");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setFieldError("Environment name is required");
      return;
    }

    setSubmitting(true);
    setError("");
    setFieldError("");
    try {
      const env = await onCreate({ name: trimmed, color });
      reset();
      onOpenChange(false);
      onSuccess(env);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create environment. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!submitting) onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Environment</DialogTitle>
          <div className="mt-1 text-sm text-[var(--signal-fg-secondary)]">
            Add a new deployment environment for managing flag states
            independently.
          </div>
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
              placeholder="e.g. Production, Staging, Development"
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
                  className={`h-8 w-8 rounded-full border-2 transition-all hover:scale-110 ${COLOR_MAP[c.value] || "bg-slate-500"} ${
                    color === c.value
                      ? "border-slate-900 shadow-md"
                      : "border-transparent"
                  }`}
                  title={c.label}
                />
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
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

// ── Edit Environment Dialog ────────────────────────────────────────────────

interface EditEnvironmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  environment: Environment | null;
  onUpdate: (data: {
    name: string;
    slug?: string;
    color?: string;
  }) => Promise<Environment>;
  onSuccess: () => void;
}

export function EditEnvironmentDialog({
  open,
  onOpenChange,
  environment,
  onUpdate,
  onSuccess,
}: EditEnvironmentDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#64748b");
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [error, setError] = useState("");

  function reset(env: Environment) {
    setName(env.name);
    setColor(env.color);
    setFieldError("");
    setError("");
  }

  function handleOpenChange(v: boolean) {
    if (submitting) return;
    if (v && environment) reset(environment);
    onOpenChange(v);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setFieldError("Environment name is required");
      return;
    }

    setSubmitting(true);
    setError("");
    setFieldError("");
    try {
      await onUpdate({ name: trimmed, color });
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to update environment.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Environment</DialogTitle>
          <div className="mt-1 text-sm text-[var(--signal-fg-secondary)]">
            Update environment details. Changes may affect API keys and flag
            states.
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div>
            <Label htmlFor="edit-env-name">Environment Name</Label>
            <Input
              id="edit-env-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFieldError("");
              }}
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
                  className={`h-8 w-8 rounded-full border-2 transition-all hover:scale-110 ${COLOR_MAP[c.value] || "bg-slate-500"} ${
                    color === c.value
                      ? "border-slate-900 shadow-md"
                      : "border-transparent"
                  }`}
                  title={c.label}
                />
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete Confirmation Dialog ─────────────────────────────────────────────

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  consequences?: string[];
  onDelete: () => Promise<void>;
}

export function DeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  consequences = [],
  onDelete,
}: DeleteDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  async function handleDelete() {
    setSubmitting(true);
    try {
      await onDelete();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!submitting) onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-600">{title}</DialogTitle>
          <div className="mt-1 text-sm text-[var(--signal-fg-secondary)]">
            {description && (
              <p className="font-semibold text-[var(--signal-fg-primary)]">
                {description}
              </p>
            )}
            {consequences.length > 0 && (
              <div className="bg-[var(--signal-bg-danger-muted)] border border-red-200 rounded-lg p-3 text-sm">
                <p className="font-semibold text-red-800 mb-1">This will:</p>
                <ul className="list-disc list-inside space-y-1 text-red-700">
                  {consequences.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-sm font-semibold text-red-600">
              This action cannot be undone.
            </p>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={submitting}>
            {submitting ? (
              <>
                <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              title
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
