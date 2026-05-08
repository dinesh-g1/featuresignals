"use client";

import { useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface PinButtonProps {
  projectId: string;
  resourceType: string;
  resourceId: string;
  isPinned?: boolean;
  onToggle?: (pinned: boolean) => void;
  className?: string;
}

export function PinButton({
  projectId,
  resourceType,
  resourceId,
  isPinned: initialPinned = false,
  onToggle,
  className,
}: PinButtonProps) {
  const token = useAppStore((s) => s.token);
  const [pinned, setPinned] = useState(initialPinned);
  const [loading, setLoading] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token || loading) return;

    setLoading(true);
    try {
      if (pinned) {
        await api.unpinItem(token, resourceId);
      } else {
        await api.pinItem(token, projectId, resourceType, resourceId);
      }
      const next = !pinned;
      setPinned(next);
      onToggle?.(next);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={cn(
        "rounded p-0.5 transition-colors hover:bg-[var(--signal-bg-secondary)]",
        pinned ? "text-amber-500" : "text-[var(--signal-fg-tertiary)] opacity-0 group-hover:opacity-100",
        className,
      )}
      title={pinned ? "Unpin" : "Pin"}
      aria-label={pinned ? "Unpin" : "Pin to sidebar"}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          d={
            pinned
              ? "M9.828.722a.5.5 0 01.354.146l4.95 4.95a.5.5 0 010 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.039l-3.134 3.134a5.927 5.927 0 01.16 1.013c.046.702-.032 1.345-.462 1.842a.5.5 0 01-.707 0l-4.95-4.95a.5.5 0 010-.707zm-3.03 1.735l3.705 3.705-2.89 2.89-3.705-3.705z"
              : "M9.828.722a.5.5 0 01.354.146l4.95 4.95a.5.5 0 010 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.039l-3.134 3.134a5.927 5.927 0 01.16 1.013c.046.702-.032 1.345-.462 1.842a.5.5 0 01-.707 0l-4.95-4.95a.5.5 0 010-.707zm3.03 1.735L9.153 5.162l2.89 2.89 1.214-1.215z"
          }
        />
      </svg>
    </button>
  );
}
