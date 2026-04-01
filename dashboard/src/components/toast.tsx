"use client";

import { useEffect, useState, useCallback } from "react";

interface Toast {
  id: number;
  message: string;
  type: "error" | "success";
}

let addToast: (message: string, type: "error" | "success") => void = () => {};

export function toast(message: string, type: "error" | "success" = "error") {
  addToast(message, type);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [counter, setCounter] = useState(0);

  const add = useCallback(
    (message: string, type: "error" | "success") => {
      const id = counter;
      setCounter((c) => c + 1);
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
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
          className={`rounded-lg px-4 py-3 text-sm font-medium shadow-lg ring-1 animate-in slide-in-from-right ${
            t.type === "error"
              ? "bg-red-50 text-red-700 ring-red-200"
              : "bg-emerald-50 text-emerald-700 ring-emerald-200"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
