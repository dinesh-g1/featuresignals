"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import type { Environment } from "@/lib/types";

const presetColors = [
  { label: "Green", value: "#22c55e" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Red", value: "#ef4444" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Purple", value: "#8b5cf6" },
  { label: "Slate", value: "#64748b" },
];

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
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState<string>("");

  function handleClose() {
    if (creating) return;
    setName("");
    setColor("#64748b");
    setError("");
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
    setError("");
    setFieldError("");
    try {
      const created = await api.createEnvironment(token, projectId, {
        name: trimmed,
        color,
      });
      setName("");
      setColor("#64748b");
      setError("");
      onCreated(created);
      onOpenChange(false);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create environment. Please try again.",
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        if (!creating) onOpenChange(v);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white shadow-2xl focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="px-6 pt-6 pb-2">
            <Dialog.Title className="text-lg font-semibold text-slate-900">
              Create a new environment
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-slate-500">
              Environments let you manage separate flag configurations for
              development, staging, production, etc.
            </Dialog.Description>
          </div>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="px-6 pb-6 pt-4 space-y-4"
          >
            <div>
              <label
                htmlFor="env-name"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Environment name
              </label>
              <input
                id="env-name"
                autoFocus
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                  setFieldError("");
                }}
                placeholder="e.g. QA, Canary, Preview"
                aria-invalid={!!fieldError}
                aria-describedby={fieldError ? "env-name-error" : undefined}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              {fieldError && (
                <p
                  id="env-name-error"
                  className="text-xs text-red-500"
                  role="alert"
                >
                  {fieldError}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Color
              </label>
              <div className="flex gap-2">
                {presetColors.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={`h-8 w-8 rounded-full transition-all ${color === c.value ? "ring-2 ring-offset-2 ring-indigo-500 scale-110" : "hover:scale-105"}`}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={creating}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || !name.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:ring-offset-2 disabled:opacity-50"
              >
                {creating && (
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                )}
                {creating ? "Creating..." : "Create Environment"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
