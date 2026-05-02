"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAppStore } from "@/stores/app-store";

const PROJECT_SCOPED_ROUTES = new Set([
  "dashboard",
  "flags",
  "segments",
  "environments",
  "api-keys",
  "webhooks",
  "team",
  "approvals",
  "audit",
  "activity",
  "janitor",
  "env-comparison",
  "target-inspector",
  "target-comparison",
  "analytics",
  "metrics",
  "health",
  "usage-insights",
]);

export default function OldRouteRedirect() {
  const router = useRouter();
  const params = useParams();
  const projectId = useAppStore((s) => s.currentProjectId);

  useEffect(() => {
    const routeSegments = params.oldRoute as string[];
    if (!routeSegments || routeSegments.length === 0) return;

    const firstSegment = routeSegments[0];

    if (PROJECT_SCOPED_ROUTES.has(firstSegment)) {
      if (projectId) {
        const rest = routeSegments.slice(1).join("/");
        const newPath = `/projects/${projectId}/${firstSegment}${rest ? "/" + rest : ""}`;
        router.replace(newPath);
      } else {
        router.replace("/projects");
      }
    }
  }, [router, params, projectId]);

  return null;
}
