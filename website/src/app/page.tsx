import { CalculatorProvider } from "@/lib/calculator-context";
import { HeroCalculator } from "@/components/hero-calculator";
import { PricingSection } from "@/components/pricing-section";
import { FinalCta } from "@/components/final-cta";
import { CheckCircleFillIcon } from "@primer/octicons-react";
import Link from "next/link";

/**
 * FeatureSignals Homepage — Release Infrastructure Platform
 *
 * Narrative-driven. Each section answers "what does this do for my team?"
 * Not "here are features we have."
 */

export default function HomePage() {
  return (
    <CalculatorProvider>
      {/* 1. Hero */}
      <HeroCalculator />

      {/* 2. The Platform — story-driven sections, alternating layout */}
      <ShipFaster />
      <StopFlagRot />
      <MigrateWithoutFear />
      <TrustSection />
      <PricingSection />
      <FinalCta />
    </CalculatorProvider>
  );
}

/** Section: Ship faster with confidence */
function ShipFaster() {
  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-semibold text-[var(--fgColor-accent)] uppercase tracking-wider">
              Release Management + Experiments
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[var(--fgColor-default)] tracking-tight leading-tight">
              Ship faster. Roll back instantly. Know what works.
            </h2>
            <p className="mt-4 text-base text-[var(--fgColor-muted)] leading-relaxed max-w-lg">
              Deploy code to production behind feature flags. Roll out gradually to 1%, 10%, 100%.
              If something breaks, kill the flag in one click — no redeploy, no downtime.
              Run A/B experiments with weighted variants and impression tracking to measure
              what actually moves your metrics. Built into every plan, not a paid add-on.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/create"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[var(--bgColor-accent-emphasis)] hover:opacity-90 transition-opacity shadow-sm"
              >
                Try the demo →
              </Link>
              <a
                href="https://docs.featuresignals.com"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium text-[var(--fgColor-default)] border border-[var(--borderColor-default)] hover:bg-[var(--bgColor-muted)] transition-colors"
              >
                Read the docs
              </a>
            </div>
          </div>
          <div className="relative">
            <div className="rounded-2xl border border-[var(--borderColor-default)] bg-[var(--bgColor-inset)] p-8 shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-sm font-medium text-[var(--fgColor-default)]">Production deploy v2.4.1</p>
                </div>
                <div className="h-2 w-full rounded-full bg-[var(--borderColor-default)] overflow-hidden">
                  <div className="h-full w-[15%] rounded-full bg-[var(--fgColor-accent)]" />
                </div>
                <p className="text-xs text-[var(--fgColor-muted)]">Rolling out to 15% of users · 0 errors</p>
                <div className="h-px bg-[var(--borderColor-default)]" />
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><p className="text-[var(--fgColor-muted)]">Flags active</p><p className="font-bold tabular-nums text-[var(--fgColor-default)]">47</p></div>
                  <div><p className="text-[var(--fgColor-muted)]">Eval latency</p><p className="font-bold tabular-nums text-[var(--fgColor-default)]">0.4ms</p></div>
                  <div><p className="text-[var(--fgColor-muted)]">Experiments</p><p className="font-bold tabular-nums text-[var(--fgColor-default)]">3 running</p></div>
                  <div><p className="text-[var(--fgColor-muted)]">Last 24h evals</p><p className="font-bold tabular-nums text-[var(--fgColor-default)]">12.4M</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Section: Stop flag rot */
function StopFlagRot() {
  return (
    <section className="py-20 sm:py-28 bg-[var(--bgColor-inset)]">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1 relative">
            <div className="rounded-2xl border border-[var(--borderColor-default)] bg-white p-8 shadow-sm">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[var(--fgColor-default)]">AI Janitor · Last scan</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">2h ago</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-lg bg-[var(--bgColor-inset)]">
                    <p className="text-2xl font-bold tabular-nums text-[var(--fgColor-default)]">12</p>
                    <p className="text-xs text-[var(--fgColor-muted)]">Stale flags found</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--bgColor-inset)]">
                    <p className="text-2xl font-bold tabular-nums text-[var(--fgColor-default)]">3</p>
                    <p className="text-xs text-[var(--fgColor-muted)]">PRs created</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--bgColor-inset)]">
                    <p className="text-2xl font-bold tabular-nums text-[var(--fgColor-default)]">1,240</p>
                    <p className="text-xs text-[var(--fgColor-muted)]">Dead LOC removed</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="order-1 md:order-2">
            <span className="text-xs font-semibold text-[var(--fgColor-accent)] uppercase tracking-wider">
              AI Janitor
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[var(--fgColor-default)] tracking-tight leading-tight">
              Your codebase has dead flags. The AI Janitor finds them.
            </h2>
            <p className="mt-4 text-base text-[var(--fgColor-muted)] leading-relaxed max-w-lg">
              Engineering teams forget to remove flags after launches. Over time, they accumulate —
              cluttering code, confusing new developers, and hiding real bugs. The AI Janitor scans
              your repositories, identifies flags that haven&apos;t been toggled in months, analyzes
              whether they&apos;re safe to remove, and opens pull requests with the fixes automatically.
            </p>
            <div className="mt-6">
              <Link
                href="/cleanup"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[var(--bgColor-accent-emphasis)] hover:opacity-90 transition-opacity shadow-sm"
              >
                See it in action →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Section: Migrate without fear */
