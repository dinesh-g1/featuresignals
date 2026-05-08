"use client";

import { useState, useCallback } from "react";
import {
  ChevronDown,
  ChevronRight,
  PlayIcon,
  CopyIcon,
  Check,
  LockIcon,
  KeyIcon,
} from "lucide-react";
import type { ApiEndpoint, ApiCategory } from "@/data/api-endpoints";

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const API_BASE_URL: string =
  process.env.NEXT_PUBLIC_API_URL ?? "https://api.featuresignals.com";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface TryItResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
}

interface TryItState {
  loading: boolean;
  response: TryItResponse | null;
  error: string | null;
}

interface CopyState {
  copied: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function buildCurlCommand(method: string, path: string, auth: string): string {
  const url = `${API_BASE_URL}${path}`;
  const parts: string[] = [`curl -X ${method} "${url}"`];

  if (auth && auth !== "None") {
    const isApiKey = auth.toLowerCase().includes("api key");
    if (isApiKey) {
      parts.push(`-H "X-API-Key: YOUR_API_KEY"`);
    } else {
      parts.push(`-H "Authorization: Bearer YOUR_TOKEN"`);
    }
  }

  parts.push(`-H "Content-Type: application/json"`);
  return parts.join(" \\\n  ");
}

function formatJson(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return raw;
  }
}

function statusColorClass(status: number): { bg: string; fg: string } {
  if (status >= 200 && status < 300) {
    return {
      bg: "var(--signal-bg-success-muted)",
      fg: "var(--signal-fg-success)",
    };
  }
  if (status >= 400) {
    return {
      bg: "var(--signal-bg-danger-muted)",
      fg: "var(--signal-fg-danger)",
    };
  }
  return {
    bg: "var(--signal-bg-warning-muted)",
    fg: "var(--signal-fg-warning)",
  };
}

/* ------------------------------------------------------------------ */
/*  Method → Color mapping                                             */
/* ------------------------------------------------------------------ */

const METHOD_STYLES: Record<string, { bg: string; fg: string }> = {
  GET: {
    bg: "var(--signal-bg-success-muted)",
    fg: "var(--signal-fg-success)",
  },
  POST: {
    bg: "var(--signal-bg-accent-muted)",
    fg: "var(--signal-fg-accent)",
  },
  PUT: {
    bg: "var(--signal-bg-warning-muted)",
    fg: "var(--signal-fg-warning)",
  },
  DELETE: {
    bg: "var(--signal-bg-danger-muted)",
    fg: "var(--signal-fg-danger)",
  },
  PATCH: {
    bg: "var(--signal-bg-info-muted)",
    fg: "var(--signal-fg-info)",
  },
};

function getMethodStyle(method: string): { bg: string; fg: string } {
  return (
    METHOD_STYLES[method] ?? {
      bg: "var(--signal-bg-secondary)",
      fg: "var(--signal-fg-primary)",
    }
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function MethodBadge({ method }: { method: string }) {
  const style = getMethodStyle(method);
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold font-mono tracking-wide uppercase shrink-0"
      style={{ backgroundColor: style.bg, color: style.fg }}
    >
      {method}
    </span>
  );
}

function AuthBadge({ auth }: { auth: string }) {
  if (!auth || auth === "None") return null;

  const isApiKey = auth.toLowerCase().includes("api key");
  const Icon = isApiKey ? KeyIcon : LockIcon;

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0"
      style={{
        backgroundColor: "var(--signal-bg-secondary)",
        color: "var(--signal-fg-secondary)",
        border: "1px solid var(--signal-border-default)",
      }}
    >
      <Icon size={12} />
      {auth}
    </span>
  );
}

function HasBodyIndicator() {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0"
      style={{
        backgroundColor: "var(--signal-bg-warning-muted)",
        color: "var(--signal-fg-warning)",
        border: "1px solid var(--signal-border-warning-muted)",
      }}
    >
      Request Body
    </span>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 text-[0.85em] font-mono rounded bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-primary)] border border-[var(--signal-border-default)]">
      {children}
    </code>
  );
}

