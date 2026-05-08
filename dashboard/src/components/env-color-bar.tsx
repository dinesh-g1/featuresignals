"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/stores/app-store";
import { EventBus } from "@/lib/event-bus";
import { api } from "@/lib/api";
import { EVENTS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  ShieldIcon,
  GlobeIcon,
  BeakerIcon,
  GearIcon,
} from "@/components/icons/nav-icons";
import type { Environment } from "@/lib/types";

// ─── Types ──────────────────────────────────────────────────────────

type EnvType = "production" | "staging" | "development" | "other";

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Classify environment from its name, slug, and color.
 * Uses a multi-signal approach: slug first (most reliable), then name,
 * then color hue as a fallback.
 */
function classifyEnv(env: Environment): EnvType {
  const name = env.name.toLowerCase();
  const slug = env.slug.toLowerCase();

  // Slug-based (most reliable — these are programmatic identifiers)
  if (slug === "production" || slug.endsWith("-prod")) return "production";
  if (slug === "staging" || slug.endsWith("-stag")) return "staging";
  if (slug === "development" || slug.endsWith("-dev")) return "development";

  // Name-based heuristics
  if (name.includes("prod") || name.includes("live")) return "production";
  if (
    name.includes("stag") ||
    name.includes("preprod") ||
    name.includes("pre-prod")
  )
    return "staging";
  if (name.includes("dev") || name.includes("local")) return "development";

  // Color-based fallback (parse hex color to guess)
  if (env.color) {
    const hex = env.color.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    // Red-dominant → production
    if (r > 180 && g < 100 && b < 100) return "production";
    // Amber/yellow-dominant → staging
    if (r > 180 && g > 120 && b < 80) return "staging";
    // Green/blue-dominant → development
    if ((g > 150 && r < 120) || (b > 150 && r < 120)) return "development";
  }

  return "other";
}

// ─── Config per env type ────────────────────────────────────────────

const ENV_CONFIG: Record<
  EnvType,
  {
    Icon: typeof GlobeIcon;
    label: string;
    barBg: string;
    textColor: string;
  }
> = {
  production: {
    Icon: ShieldIcon,
    label: "⚠️ Production — changes affect real users",
    barBg: "from-red-500 to-orange-500",
    textColor: "text-red-700 dark:text-red-400",
  },
  staging: {
    Icon: BeakerIcon,
    label: "Staging",
    barBg: "from-amber-400 to-yellow-500",
    textColor: "text-amber-800 dark:text-amber-400",
  },
  development: {
    Icon: GearIcon,
    label: "Development",
    barBg: "from-emerald-400 to-teal-500",
    textColor: "text-emerald-700 dark:text-emerald-400",
  },
  other: {
    Icon: GlobeIcon,
    label: "",
    barBg: "from-violet-400 to-purple-500",
    textColor: "text-violet-700 dark:text-violet-400",
  },
};

// ─── Component ──────────────────────────────────────────────────────

export function EnvColorBar() {
  const token = useAppStore((s) => s.token);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const currentEnvId = useAppStore((s) => s.currentEnvId);
  const [env, setEnv] = useState<Environment | null>(null);
  const [visible, setVisible] = useState(false);
  const [animate, setAnimate] = useState(false);

  // Fetch the current environment details
  useEffect(() => {
    if (!token || !currentProjectId) {
      setEnv(null);
      return;
    }
    api
      .listEnvironments(token, currentProjectId)
      .then((list) => {
        const found = list.find((e) => e.id === currentEnvId) ?? null;
        setEnv(found);
      })
      .catch(() => {
        setEnv(null);
      });

    const unsub = EventBus.subscribe(EVENTS.ENVIRONMENTS_CHANGED, () => {
      api
        .listEnvironments(token, currentProjectId)
        .then((list) => {
          const found = list.find((e) => e.id === currentEnvId) ?? null;
          setEnv(found);
        })
        .catch(() => {});
    });
    return () => unsub();
  }, [token, currentProjectId, currentEnvId]);

  // Entrance animation
  useEffect(() => {
    if (env) {
      setVisible(true);
      const timer = requestAnimationFrame(() => {
        setAnimate(true);
      });
      return () => cancelAnimationFrame(timer);
    } else {
      setAnimate(false);
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
    // We only want to re-run when env identity changes, not on every reference change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [env?.id]);

  if (!env || !visible) return null;

  const envType = classifyEnv(env);
  const config = ENV_CONFIG[envType];
  const { Icon } = config;

  const displayLabel = envType === "other" ? env.name : config.label;

  return (
    <div
      className={cn(
        "relative -mx-4 sm:-mx-6 lg:-mx-8 -mt-6 mb-4 overflow-hidden",
        "transition-all duration-300 ease-out",
        animate ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2",
      )}
      role="status"
      aria-label={`Current environment: ${env.name}`}
    >
      {/* The 4px color strip */}
      <div
        className="h-1 w-full"
        style={{ backgroundColor: env.color || "#6b7280" }}
      />

      {/* The label bar */}
      <div
        className={cn(
          "flex items-center gap-2 px-4 sm:px-6 lg:px-8 py-2 text-sm font-medium",
          "bg-[var(--signal-bg-primary)] border-b border-[var(--signal-border-subtle)]",
          "text-[var(--signal-fg-primary)]",
        )}
      >
        {/* Colored dot using env.color */}
        <span
          className="inline-block h-2.5 w-2.5 rounded-full shrink-0 ring-1 ring-black/10"
          style={{ backgroundColor: env.color || "#6b7280" }}
          aria-hidden="true"
        />
        <Icon
          className="h-4 w-4 shrink-0 text-[var(--signal-fg-secondary)]"
          aria-hidden="true"
        />
        <span className="truncate">{displayLabel}</span>
      </div>
    </div>
  );
}
