"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Download, ShieldCheck } from "lucide-react";
import { CalculatorSlider } from "@/components/ui/calculator-slider";
import {
  type CompetitorProvider,
  calculateSavings,
  formatUSD,
} from "@/lib/pricing";

function CountingNumber({
  value,
  prefix = "",
  suffix = "",
}: {
  value: number;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="tabular-nums"
    >
      {prefix}
      {value.toLocaleString("en-US")}
      {suffix}
    </motion.span>
  );
}

const PROVIDER_OPTIONS: { value: CompetitorProvider; label: string }[] = [
  { value: "launchdarkly", label: "LaunchDarkly" },
  { value: "configcat", label: "ConfigCat" },
  { value: "flagsmith", label: "Flagsmith" },
  { value: "unleash", label: "Unleash" },
];

export function HeroCalculator() {
  const [teamSize, setTeamSize] = useState(50);
  const [provider, setProvider] = useState<CompetitorProvider>("launchdarkly");
  const result = useMemo(
    () => calculateSavings({ teamSize, provider }),
    [teamSize, provider],
  );

  return (
    <section
      id="hero"
      className="relative overflow-hidden bg-white"
      aria-labelledby="hero-heading"
    >
      <div
        className="absolute inset-0 bg-grid-subtle opacity-60"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-7xl px-6 py-20 sm:py-24">
        {/* Trust badges */}
        <motion.div
          className="flex flex-wrap items-center justify-center gap-3 mb-12"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[var(--signal-bg-success-muted)] text-[var(--signal-fg-success)] border border-[var(--signal-border-success-muted)]">
            <ShieldCheck size={14} />
            SOC 2
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)] border border-[var(--signal-border-accent-muted)]">
            OpenFeature Native
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[var(--signal-bg-info-muted)] text-[var(--signal-fg-info)] border border-[var(--borderColor-done-emphasis)] border-opacity-20">
            Apache 2.0
          </span>
        </motion.div>

        {/* Side-by-side layout: Left text, Right calculator */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1
              id="hero-heading"
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--signal-fg-primary)] leading-[1.1]"
            >
              The complete feature flag lifecycle platform.
            </h1>
            <p className="text-xl text-[var(--signal-fg-accent)] font-semibold mt-3">
              Sub-millisecond evaluation. Transparent pricing.
            </p>
            <p className="text-lg text-[var(--signal-fg-secondary)] mt-4 leading-relaxed">
              Manage the entire lifecycle of every feature flag — from creation
              to rollout to automated cleanup. Open source. Self-host or cloud.
              Pay only for what you use. See how much you could save compared to
              your current provider.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <a
                href="#live-demo"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white bg-[var(--signal-bg-success-emphasis)] hover:bg-[#1c8139] transition-colors"
                style={{ boxShadow: "0 1px 0 0 #1f232826" }}
              >
                See it in action <ArrowRight size={16} />
              </a>
              <a
                href="https://featuresignals.com/docs/getting-started/quickstart"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-[var(--signal-fg-primary)] bg-[var(--signal-bg-secondary)] hover:bg-[#eff2f5] border border-[var(--signal-border-default)] transition-colors"
                style={{ boxShadow: "0 1px 0 0 #1f23280a" }}
              >
                <Download size={16} />
                Self-host in 3 minutes
              </a>
            </div>
          </motion.div>

          {/* Right: Calculator */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              className="rounded-2xl border border-[var(--signal-border-default)] bg-white p-6 sm:p-8"
              style={{ boxShadow: "var(--signal-shadow-lg)" }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <CalculatorSlider
                  value={teamSize}
                  onChange={setTeamSize}
                  min={5}
                  max={500}
                  label="Team Size"
                  minLabel="5 engineers"
                  maxLabel="500 engineers"
                  formatValue={(v) => `${v}`}
                />
                <div>
                  <label
                    className="text-sm font-semibold text-[var(--signal-fg-primary)] block mb-3"
                    htmlFor="provider-select"
                  >
                    Current Provider
                  </label>
                  <div className="relative">
                    <select
                      id="provider-select"
                      value={provider}
                      onChange={(e) =>
                        setProvider(e.target.value as CompetitorProvider)
                      }
                      className="w-full appearance-none rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] px-4 py-3 pr-10 text-sm font-medium text-[var(--signal-fg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-muted)] focus:border-[var(--signal-fg-accent)] transition-shadow cursor-pointer"
                    >
                      {PROVIDER_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <svg
                        className="h-4 w-4 text-[var(--signal-fg-secondary)]"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                      >
                        <path d="M4.427 6.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 6H4.604a.25.25 0 00-.177.427z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-5 border-t border-[var(--signal-border-subtle)]">
                <div>
                  <div className="text-xs font-semibold text-[var(--signal-fg-tertiary)] uppercase tracking-wider mb-1">
                    {result.competitor.name}
                  </div>
                  <div className="text-xl font-bold text-[var(--signal-fg-primary)] tabular-nums">
                    <CountingNumber
                      value={result.competitor.monthly}
                      prefix="$"
                      suffix="/mo"
                    />
                  </div>
                  <div className="text-xs text-[var(--signal-fg-tertiary)] mt-0.5">
                    <CountingNumber
                      value={result.competitor.annual}
                      prefix="$"
                      suffix="/year"
                    />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-[var(--signal-fg-tertiary)] uppercase tracking-wider mb-1">
                    FeatureSignals Cloud
                  </div>
                  <div className="text-xl font-bold text-[var(--signal-fg-success)] tabular-nums">
                    ~{formatUSD(7)}/mo
                  </div>
                  <div className="text-xs text-[var(--signal-fg-tertiary)] mt-0.5">
                    pay-as-you-go
                  </div>
                </div>
              </div>
              <div
                className="mt-5 rounded-xl p-4 text-center"
                style={{
                  background:
                    "linear-gradient(135deg, var(--signal-bg-success-muted), var(--signal-bg-accent-muted))",
                }}
              >
                <div className="text-xs font-semibold text-[var(--signal-fg-secondary)] mb-1">
                  Estimated Annual Savings
                </div>
                <div className="text-2xl font-bold text-[var(--signal-fg-success)] tabular-nums">
                  <CountingNumber value={result.savings.annual} prefix="$" />
                </div>
                <div className="text-xs font-medium text-[var(--signal-fg-success)] mt-1">
                  {result.savings.percent}% less than {result.competitor.name}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
