"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CheckCircleFillIcon,
  AlertIcon,
  InfoFillIcon,
} from "@/components/icons/nav-icons";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: number;
  message: string;
  type: "error" | "success" | "info";
  exiting?: boolean;
  action?: ToastAction;
}

let addToast: (
  message: string,
  type: "error" | "success" | "info",
  action?: ToastAction,
) => void = () => {};

export function toast(
  message: string,
  type: "error" | "success" | "info" = "error",
  action?: ToastAction,
) {
  addToast(message, type, action);
}

const iconMap = {
  success: CheckCircleFillIcon,
  error: AlertIcon,
  info: InfoFillIcon,
} as const;

const styleMap = {
  error:
    "bg-[var(--signal-bg-danger-muted)] text-[var(--signal-fg-danger)] ring-[var(--signal-border-danger-emphasis)]/30 shadow-[var(--signal-shadow-sm)]",
  info: "bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)] ring-[var(--signal-border-accent-muted)] shadow-[var(--signal-shadow-sm)]",
  success:
    "bg-[var(--signal-bg-success-muted)] text-[var(--signal-fg-success)] ring-[var(--signal-border-success-muted)] shadow-[var(--signal-shadow-sm)]",
} as const;

const iconStyleMap = {
  error: "text-[var(--signal-fg-danger)]",
  info: "text-[var(--signal-fg-accent)]",
  success: "text-[var(--signal-fg-success)]",
} as const;

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [counter, setCounter] = useState(0);

  const add = useCallback(
    (
      message: string,
      type: "error" | "success" | "info",
      action?: ToastAction,
    ) => {
      const id = counter;
      setCounter((c) => c + 1);
      setToasts((prev) => [...prev, { id, message, type, action }]);
      setTimeout(
        () => {
          setToasts((prev) =>
            prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
          );
          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
          }, 200);
        },
        action ? 5000 : 3500,
      );
    },
    [counter],
  );

  useEffect(() => {
    addToast = add;
  }, [add]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((t) => {
        const Icon = iconMap[t.type];
        return (
          <div
            key={t.id}
            className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-xl ring-1 transition-all duration-200 ${
              t.exiting
                ? "opacity-0 translate-x-4 scale-95"
                : "animate-bounce-in"
            } ${styleMap[t.type]}`}
          >
            <Icon className={`h-4 w-4 shrink-0 ${iconStyleMap[t.type]}`} />
            <span className="flex-1">{t.message}</span>
            {t.action && (
              <button
                onClick={t.action.onClick}
                className="shrink-0 rounded-md px-2 py-0.5 text-xs font-bold underline underline-offset-2 transition-colors hover:opacity-80"
              >
                {t.action.label}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
