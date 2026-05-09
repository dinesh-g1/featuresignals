"use client";

import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiEndpointProps {
  /** HTTP method for the endpoint. */
  method: HttpMethod;
  /** URL path (e.g. "/v1/flags/{flagId}"). */
  path: string;
  /** Whether authentication is required. Defaults to true. */
  auth?: boolean;
  /** Description and usage notes rendered below the endpoint header. */
  children?: React.ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Method Badge Configuration                                         */
/* ------------------------------------------------------------------ */

interface MethodStyle {
  fgVar: string;
  bgVar: string;
}

const methodStyleMap: Record<HttpMethod, MethodStyle> = {
  GET: {
    fgVar: "--signal-fg-success",
    bgVar: "--signal-bg-success-muted",
  },
  POST: {
    fgVar: "--signal-fg-accent",
    bgVar: "--signal-bg-accent-muted",
  },
  PUT: {
    fgVar: "--signal-fg-warning",
    bgVar: "--signal-bg-warning-muted",
  },
  PATCH: {
    fgVar: "--signal-fg-info",
    bgVar: "--signal-bg-info-muted",
  },
  DELETE: {
    fgVar: "--signal-fg-danger",
    bgVar: "--signal-bg-danger-muted",
  },
};

/* ------------------------------------------------------------------ */
/*  ApiEndpoint Component                                              */
/* ------------------------------------------------------------------ */

/**
 * Shared MDX component for documenting API endpoints.
 *
 * Renders a color-coded method badge, monospace path, optional
 * "Auth Required" badge, and the provided description children.
 * All colors drawn exclusively from Signal UI CSS custom properties.
 */
function ApiEndpoint({
  method,
  path,
  auth = true,
  children,
}: ApiEndpointProps) {
  const { fgVar, bgVar } = methodStyleMap[method];

  return (
    <div
      className={cn(
        "relative my-6 rounded-[var(--signal-radius-md)]",
        "border border-[var(--signal-border-default)]",
        "bg-[var(--signal-bg-primary)]",
        "shadow-[var(--signal-shadow-sm)]",
        "overflow-hidden",
      )}
    >
      {/* Header row: method badge + path + optional auth badge */}
      <div
        className={cn(
          "flex flex-wrap items-center gap-3 px-4 py-3",
          "border-b border-[var(--signal-border-subtle)]",
          "bg-[var(--signal-bg-secondary)]",
        )}
      >
        {/* HTTP method badge */}
        <span
          className={cn(
            "inline-flex items-center px-2.5 py-0.5 rounded-[var(--signal-radius-sm)]",
            "text-xs font-semibold font-[var(--signal-font-mono)]",
            "tracking-[var(--signal-tracking-wide)]",
          )}
          style={{
            color: `var(${fgVar})`,
            backgroundColor: `var(${bgVar})`,
          }}
        >
          {method}
        </span>

        {/* Endpoint path */}
        <code
          className={cn(
            "text-sm font-[var(--signal-font-mono)]",
            "text-[var(--signal-fg-primary)]",
            "break-all",
          )}
        >
          {path}
        </code>

        {/* Auth required badge */}
        {auth && (
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5",
              "rounded-[var(--signal-radius-sm)]",
              "text-xs font-medium",
              "border border-[var(--signal-border-subtle)]",
            )}
            style={{
              color: "var(--signal-fg-secondary)",
              backgroundColor: "var(--signal-bg-tertiary)",
            }}
          >
            <Lock size={11} aria-hidden="true" />
            Auth Required
          </span>
        )}
      </div>

      {/* Description / content area */}
      {children && (
        <div
          className={cn(
            "px-4 py-3",
            "text-sm leading-relaxed",
            "text-[var(--signal-fg-secondary)]",
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Exports                                                            */
/* ------------------------------------------------------------------ */

export { ApiEndpoint };
export default ApiEndpoint;
