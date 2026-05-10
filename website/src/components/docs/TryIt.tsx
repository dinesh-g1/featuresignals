"use client";

import { useState, useCallback, useRef, type FormEvent } from "react";
import { Send, Loader2, Key, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface TryItProps {
  /** HTTP method for the request. */
  method: HttpMethod;
  /** API endpoint path (e.g. "/v1/flags"). */
  endpoint: string;
  /** Base URL for the API. Defaults to "https://api.featuresignals.com". */
  baseUrl?: string;
  /** Whether the endpoint requires an API key. Defaults to true. */
  authRequired?: boolean;
  /** Pre-filled JSON body for methods that support a request body. */
  exampleBody?: string;
}

/* ------------------------------------------------------------------ */
/*  Async State                                                         */
/* ------------------------------------------------------------------ */

type AsyncState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "success";
      statusCode: number;
      statusText: string;
      headers: Record<string, string>;
      body: string;
    }
  | { status: "error"; message: string };

/* ------------------------------------------------------------------ */
/*  Method Style Configuration                                         */
/* ------------------------------------------------------------------ */

interface MethodStyle {
  fgVar: string;
  bgVar: string;
  accentVar: string;
}

const methodStyleMap: Record<HttpMethod, MethodStyle> = {
  GET: {
    fgVar: "--signal-fg-success",
    bgVar: "--signal-bg-success-muted",
    accentVar: "--signal-bg-success-emphasis",
  },
  POST: {
    fgVar: "--signal-fg-accent",
    bgVar: "--signal-bg-accent-muted",
    accentVar: "--signal-bg-accent-emphasis",
  },
  PUT: {
    fgVar: "--signal-fg-warning",
    bgVar: "--signal-bg-warning-muted",
    accentVar: "--signal-bg-warning-emphasis",
  },
  PATCH: {
    fgVar: "--signal-fg-info",
    bgVar: "--signal-bg-info-muted",
    accentVar: "--signal-bg-info-emphasis",
  },
  DELETE: {
    fgVar: "--signal-fg-danger",
    bgVar: "--signal-bg-danger-muted",
    accentVar: "--signal-bg-danger-emphasis",
  },
};

const methodsWithBody: ReadonlySet<HttpMethod> = new Set([
  "POST",
  "PUT",
  "PATCH",
]);

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Mask an API key so only the last 4 characters are visible in the UI. */
function maskApiKey(key: string): string {
  if (key.length <= 4) return key;
  const visible = key.slice(-4);
  const masked = "\u2022".repeat(Math.min(key.length - 4, 20));
  return `${masked}${visible}`;
}

/** Return the default Content-Type for a method. */
function getContentType(method: HttpMethod): string {
  return method === "GET" || method === "DELETE"
    ? "application/json"
    : "application/json";
}

/* ------------------------------------------------------------------ */
/*  TryIt Component                                                     */
/* ------------------------------------------------------------------ */

/**
 * Embedded API console for interactively trying out endpoints.
 *
 * Users supply an API key and optional JSON body, then send a real
 * request to the FeatureSignals API. The response status, headers,
 * and body are displayed inline. All colors use Signal UI CSS
 * custom properties exclusively.
 */
