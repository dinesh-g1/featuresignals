"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, Info } from "lucide-react";

interface Toast {
  id: number;
  message: string;
  type: "error" | "success" | "info";
  exiting?: boolean;
}

let addToast: (message: string, type: "error" | "success" | "info") => void = () => {};

export function toast(message: string, type: "error" | "success" | "info" = "error") {
  addToast(message, type);
}

const iconMap = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
} as const;

const styleMap = {
  error: "bg-red-50 text-red-700 ring-red-200/80 shadow-red-100/50",
  info: "bg-blue-50 text-blue-700 ring-blue-200/80 shadow-blue-100/50",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200/80 shadow-emerald-100/50",
} as const;

const iconStyleMap = {
  error: "text-red-500",
  info: "text-blue-500",
  success: "text-emerald-500",
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
        setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
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
              t.exiting ? "opacity-0 translate-x-4 scale-95" : "animate-bounce-in"
            } ${styleMap[t.type]}`}
          >
            <Icon className={`h-4 w-4 shrink-0 ${iconStyleMap[t.type]}`} strokeWidth={2} />
            {t.message}
          </div>
        );
      })}
    </div>
  );
}