function ParamTable({
  params,
  label,
}: {
  params: { name: string; required: boolean; description: string }[];
  label: string;
}) {
  if (!params || params.length === 0) return null;

  return (
    <div className="mt-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--signal-fg-secondary)] mb-2">
        {label}
      </h4>
      <div className="overflow-x-auto border border-[var(--signal-border-default)] rounded-md">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)]">
              <th className="px-3 py-2 font-semibold text-[var(--signal-fg-primary)]">
                Name
              </th>
              <th className="px-3 py-2 font-semibold text-[var(--signal-fg-primary)]">
                Required
              </th>
              <th className="px-3 py-2 font-semibold text-[var(--signal-fg-primary)]">
                Description
              </th>
            </tr>
          </thead>
          <tbody>
            {params.map((p) => (
              <tr
                key={p.name}
                className="border-b border-[var(--signal-border-default)] last:border-b-0"
              >
                <td className="px-3 py-2">
                  <InlineCode>{p.name}</InlineCode>
                </td>
                <td className="px-3 py-2">
                  {p.required ? (
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold"
                      style={{
                        backgroundColor: "var(--signal-bg-danger-muted)",
                        color: "var(--signal-fg-danger)",
                      }}
                    >
                      Required
                    </span>
                  ) : (
                    <span className="text-[var(--signal-fg-secondary)]">
                      Optional
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-[var(--signal-fg-secondary)]">
                  {p.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EndpointPath({ path }: { path: string }) {
  // Replace path parameters like {foo} with emphasized inline-code segments
  const segments = path.split(/(\{[^}]+\})/g);

  return (
    <code className="text-sm font-mono text-[var(--signal-fg-primary)] break-all">
      {segments.map((seg, i) => {
        if (seg.startsWith("{") && seg.endsWith("}")) {
          return (
            <span
              key={i}
              className="px-0.5 rounded text-[var(--signal-fg-accent)]"
              style={{ backgroundColor: "var(--signal-bg-accent-muted)" }}
            >
              {seg}
            </span>
          );
        }
        return <span key={i}>{seg}</span>;
      })}
    </code>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline Try-It sub-component                                        */
/* ------------------------------------------------------------------ */

function InlineTryIt({
  method,
  path,
  auth,
  state,
  onSend,
  onReset,
}: {
  method: string;
  path: string;
  auth: string;
  state: TryItState;
  onSend: () => void;
  onReset: () => void;
}) {
  const [copyState, setCopyState] = useState<CopyState>({ copied: false });

  const curlCommand = buildCurlCommand(method, path, auth);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(curlCommand);
      setCopyState({ copied: true });
      setTimeout(() => setCopyState({ copied: false }), 2000);
    } catch {
      // Clipboard API unavailable — silently fail, the user can still select text
    }
  }, [curlCommand]);

  const responseStatusStyle = state.response
    ? statusColorClass(state.response.status)
    : null;

  return (
    <div
      className="mt-4 rounded-md overflow-hidden"
      style={{
        border: "1px solid var(--signal-border-default)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{
          backgroundColor: "var(--signal-bg-secondary)",
          borderBottom: "1px solid var(--signal-border-default)",
        }}
      >
        <span className="text-xs font-semibold text-[var(--signal-fg-primary)] flex items-center gap-1.5">
          <PlayIcon size={12} />
          Try it
        </span>
        <div className="flex items-center gap-1.5">
          {/* Copy curl button */}
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors hover:bg-[var(--signal-bg-primary)]"
            style={{
              color: "var(--signal-fg-secondary)",
            }}
            title="Copy curl command"
          >
            {copyState.copied ? (
              <Check size={12} />
            ) : (
              <CopyIcon size={12} />
            )}
            {copyState.copied ? "Copied" : "Copy curl"}
          </button>

          {/* Send button */}
          <button
            type="button"
            onClick={onSend}
            disabled={state.loading}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: "var(--signal-bg-accent-emphasis)",
              color: "var(--signal-fg-on-emphasis)",
            }}
          >
            {state.loading ? (
              <>
                <span
                  className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"
                  aria-hidden="true"
                />
                Sending…
              </>
            ) : (
              <>
                <PlayIcon size={12} />
                Send Request
              </>
            )}
          </button>
        </div>
      </div>

      {/* Curl command block */}
      <div className="relative">
        <pre
          className="px-4 py-3 text-xs font-mono text-[var(--signal-fg-primary)] overflow-x-auto m-0 whitespace-pre-wrap break-all"
          style={{
            backgroundColor:
              "var(--bgColor-canvas-inset, var(--signal-bg-secondary))",
          }}
        >
          <code>{curlCommand}</code>
        </pre>
      </div>

      {/* Response area */}
      {(state.loading || state.response || state.error) && (
        <div
          style={{
            borderTop: "1px solid var(--signal-border-default)",
          }}
        >
          {/* Loading state */}
          {state.loading && (
            <div
              className="px-4 py-6 flex items-center justify-center gap-2"
              style={{ color: "var(--signal-fg-secondary)" }}
            >
              <span
                className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
                aria-hidden="true"
              />
              <span className="text-xs">Waiting for response…</span>
            </div>
          )}

          {/* Error state (e.g. CORS, network failure) */}
          {state.error && !state.loading && (
            <div
              className="px-4 py-4"
              style={{
                backgroundColor: "var(--signal-bg-danger-muted)",
                borderBottom: "1px solid var(--borderColor-danger-muted)",
              }}
            >
              <div className="flex items-start gap-2">
                <span
                  className="text-xs font-mono font-semibold shrink-0 mt-0.5"
                  style={{ color: "var(--signal-fg-danger)" }}
                >
                  Error
                </span>
                <p
                  className="text-xs m-0 leading-relaxed"
                  style={{ color: "var(--signal-fg-danger)" }}
                >
                  {state.error}
                </p>
              </div>
            </div>
          )}

          {/* Success / HTTP response */}
          {state.response && !state.loading && (
            <div>
              {/* Status row */}
              <div
                className="flex items-center gap-2 px-4 py-2"
                style={{
                  backgroundColor: "var(--signal-bg-secondary)",
                  borderBottom: "1px solid var(--signal-border-default)",
                }}
              >
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold font-mono"
                  style={{
                    backgroundColor: responseStatusStyle?.bg,
                    color: responseStatusStyle?.fg,
                  }}
                >
                  {state.response.status} {state.response.statusText}
                </span>
                {/* Show content-type header if present */}
                {state.response.headers["content-type"] && (
                  <span className="text-[11px] text-[var(--signal-fg-secondary)] font-mono truncate">
                    {state.response.headers["content-type"]}
                  </span>
                )}
              </div>

              {/* Response body */}
              <div className="relative">
                <pre
                  className="px-4 py-3 text-xs font-mono m-0 overflow-x-auto max-h-64"
                  style={{
                    color: "var(--signal-fg-primary)",
                    backgroundColor:
                      "var(--bgColor-canvas-inset, var(--signal-bg-secondary))",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  <code>{formatJson(state.response.body)}</code>
                </pre>

                {/* Reset button to clear response */}
                <button
                  type="button"
                  onClick={onReset}
                  className="absolute top-1 right-2 px-1.5 py-0.5 rounded text-[10px] transition-colors hover:bg-[var(--signal-bg-primary)]"
                  style={{ color: "var(--signal-fg-secondary)" }}
                  title="Clear response"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Auth summary helper                                                */
/* ------------------------------------------------------------------ */

function deriveAuthTypes(endpoints: ApiEndpoint[]): string {
  const authSet = new Set(endpoints.map((e) => e.auth).filter(Boolean));
  if (authSet.size === 0) return "No auth";
  return Array.from(authSet).join(", ");
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function ApiReferenceSection({ category }: { category: ApiCategory }) {
  const [expandedIndices, setExpandedIndices] = useState<Set<number>>(
    new Set(),
  );

  // Per-endpoint try-it state: index → TryItState
  const [tryItStates, setTryItStates] = useState<Record<number, TryItState>>(
    {},
  );

  const toggle = useCallback((index: number) => {
    setExpandedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const sendRequest = useCallback(
    async (index: number, method: string, path: string, auth: string) => {
      // Set loading state
      setTryItStates((prev) => ({
        ...prev,
        [index]: { loading: true, response: null, error: null },
      }));

      const url = `${API_BASE_URL}${path}`;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (auth && auth !== "None") {
        const isApiKey = auth.toLowerCase().includes("api key");
        if (isApiKey) {
          headers["X-API-Key"] = "YOUR_API_KEY";
        } else {
          headers["Authorization"] = "Bearer YOUR_TOKEN";
        }
      }

      try {
        const res = await fetch(url, {
          method,
          headers,
          // Include credentials only for same-origin; cross-origin API calls
          // typically use token auth and should not send cookies.
          credentials: "omit",
        });

        const body = await res.text();

        // Extract headers into a plain object
        const responseHeaders: Record<string, string> = {};
        res.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        setTryItStates((prev) => ({
          ...prev,
          [index]: {
            loading: false,
            response: {
              status: res.status,
              statusText: res.statusText,
              headers: responseHeaders,
              body,
            },
            error: null,
          },
        }));
      } catch (err: unknown) {
        let message = "An unknown error occurred.";
        if (err instanceof TypeError) {
          // fetch() throws TypeError for network failures and CORS blocks
          if (err.message.includes("Failed to fetch")) {
            message =
              "Request blocked. This is likely due to CORS policy — the API server does not allow cross-origin requests from the browser. Use the curl command above in your terminal instead.";
          } else if (err.message.includes("NetworkError")) {
            message =
              "Network error. The API server may be unreachable or the request was blocked by the browser. Try the curl command above.";
          } else {
            message = `Network error: ${err.message}`;
          }
        } else if (err instanceof Error) {
          message = err.message;
        }

        setTryItStates((prev) => ({
          ...prev,
          [index]: {
            loading: false,
            response: null,
            error: message,
          },
        }));
      }
    },
    [],
  );

  const clearTryIt = useCallback((index: number) => {
    setTryItStates((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  }, []);

  const { endpoints } = category;
  const endpointCount = endpoints.length;
  const authTypes = deriveAuthTypes(endpoints);

  return (
    <div>
      {/* Category header */}
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-2"
      >
        {category.name} API
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-5 leading-relaxed">
        {category.description}
      </p>

      {/* Summary badge */}
      <div
        className="inline-flex items-center gap-3 px-4 py-2 rounded-lg text-sm mb-8 flex-wrap"
        style={{
          backgroundColor: "var(--signal-bg-secondary)",
          border: "1px solid var(--signal-border-default)",
        }}
      >
        <span className="font-semibold text-[var(--signal-fg-primary)]">
          {endpointCount} {endpointCount === 1 ? "endpoint" : "endpoints"}
        </span>
        <span
          className="inline-block w-px h-4 shrink-0"
          style={{ backgroundColor: "var(--signal-border-default)" }}
          aria-hidden="true"
        />
        <span className="text-[var(--signal-fg-secondary)] flex items-center gap-1.5">
          <LockIcon size={14} />
          {authTypes}
        </span>
      </div>

      {/* No endpoints edge case */}
      {endpoints.length === 0 && (
        <div
          className="rounded-lg p-8 text-center"
          style={{
            backgroundColor: "var(--signal-bg-secondary)",
            border: "1px solid var(--signal-border-default)",
          }}
        >
          <p className="text-[var(--signal-fg-secondary)]">
            No endpoints have been documented for this category yet.
          </p>
        </div>
      )}

      {/* Endpoint cards */}
      {endpoints.length > 0 && (
        <div className="space-y-2">
          {endpoints.map((ep, idx) => {
            const isExpanded = expandedIndices.has(idx);
            const primaryMethod = ep.methods[0] ?? "GET";
            const altMethods = ep.methods.slice(1);
            const tryItState = tryItStates[idx] ?? {
              loading: false,
              response: null,
              error: null,
            };

            return (
              <div
                key={`${primaryMethod}-${ep.path}`}
                className="rounded-lg overflow-hidden"
                style={{
                  border: `1px solid ${isExpanded ? "var(--signal-border-emphasis)" : "var(--signal-border-default)"}`,
                  backgroundColor: "var(--signal-bg-primary)",
                  transition: "border-color 0.15s ease",
                }}
              >
                {/* Summary row — always visible, clickable */}
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-[var(--signal-bg-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--signal-border-accent-emphasis)] focus-visible:outline-offset-[-2px] cursor-pointer"
                >
                  {/* Expand chevron */}
                  <span className="shrink-0 text-[var(--signal-fg-secondary)]">
                    {isExpanded ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                  </span>

                  {/* Methods */}
                  <MethodBadge method={primaryMethod} />

                  {/* Path */}
                  <EndpointPath path={ep.path} />

                  {/* Alternate methods (e.g. HEAD/OPTIONS) */}
                  {altMethods.length > 0 && (
                    <span className="text-xs text-[var(--signal-fg-secondary)] shrink-0">
                      +{altMethods.join(", ")}
                    </span>
                  )}

                  {/* Spacer */}
                  <span className="flex-1" aria-hidden="true" />

                  {/* Summary on the right (hidden on narrow screens) */}
                  <span className="hidden md:inline-block text-xs text-[var(--signal-fg-secondary)] truncate max-w-[200px]">
                    {ep.summary}
                  </span>

                  {/* Auth badge (compact) */}
                  <AuthBadge auth={ep.auth} />
                </button>

                {/* Expanded detail panel */}
                {isExpanded && (
                  <div
                    className="px-4 pb-4 pt-1 space-y-3"
                    style={{
                      borderTop: "1px solid var(--signal-border-default)",
                    }}
                  >
                    {/* Description */}
                    <div>
                      <p className="text-sm text-[var(--signal-fg-secondary)] leading-relaxed">
                        {ep.description || ep.summary}
                      </p>
                    </div>

                    {/* Full method list if multiple */}
                    {ep.methods.length > 1 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-[var(--signal-fg-secondary)] shrink-0">
                          Allowed methods:
                        </span>
                        {ep.methods.map((m) => (
                          <MethodBadge key={m} method={m} />
                        ))}
                      </div>
                    )}

                    {/* Auth */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-[var(--signal-fg-secondary)] shrink-0">
                        Auth:
                      </span>
                      {ep.auth && ep.auth !== "None" ? (
                        <AuthBadge auth={ep.auth} />
                      ) : (
                        <span className="text-xs text-[var(--signal-fg-secondary)]">
                          None
                        </span>
                      )}
                    </div>

                    {/* Path parameters */}
                    <ParamTable
                      params={ep.pathParams}
                      label="Path Parameters"
                    />

                    {/* Query parameters */}
                    <ParamTable
                      params={ep.queryParams}
                      label="Query Parameters"
                    />

                    {/* Metadata pills */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Has request body */}
                      {ep.hasBody && <HasBodyIndicator />}

                      {/* Success status */}
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0"
                        style={{
                          backgroundColor: "var(--signal-bg-success-muted)",
                          color: "var(--signal-fg-success)",
                          border: "1px solid var(--signal-border-success-muted)",
                        }}
                      >
                        {ep.successStatus}
                      </span>

                      {/* Tags */}
                      {ep.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0"
                          style={{
                            backgroundColor: "var(--signal-bg-secondary)",
                            color: "var(--signal-fg-secondary)",
                            border: "1px solid var(--signal-border-default)",
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Inline Try-It section */}
                    <InlineTryIt
                      method={primaryMethod}
                      path={ep.path}
                      auth={ep.auth}
                      state={tryItState}
                      onSend={() =>
                        sendRequest(idx, primaryMethod, ep.path, ep.auth)
                      }
                      onReset={() => clearTryIt(idx)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