function TryIt({
  method,
  endpoint,
  baseUrl = "https://api.featuresignals.com",
  authRequired = true,
  exampleBody = "",
}: TryItProps) {
  const [apiKey, setApiKey] = useState("");
  const [bodyInput, setBodyInput] = useState(exampleBody);
  const [state, setState] = useState<AsyncState>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  const supportsBody = methodsWithBody.has(method);
  const fullUrl = `${baseUrl.replace(/\/+$/, "")}/${endpoint.replace(/^\/+/, "")}`;
  const style = methodStyleMap[method];

  /* ------- Submit handler ------- */

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();

      // Abort any in-flight request
      abortRef.current?.abort();

      const controller = new AbortController();
      abortRef.current = controller;

      setState({ status: "loading" });

      const headers: Record<string, string> = {
        Accept: "application/json",
        "Content-Type": getContentType(method),
      };

      if (authRequired && apiKey.trim()) {
        headers["Authorization"] = `Bearer ${apiKey.trim()}`;
      }

      const init: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      if (supportsBody && bodyInput.trim()) {
        init.body = bodyInput.trim();
      }

      fetch(fullUrl, init)
        .then(async (response) => {
          const responseHeaders: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            // Redact the authorization header from the displayed response
            if (key.toLowerCase() === "authorization") {
              responseHeaders[key] = "Bearer [REDACTED]";
            } else {
              responseHeaders[key] = value;
            }
          });

          let body: string;
          const contentType = response.headers.get("content-type") ?? "";
          if (contentType.includes("application/json")) {
            try {
              const json = await response.json();
              body = JSON.stringify(json, null, 2);
            } catch {
              body = await response.text();
            }
          } else {
            body = await response.text();
          }

          if (!controller.signal.aborted) {
            setState({
              status: "success",
              statusCode: response.status,
              statusText: response.statusText,
              headers: responseHeaders,
              body,
            });
          }
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;

          const message =
            err instanceof TypeError
              ? "Network error — check your connection and try again."
              : err instanceof Error
                ? err.message
                : "An unexpected error occurred.";

          setState({ status: "error", message });
        });
    },
    [method, fullUrl, authRequired, apiKey, bodyInput, supportsBody],
  );

  /* ------- Render ------- */

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
      {/* Header */}
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 px-4 py-3",
          "border-b border-[var(--signal-border-subtle)]",
          "bg-[var(--signal-bg-secondary)]",
        )}
      >
        <span className="text-sm font-semibold text-[var(--signal-fg-primary)]">
          Try It
        </span>
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-[var(--signal-radius-sm)]",
            "text-xs font-semibold font-[var(--signal-font-mono)]",
          )}
          style={{
            color: `var(${style.fgVar})`,
            backgroundColor: `var(${style.bgVar})`,
          }}
        >
          {method}
        </span>
        <code
          className={cn(
            "text-xs font-[var(--signal-font-mono)]",
            "text-[var(--signal-fg-secondary)]",
            "truncate max-w-full",
          )}
        >
          {fullUrl}
        </code>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="px-4 py-3 space-y-3">
        {/* API Key field */}
        {authRequired && (
          <div className="space-y-1.5">
            <label
              htmlFor="tryit-apikey"
              className={cn(
                "flex items-center gap-1.5",
                "text-xs font-medium",
                "text-[var(--signal-fg-secondary)]",
              )}
            >
              <Key size={12} aria-hidden="true" />
              API Key
            </label>
            <div className="relative">
              <input
                id="tryit-apikey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="fs_sk_..."
                autoComplete="off"
                spellCheck={false}
                className={cn(
                  "w-full px-3 py-2",
                  "text-sm font-[var(--signal-font-mono)]",
                  "rounded-[var(--signal-radius-sm)]",
                  "border border-[var(--signal-border-default)]",
                  "bg-[var(--signal-bg-primary)]",
                  "text-[var(--signal-fg-primary)]",
                  "placeholder:text-[var(--signal-fg-tertiary)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-emphasis)] focus:ring-offset-1",
                  "transition-shadow",
                )}
              />
              {apiKey.length > 4 && (
                <span
                  className={cn(
                    "absolute right-3 top-1/2 -translate-y-1/2",
                    "text-xs font-[var(--signal-font-mono)]",
                    "text-[var(--signal-fg-tertiary)]",
                    "pointer-events-none",
                  )}
                  aria-hidden="true"
                >
                  {maskApiKey(apiKey)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* JSON Body field */}
        {supportsBody && (
          <div className="space-y-1.5">
            <label
              htmlFor="tryit-body"
              className={cn(
                "text-xs font-medium",
                "text-[var(--signal-fg-secondary)]",
              )}
            >
              Request Body (JSON)
            </label>
            <textarea
              id="tryit-body"
              value={bodyInput}
              onChange={(e) => setBodyInput(e.target.value)}
              rows={6}
              spellCheck={false}
              className={cn(
                "w-full px-3 py-2",
                "text-sm font-[var(--signal-font-mono)]",
                "rounded-[var(--signal-radius-sm)]",
                "border border-[var(--signal-border-default)]",
                "bg-[var(--signal-bg-primary)]",
                "text-[var(--signal-fg-primary)]",
                "placeholder:text-[var(--signal-fg-tertiary)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-emphasis)] focus:ring-offset-1",
                "resize-vertical",
                "transition-shadow",
              )}
              placeholder='{"key": "my-feature", "name": "My Feature"}'
            />
          </div>
        )}

        {/* Send button */}
        <button
          type="submit"
          disabled={state.status === "loading"}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2",
            "text-sm font-semibold",
            "rounded-[var(--signal-radius-sm)]",
            "transition-all",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
            "focus-visible:ring-[var(--signal-border-accent-emphasis)]",
            state.status === "loading"
              ? "opacity-60 cursor-not-allowed"
              : "cursor-pointer hover:-translate-y-px active:scale-[0.97]",
          )}
          style={{
            color: "var(--signal-fg-on-emphasis)",
            backgroundColor: `var(${style.accentVar})`,
          }}
        >
          {state.status === "loading" ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              Sending...
            </>
          ) : (
            <>
              <Send size={15} aria-hidden="true" />
              Send Request
            </>
          )}
        </button>
      </form>

      {/* Response area */}
      {state.status !== "idle" && state.status !== "loading" && (
        <div
          className={cn(
            "border-t border-[var(--signal-border-subtle)]",
            "bg-[var(--signal-bg-secondary)]",
          )}
        >
          {/* Success response */}
          {state.status === "success" && (
            <div className="divide-y divide-[var(--signal-border-subtle)]">
              {/* Status bar */}
              <div className="flex items-center gap-2 px-4 py-2">
                <CheckCircle2
                  size={16}
                  aria-hidden="true"
                  style={{ color: "var(--signal-fg-success)" }}
                />
                <span className="text-sm font-medium text-[var(--signal-fg-primary)]">
                  Response
                </span>
                <span
                  className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-[var(--signal-radius-sm)]",
                    "text-xs font-semibold font-[var(--signal-font-mono)]",
                  )}
                  style={{
                    color: `var(${
                      state.statusCode < 400
                        ? "--signal-fg-success"
                        : "--signal-fg-danger"
                    })`,
                    backgroundColor: `var(${
                      state.statusCode < 400
                        ? "--signal-bg-success-muted"
                        : "--signal-bg-danger-muted"
                    })`,
                  }}
                >
                  {state.statusCode} {state.statusText}
                </span>
              </div>

              {/* Response headers */}
              <details className="px-4 py-2 group">
                <summary
                  className={cn(
                    "text-xs font-medium cursor-pointer select-none",
                    "text-[var(--signal-fg-secondary)]",
                    "hover:text-[var(--signal-fg-primary)]",
                    "transition-colors",
                  )}
                >
                  Response Headers
                </summary>
                <pre
                  className={cn(
                    "mt-2 p-3 rounded-[var(--signal-radius-sm)]",
                    "text-xs font-[var(--signal-font-mono)]",
                    "bg-[var(--signal-bg-inverse)]",
                    "text-[var(--signal-fg-on-emphasis)]",
                    "overflow-x-auto",
                    "code-block-selection",
                  )}
                >
                  {Object.entries(state.headers)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join("\n")}
                </pre>
              </details>

              {/* Response body */}
              <div className="px-4 py-3">
                <pre
                  className={cn(
                    "p-3 rounded-[var(--signal-radius-sm)]",
                    "text-xs font-[var(--signal-font-mono)]",
                    "bg-[var(--signal-bg-inverse)]",
                    "text-[var(--signal-fg-on-emphasis)]",
                    "overflow-x-auto",
                    "max-h-96 overflow-y-auto",
                    "whitespace-pre-wrap",
                    "code-block-selection",
                  )}
                >
                  {state.body || "(empty body)"}
                </pre>
              </div>
            </div>
          )}

          {/* Error response */}
          {state.status === "error" && (
            <div className="flex items-start gap-3 px-4 py-3">
              <AlertTriangle
                size={16}
                className="mt-0.5 shrink-0"
                aria-hidden="true"
                style={{ color: "var(--signal-fg-danger)" }}
              />
              <div>
                <p className="text-sm font-medium text-[var(--signal-fg-primary)]">
                  Request Failed
                </p>
                <p className="mt-0.5 text-sm text-[var(--signal-fg-secondary)]">
                  {state.message}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Exports                                                            */
/* ------------------------------------------------------------------ */

export { TryIt };
export default TryIt;
