"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRightIcon,
  ShieldLockIcon,
  AlertIcon,
  CheckIcon,
  SyncIcon,
} from "@primer/octicons-react";
import { type CompetitorProvider, formatUSD, formatINR } from "@/lib/pricing";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MigrationInventory {
  provider: string;
  flags: number;
  environments: number;
  segments: number;
  estimatedMigrationTimeSec: number;
}

interface MigrationResult {
  inventory: MigrationInventory;
  savings: {
    annual: number;
    percent: number;
  };
}

type MigrationStatus = "idle" | "loading" | "success" | "error";

// ---------------------------------------------------------------------------
// Simulated migration data (in production, this calls POST /v1/public/migration/preview)
// ---------------------------------------------------------------------------

const DEMO_INVENTORIES: Record<CompetitorProvider, MigrationInventory> = {
  launchdarkly: {
    provider: "LaunchDarkly",
    flags: 47,
    environments: 3,
    segments: 12,
    estimatedMigrationTimeSec: 141, // ~3 sec per flag
  },
  configcat: {
    provider: "ConfigCat",
    flags: 34,
    environments: 2,
    segments: 8,
    estimatedMigrationTimeSec: 102,
  },
  flagsmith: {
    provider: "Flagsmith",
    flags: 28,
    environments: 2,
    segments: 5,
    estimatedMigrationTimeSec: 84,
  },
  unleash: {
    provider: "Unleash",
    flags: 31,
    environments: 3,
    segments: 7,
    estimatedMigrationTimeSec: 93,
  },
};

const DEMO_SAVINGS: Record<
  CompetitorProvider,
  { annual: number; percent: number }
> = {
  launchdarkly: { annual: 143988, percent: 99.2 },
  configcat: { annual: 15456, percent: 97.3 },
  flagsmith: { annual: 12036, percent: 96.3 },
  unleash: { annual: 9816, percent: 95.5 },
};

