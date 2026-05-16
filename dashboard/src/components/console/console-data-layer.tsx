"use client";

/**
 * ConsoleDataLayer — conditionally renders console-specific data hooks
 * only when the user is on a console route.
 *
 * Extracted from AppLayout to prevent data fetching, polling, and
 * WebSocket connections from firing on non-console routes like
 * /settings, /billing, etc.
 *
 * Renders nothing visually — this is a side-effect-only component.
 */

import { useConsoleData } from "@/hooks/use-console-data";
import { useConsoleInsights } from "@/hooks/use-console-insights";
import { useConsoleIntegrations } from "@/hooks/use-console-integrations";
import { useConsoleAI } from "@/hooks/use-console-ai";
import { useProactiveDetection } from "@/hooks/use-proactive-detection";
import { useConsoleWebSocket } from "@/hooks/use-console-websocket";
import { useConsoleUrlSync } from "@/hooks/use-console-url-sync";

export function ConsoleDataLayer() {
  // ── Data fetching hooks ────────────────────────────────────────
  useConsoleData();
  useConsoleInsights();
  useConsoleIntegrations();

  // ── AI & proactive detection ───────────────────────────────────
  useConsoleAI();
  useProactiveDetection();

  // ── Real-time connection ───────────────────────────────────────
  useConsoleWebSocket();

  // ── URL ↔ store sync ───────────────────────────────────────────
  useConsoleUrlSync();

  return null;
}
