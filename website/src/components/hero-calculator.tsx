"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowRightIcon,
  DownloadIcon,
  ShieldCheckIcon,
} from "@primer/octicons-react";
import { CalculatorSlider } from "@/components/ui/calculator-slider";
import {
  type CompetitorProvider,
  calculateSavings,
  formatUSD,
  formatINR,
} from "@/lib/pricing";
import { useCalculatorContext } from "@/lib/calculator-context";

function CountingNumber({
  value,
  prefix = "",
  suffix = "",
  duration = 0.6,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
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
  const { teamSize, provider, setTeamSize, setProvider } =
    useCalculatorContext();

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
      {/* Background grid pattern */}
      <div
        className="absolute inset-0 bg-grid-subtle opacity-60"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-6 pt-24 pb-20 sm:pt-32 sm:pb-28 lg:pt-40 lg:pb-32">
        {/* Trust badges */}
        <motion.div
          className="flex flex-wrap items-center justify-center gap-3 mb-10"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[var(--bgColor-success-muted)] text-[var(--fgColor-success)] border border-[var(--borderColor-success-muted)]">
            <ShieldCheckIcon size={14} />
            SOC 2
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[var(--bgColor-accent-muted)] text-[var(--fgColor-accent)] border border-[var(--borderColor-accent-muted)]">
            OpenFeature Native
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[var(--bgColor-done-muted)] text-[var(--fgColor-done)] border border-[var(--borderColor-done-emphasis)] border-opacity-20">
            Apache 2.0
          </span>
        </motion.div>

        {/* Hero headline */}
        <motion.h1
          id="hero-heading"
          className="text-center text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--fgColor-default)] max-w-4xl mx-auto leading-[1.1]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          Your feature flags are bleeding money.
          <br />
          <span className="text-[var(--fgColor-danger)]">
            {formatUSD(result.competitor.monthly)}/month
          </span>{" "}
          for {teamSize} engineers?!
        </motion.h1>

        <motion.p
          className="text-center text-lg text-[var(--fgColor-muted)] max-w-2xl mx-auto mt-5 mb-12"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          We&apos;ll prove it. Right here. In 60 seconds. No signup. No demo
          call. No salesperson named Chad. Just real math with real competitor
          pricing. FeatureSignals is a flat {formatINR(999)}/month (~
          {formatUSD(12)}). Unlimited flags. Unlimited seats. The only thing
          unlimited at LaunchDarkly is their pricing page.
        </motion.p>

        {/* Calculator card */}
        <motion.div
          className="mx-auto max-w-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <div
            className="rounded-2xl border border-[var(--borderColor-default)] bg-white p-6 sm:p-8"
            style={{ boxShadow: "var(--shadow-floating-medium)" }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              {/* Team Size Slider */}
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

              {/* Provider Dropdown */}
              <div>
                <label
                  className="text-sm font-semibold text-[var(--fgColor-default)] block mb-3"
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
                    className="w-full appearance-none rounded-lg border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-4 py-3 pr-10 text-sm font-medium text-[var(--fgColor-default)] focus:outline-none focus:ring-2 focus:ring-[var(--borderColor-accent-muted)] focus:border-[var(--fgColor-accent)] transition-shadow duration-150 cursor-pointer"
                  >
                    {PROVIDER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg
                      className="h-4 w-4 text-[var(--fgColor-muted)]"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                    >
                      <path d="M4.427 6.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 6H4.604a.25.25 0 00-.177.427z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-[var(--borderColor-muted)]">
              {/* Competitor cost */}
              <div className="text-center sm:text-left">
                <div className="text-xs font-semibold text-[var(--fgColor-subtle)] uppercase tracking-wider mb-1">
                  {result.competitor.name}
                </div>
                <div className="text-2xl font-bold text-[var(--fgColor-danger)] tabular-nums">
                  <CountingNumber
                    value={result.competitor.monthly}
                    prefix="$"
                    suffix="/mo"
                  />
                </div>
                <div className="text-xs text-[var(--fgColor-subtle)] mt-0.5">
                  <CountingNumber
                    value={result.competitor.annual}
                    prefix="$"
                    suffix="/year"
                  />
                </div>
              </div>

              {/* FeatureSignals cost */}
              <div className="text-center sm:text-right">
                <div className="text-xs font-semibold text-[var(--fgColor-subtle)] uppercase tracking-wider mb-1">
                  FeatureSignals Pro
                </div>
                <div className="text-2xl font-bold text-[var(--fgColor-success)] tabular-nums">
                  {formatINR(999)}/mo
                </div>
                <div className="text-xs text-[var(--fgColor-subtle)] mt-0.5">
                  ~{formatUSD(12)}/mo · unlimited seats
                </div>
              </div>
            </div>

            {/* Annual savings */}
            <div
              className="mt-6 rounded-xl p-5 text-center"
              style={{
                background:
                  "linear-gradient(135deg, var(--bgColor-success-muted), var(--bgColor-accent-muted))",
              }}
            >
              <div className="text-sm font-semibold text-[var(--fgColor-muted)] mb-1">
                Annual Savings
              </div>
              <div className="text-3xl sm:text-4xl font-bold text-[var(--fgColor-success)] tabular-nums">
                <CountingNumber
                  value={result.savings.annual}
                  prefix="$"
                  duration={0.8}
                />
              </div>
              <div className="text-sm font-medium text-[var(--fgColor-success)] mt-1">
                {result.savings.percent}% less than {result.competitor.name}
              </div>
            </div>

            {/* Formula hint */}
            <p className="text-xs text-[var(--fgColor-subtle)] mt-3 text-center">
              {result.formula}
            </p>
          </div>
        </motion.div>

        {/* CTAs */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <a
            href="#live-demo"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white bg-[var(--bgColor-success-emphasis)] hover:bg-[#1c8139] active:bg-[#197935] transition-colors duration-150"
            style={{ boxShadow: "0 1px 0 0 #1f232826" }}
          >
            See the math
            <ArrowRightIcon size={16} />
          </a>
          <a
            href="https://docs.featuresignals.com/getting-started/quickstart"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-[var(--fgColor-default)] bg-[var(--bgColor-muted)] hover:bg-[#eff2f5] border border-[var(--borderColor-default)] transition-colors duration-150"
            style={{ boxShadow: "0 1px 0 0 #1f23280a" }}
          >
            <DownloadIcon size={16} />
            Self-host in 3 min
          </a>
        </motion.div>
      </div>
    </section>
  );
}
