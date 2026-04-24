import type { Metadata } from "next";
import Link from "next/link";
import { SectionReveal } from "@/components/section-reveal";
import {
  Brain,
  ArrowRight,
  Check,
  Sparkles,
  ShieldCheck,
  GitBranch,
  FileCode,
  Search,
  Bell,
  Clock,
  Zap,
  Terminal,
  AlertCircle,
  Activity,
  BarChart3,
} from "lucide-react";

export const metadata: Metadata = {
  title: "AI Janitor — Autonomous Stale Flag Cleanup",
  description:
    "FeatureSignals' AI Janitor autonomously detects stale feature flags, scans your codebase, generates cleanup PRs, and eliminates technical debt. No tickets. No sprint planning.",
  openGraph: {
    title: "AI Janitor — Autonomous Stale Flag Cleanup | FeatureSignals",
    description:
      "AI-powered stale flag detection, codebase scanning, and automated PR generation. Reclaim engineering velocity.",
  },
};

export default function AIPage() {
  return (
    <>
      {/* ==================== HERO ==================== */}
      <SectionReveal>
        <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-24 px-6 border-b border-stone-200 bg-stone-50">
          <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#292524_1px,transparent_1px)] [background-size:20px_20px]" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent" />

          <div className="max-w-6xl mx-auto text-center space-y-8 relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-sm font-medium text-accent">
              <Brain className="h-4 w-4" />
              AI-Powered
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-stone-900 leading-[1.1]">
              The AI Janitor.
              <br />
              <span className="text-accent">Your flags, cleaned.</span>
            </h1>

            <p className="text-xl text-stone-600 max-w-3xl mx-auto leading-relaxed">
              Every stale feature flag is a ticking time bomb of technical debt.
              FeatureSignals&apos;s AI scans your codebase, identifies unused
              flags, and generates cleanup pull requests — autonomously.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <a
                href="https://app.featuresignals.com/register"
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-md bg-accent text-white font-semibold shadow-md hover:bg-accent-dark transition-all"
              >
                Deploy with AI Janitor
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <Link
                href="/features"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-md bg-white text-stone-800 font-semibold border border-stone-200 shadow-sm hover:bg-stone-100 transition-all"
              >
                <Brain className="h-4 w-4" />
                Core Features
              </Link>
            </div>
          </div>
        </section>
      </SectionReveal>

      {/* ==================== THE PROBLEM ==================== */}
      <SectionReveal>
        <section className="py-20 sm:py-24 px-6 border-b border-stone-200 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-sm font-medium text-amber-800">
                <AlertCircle className="h-4 w-4" />
                The Hidden Tax
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight">
                Flag rot is silently draining your budget
              </h2>
              <p className="text-lg text-stone-600">
                Industry data shows the average enterprise has 200+ stale flags.
                Each one costs 1.5 hours per engineer per week in maintenance
                overhead. That&apos;s not velocity — it&apos;s hemorrhage.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {([
                {
                  metric: "75%",
                  label: "of flags are never cleaned up",
                  desc: "Research across 500+ engineering orgs shows most flags remain in codebases long after rollout is complete.",
                },
                {
                  metric: "200+",
                  label: "average stale flags per enterprise",
                  desc: "The average mid-to-large engineering organization carries hundreds of dead code paths from abandoned feature flags.",
                },
                {
                  metric: "40%",
                  label: "faster cleanup with AI Janitor",
                  desc: "Teams using automated detection and PR generation reclaim 40% of flag-related technical debt in the first month.",
                },
              ] as const).map(({ metric, label, desc }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-stone-200 bg-stone-50 p-6 text-center shadow-sm"
                >
                  <div className="text-4xl font-extrabold text-accent">
                    {metric}
                  </div>
                  <div className="mt-2 text-sm font-bold text-stone-900">
                    {label}
                  </div>
                  <p className="mt-2 text-sm text-stone-600">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </SectionReveal>

      {/* ==================== HOW IT WORKS ==================== */}
      <SectionReveal>
        <section className="py-20 sm:py-24 px-6 border-b border-stone-200 bg-stone-50">
          <div className="max-w-6xl mx-auto">
            <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight">
                How the AI Janitor works
              </h2>
              <p className="text-lg text-stone-600">
                Four autonomous steps from detection to merge. No human
                intervention required — unless you want it.
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              {([
                {
                  step: "01",
                  title: "Detect",
                  icon: Search,
                  desc: "AI scans your connected Git repositories for all flag references in code.",
                },
                {
                  step: "02",
                  title: "Analyze",
                  icon: BarChart3,
                  desc: "Cross-references code references with evaluation data to identify stale flags.",
                },
                {
                  step: "03",
                  title: "Generate PR",
                  icon: GitBranch,
                  desc: "Creates a pull request that removes the dead code, flag checks, and conditions.",
                },
                {
                  step: "04",
                  title: "Merge",
                  icon: Check,
                  desc: "You review and merge. Or configure auto-merge for low-risk flags after approval.",
                },
              ] as const).map(({ step, title, icon: Icon, desc }) => (
                <div
                  key={step}
                  className="group relative rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-accent/30 hover:shadow-lg"
                >
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-white shadow-lg shadow-accent/25">
                    <Icon className="h-6 w-6" strokeWidth={1.5} />
                  </div>
                  <div className="mt-3 text-xs font-bold text-accent">
                    Step {step}
                  </div>
                  <h3 className="mt-1 text-lg font-bold text-stone-900">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm text-stone-600">{desc}</p>
                  {Number(step) < 4 && (
                    <div className="absolute -right-3 top-1/2 hidden -translate-y-1/2 md:block">
                      <ArrowRight className="h-5 w-5 text-stone-300" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </SectionReveal>

      {/* ==================== CAPABILITIES ==================== */}
      <SectionReveal>
        <section className="py-20 sm:py-24 px-6 border-b border-stone-200 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight">
                AI capabilities, not gimmicks
              </h2>
              <p className="text-lg text-stone-600">
                Every AI feature is built to solve a specific engineering pain
                point. No chatbots. No flashy demos. Just infrastructure that
                works.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {([
                {
                  icon: Search,
                  title: "Deep Codebase Scanning",
                  desc: "Parses your entire repository to find all flag references, conditionals, and evaluation calls across every file.",
                },
                {
                  icon: BarChart3,
                  title: "Usage Analytics",
                  desc: "Tracks evaluation patterns over time to determine which flags are genuinely in use versus orphaned.",
                },
                {
                  icon: GitBranch,
                  title: "Autonomous PR Generation",
                  desc: "Generates well-structured pull requests that remove dead code, with clear descriptions and change summaries.",
                },
                {
                  icon: Activity,
                  title: "Anomaly Detection",
                  desc: "Monitors evaluation patterns and alerts when a flag behaves unexpectedly — before it causes an incident.",
                },
                {
                  icon: Bell,
                  title: "Smart Notifications",
                  desc: "Notifies you via Slack, email, or webhook when a flag is ready for cleanup or when anomalous behavior is detected.",
                },
                {
                  icon: ShieldCheck,
                  title: "Human-in-the-Loop",
                  desc: "All AI actions require human approval by default. Configurable auto-merge policies for low-risk cleanups.",
                },
              ] as const).map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="group flex flex-col rounded-2xl border border-stone-200 bg-stone-50 p-6 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-accent/30 hover:shadow-lg"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/20 group-hover:bg-accent/20 transition-colors">
                    <Icon className="h-6 w-6" strokeWidth={1.5} />
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-stone-900">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600 flex-1">
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </SectionReveal>

      {/* ==================== PR PREVIEW ==================== */}
      <SectionReveal>
        <section className="py-20 sm:py-24 px-6 border-b border-stone-200 bg-stone-50">
          <div className="max-w-6xl mx-auto">
            <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-sm font-medium text-accent">
                <GitBranch className="h-4 w-4" />
                AI-Generated PR
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight">
                See what the AI produces
              </h2>
              <p className="text-lg text-stone-600">
                Every generated PR includes context, code changes, and a safety
                assessment. Review and merge with confidence.
              </p>
            </div>

            <div className="max-w-3xl mx-auto bg-stone-900 rounded-2xl border border-stone-800 shadow-xl overflow-hidden">
              {/* PR Header */}
              <div className="px-6 py-4 border-b border-stone-800 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <GitBranch className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-semibold text-sm truncate">
                    [AI Janitor] Remove stale flag &ldquo;new-checkout-flow&rdquo;
                  </div>
                  <div className="text-stone-400 text-xs">
                    #342 &middot; opened by fs-ai[bot] &middot; 2 minutes ago
                  </div>
                </div>
                <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-mono font-semibold border border-emerald-500/30">
                  Open
                </span>
              </div>

              {/* PR Body */}
              <div className="px-6 py-4 space-y-4">
                <div className="text-stone-300 text-sm space-y-2">
                  <p>
                    <span className="text-accent-light font-bold">
                      Reason:
                    </span>{" "}
                    Flag <code className="text-emerald-400">new-checkout-flow</code> has been
                    100% rolled out for 45 days with zero targeting rules
                    configured.
                  </p>
                  <p>
                    <span className="text-accent-light font-bold">
                      Impact:
                    </span>{" "}
                    3 files changed, 142 lines removed, 0 lines added.
                  </p>
                </div>

                {/* Diff Preview */}
                <div className="bg-stone-950 rounded-lg border border-stone-800 overflow-hidden">
                  <div className="px-4 py-2 bg-stone-850 border-b border-stone-800 text-xs text-stone-400 font-mono">
                    src/checkout/CheckoutFlow.tsx
                  </div>
                  <div className="p-4 font-mono text-xs leading-relaxed">
                    <div className="text-stone-500">
                      &nbsp; &nbsp;const CheckoutFlow = () =&gt; &#123;
                    </div>
                    <div className="text-red-400/80">
                      - &nbsp; if (flags.variation(&ldquo;new-checkout-flow&rdquo;, &#123; key: user.id &#125;)) &#123;
                    </div>
                    <div className="text-stone-300 ml-4">
                      &nbsp; &nbsp; &nbsp;return &lt;EnhancedCheckout /&gt;;
                    </div>
                    <div className="text-red-400/80">
                      - &nbsp; &#125;
                    </div>
                    <div className="text-red-400/80">
                      - &nbsp; return &lt;LegacyCheckout /&gt;;
                    </div>
                    <div className="text-emerald-400">
                      + &nbsp; return &lt;EnhancedCheckout /&gt;;
                    </div>
                    <div className="text-stone-500">
                      &nbsp; &#125;;
                    </div>
                  </div>
                </div>

                {/* Safety assessment */}
                <div className="flex items-center gap-2 text-sm text-stone-400 pt-1">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>
                    <strong className="text-emerald-400">Safety Score:</strong>{" "}
                    98/100 — Safe to merge. No A/B tests depend on this flag.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </SectionReveal>

      {/* ==================== CONFIGURATION OPTIONS ==================== */}
      <SectionReveal>
        <section className="py-20 sm:py-24 px-6 border-b border-stone-200 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight">
                Configure cleanup to your standards
              </h2>
              <p className="text-lg text-stone-600">
                The AI Janitor adapts to your team&apos;s workflow, not the
                other way around.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {([
                {
                  icon: Clock,
                  title: "Rollout Threshold",
                  desc: "Configure how long a flag must be at 100% rollout before the AI flags it for cleanup. Default: 30 days.",
                },
                {
                  icon: ShieldCheck,
                  title: "Approval Policy",
                  desc: "Require human approval for all PRs, or enable auto-merge for low-risk flags with safety scores above 95.",
                },
                {
                  icon: Bell,
                  title: "Notification Channels",
                  desc: "Get notified via Slack, email, Discord, or webhook when cleanup PRs are generated or require attention.",
                },
                {
                  icon: Terminal,
  AlertCircle,
                  title: "Exclusion Rules",
                  desc: "Exclude specific files, directories, or flag patterns from AI scanning. Fine-grained control over what the AI touches.",
                },
              ] as const).map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-stone-200 bg-stone-50 p-6 text-left shadow-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Icon className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-stone-900">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm text-stone-600">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </SectionReveal>

      {/* ==================== SECURITY + COMPLIANCE ==================== */}
      <SectionReveal>
        <section className="py-20 sm:py-24 px-6 border-b border-stone-200 bg-stone-50">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-sm font-medium text-accent">
                <ShieldCheck className="h-4 w-4" />
                Enterprise-Grade Safety
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight">
                AI you can trust with your codebase
              </h2>
              <p className="text-lg text-stone-600 leading-relaxed">
                We understand that giving an AI write access to your repository
                is a big step. That&apos;s why every AI action is logged,
                auditable, and configurable. The AI never merges without your
                explicit approval — unless you configure auto-merge.
              </p>
              <ul className="space-y-3">
                {([
                  "All PRs are human-reviewed by default",
                  "Tamper-evident audit trail for every AI action",
                  "Configurable auto-merge with safety score thresholds",
                  "Zero code is sent to third-party AI providers",
                  "On-premise AI inference for air-gapped deployments",
                ] as const).map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-stone-700"
                  >
                    <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-stone-900 p-8 rounded-2xl border border-stone-800 shadow-xl">
              <h3 className="text-white font-bold text-lg mb-4">
                AI Governance Dashboard
              </h3>
              <div className="space-y-4">
                {([
                  { label: "Total Cleanup PRs Generated", value: "47", color: "text-accent-light" },
                  { label: "PRs Merged", value: "42", color: "text-emerald-400" },
                  { label: "PRs Rejected", value: "5", color: "text-amber-400" },
                  { label: "Lines of Dead Code Removed", value: "12,847", color: "text-accent-light" },
                  { label: "Avg. Safety Score", value: "96.2/100", color: "text-emerald-400" },
                ] as const).map(({ label, value, color }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between border-b border-stone-800 pb-3 last:border-0"
                  >
                    <span className="text-stone-400 text-sm">{label}</span>
                    <span className={`font-bold font-mono ${color}`}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </SectionReveal>

      {/* ==================== FAQ ==================== */}
      <SectionReveal>
        <section className="py-20 sm:py-24 px-6 bg-white">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight text-center mb-12">
              Frequently asked questions
            </h2>

            <div className="space-y-6">
              {([
                {
                  q: "How does the AI Janitor detect stale flags?",
                  a: "The AI scans your connected Git repositories to find all flag references. It cross-references these with the evaluation data from your FeatureSignals account — if a flag has been 100% rolled out for a configurable threshold (default 30 days) and has no targeting rules, it's marked as stale.",
                },
                {
                  q: "Does the AI Janitor have write access to my repositories?",
                  a: "By default, the AI generates PRs that require human review and merge. You can optionally configure auto-merge for flags with high safety scores. All AI actions are logged in the audit trail.",
                },
                {
                  q: "Can I use AI Janitor with self-hosted FeatureSignals?",
                  a: "Yes. The AI Janitor runs as part of the FeatureSignals server. For air-gapped deployments, AI inference happens entirely within your VPC — no data leaves your infrastructure.",
                },
                {
                  q: "Which Git providers are supported?",
                  a: "GitHub, GitLab, and Bitbucket are supported. The AI connects via your existing OAuth integration or a dedicated deploy key with read access to your repositories.",
                },
                {
                  q: "Can I exclude certain files or directories from scanning?",
                  a: "Absolutely. You can configure exclusion rules at the project level to skip specific files, directories, or flag patterns. The AI respects your .gitignore rules by default.",
                },
                {
                  q: "Does the AI Janitor work with flags created before I started using FeatureSignals?",
                  a: "Yes. During your migration or initial setup, the AI can scan your entire history to identify pre-existing stale flags. It will generate cleanup PRs for all of them.",
                },
              ] as const).map(({ q, a }) => (
                <details
                  key={q}
                  className="group rounded-2xl border border-stone-200 bg-stone-50 p-6 shadow-sm open:border-accent/30 open:ring-1 open:ring-accent/20 transition-all"
                >
                  <summary className="flex items-start justify-between cursor-pointer list-none">
                    <span className="text-base font-bold text-stone-900 pr-4">
                      {q}
                    </span>
                    <span className="text-accent text-lg font-mono group-open:rotate-45 transition-transform shrink-0">
                      +
                    </span>
                  </summary>
                  <p className="mt-4 text-sm text-stone-600 leading-relaxed">
                    {a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </SectionReveal>

      {/* ==================== CTA ==================== */}
      <SectionReveal>
        <section className="mx-auto max-w-6xl px-6 pb-16 sm:pb-24 pt-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 px-6 py-16 text-center sm:px-12 sm:py-20">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)",
                backgroundSize: "32px 32px",
              }}
            />

            <div className="relative">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent-light">
                <Brain className="h-4 w-4" />
                Stop cleaning flags. Start shipping.
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Ready to eliminate flag rot?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-stone-300 sm:text-lg">
                The AI Janitor is available on the Pro plan. Start your 14-day
                free trial — no credit card required.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <a
                  href="https://app.featuresignals.com/register"
                  className="group inline-flex items-center justify-center rounded-xl bg-accent px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-accent-dark hover:shadow-xl"
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </a>
                <Link
                  href="/features"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-white/10"
                >
                  <Brain className="h-4 w-4" />
                  Explore Core Features
                </Link>
              </div>
            </div>
          </div>
        </section>
      </SectionReveal>
    </>
  );
}
