"use client";

import React, { useState, useCallback } from "react";
import { Copy, Play, Loader2, CircleCheck, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Language = "curl" | "node" | "python" | "go";

interface SnippetConfig {
  language: Language;
  label: string;
  code: string;
}

interface TryItSnippetProps {
  /** The default API base URL (defaults to 'https://api.featuresignals.com') */
  baseUrl?: string;
  /** The default flag key for the snippet */
  defaultFlagKey?: string;
  /** The default environment key */
  defaultEnvKey?: string;
  /** Whether to show the "Run" button (requires CORS-enabled sandbox) */
  showRun?: boolean;
  /** A sandbox URL that proxies evaluation requests */
  sandboxUrl?: string;
}

// ---------------------------------------------------------------------------
// Code Templates
// ---------------------------------------------------------------------------

function generateSnippets(
  flagKey: string,
  envKey: string,
  baseUrl: string,
): SnippetConfig[] {
  return [
    {
      language: "curl",
      label: "cURL",
      code: `curl -X POST ${baseUrl}/v1/evaluate \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "flag_key": "${flagKey}",
    "user": {
      "key": "user-123",
      "attributes": {
        "country": "US",
        "plan": "enterprise"
      }
    }
  }'`,
    },
    {
      language: "node",
      label: "Node.js",
      code: `import { FeatureSignalsClient } from '@featuresignals/node';

const client = new FeatureSignalsClient('YOUR_API_KEY', {
  envKey: '${envKey}',
  baseURL: '${baseUrl}',
});

await client.waitForReady();

const enabled = client.boolVariation(
  '${flagKey}',
  {
    key: 'user-123',
    attributes: { country: 'US', plan: 'enterprise' },
  },
  false,
);

console.log('Flag enabled:', enabled);`,
    },
    {
      language: "python",
      label: "Python",
      code: `from featuresignals import FeatureSignalsClient, ClientOptions, EvalContext

client = FeatureSignalsClient(
    "YOUR_API_KEY",
    ClientOptions(
        env_key="${envKey}",
        base_url="${baseUrl}",
    ),
)
client.wait_for_ready()

enabled = client.bool_variation(
    "${flagKey}",
    EvalContext(
        key="user-123",
        attributes={"country": "US", "plan": "enterprise"},
    ),
    False,
)

print("Flag enabled:", enabled)`,
    },
    {
      language: "go",
      label: "Go",
      code: `package main

import (
    "fmt"
    fs "github.com/featuresignals/sdk-go"
)

func main() {
    client := fs.NewClient("YOUR_API_KEY", "${envKey}",
        fs.WithBaseURL("${baseUrl}"),
    )
    defer client.Close()
    <-client.Ready()

    enabled := client.BoolVariation(
        "${flagKey}",
        fs.NewContext("user-123",
            fs.WithAttribute("country", "US"),
            fs.WithAttribute("plan", "enterprise"),
        ),
        false,
    )

    fmt.Println("Flag enabled:", enabled)
}`,
    },
  ];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TryItSnippet({
  baseUrl = "https://api.featuresignals.com",
  defaultFlagKey = "new-checkout",
  defaultEnvKey = "dev",
  showRun = true,
  sandboxUrl,
}: TryItSnippetProps): React.ReactElement {
  const [flagKey, setFlagKey] = useState(defaultFlagKey);
  const [activeLang, setActiveLang] = useState<Language>("curl");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{
    status: number;
    body: string;
  } | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const snippets = generateSnippets(flagKey, defaultEnvKey, baseUrl);

  const activeSnippet =
    snippets.find((s) => s.language === activeLang) ?? snippets[0];

  const handleRun = useCallback(async () => {
    if (!sandboxUrl) {
      setRunError(
        "Run is not available — no sandbox configured. Copy the snippet and run it locally.",
      );
      return;
    }

    setRunning(true);
    setResult(null);
    setRunError(null);

    try {
      const resp = await fetch(sandboxUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flag_key: flagKey,
          user: {
            key: "user-123",
            attributes: { country: "US", plan: "enterprise" },
          },
        }),
      });

      const body = await resp.text();
      setResult({ status: resp.status, body });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unknown network error";
      setRunError(`Network error: ${message}`);
    } finally {
      setRunning(false);
    }
  }, [flagKey, sandboxUrl]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(activeSnippet.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available — ignore silently
    }
  }, [activeSnippet.code]);

  const formattedResultBody = (() => {
    if (!result) return "";
    try {
      return JSON.stringify(JSON.parse(result.body), null, 2);
    } catch {
      return result.body;
    }
  })();

  const resultIsSuccess = result && result.status < 400;
  const resultIsError = result && result.status >= 400;

  return (
    <div
      className={cn(
        "my-6 overflow-hidden",
        "rounded-[var(--signal-radius-lg)]",
        "border border-[var(--signal-border-default)]",
        "bg-[var(--signal-bg-primary)]",
        "shadow-[var(--signal-shadow-sm)]",
      )}
      data-demo="try-it"
    >
      {/* ── Header ───────────────────────────────────────────── */}
      <div
        className={cn(
          "px-5 py-5 sm:px-6",
          "border-b border-[var(--signal-border-subtle)]",
          "bg-[var(--signal-bg-secondary)]",
        )}
      >
        <span
          className={cn(
            "inline-flex items-center",
            "text-[11px] font-semibold uppercase tracking-[0.06em]",
            "text-[var(--signal-fg-accent)]",
            "bg-[var(--signal-bg-accent-muted)]",
            "px-2.5 py-0.5",
            "rounded-[var(--signal-radius-sm)]",
          )}
        >
          Try It
        </span>
        <h3 className="mt-1.5 mb-1 text-lg font-semibold text-[var(--signal-fg-primary)]">
          Evaluate a Flag
        </h3>
        <p className="m-0 text-[13px] leading-relaxed text-[var(--signal-fg-secondary)]">
          Configure the flag key, select your language, and copy the snippet —
          or run it against the sandbox.
        </p>
      </div>

      {/* ── Flag Key Input ───────────────────────────────────── */}
      <div className="px-5 sm:px-6 pt-5 pb-0">
        <label
          className="block mb-1.5 text-[13px] font-semibold text-[var(--signal-fg-primary)]"
          htmlFor="ts-flagKey"
        >
          Flag Key
        </label>
        <input
          id="ts-flagKey"
          className={cn(
            "w-full px-2.5 py-2",
            "border border-[var(--signal-border-default)]",
            "rounded-[var(--signal-radius-sm)]",
            "text-sm font-[var(--signal-font-mono)]",
            "bg-[var(--signal-bg-primary)]",
            "text-[var(--signal-fg-primary)]",
            "transition-colors duration-[var(--signal-duration-fast)]",
            "focus:outline-none focus:border-[var(--signal-border-accent-emphasis)]",
            "focus:ring-2 focus:ring-[var(--signal-border-accent-muted)]",
          )}
          type="text"
          value={flagKey}
          onChange={(e) => setFlagKey(e.target.value)}
          placeholder="my-flag-key"
        />
      </div>

      {/* ── Language Tabs + Actions ──────────────────────────── */}
      <div
        className={cn(
          "flex items-center gap-0",
          "mt-4 mx-0 px-5 sm:px-6",
          "border-b border-[var(--signal-border-subtle)]",
          "bg-[var(--signal-bg-secondary)]",
        )}
      >
        {snippets.map((s) => (
          <button
            key={s.language}
            className={cn(
              "px-3.5 py-2.5",
              "border-none border-b-2 bg-transparent",
              "text-[13px] font-medium cursor-pointer",
              "transition-all duration-[var(--signal-duration-fast)]",
              activeLang === s.language
                ? [
                    "border-[var(--signal-border-accent-emphasis)]",
                    "text-[var(--signal-fg-accent)]",
                    "font-semibold",
                  ]
                : [
                    "border-transparent",
                    "text-[var(--signal-fg-secondary)]",
                    "hover:text-[var(--signal-fg-primary)]",
                  ],
            )}
            onClick={() => setActiveLang(s.language)}
          >
            {s.label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          className={cn(
            "inline-flex items-center gap-1.5",
            "px-3 py-1.5 ml-1",
            "border border-[var(--signal-border-default)]",
            "rounded-[var(--signal-radius-sm)]",
            "bg-[var(--signal-bg-primary)]",
            "text-[var(--signal-fg-primary)]",
            "text-xs font-medium cursor-pointer",
            "transition-all duration-[var(--signal-duration-fast)]",
            "hover:border-[var(--signal-border-accent-emphasis)]",
            "hover:text-[var(--signal-fg-accent)]",
          )}
          onClick={handleCopy}
          title="Copy to clipboard"
        >
          <Copy size={13} />
          {copied ? "Copied!" : "Copy"}
        </button>
        {showRun && (
          <button
            className={cn(
              "inline-flex items-center gap-1.5",
              "px-3 py-1.5 ml-1",
              "border rounded-[var(--signal-radius-sm)]",
              "text-xs font-semibold cursor-pointer",
              "transition-all duration-[var(--signal-duration-fast)]",
              "bg-[var(--signal-bg-accent-emphasis)]",
              "border-[var(--signal-bg-accent-emphasis)]",
              "text-[var(--signal-fg-on-emphasis)]",
              "hover:bg-[var(--signal-bg-accent-hover)]",
              "hover:border-[var(--signal-bg-accent-hover)]",
              running && "opacity-60 cursor-not-allowed",
            )}
            onClick={handleRun}
            disabled={running}
          >
            {running ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Play size={13} />
            )}
            {running ? "Running..." : "Run"}
          </button>
        )}
      </div>

      {/* ── Code Block ───────────────────────────────────────── */}
      <div
        className={cn(
          "px-5 sm:px-6 py-4",
          "bg-[var(--signal-bg-secondary)]",
        )}
      >
        <pre
          className={cn(
            "m-0 p-4",
            "bg-[var(--signal-bg-primary)]",
            "border border-[var(--signal-border-subtle)]",
            "rounded-[var(--signal-radius-sm)]",
            "text-xs font-[var(--signal-font-mono)]",
            "overflow-x-auto",
          )}
        >
          <code>{activeSnippet.code}</code>
        </pre>
      </div>

      {/* ── Result / Error ───────────────────────────────────── */}
      {(result || runError) && (
        <div
          className={cn(
            "mx-5 sm:mx-6 my-4",
            "rounded-[var(--signal-radius-sm)] overflow-hidden",
            "border",
            runError || resultIsError
              ? "border-[var(--signal-border-danger-emphasis)]"
              : "border-[var(--signal-border-success-emphasis)]",
          )}
        >
          <div
            className={cn(
              "px-3 py-1.5",
              "text-[11px] font-semibold uppercase tracking-[0.05em]",
              "flex items-center gap-1.5",
              runError || resultIsError
                ? [
                    "bg-[var(--signal-bg-danger-muted)]",
                    "text-[var(--signal-fg-danger)]",
                  ]
                : [
                    "bg-[var(--signal-bg-success-muted)]",
                    "text-[var(--signal-fg-success)]",
                  ],
            )}
          >
            {runError || resultIsError ? (
              <AlertCircle size={13} />
            ) : (
              <CircleCheck size={13} />
            )}
            {runError ? "Error" : `Response (${result!.status})`}
          </div>
          <pre
            className={cn(
              "m-0 px-3 py-3",
              "text-xs font-[var(--signal-font-mono)]",
              "bg-[var(--signal-bg-primary)]",
              "overflow-x-auto",
            )}
          >
            <code>{runError ?? formattedResultBody}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