function MigrateWithoutFear() {
  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-semibold text-[var(--fgColor-accent)] uppercase tracking-wider">
              Migration + OpenFeature
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[var(--fgColor-default)] tracking-tight leading-tight">
              Already on LaunchDarkly? Switch in minutes, not months.
            </h2>
            <p className="mt-4 text-base text-[var(--fgColor-muted)] leading-relaxed max-w-lg">
              Import your flags, environments, segments, and targeting rules from LaunchDarkly,
              ConfigCat, Flagsmith, or Unleash with our built-in migration engine. Dry-run first
              to see exactly what will be migrated. And because every SDK implements OpenFeature
              natively, switching providers is a one-line code change — zero vendor lock-in.
            </p>
            <div className="mt-6">
              <Link
                href="/migrate"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[var(--bgColor-accent-emphasis)] hover:opacity-90 transition-opacity shadow-sm"
              >
                Preview your migration →
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="rounded-2xl border border-[var(--borderColor-default)] bg-[var(--bgColor-inset)] p-8 shadow-sm">
              <p className="text-sm font-semibold text-[var(--fgColor-default)] mb-4">Migration preview</p>
              <div className="space-y-3">
                {[
                  { name: "LaunchDarkly", flags: 142, envs: 3, savings: "98%" },
                  { name: "ConfigCat", flags: 89, envs: 2, savings: "74%" },
                  { name: "Flagsmith", flags: 56, envs: 2, savings: "93%" },
                ].map((p) => (
                  <div key={p.name} className="flex items-center justify-between py-2 border-b border-[var(--borderColor-default)] last:border-0">
                    <div>
                      <p className="text-sm font-medium text-[var(--fgColor-default)]">{p.name}</p>
                      <p className="text-xs text-[var(--fgColor-muted)]">{p.flags} flags · {p.envs} environments</p>
                    </div>
                    <span className="text-sm font-bold text-emerald-600 tabular-nums">Save {p.savings}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Section: Trust indicators */
function TrustSection() {
  const items = [
    { label: "Apache 2.0", desc: "Open source. Self-host or cloud. No vendor lock-in." },
    { label: "SOC 2 Type II", desc: "Audit in progress. Controls mapped and documented." },
    { label: "OpenFeature Native", desc: "All 8 SDKs. Switch providers without code changes." },
    { label: "Sub-millisecond", desc: "Stateless eval engine. No DB calls on hot path." },
    { label: "8 SDK Languages", desc: "Go, Node, Python, Java, .NET, Ruby, React, Vue." },
    { label: "Single Binary", desc: "One Go binary. Docker or bare metal. No JVM, no bloat." },
  ];

  return (
    <section className="py-16 sm:py-20 bg-[var(--bgColor-inset)]">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--fgColor-default)] tracking-tight">
            Built for teams that can&apos;t afford downtime
          </h2>
          <p className="text-base text-[var(--fgColor-muted)] mt-2 max-w-xl mx-auto">
            Open source. SOC 2. Sub-millisecond. No vendor lock-in.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.label} className="flex items-start gap-3 p-4 rounded-xl bg-white border border-[var(--borderColor-default)]">
              <CheckCircleFillIcon size={16} className="mt-0.5 shrink-0 text-emerald-500" />
              <div>
                <p className="text-sm font-semibold text-[var(--fgColor-default)]">{item.label}</p>
                <p className="text-xs text-[var(--fgColor-muted)] mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
