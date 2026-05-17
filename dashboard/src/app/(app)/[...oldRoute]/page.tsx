"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAppStore } from "@/stores/app-store";

/**
 * Old Route Redirect — Maps legacy bare routes to their Console equivalents.
 *
 * Before the unified Console Shell, routes like /flags, /dashboard, /segments
 * were reached via bare paths that internally rewrote to /projects/:id/....
 *
 * Now the Console IS the product.  Every feature lives in one of the Console
 * zones (LifecycleZone, ConnectZone, LearnZone, ContextPanel).  This catch-all
 * redirects legacy bookmarks and deep-links to the correct Console destination.
 *
 * If no project is selected in the store, the user is sent to /projects (the
 * project picker) so they can select a project before entering the Console.
 */

const ROUTE_REDIRECT_MAP: Record<string, string> = {
  // ── LifecycleZone (the main center zone) ────────────────────────
  dashboard: "/console",
  flags: "/console",
  discover: "/console",

  // ── ContextPanel (right slide-in) ───────────────────────────────
  segments: "/console?panel=segments",
  janitor: "/console?panel=janitor",
  preflight: "/console?panel=preflight",
  incidents: "/console?panel=incidents",
  approvals: "/console?panel=approvals",

  // ── LEARN Zone (right collapsible panel) ────────────────────────
  analytics: "/console",
  metrics: "/console",
  health: "/console",
  "usage-insights": "/console",
  "eval-events": "/console",
  impact: "/console",

  // ── CONNECT Zone (left collapsible panel) ───────────────────────
  "api-keys": "/console",

  // ── Power tools (now in ContextPanel or LEARN zone) ─────────────
  "env-comparison": "/console",
  "target-inspector": "/console",
  "target-comparison": "/console",

  // ── Moved to top-level settings ─────────────────────────────────
  webhooks: "/settings/webhooks",
  team: "/settings/team",

  // ── Moved to top-level activity ─────────────────────────────────
  audit: "/activity",
  activity: "/activity",

  // ── Handled by env dropdown in TopBar ───────────────────────────
  environments: "/console",
};

export default function OldRouteRedirect() {
  const router = useRouter();
  const params = useParams();
  const projectId = useAppStore((s) => s.current_project_id);

  useEffect(() => {
    const routeSegments = params.oldRoute as string[];
    if (!routeSegments || routeSegments.length === 0) return;

    const firstSegment = routeSegments[0];

    // ABM has its own route under /console/abm
    if (firstSegment === "abm") {
      router.replace(projectId ? "/console/abm" : "/projects");
      return;
    }

    const redirectTarget = ROUTE_REDIRECT_MAP[firstSegment];
    if (redirectTarget) {
      if (projectId) {
        router.replace(redirectTarget);
      } else {
        router.replace("/projects");
      }
    }
  }, [router, params, projectId]);

  return null;
}
