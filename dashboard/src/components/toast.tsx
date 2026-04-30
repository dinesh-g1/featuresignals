"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CheckCircleFillIcon,
  AlertIcon,
  InfoFillIcon,
} from "@/components/icons/nav-icons";

interface Toast {
  id: number;
  message: string;
  type: "error" | "success" | "info";
  exiting?: boolean;
}

let addToast: (
  message: string,
  type: "error" | "success" | "info",
) => void = () => {};

export function toast(
  message: string,
  type: "error" | "success" | "info" = "error",
) {
  addToast(message, type);
}

const iconMap = {
  success: CheckCircleFillIcon,
  error: AlertIcon,
  info: InfoFillIcon,
} as const;

const styleMap = {
  error:
    "bg-[var(--bgColor-danger-muted)] text-[var(--fgColor-danger)] ring-[var(--borderColor-danger-emphasis)]/30 shadow-[var(--shadow-resting-small)]",
  info: "bg-[var(--bgColor-accent-muted)] text-[var(--fgColor-accent)] ring-[var(--borderColor-accent-muted)] shadow-[var(--shadow-resting-small)]",
  success:
    "bg-[var(--bgColor-success-muted)] text-[var(--fgColor-success)] ring-[var(--borderColor-success-muted)] shadow-[var(--shadow-resting-small)]",
} as const;

const iconStyleMap = {
  error: "text-[var(--fgColor-danger)]",
  info: "text-[var(--fgColor-accent)]",
  success: "text-[var(--fgColor-success)]",
} as const;

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [counter, setCounter] = useState(0);

  const add = useCallback(
    (message: string, type: "error" | "success" | "info") => {
      const id = counter;
      setCounter((c) => c + 1);
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) =>
          prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
        );
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 200);
      }, 3500);
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
            {t.message}
          </div>
        );
      })}
    </div>
  );
}