const PROVIDER_OPTIONS: { value: CompetitorProvider; label: string }[] = [
  { value: "launchdarkly", label: "LaunchDarkly" },
  { value: "configcat", label: "ConfigCat" },
  { value: "flagsmith", label: "Flagsmith" },
  { value: "unleash", label: "Unleash" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MigrationPreview() {
  const [provider, setProvider] = useState<CompetitorProvider>("launchdarkly");
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<MigrationStatus>("idle");
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [saved, setSaved] = useState(false);

  const handlePreview = useCallback(async () => {
    if (!apiKey.trim()) return;

    setStatus("loading");
    setErrorMessage("");
    setResult(null);
    setSaved(false);

    // Simulate API call delay (in production: POST /v1/public/migration/preview)
    await new Promise((resolve) => setTimeout(resolve, 1500));

    try {
      // Simulated validation — in production this is a real API call
      if (apiKey.length < 8) {
        throw new Error(
          "Invalid API key format. Please enter a valid LaunchDarkly API key.",
        );
      }

      const inventory = DEMO_INVENTORIES[provider];
      const savings = DEMO_SAVINGS[provider];

      setResult({ inventory, savings });
      setStatus("success");
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to connect. Please try again.",
      );
      setStatus("error");
    }
  }, [apiKey, provider]);

  const handleSave = useCallback(async () => {
    // In production: POST /v1/public/migration/save
    await new Promise((resolve) => setTimeout(resolve, 500));
    setSaved(true);
  }, []);

  return (
    <section
      id="migration"
      className="py-20 sm:py-28 bg-white"
      aria-labelledby="migration-heading"
    >
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2
            id="migration-heading"
            className="text-3xl sm:text-4xl font-bold text-[var(--signal-fg-primary)] tracking-tight"
          >
            Migrate from your current provider. We handle the heavy lifting.
          </h2>
          <p className="text-lg text-[var(--signal-fg-secondary)] mt-3 max-w-2xl mx-auto">
            Connect your provider to see exactly what ports over.
            Your data is never stored — this preview is read-only.
          </p>
        </div>

        {/* Connect form */}
        <div className="mx-auto max-w-xl mb-10">
          <div
            className="rounded-2xl border border-[var(--signal-border-default)] bg-white p-6 sm:p-8"
            style={{ boxShadow: "var(--signal-shadow-sm)" }}
          >
            <div className="space-y-4">
              {/* Provider select */}
              <div>
                <label
                  className="text-sm font-semibold text-[var(--signal-fg-primary)] block mb-2"
                  htmlFor="migration-provider"
                >
                  Provider
                </label>
                <select
                  id="migration-provider"
                  value={provider}
                  onChange={(e) => {
                    setProvider(e.target.value as CompetitorProvider);
                    setResult(null);
                    setStatus("idle");
                    setErrorMessage("");
                    setSaved(false);
                  }}
                  className="w-full rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] px-4 py-2.5 text-sm text-[var(--signal-fg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-muted)] focus:border-[var(--signal-fg-accent)]"
                >
                  {PROVIDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* API Key */}
              <div>
                <label
                  className="text-sm font-semibold text-[var(--signal-fg-primary)] block mb-2"
                  htmlFor="migration-api-key"
                >
                  API Key
                </label>
                <input
                  id="migration-api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your provider API key..."
                  className="w-full rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] px-4 py-2.5 text-sm font-mono text-[var(--signal-fg-primary)] placeholder:text-[var(--signal-fg-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-muted)] focus:border-[var(--signal-fg-accent)]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handlePreview();
                  }}
                />
              </div>

              {/* Submit */}
              <button
                onClick={handlePreview}
                disabled={!apiKey.trim() || status === "loading"}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white bg-[var(--signal-bg-success-emphasis)] hover:bg-[#1c8139] active:bg-[#197935] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                style={{ boxShadow: "0 1px 0 0 #1f232826" }}
              >
                {status === "loading" ? (
                  <>
                    <SyncIcon size={16} className="animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ArrowRightIcon size={16} />
                    Connect &amp; Preview Migration
                  </>
                )}
              </button>

              <p className="text-xs text-[var(--signal-fg-tertiary)] text-center flex items-center justify-center gap-1.5">
                <ShieldLockIcon size={12} />
                Your data is never stored. Preview only.
              </p>
            </div>
          </div>
        </div>

        {/* Results */}
        <AnimatePresence mode="wait">
          {status === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mx-auto max-w-4xl"
            >
              <div
                className="rounded-2xl border border-[var(--signal-border-default)] bg-white p-12 text-center"
                style={{ boxShadow: "var(--signal-shadow-sm)" }}
              >
                <SyncIcon
                  size={32}
                  className="animate-spin mx-auto mb-4 text-[var(--signal-fg-accent)]"
                />
                <p className="text-sm text-[var(--signal-fg-secondary)]">
                  Fetching flag inventory from{" "}
                  {PROVIDER_OPTIONS.find((p) => p.value === provider)?.label}...
                </p>
              </div>
            </motion.div>
          )}

          {status === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mx-auto max-w-xl"
            >
              <div
                className="rounded-xl border border-[var(--signal-border-danger-emphasis)] bg-[var(--signal-bg-danger-muted)] p-5"
                role="alert"
              >
                <div className="flex items-start gap-3">
                  <AlertIcon
                    size={16}
                    className="shrink-0 mt-0.5 text-[var(--signal-fg-danger)]"
                  />
                  <div>
                    <div className="text-sm font-semibold text-[var(--signal-fg-danger)]">
                      Connection failed
                    </div>
                    <p className="text-sm text-[var(--signal-fg-secondary)] mt-1">
                      {errorMessage}
                    </p>
                    <button
                      onClick={() => {
                        setStatus("idle");
                        setErrorMessage("");
                      }}
                      className="mt-3 text-sm font-medium text-[var(--signal-fg-accent)] hover:underline"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {status === "success" && result && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mx-auto max-w-4xl"
            >
              {/* Side-by-side comparison */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Source */}
                <div
                  className="rounded-xl border border-[var(--signal-border-default)] bg-white p-6 text-center"
                  style={{ boxShadow: "var(--signal-shadow-sm)" }}
                >
                  <div className="text-xs font-semibold text-[var(--signal-fg-tertiary)] uppercase tracking-wider mb-3">
                    {result.inventory.provider}
                  </div>
                  <div className="space-y-2 text-sm text-[var(--signal-fg-secondary)]">
                    <div>
                      <span className="font-bold text-[var(--signal-fg-primary)]">
                        {result.inventory.flags}
                      </span>{" "}
                      flags
                    </div>
                    <div>
                      <span className="font-bold text-[var(--signal-fg-primary)]">
                        {result.inventory.environments}
                      </span>{" "}
                      environments
                    </div>
                    <div>
                      <span className="font-bold text-[var(--signal-fg-primary)]">
                        {result.inventory.segments}
                      </span>{" "}
                      segments
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <ArrowRightIcon
                      size={24}
                      className="mx-auto text-[var(--signal-fg-success)]"
                    />
                    <div className="text-xs text-[var(--signal-fg-secondary)] mt-1">
                      ~
                      {Math.ceil(
                        result.inventory.estimatedMigrationTimeSec / 60,
                      )}{" "}
                      min migration
                    </div>
                  </div>
                </div>

                {/* Destination */}
                <div
                  className="rounded-xl border-2 border-[var(--signal-border-success-emphasis)] bg-[var(--signal-bg-success-muted)] p-6 text-center"
                  style={{ boxShadow: "var(--signal-shadow-sm)" }}
                >
                  <div className="text-xs font-semibold text-[var(--signal-fg-success)] uppercase tracking-wider mb-3">
                    FeatureSignals
                  </div>
                  <div className="space-y-2 text-sm text-[var(--signal-fg-secondary)]">
                    <div>
                      <span className="font-bold text-[var(--signal-fg-success)]">
                        {result.inventory.flags}
                      </span>{" "}
                      flags
                    </div>
                    <div>
                      <span className="font-bold text-[var(--signal-fg-success)]">
                        {result.inventory.environments}
                      </span>{" "}
                      environments
                    </div>
                    <div>
                      <span className="font-bold text-[var(--signal-fg-success)]">
                        {result.inventory.segments}
                      </span>{" "}
                      segments
                    </div>
                    <div className="pt-2 border-t border-[var(--signal-border-success-muted)]">
                      <div className="font-bold text-[var(--signal-fg-success)]">
                        {formatINR(999)}/month
                      </div>
                      <div className="text-xs">flat rate, unlimited seats</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Savings banner */}
              <div
                className="rounded-2xl p-6 text-center"
                style={{
                  background:
                    "linear-gradient(135deg, var(--signal-bg-success-muted), var(--signal-bg-accent-muted))",
                }}
              >
                <div className="text-2xl sm:text-3xl font-bold text-[var(--signal-fg-success)] mb-1">
                  Annual savings: {formatUSD(result.savings.annual)}
                </div>
                <div className="text-sm text-[var(--signal-fg-secondary)] mb-4">
                  That&apos;s {result.savings.percent}% less than{" "}
                  {result.inventory.provider}
                </div>
                <div className="text-xs text-[var(--signal-fg-secondary)] mb-4">
                  Migration time: ~
                  {Math.ceil(result.inventory.estimatedMigrationTimeSec / 60)}{" "}
                  minutes for {result.inventory.flags} flags
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={handleSave}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-[var(--signal-bg-success-emphasis)] hover:bg-[#1c8139] transition-colors duration-150"
                    style={{ boxShadow: "0 1px 0 0 #1f232826" }}
                  >
                    {saved ? (
                      <>
                        <CheckIcon size={16} />
                        Comparison Saved
                      </>
                    ) : (
                      "Save this comparison"
                    )}
                  </button>
                </div>

                {saved && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4"
                  >
                    <div
                      className="inline-flex items-start gap-2 px-4 py-3 rounded-lg bg-[var(--signal-bg-accent-muted)] border border-[var(--signal-border-accent-muted)] text-sm text-[var(--signal-fg-primary)]"
                      role="status"
                    >
                      <CheckIcon
                        size={14}
                        className="shrink-0 mt-0.5 text-[var(--signal-fg-success)]"
                      />
                      <span>
                        Comparison saved for 7 days.{" "}
                        <a
                          href="https://app.featuresignals.com/signup"
                          className="font-semibold text-[var(--signal-fg-accent)] hover:underline"
                        >
                          Create a free account
                        </a>{" "}
                        to migrate now.
                      </span>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
