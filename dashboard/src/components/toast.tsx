"use client";

import { useEffect, useState, useCallback } from "react";

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
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`rounded-lg px-4 py-3 text-sm font-medium shadow-lg ring-1 transition-all duration-200 ${
            t.exiting ? "opacity-0 translate-x-4" : "animate-slide-up"
          } ${
            t.type === "error"
              ? "bg-red-50 text-red-700 ring-red-200"
              : t.type === "info"
                ? "bg-blue-50 text-blue-700 ring-blue-200"
                : "bg-emerald-50 text-emerald-700 ring-emerald-200"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
