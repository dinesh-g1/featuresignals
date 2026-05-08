"use client";

import { useState, useCallback } from "react";
import { CopyIcon, CheckIcon } from "@/components/icons/nav-icons";
import { API_BASE_URL } from "@/lib/external-urls";
import { cn } from "@/lib/utils";

interface SdkSnippetProps {
  apiKey: string;
  className?: string;
}

type SdkTab = "node" | "go" | "python" | "react" | "java" | "csharp" | "ruby";

const SDK_TABS: { id: SdkTab; label: string }[] = [
  { id: "node", label: "Node.js" },
  { id: "go", label: "Go" },
  { id: "python", label: "Python" },
  { id: "react", label: "React" },
  { id: "java", label: "Java" },
  { id: "csharp", label: "C#" },
  { id: "ruby", label: "Ruby" },
];

const INSTALL_COMMANDS: Record<SdkTab, string> = {
  go: "go get github.com/featuresignals/sdk-go",
  node: "npm install @featuresignals/sdk",
  python: "pip install featuresignals",
  java: `<dependency>
  <groupId>com.featuresignals</groupId>
  <artifactId>sdk</artifactId>
  <version>1.0.0</version>
</dependency>`,
  csharp: "dotnet add package FeatureSignals.SDK",
  ruby: "gem install featuresignals",
  react: "npm install @featuresignals/react",
};

function buildSnippet(lang: SdkTab, apiKey: string): string {
  const key = apiKey || "YOUR_API_KEY";
  const url = API_BASE_URL;

  const snippets: Record<SdkTab, string> = {
    go: `import fs "github.com/featuresignals/sdk-go"

client := fs.NewClient("${key}",
    fs.WithBaseURL("${url}"))
defer client.Close()

enabled := client.IsEnabled("dark-mode", fs.User{
    Key: "demo-user-123",
})
// enabled == true → show dark theme`,
    node: `import { FeatureSignals } from "@featuresignals/sdk";

const client = new FeatureSignals("${key}", {
  baseURL: "${url}",
});

const enabled = await client.isEnabled("dark-mode", {
  key: "demo-user-123",
});
// enabled === true → show dark theme`,
    python: `from featuresignals import FeatureSignals

client = FeatureSignals("${key}",
    base_url="${url}")

enabled = client.is_enabled("dark-mode", {
    "key": "demo-user-123",
})
# enabled == True → show dark theme`,
    java: `import com.featuresignals.SDK;

SDK client = SDK.builder("${key}")
    .baseUrl("${url}")
    .build();

boolean enabled = client.isEnabled("dark-mode",
    Map.of("key", "demo-user-123"));
// enabled == true → show dark theme`,
    csharp: `using FeatureSignals;

var client = new FSClient("${key}",
    new FSOptions { BaseUrl = "${url}" });

bool enabled = client.IsEnabled("dark-mode",
    new User { Key = "demo-user-123" });
// enabled == true → show dark theme`,
    ruby: `require "featuresignals"

client = FeatureSignals::Client.new("${key}",
    base_url: "${url}")

enabled = client.enabled?("dark-mode",
    key: "demo-user-123")
# enabled == true → show dark theme`,
    react: `import { FSProvider, useFlag } from "@featuresignals/react";

function App() {
  return (
    <FSProvider
      apiKey="${key}"
      baseURL="${url}"
      user={{ key: "demo-user-123" }}
    >
      <Layout />
    </FSProvider>
  );
}

function Layout() {
  const isDark = useFlag("dark-mode");
  return isDark ? <DarkTheme /> : <LightTheme />;
}`,
  };
  return snippets[lang] ?? snippets.node;
}

export function SdkSnippet({ apiKey, className }: SdkSnippetProps) {
  const [selectedSdk, setSelectedSdk] = useState<SdkTab>("node");
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  const copyText = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedLabel(label);
    setTimeout(() => setCopiedLabel(null), 2000);
  }, []);

  const snippet = buildSnippet(selectedSdk, apiKey);
  const installCmd = INSTALL_COMMANDS[selectedSdk];

  return (
    <div className={cn("space-y-4", className)}>
      {/* SDK language tabs */}
      <div className="flex flex-wrap gap-1.5">
        {SDK_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedSdk(tab.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150",
              selectedSdk === tab.id
                ? "bg-[var(--signal-bg-accent-emphasis)] text-white shadow-sm"
                : "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-secondary)] hover:bg-[var(--signal-border-default)] hover:text-[var(--signal-fg-primary)]",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Install command */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium text-[var(--signal-fg-secondary)]">
            Installation
          </span>
          <button
            type="button"
            onClick={() => copyText(installCmd, "install")}
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--signal-fg-accent)] transition-colors hover:text-[var(--signal-fg-accent)]/80"
          >
            {copiedLabel === "install" ? (
              <>
                <CheckIcon className="h-3 w-3" />
                Copied!
              </>
            ) : (
              <>
                <CopyIcon className="h-3 w-3" />
                Copy
              </>
            )}
          </button>
        </div>
        <pre className="overflow-x-auto rounded-lg bg-[var(--signal-bg-inverse)] p-3 sm:p-4 text-xs sm:text-sm text-slate-100 font-mono">
          <code>{installCmd}</code>
        </pre>
      </div>

      {/* Code snippet */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium text-[var(--signal-fg-secondary)]">
            Usage — evaluating <code className="bg-[var(--signal-bg-secondary)] px-1 py-0.5 rounded text-[var(--signal-fg-accent)] text-[11px] font-mono">dark-mode</code>
          </span>
          <button
            type="button"
            onClick={() => copyText(snippet, "snippet")}
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--signal-fg-accent)] transition-colors hover:text-[var(--signal-fg-accent)]/80"
          >
            {copiedLabel === "snippet" ? (
              <>
                <CheckIcon className="h-3 w-3" />
                Copied!
              </>
            ) : (
              <>
                <CopyIcon className="h-3 w-3" />
                Copy
              </>
            )}
          </button>
        </div>
        <pre className="overflow-x-auto rounded-lg bg-[var(--signal-bg-inverse)] p-3 sm:p-4 text-xs sm:text-sm text-slate-100 font-mono">
          <code>{snippet}</code>
        </pre>
      </div>
    </div>
  );
}
