'use client';

import React, { useState, useCallback } from 'react';

// ── Types ────────────────────────────────────────────────────────────────

type Language = 'curl' | 'node' | 'python' | 'go';

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

// ── Code Templates ───────────────────────────────────────────────────────

function generateSnippets(
  flagKey: string,
  envKey: string,
  baseUrl: string,
): SnippetConfig[] {
  return [
    {
      language: 'curl',
      label: 'cURL',
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
      language: 'node',
      label: 'Node.js',
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
      language: 'python',
      label: 'Python',
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
      language: 'go',
      label: 'Go',
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

// ── Component ────────────────────────────────────────────────────────────

export default function TryItSnippet({
  baseUrl = 'https://api.featuresignals.com',
  defaultFlagKey = 'new-checkout',
  defaultEnvKey = 'dev',
  showRun = true,
  sandboxUrl,
}: TryItSnippetProps): React.ReactElement {
  const [flagKey, setFlagKey] = useState(defaultFlagKey);
  const [activeLang, setActiveLang] = useState<Language>('curl');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ status: number; body: string; error?: string } | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const snippets = generateSnippets(flagKey, defaultEnvKey, baseUrl);

  const activeSnippet = snippets.find((s) => s.language === activeLang) ?? snippets[0];

  const handleRun = useCallback(async () => {
    if (!sandboxUrl) {
      setRunError('Run is not available — no sandbox configured. Copy the snippet and run it locally.');
      return;
    }

    setRunning(true);
    setResult(null);
    setRunError(null);

    try {
      const resp = await fetch(sandboxUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flag_key: flagKey,
          user: {
            key: 'user-123',
            attributes: { country: 'US', plan: 'enterprise' },
          },
        }),
      });

      const body = await resp.text();
      setResult({ status: resp.status, body });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown network error';
      setRunError(`Network error: ${message}`);
    } finally {
      setRunning(false);
    }
  }, [flagKey, sandboxUrl]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(activeSnippet.code);
    } catch {
      // Clipboard API not available — ignore
    }
  }, [activeSnippet.code]);

  return (
    <div className="fs-demo" data-demo="try-it">
      {/* Header */}
      <div className="fs-demo-header">
        <span className="fs-demo-badge">Try It</span>
        <h3>Evaluate a Flag</h3>
        <p>Configure the flag key, select your language, and copy the snippet — or run it against the sandbox.</p>
      </div>

      {/* Flag Key Input */}
      <div className="fs-ts-field">
        <label className="fs-ts-label" htmlFor="ts-flagKey">Flag Key</label>
        <div className="fs-ts-input-row">
          <input
            id="ts-flagKey"
            className="fs-ts-input"
            type="text"
            value={flagKey}
            onChange={(e) => setFlagKey(e.target.value)}
            placeholder="my-flag-key"
          />
        </div>
      </div>

      {/* Language Tabs */}
      <div className="fs-ts-tabs">
        {snippets.map((s) => (
          <button
            key={s.language}
            className={`fs-ts-tab ${activeLang === s.language ? 'fs-ts-tab--active' : ''}`}
            onClick={() => setActiveLang(s.language)}
          >
            {s.label}
          </button>
        ))}
        <div className="fs-ts-tabs-spacer" />
        <button className="fs-ts-copy-btn" onClick={handleCopy} title="Copy to clipboard">
          📋 Copy
        </button>
        {showRun && (
          <button
            className="fs-ts-run-btn"
            onClick={handleRun}
            disabled={running}
          >
            {running ? '⏳ Running...' : '▶ Run'}
          </button>
        )}
      </div>

      {/* Code Block */}
      <div className="fs-ts-code-block">
        <pre className="fs-ts-code"><code>{activeSnippet.code}</code></pre>
      </div>

      {/* Result */}
      {(result || runError) && (
        <div className={`fs-ts-result ${runError ? 'fs-ts-result--error' : result && result.status < 400 ? 'fs-ts-result--success' : 'fs-ts-result--error'}`}>
          <div className="fs-ts-result-header">
            {runError ? 'Error' : `Response (${result?.status})`}
          </div>
          <pre className="fs-ts-result-body">
            <code>{runError ?? (() => {
              if (!result) return '';
              try {
                return JSON.stringify(JSON.parse(result.body), null, 2);
              } catch {
                return result.body;
              }
            })()}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
