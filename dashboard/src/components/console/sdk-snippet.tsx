"use client";

/**
 * SdkSnippetPanel — Displays SDK installation and initialization code
 * for the selected language with syntax-highlighted snippets, a copy
 * button, and Framer Motion animations.
 *
 * Feature-level language: "Get started with Go" not "Copy Go snippet".
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  Check,
  X,
  Terminal,
  Package,
  Play,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import type { APIKey } from "@/lib/types";

// ─── Types ──────────────────────────────────────────────────────────

export type SdkLanguage =
  | "go"
  | "node"
  | "python"
  | "react"
  | "java"
  | "dotnet"
  | "ruby"
  | "vue";

interface SdkSnippetPanelProps {
  language: SdkLanguage;
  onClose: () => void;
}

// ─── SDK Metadata ───────────────────────────────────────────────────

interface SdkMeta {
  label: string;
  packageName: string;
  installCommand: string;
  importStatement: string;
  initSnippet: (sdkKey: string) => string;
  usageExample: string;
}

const SDK_META: Record<SdkLanguage, SdkMeta> = {
  go: {
    label: "Go",
    packageName: "github.com/featuresignals/fs-go",
    installCommand: "go get github.com/featuresignals/fs-go",
    importStatement: `import "github.com/featuresignals/fs-go"`,
    initSnippet: (key) =>
      `client, err := fs.NewClient(fs.Config{\n  SDKKey: "${key}",\n  Environment: "production",\n})`,
    usageExample: `enabled, err := client.IsEnabled(ctx, "dark-mode")\nif err != nil {\n  log.Printf("eval error: %%v", err)\n}\nif enabled {\n  // Dark mode is LIVE\n}`,
  },
  node: {
    label: "Node.js",
    packageName: "@featuresignals/fs-node",
    installCommand: "npm install @featuresignals/fs-node",
    importStatement: `const { FeatureSignals } = require("@featuresignals/fs-node");`,
    initSnippet: (key) =>
      `const client = new FeatureSignals({\n  sdkKey: "${key}",\n  environment: "production",\n});`,
    usageExample: `const enabled = await client.isEnabled("dark-mode");\nif (enabled) {\n  // Dark mode is LIVE\n}`,
  },
  python: {
    label: "Python",
    packageName: "featuresignals",
    installCommand: "pip install featuresignals",
    importStatement: `from featuresignals import FeatureSignals`,
    initSnippet: (key) =>
      `client = FeatureSignals(\n  sdk_key="${key}",\n  environment="production",\n)`,
    usageExample: `enabled = client.is_enabled("dark-mode")\nif enabled:\n  # Dark mode is LIVE\n  pass`,
  },
  react: {
    label: "React",
    packageName: "@featuresignals/fs-react",
    installCommand: "npm install @featuresignals/fs-react",
    importStatement: `import { FeatureSignalsProvider, useFeature } from "@featuresignals/fs-react";`,
    initSnippet: (key) =>
      `<FeatureSignalsProvider\n  sdkKey="${key}"\n  environment="production"\n>`,
    usageExample: `const darkMode = useFeature("dark-mode");\nif (darkMode.enabled) {\n  // Dark mode is LIVE\n}`,
  },
  java: {
    label: "Java",
    packageName: "com.featuresignals:fs-java",
    installCommand: `// Maven:\n<dependency>\n  <groupId>com.featuresignals</groupId>\n  <artifactId>fs-java</artifactId>\n  <version>LATEST</version>\n</dependency>`,
    importStatement: `import com.featuresignals.FeatureSignals;`,
    initSnippet: (key) =>
      `FeatureSignals client = FeatureSignals.builder()\n  .sdkKey("${key}")\n  .environment("production")\n  .build();`,
    usageExample: `boolean enabled = client.isEnabled("dark-mode");\nif (enabled) {\n  // Dark mode is LIVE\n}`,
  },
  dotnet: {
    label: ".NET",
    packageName: "FeatureSignals.Client",
    installCommand: "dotnet add package FeatureSignals.Client",
    importStatement: `using FeatureSignals;`,
    initSnippet: (key) =>
      `var client = new FeatureSignalsClient(new FeatureSignalsConfig\n{\n  SdkKey = "${key}",\n  Environment = "production"\n});`,
    usageExample: `var enabled = await client.IsEnabledAsync("dark-mode");\nif (enabled) {\n  // Dark mode is LIVE\n}`,
  },
  ruby: {
    label: "Ruby",
    packageName: "featuresignals",
    installCommand: "gem install featuresignals",
    importStatement: `require "featuresignals"`,
    initSnippet: (key) =>
      `client = FeatureSignals::Client.new(\n  sdk_key: "${key}",\n  environment: "production"\n)`,
    usageExample: `enabled = client.is_enabled?("dark-mode")\nif enabled\n  # Dark mode is LIVE\nend`,
  },
  vue: {
    label: "Vue",
    packageName: "@featuresignals/fs-vue",
    installCommand: "npm install @featuresignals/fs-vue",
    importStatement: `import { FeatureSignalsPlugin } from "@featuresignals/fs-vue";`,
    initSnippet: (key) =>
      `app.use(FeatureSignalsPlugin, {\n  sdkKey: "${key}",\n  environment: "production",\n});`,
    usageExample: `<script setup>\nimport { useFeature } from "@featuresignals/fs-vue";\nconst darkMode = useFeature("dark-mode");\n</script>\n<template>\n  <div v-if="darkMode.enabled">Dark mode is LIVE</div>\n</template>`,
  },
};

// ─── Snippet Block ──────────────────────────────────────────────────

function SnippetBlock({
  label,
  code,
  language,
  icon: Icon,
}: {
  label: string;
  code: string;
  language: SdkLanguage;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available — silently ignore
    }
  }, [code]);

  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center justify-between mb-1.5">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--signal-fg-tertiary)]">
          <Icon className="h-3 w-3" />
          {label}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "inline-flex items-center gap-1 rounded-[var(--signal-radius-sm)] px-2 py-0.5 text-[10px] font-medium transition-all duration-[var(--signal-duration-fast)]",
            copied
              ? "bg-[var(--signal-bg-success-muted)] text-[var(--signal-fg-success)]"
              : "text-[var(--signal-fg-tertiary)] hover:text-[var(--signal-fg-secondary)] hover:bg-[var(--signal-bg-secondary)]",
          )}
          aria-label={copied ? "Copied" : `Copy ${label.toLowerCase()}`}
        >
          {copied ? (
            <motion.span
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="flex items-center gap-1"
            >
              <Check className="h-3 w-3" />
              Copied
            </motion.span>
          ) : (
            <span className="flex items-center gap-1">
              <Copy className="h-3 w-3" />
              Copy
            </span>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-[var(--signal-radius-md)] border border-[var(--signal-border-subtle)] bg-[var(--signal-bg-secondary)] p-3">
        <code className="text-[12px] leading-relaxed font-mono text-[var(--signal-fg-primary)] whitespace-pre select-all">
          {code}
        </code>
      </pre>
    </div>
  );
}

// ─── Environment Selector ───────────────────────────────────────────

const ENVIRONMENTS = ["production", "staging", "development"] as const;

function EnvironmentSelector({
  selected,
  onChange,
}: {
  selected: string;
  onChange: (env: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 mb-4">
      <span className="text-[10px] font-medium text-[var(--signal-fg-tertiary)]">
        Environment:
      </span>
      <div className="flex rounded-[var(--signal-radius-sm)] border border-[var(--signal-border-subtle)] bg-[var(--signal-bg-secondary)] p-0.5">
        {ENVIRONMENTS.map((env) => (
          <button
            key={env}
            type="button"
            onClick={() => onChange(env)}
            className={cn(
              "px-2 py-0.5 text-[10px] font-medium rounded-[3px] transition-all duration-[var(--signal-duration-fast)] capitalize",
              selected === env
                ? "bg-[var(--signal-bg-primary)] text-[var(--signal-fg-primary)] shadow-[var(--signal-shadow-xs)]"
                : "text-[var(--signal-fg-tertiary)] hover:text-[var(--signal-fg-secondary)]",
            )}
          >
            {env}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function SdkSnippetPanel({ language, onClose }: SdkSnippetPanelProps) {
  const token = useAppStore((s) => s.token);
  const currentProjectId = useAppStore((s) => s.currentProjectId);

  const [sdkKey, setSdkKey] = useState<string>("");
  const [loadingKey, setLoadingKey] = useState(true);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [environment, setEnvironment] = useState("production");

  const meta = SDK_META[language];

  // Fetch SDK keys when panel opens.
  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    setLoadingKey(true);
    setKeyError(null);

    const fetchKeys = async () => {
      try {
        // Determine project ID: use current or fetch first project.
        let projectId = currentProjectId;
        if (!projectId) {
          const projects = await api.listProjects(token);
          if (projects.length > 0) {
            projectId = projects[0].id;
          } else {
            if (!cancelled) {
              setSdkKey("fs_srv_YOUR_SDK_KEY");
              setLoadingKey(false);
            }
            return;
          }
        }

        // List environments for the project, then find SDK keys.
        const envs = await api.listEnvironments(token, projectId);
        let foundKey = "";

        for (const env of envs) {
          try {
            const keys = await api.listAPIKeys(token, env.id);
            const sdkKeys = keys.filter(
              (k: APIKey) => k.type === "sdk" && !k.revoked_at,
            );
            if (sdkKeys.length > 0) {
              // Prefer the key matching the selected environment name.
              const match =
                sdkKeys.find((k: APIKey) => k.key_prefix != null) ?? sdkKeys[0];
              foundKey = (match ?? sdkKeys[0]).key_prefix || "fs_srv_...";
              break;
            }
          } catch {
            // Env might not have API keys, continue.
          }
        }

        if (!cancelled) {
          setSdkKey(foundKey || "fs_srv_YOUR_SDK_KEY");
        }
      } catch (err) {
        if (!cancelled) {
          setKeyError(
            err instanceof Error ? err.message : "Failed to load SDK key",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingKey(false);
        }
      }
    };

    fetchKeys();
    return () => {
      cancelled = true;
    };
  }, [token, environment, currentProjectId]);

  const displayKey = loadingKey ? "••••••••••••••••" : sdkKey;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 35 }}
        className="mx-3 mb-3 rounded-[var(--signal-radius-lg)] border border-[var(--signal-border-subtle)] bg-[var(--signal-bg-primary)] shadow-[var(--signal-shadow-md)] overflow-hidden"
        role="region"
        aria-label={`${meta.label} SDK setup`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--signal-border-subtle)]">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-[var(--signal-radius-sm)] bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)]">
              <Terminal className="h-3.5 w-3.5" />
            </span>
            <div>
              <h3 className="text-xs font-semibold text-[var(--signal-fg-primary)]">
                {meta.label} SDK
              </h3>
              <p className="text-[10px] text-[var(--signal-fg-tertiary)]">
                Install and initialize in 3 steps
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-6 w-6 items-center justify-center rounded-[var(--signal-radius-sm)] text-[var(--signal-fg-tertiary)] hover:text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-secondary)] transition-colors duration-[var(--signal-duration-fast)]"
            aria-label="Close SDK panel"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-3 py-3">
          {/* Environment selector */}
          <EnvironmentSelector
            selected={environment}
            onChange={setEnvironment}
          />

          {keyError && (
            <div className="mb-3 rounded-[var(--signal-radius-sm)] bg-[var(--signal-bg-danger-muted)] px-3 py-2 text-[11px] text-[var(--signal-fg-danger)]">
              {keyError}
            </div>
          )}

          {/* Step 1: Install */}
          <SnippetBlock
            label="1. Install"
            code={meta.installCommand}
            language={language}
            icon={Package}
          />

          {/* Step 2: Initialize */}
          <SnippetBlock
            label="2. Initialize"
            code={meta.initSnippet(displayKey)}
            language={language}
            icon={Play}
          />

          {/* Step 3: Usage */}
          <SnippetBlock
            label="3. Use"
            code={meta.usageExample}
            language={language}
            icon={Terminal}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
