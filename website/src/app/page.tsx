"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { SectionReveal } from "@/components/section-reveal";
import {
  ArrowRight,
  Brain,
  Check,
  Cloud,
  Code,
  DollarSign,
  FlaskConical,
  Play,
  Rocket,
  ShieldCheck,
  Sparkles,
  Zap,
  GitBranch,
  TrendingUp,
  Users,
  X,
  Download,
  Terminal,
  Flag,
  BarChart3,
  Activity,
} from "lucide-react";
import { logoPlaceholders, trustMetrics, trustedBy } from "@/data/testimonials";

export default function HomePage() {
  const [teamSize, setTeamSize] = useState(50);

  const calculateRot = (size: number) => {
    return (size * 75 * 52 * 1.5).toLocaleString();
  };

  const terminalHtml = [
    '<span class="text-stone-500"># Deploy in 3 minutes</span>',
    '<span class="text-accent">git clone</span> https://github.com/dinesh-g1/featuresignals',
    '<span class="text-accent">cd</span> featuresignals',
    '<span class="text-accent">docker compose up</span> -d',
    "",
    '<span class="text-stone-500"># Evaluate from any language</span>',
    `<span class="text-accent-light">import</span> featuresignals <span class="text-accent-light">from</span> <span class="text-emerald-400">'@featuresignals/node'</span>;`,
    `<span class="text-accent-light">const</span> client = featuresignals.init(<span class="text-emerald-400">'sdk-key'</span>, { envKey: <span class="text-emerald-400">'production'</span> });`,
    `client.boolVariation(<span class="text-emerald-400">'new-checkout'</span>, user, <span class="text-amber-400">false</span>);`,
  ].join("<br />");

  return (
    <>
      {/* ==================== HERO SECTION ==================== */}
      <SectionReveal>
        <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-24 px-6 border-b border-stone-200 bg-stone-50">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#292524_1px,transparent_1px)] [background-size:20px_20px]" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent" />

          <div className="max-w-6xl mx-auto text-center space-y-8 relative z-10">
            {/* Top badges */}
            <div className="flex justify-center items-center gap-3 flex-wrap">
              <span className="bg-white border border-stone-200 text-stone-600 text-xs px-3 py-1.5 rounded-full font-mono shadow-sm">
                SOC 2 Type II
              </span>
              <span className="bg-white border border-stone-200 text-stone-600 text-xs px-3 py-1.5 rounded-full font-mono shadow-sm">
                OpenFeature Native
              </span>
              <span className="bg-accent/10 border border-accent/20 text-accent text-xs px-3 py-1.5 rounded-full font-mono shadow-sm font-semibold">
                Apache 2.0
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-stone-900 leading-[1.1]">
              Mission-critical flags.<br />
              <span className="text-accent">Zero vendor lock-in.</span>
            </h1>

            <p className="text-xl text-stone-600 max-w-3xl mx-auto leading-relaxed">
              The control plane for software delivery. Sub-millisecond latency.
              Automated tech-debt cleanup. We integrate natively with Terraform
              and charge for infrastructure — <strong className="text-stone-900">never by Monthly Active Users.</strong>
            </p>

            {/* Dual CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <a
                href="https://app.featuresignals.com/register"
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-md bg-accent text-white font-semibold shadow-md hover:bg-accent-dark transition-all"
              >
                Deploy in 3 Minutes
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href="#migration"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-md bg-white text-stone-800 font-semibold border border-stone-200 shadow-sm hover:bg-stone-100 transition-all"
              >
                <Download className="h-4 w-4" />
                Migrate from LaunchDarkly
              </a>
            </div>

            {/* Terminal command */}
            <p className="text-sm text-stone-500 font-mono mt-2 font-medium">
              {`> fs migrate --from=launchdarkly --project=core`}
            </p>
          </div>
        </section>
      </SectionReveal>

      {/* ==================== TRUSTED BY + METRICS ==================== */}
      <SectionReveal>
        <section className="border-y border-stone-100 bg-white py-8 sm:py-10">
          <div className="mx-auto max-w-6xl px-6">
            <p className="mb-6 text-center text-xs font-semibold uppercase tracking-wider text-stone-400">
              Trusted by engineering teams at
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 sm:gap-x-12">
              {logoPlaceholders.map((name) => (
                <div
                  key={name}
                  className="text-sm font-bold text-stone-300 sm:text-base"
                >
                  {name}
                </div>
              ))}
            </div>
          </div>
        </section>
      </SectionReveal>

      {/* Metrics row */}
      <SectionReveal>
        <section className="border-y border-stone-100 bg-stone-50 py-10 sm:py-14">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              {(
                [
                  [trustMetrics.evaluationsPerMonth, "Evaluations / month"],
                  [trustMetrics.organizations, "Organizations"],
                  [trustMetrics.developers, "Developers"],
                  [trustMetrics.uptime, "Uptime SLA"],
                ] as const
              ).map(([value, label]) => (
                <div key={label} className="text-center">
                  <div className="text-3xl font-extrabold text-accent sm:text-4xl">
                    {value}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-stone-900">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </SectionReveal>

      {/* ==================== PROBLEM → SOLUTION ==================== */}
      <SectionReveal>
        <section className="mx-auto max-w-6xl px-6 py-16 text-center sm:py-24">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-stone-900">
            Feature flags should solve problems, not create them
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-stone-600">
            Most teams end up with hundreds of stale flags, surprise bills, and
            vendor lock-in. FeatureSignals was built to fix all three.
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {(
              [
                {
                  problem: "Stale flags pile up as technical debt",
                  solution:
                    "AI scans your codebase, finds unused flags, and generates cleanup PRs for your review. We call it the AI Janitor.",
                },
                {
                  problem: "Surprise bills from per-seat pricing",
                  solution:
                    "Flat-rate pricing. Unlimited MAUs, unlimited seats. No per-seat, per-MAU, or per-evaluation fees. Ever.",
                },
                {
                  problem: "Vendor lock-in with proprietary systems",
                  solution:
                    "Apache-2.0 open source. Self-host anywhere. OpenFeature SDKs — switch providers without code changes.",
                },
              ] as const
            ).map(({ problem, solution }) => (
              <div
                key={problem}
                className="rounded-2xl border border-stone-200 bg-white p-6 text-left shadow-sm"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-red-600">
                  <X className="h-4 w-4" />
                  {problem}
                </div>
                <div className="my-4 border-t border-stone-100" />
                <div className="flex items-start gap-2 text-sm text-stone-600">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  {solution}
                </div>
              </div>
            ))}
          </div>
        </section>
      </SectionReveal>

      {/* ==================== ARCHITECTURE (Dark Contrast Card) ==================== */}
      <SectionReveal>
        <section className="py-20 sm:py-24 px-6 border-b border-stone-200 bg-white">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-sm font-medium text-accent">
                <Zap className="h-4 w-4" />
                100% Availability Architecture
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight">
                Built for 100% Availability.
              </h2>
              <p className="text-lg text-stone-600 leading-relaxed">
                If our core API goes down, your application shouldn't. Our
                decentralized edge architecture ensures zero-downtime
                evaluations, while background polling keeps your latency
                strictly under 5ms globally.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <div className="border border-stone-200 bg-stone-50 text-stone-700 font-mono text-xs px-3 py-1.5 rounded-md">
                  Sub 1ms Latency
                </div>
                <div className="border border-stone-200 bg-stone-50 text-stone-700 font-mono text-xs px-3 py-1.5 rounded-md">
                  Zero PII Egress
                </div>
                <div className="border border-stone-200 bg-stone-50 text-stone-700 font-mono text-xs px-3 py-1.5 rounded-md">
                  100% Uptime Resiliency
                </div>
              </div>
            </div>

            <div className="bg-stone-900 p-10 rounded-2xl border border-stone-800 shadow-xl w-full relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 text-stone-800 text-9xl opacity-30">
                ⚑
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 relative z-10">
                The Hybrid-Edge Architecture
              </h3>
              <p className="text-stone-300 text-base leading-relaxed mb-8 relative z-10">
                To win enterprise and startup alike, the control plane (UI, RBAC,
                Audit) is managed SaaS, while the data plane runs at the edge
                (Cloudflare Workers / Fastly) or entirely within your VPC via a
                lightweight binary sidecar.
              </p>
              <div className="flex flex-wrap gap-4 relative z-10">
                <div className="border border-stone-700 bg-stone-800 text-stone-200 font-mono text-sm px-4 py-2 rounded-md">
                  &#9664; Control Plane (SaaS)
                </div>
                <div className="border border-stone-700 bg-stone-800 text-stone-200 font-mono text-sm px-4 py-2 rounded-md">
                  Data Plane (Edge) &#9654;
                </div>
              </div>
              {/* Architecture flow */}
              <div className="mt-6 grid grid-cols-3 gap-3 relative z-10">
                {[
                  { label: "API Server", desc: "REST + SSE" },
                  { label: "Edge Cache", desc: "Sub-1ms eval" },
                  { label: "Local Sidecar", desc: "Air-gapped" },
                ].map(({ label, desc }) => (
                  <div
                    key={label}
                    className="bg-stone-800/50 border border-stone-700 rounded-lg p-3 text-center"
                  >
                    <div className="text-accent-light text-xs font-bold">
                      {label}
                    </div>
                    <div className="text-stone-400 text-[10px] mt-0.5">
                      {desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </SectionReveal>

      {/* ==================== WHY FEATURESIGNALS (6 cards) ==================== */}
      <SectionReveal>
        <section className="mx-auto max-w-6xl px-6 py-16 text-center sm:py-24">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-stone-900">
            Why engineering teams choose FeatureSignals
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-stone-600">
            Built for developers who value speed, control, and transparency. No
            vendor lock-in. No surprise bills.
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                {
                  Icon: DollarSign,
                  title: "Predictable Pricing",
                  description:
                    "No per-seat fees. No per-MAU charges. No hidden costs. Just ₹999/month for unlimited everything.",
                  link: "/pricing",
                  linkLabel: "See pricing",
                },
                {
                  Icon: Brain,
                  title: "AI Janitor",
                  description:
                    "AI scans your codebase, identifies stale flags, analyzes usage patterns, and generates cleanup pull requests automatically. You just review and merge.",
                  link: "/features/ai",
                  linkLabel: "Explore AI features",
                },
                {
                  Icon: ShieldCheck,
                  title: "Enterprise Governance",
                  description:
                    "RBAC, tamper-evident audit logs, approval workflows, SSO (SAML/OIDC), SCIM, IP allowlists. Deploy on your infrastructure or ours.",
                  link: "/features/security",
                  linkLabel: "Security details",
                },
                {
                  Icon: FlaskConical,
                  title: "A/B Experimentation",
                  description:
                    "Built-in variant assignment with consistent hashing, weighted splits, mutual exclusion groups, and impression tracking for analytics.",
                  link: "/features",
                  linkLabel: "See experimentation",
                },
                {
                  Icon: Zap,
                  title: "Sub-millisecond Edge",
                  description:
                    "SSE streaming pushes flag changes to SDKs instantly. Sub-1ms local evaluation. Relay proxy for edge deployments.",
                  link: "/features",
                  linkLabel: "See flag engine",
                },
                {
                  Icon: Code,
                  title: "SDKs for Every Stack",
                  description:
                    "Go, Node.js, Python, Java, C#, Ruby, React, Vue — all with OpenFeature providers. Switch providers without code changes.",
                  link: "https://docs.featuresignals.com/sdks/overview",
                  linkLabel: "View SDKs",
                  external: true as const,
                },
              ] as const
            ).map(({ Icon, title, description, link, linkLabel, ...rest }) => (
              <div
                key={title}
                className="group flex flex-col rounded-2xl border border-stone-200 bg-white p-6 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-accent/30 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/20 transition-colors group-hover:bg-accent/20">
                  <Icon className="h-6 w-6" strokeWidth={1.5} />
                </div>
                <h3 className="mt-5 text-lg font-bold text-stone-900">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600 flex-1">
                  {description}
                </p>
                <Link
                  href={link}
                  {...("external" in rest
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent transition-colors hover:text-accent-dark"
                >
                  {linkLabel}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            ))}
          </div>
        </section>
      </SectionReveal>

      {/* ==================== FLAG ROT AI JANITOR ==================== */}
      <SectionReveal>
        <section
          id="flag-rot"
          className="py-20 sm:py-24 px-6 border-y border-stone-200 bg-stone-50"
        >
          <div className="max-w-7xl mx-auto space-y-16">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-sm font-medium text-amber-800">
                <Brain className="h-4 w-4" />
                The AI Janitor
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight">
                The hidden tax on engineering velocity.
              </h2>
              <p className="text-lg text-stone-600">
                Every stale feature flag is a logic path that must be tested and
                maintained. FeatureSignals' AI Janitor eradicates debt
                autonomously.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-start">
              {/* Left: Calculator */}
              <div className="space-y-8">
                <p className="text-stone-700 leading-relaxed text-lg">
                  When a feature reaches 100% rollout, our engine automatically
                  issues a GitHub Pull Request to delete the dead code. No
                  tickets. No sprint planning. Just clean code.
                </p>

                <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm">
                  <h3 className="text-xl font-bold text-stone-900 mb-6">
                    Calculate Your Flag Rot Liability
                  </h3>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-sm font-semibold text-stone-700">
                          Engineering Team Size
                        </label>
                        <span className="text-accent font-mono font-bold text-lg">
                          {teamSize}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="500"
                        value={teamSize}
                        onChange={(e) => setTeamSize(Number(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-stone-400 mt-1">
                        <span>5 engineers</span>
                        <span>500 engineers</span>
                      </div>
                    </div>
                    <div className="pt-6 border-t border-stone-200">
                      <div className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-2">
                        Annual Financial Hemorrhage
                      </div>
                      <div className="text-4xl sm:text-5xl font-extrabold text-stone-900 tracking-tight">
                        $<span className="text-accent">{calculateRot(teamSize)}</span>
                      </div>
                      <p className="text-xs text-stone-400 mt-2">
                        Based on $75/hr blended cost × 1.5 hrs/week wasted per
                        engineer on stale flags
                      </p>
                    </div>
                  </div>
                </div>

                <a
                  href="https://app.featuresignals.com/register"
                  className="inline-flex items-center gap-2 text-accent font-semibold hover:text-accent-dark transition-colors"
                >
                  Start recovering that cost today
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>

              {/* Right: Flag Configuration UI Recreation */}
              <div className="bg-stone-200 p-8 rounded-2xl border border-stone-300 h-full flex flex-col justify-center">
                <div className="mb-4 text-stone-600 text-sm flex items-center gap-2">
                  <span className="text-accent text-lg">⚙</span>
                  <span className="font-bold text-stone-800">
                    Live: Flag Configuration Card
                  </span>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 w-full">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-bold text-stone-900">
                          New Checkout Flow
                        </h3>
                        <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded font-semibold border border-emerald-200">
                          Operational
                        </span>
                      </div>
                      <div className="text-stone-500 font-mono text-sm">
                        key:{" "}
                        <span className="bg-stone-100 px-1 py-0.5 rounded text-stone-700 border border-stone-200">
                          new-checkout-flow
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="bg-accent px-3 py-1 text-white text-xs font-bold rounded-full">
                        ON
                      </span>
                    </div>
                  </div>

                  <hr className="border-stone-100 mb-6" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                        Targeting Rules
                      </div>
                      <div className="bg-stone-50 border border-stone-200 rounded p-4 text-sm space-y-2">
                        <div className="text-stone-700">
                          IF{" "}
                          <span className="bg-accent/10 text-accent-dark font-mono px-1 rounded">
                            user.plan
                          </span>{" "}
                          EQUALS{" "}
                          <span className="bg-stone-200 text-stone-800 font-mono px-1 rounded">
                            &apos;enterprise&apos;
                          </span>
                        </div>
                        <div className="text-stone-700">
                          SERVE{" "}
                          <span className="text-emerald-600 font-bold">
                            True (100%)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                        AI Janitor Status
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded p-4">
                        <div className="flex items-center space-x-2 text-amber-800 font-bold text-sm mb-2">
                          <Activity className="h-4 w-4 text-amber-500" />
                          <span>Flag is 100% rolled out</span>
                        </div>
                        <p className="text-amber-700 text-xs mb-4">
                          Active in Production for 45 days. Ready for cleanup.
                        </p>
                        <button className="bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold px-3 py-1.5 rounded shadow-sm hover:bg-amber-200 transition-colors">
                          Generate Cleanup PR
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </SectionReveal>

      {/* ==================== HOW IT WORKS ==================== */}
      <SectionReveal>
        <section className="border-y border-stone-100 bg-white py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-stone-900">
              Up and running in 3 minutes
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-stone-600">
              Three steps from zero to shipping features safely.
            </p>

            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {(
                [
                  {
                    step: "1",
                    title: "Create a flag",
                    description:
                      "Define your flag with targeting rules, percentage rollouts, and environment-specific states.",
                    icon: Flag,
                  },
                  {
                    step: "2",
                    title: "Integrate your SDK",
                    description:
                      "Drop in one of our 8 SDKs (Go, Node, Python, Java, C#, Ruby, React, Vue). All support OpenFeature.",
                    icon: GitBranch,
                  },
                  {
                    step: "3",
                    title: "Ship with confidence",
                    description:
                      "Roll out gradually, A/B test, use kill switches. AI monitors and cleans up stale flags automatically.",
                    icon: Rocket,
                  },
                ] as const
              ).map(({ step, title, description, icon: Icon }, i) => (
                <div
                  key={step}
                  className="group relative rounded-2xl border border-stone-200 bg-stone-50 p-6 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-accent/30 hover:shadow-lg"
                >
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-white shadow-lg shadow-accent/25 transition-colors group-hover:bg-accent-dark">
                    <Icon className="h-6 w-6" strokeWidth={1.5} />
                  </div>
                  <div className="mt-3 text-xs font-bold text-accent">
                    Step {step}
                  </div>
                  <h3 className="mt-1 text-lg font-bold text-stone-900">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm text-stone-600">{description}</p>
                  {i < 2 && (
                    <div className="absolute -right-3 top-1/2 hidden -translate-y-1/2 sm:block">
                      <ArrowRight className="h-5 w-5 text-stone-300" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </SectionReveal>

      {/* ==================== AI CAPABILITIES SPOTLIGHT ==================== */}
      <SectionReveal>
        <section className="relative overflow-hidden bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 py-16 text-white sm:py-24">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)",
              backgroundSize: "40px 40px",
            }}
          />

          <div className="relative mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent-light">
                <Brain className="h-4 w-4" />
                AI Where It Matters
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                AI-powered flag lifecycle management
              </h2>
              <p className="mt-4 text-lg text-stone-300">
                AI that solves the #1 pain point in feature flags: stale flag
                cleanup. No gimmicks. No chatbots. Just infrastructure that
                works.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {(
                [
                  {
                    title: "AI Flag Cleanup",
                    description:
                      "Scans codebase, identifies stale flags, generates cleanup PRs. Human reviews and approves.",
                    icon: Check,
                  },
                  {
                    title: "AI Anomaly Detection",
                    description:
                      "Monitors evaluation patterns, detects anomalies, alerts with root cause analysis.",
                    icon: Sparkles,
                  },
                  {
                    title: "AI Incident Response",
                    description:
                      "Correlates flag changes with errors, suggests rollback. Human approves one-click revert.",
                    icon: ShieldCheck,
                  },
                ] as const
              ).map(({ title, description, icon: Icon }) => (
                <div
                  key={title}
                  className="group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all hover:border-accent/40 hover:bg-white/10"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/20 text-accent-light ring-1 ring-accent/30 transition-colors group-hover:bg-accent/30">
                    <Icon className="h-6 w-6" strokeWidth={1.5} />
                  </div>
                  <h3 className="mt-4 text-lg font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-300">
                    {description}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link
                href="/features/ai"
                className="group inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold transition-colors hover:bg-white/10"
              >
                Explore all AI capabilities
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </section>
      </SectionReveal>

      {/* ==================== TESTIMONIALS ==================== */}
      <SectionReveal>
        <section className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-stone-900">
              What engineering teams are saying
            </h2>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {trustedBy.map(({ quote, name, title, company }) => (
              <blockquote
                key={name}
                className="flex flex-col rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
              >
                <p className="flex-1 text-sm leading-relaxed text-stone-600">
                  &ldquo;{quote}&rdquo;
                </p>
                <div className="mt-5 flex items-center gap-3 border-t border-stone-100 pt-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                    {name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-stone-900">
                      {name}
                    </div>
                    <div className="text-xs text-stone-500">
                      {title}, {company}
                    </div>
                  </div>
                </div>
              </blockquote>
            ))}
          </div>
        </section>
      </SectionReveal>

      {/* ==================== VS LAUNCHDARKLY (KILL SHOT) ==================== */}
      <SectionReveal>
        <section className="border-y border-stone-100 bg-stone-50 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-stone-900">
                FeatureSignals vs LaunchDarkly
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-stone-600">
                Same enterprise features. Open-source. Predictable pricing.
                One-click migration.
              </p>
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {(
                [
                  {
                    metric: "₹999/mo",
                    vs: "$12/connection",
                    label: "Pro plan pricing",
                    detail: "Unlimited everything. No per-seat fees.",
                  },
                  {
                    metric: "Apache-2.0",
                    vs: "Proprietary",
                    label: "Open-source licensed",
                    detail: "Self-host anywhere. Full code access.",
                  },
                  {
                    metric: "AI Janitor",
                    vs: "Manual cleanup",
                    label: "Stale flag cleanup",
                    detail: "AI scans code, generates PRs. Human approves.",
                  },
                ] as const
              ).map(({ metric, vs, label, detail }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm"
                >
                  <div className="flex items-center justify-center gap-4">
                    <div>
                      <div className="text-2xl font-extrabold text-accent">
                        {metric}
                      </div>
                      <div className="text-xs text-stone-500">
                        FeatureSignals
                      </div>
                    </div>
                    <div className="text-stone-300 font-bold">vs</div>
                    <div>
                      <div className="text-2xl font-extrabold text-stone-400">
                        {vs}
                      </div>
                      <div className="text-xs text-stone-500">LaunchDarkly</div>
                    </div>
                  </div>
                  <div className="mt-4 text-sm font-semibold text-stone-900">
                    {label}
                  </div>
                  <div className="mt-1 text-xs text-stone-500">{detail}</div>
                </div>
              ))}
            </div>

            {/* Kill-shot callout */}
            <div className="mt-8">
              <div className="mx-auto max-w-xl rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-center">
                <p className="text-sm text-amber-800">
                  <span className="font-semibold">Here&apos;s the thing:</span>{" "}
                  LaunchDarkly charges $12 per connection. A typical 100-person
                  engineering org pays $12,000/month. We charge ₹999 (~$12).
                  <br />
                  <span className="font-bold">
                    You do the math. Then migrate.
                  </span>
                </p>
              </div>
            </div>

            <div className="mt-8 text-center">
              <a
                href="#migration"
                className="group inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-accent-dark hover:shadow-md"
              >
                Start your migration
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>
          </div>
        </section>
      </SectionReveal>

      {/* ==================== MIGRATION (ESCAPE HATCH) ==================== */}
      <SectionReveal>
        <section
          id="migration"
          className="py-20 sm:py-24 px-6 border-b border-stone-200 bg-white"
        >
          <div className="max-w-6xl mx-auto">
            <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-sm font-medium text-accent">
                <Download className="h-4 w-4" />
                The Escape Hatch
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight">
                Migrate from any provider in under an hour
              </h2>
              <p className="text-lg text-stone-600">
                We import your flags, environments, targeting rules, and SDK
                configuration — preserving your exact evaluation logic.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {(
                [
                  {
                    name: "LaunchDarkly",
                    pain: "$12/connection/month",
                    users: "10,000+ teams",
                    cmd: "fs migrate --from=launchdarkly",
                    color: "text-amber-600",
                    bg: "bg-amber-50 border-amber-200",
                  },
                  {
                    name: "Unleash",
                    pain: "$80/month (Pro)",
                    users: "5,000+ teams",
                    cmd: "fs migrate --from=unleash",
                    color: "text-stone-700",
                    bg: "bg-stone-100 border-stone-200",
                  },
                  {
                    name: "Flagsmith",
                    pain: "$45/month (Cloud Pro)",
                    users: "2,000+ teams",
                    cmd: "fs migrate --from=flagsmith",
                    color: "text-blue-600",
                    bg: "bg-blue-50 border-blue-200",
                  },
                ] as const
              ).map(({ name, pain, users, cmd, color, bg }) => (
                <div
                  key={name}
                  className={`rounded-2xl ${bg} p-8 shadow-sm flex flex-col`}
                >
                  <h3 className={`text-xl font-bold ${color} mb-2`}>{name}</h3>
                  <p className="text-stone-600 text-sm mb-4">
                    <strong>Pricing:</strong> {pain} &middot; {users}
                  </p>
                  <div className="bg-stone-900 text-stone-200 rounded-lg p-3 font-mono text-xs mb-6 flex-1">
                    <span className="text-accent-light">$</span> {cmd}
                    <span className="text-stone-500"> --project</span>=core
                  </div>
                  <a
                    href="https://app.featuresignals.com/register"
                    className="inline-flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
                  >
                    Migrate now
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              ))}
            </div>

            {/* Migration steps */}
            <div className="mt-16 max-w-4xl mx-auto">
              <h3 className="text-xl font-bold text-stone-900 text-center mb-8">
                How the migration works
              </h3>
              <div className="grid sm:grid-cols-4 gap-6">
                {(
                  [
                    { step: "1", label: "Connect", desc: "Provide your provider API key" },
                    { step: "2", label: "Map", desc: "We map environments, flags, and rules" },
                    { step: "3", label: "Validate", desc: "Preview evaluation results side-by-side" },
                    { step: "4", label: "Switch", desc: "Update SDK endpoint. Done." },
                  ] as const
                ).map(({ step, label, desc }) => (
                  <div key={step} className="text-center">
                    <div className="w-10 h-10 rounded-full bg-accent text-white font-bold flex items-center justify-center mx-auto mb-2 text-sm">
                      {step}
                    </div>
                    <div className="text-sm font-bold text-stone-900">
                      {label}
                    </div>
                    <div className="text-xs text-stone-500 mt-1">{desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </SectionReveal>

      {/* ==================== DEPLOY ANYWHERE ==================== */}
      <SectionReveal>
        <section className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-stone-900">
              Deploy your way
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-stone-600">
              Self-host on your infrastructure, use our cloud, or run a hybrid.
              Docker Compose, Kubernetes, or a single binary.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {(
              [
                {
                  title: "Self-Hosted",
                  description:
                    "Deploy on any VPS or Kubernetes cluster. Apache-2.0 licensed. Full code access. Infrastructure cost from ~$17/mo.",
                  icon: Cloud,
                  link: "https://docs.featuresignals.com/getting-started/quickstart",
                  linkLabel: "Quickstart guide",
                  external: true as const,
                },
                {
                  title: "Cloud-Hosted",
                  description:
                    "Use our managed service with multi-region data residency. US, Europe, India regions. 14-day Pro trial included.",
                  icon: Rocket,
                  link: "https://app.featuresignals.com/register",
                  linkLabel: "Start free trial",
                },
                {
                  title: "OpenFeature Compatible",
                  description:
                    "All 8 SDKs ship with OpenFeature providers. Switch providers without code changes. Zero vendor lock-in, guaranteed.",
                  icon: Code,
                  link: "https://docs.featuresignals.com/sdks/openfeature",
                  linkLabel: "OpenFeature docs",
                  external: true as const,
                },
              ] as const
            ).map(({ title, description, icon: Icon, link, linkLabel, ...rest }) => (
              <div
                key={title}
                className="group flex flex-col rounded-2xl border border-stone-200 bg-white p-6 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-stone-300 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/20">
                  <Icon className="h-6 w-6" strokeWidth={1.5} />
                </div>
                <h3 className="mt-5 text-lg font-bold text-stone-900">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600 flex-1">
                  {description}
                </p>
                <Link
                  href={link}
                  {...("external" in rest
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent transition-colors hover:text-accent-dark"
                >
                  {linkLabel}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            ))}
          </div>
        </section>
      </SectionReveal>

      {/* ==================== PRICING ==================== */}
      <SectionReveal>
        <section className="py-20 sm:py-24 px-6 border-y border-stone-100 bg-stone-50">
          <div className="max-w-7xl mx-auto space-y-16">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight">
                Pay for infrastructure. Not your success.
              </h2>
              <p className="text-lg text-stone-600">
                Legacy tools tax your growth by charging per Monthly Active User.
                We charge a flat rate.
                <strong className="text-stone-900"> Unlimited MAUs. Unlimited seats.</strong>
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Free */}
              <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm flex flex-col">
                <h3 className="text-xl font-bold text-stone-800 mb-2">
                  Developer
                </h3>
                <div className="text-4xl font-extrabold text-stone-900 mb-8">
                  Free<span className="text-lg font-medium text-stone-500">/mo</span>
                </div>
                <ul className="space-y-4 text-sm text-stone-600 flex-1 font-medium">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-accent shrink-0" /> Unlimited
                    MAUs
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-accent shrink-0" /> 3 Team
                    Seats
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-accent shrink-0" /> Core
                    Boolean & JSON Flags
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-accent shrink-0" /> 1
                    Project, 2 Environments
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-accent shrink-0" /> All 8
                    SDKs + OpenFeature
                  </li>
                </ul>
                <a
                  href="https://app.featuresignals.com/register"
                  className="w-full mt-8 py-3 rounded-md border border-stone-300 text-stone-800 font-bold text-center block hover:bg-stone-100 transition shadow-sm"
                >
                  Start Building
                </a>
              </div>

              {/* Pro (Most Popular) */}
              <div className="bg-white p-8 rounded-2xl border-2 border-accent flex flex-col relative shadow-xl transform md:-translate-y-4">
                <div className="absolute -top-3 inset-x-0 text-center">
                  <span className="bg-accent text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                    Most Popular
                  </span>
                </div>
                <h3 className="text-xl font-bold text-accent mb-2">Pro</h3>
                <div className="text-4xl font-extrabold text-stone-900 mb-8">
                  ₹999<span className="text-lg font-medium text-stone-500">/mo</span>
                </div>
                <ul className="space-y-4 text-sm text-stone-600 flex-1 font-medium">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-accent shrink-0" /> Everything
                    in Developer
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-accent shrink-0" /> Unlimited
                    Team Seats
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-accent shrink-0" /> AI Janitor
                    (Automated PRs)
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-accent shrink-0" /> A/B
                    Testing Engine
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-accent shrink-0" /> RBAC,
                    Audit Logs & Approvals
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-accent shrink-0" /> Webhooks
                    & Scheduling
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-accent shrink-0" /> Relay
                    Proxy
                  </li>
                </ul>
                <a
                  href="https://app.featuresignals.com/register?plan=pro"
                  className="w-full mt-8 py-3 rounded-md bg-accent text-white font-bold text-center block hover:bg-accent-dark transition shadow-md"
                >
                  Upgrade to Pro
                </a>
              </div>

              {/* Enterprise */}
              <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm flex flex-col">
                <h3 className="text-xl font-bold text-stone-800 mb-2">
                  Enterprise
                </h3>
                <div className="text-4xl font-extrabold text-stone-900 mb-8">
                  Custom
                </div>
                <ul className="space-y-4 text-sm text-stone-600 flex-1 font-medium">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-accent shrink-0" /> Everything
                    in Pro
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-accent shrink-0" /> Dedicated
                    VPS / Air-Gapped
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-accent shrink-0" /> Multi-stage
                    Approvals
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-accent shrink-0" /> SAML SSO
                    & SCIM
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-accent shrink-0" /> 4h Support
                    SLA
                  </li>
                </ul>
                <a
                  href="/contact"
                  className="w-full mt-8 py-3 rounded-md border border-stone-300 text-stone-800 font-bold text-center block hover:bg-stone-100 transition shadow-sm"
                >
                  Talk to Sales
                </a>
              </div>
            </div>

            {/* Common features */}
            <div className="max-w-4xl mx-auto text-center">
              <p className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-4">
                All plans include
              </p>
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-3">
                {[
                  "5 flag types (boolean, string, number, JSON, A/B)",
                  "8 SDKs (all with OpenFeature)",
                  "Real-time SSE streaming",
                  "Percentage rollouts with consistent hashing",
                  "Kill switch — emergency disable",
                  "API Playground",
                ].map((feature) => (
                  <span
                    key={feature}
                    className="inline-flex items-center gap-1.5 text-sm text-stone-600"
                  >
                    <Check className="h-3.5 w-3.5 text-accent" />
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </SectionReveal>

      {/* ==================== FINAL CTA ==================== */}
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
                <Rocket className="h-4 w-4" />
                Start shipping with confidence
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Ready to ship faster?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-stone-300 sm:text-lg">
                Start a free trial with full Pro features for 14 days, or
                self-host in under 3 minutes. No credit card required.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <a
                  href="https://app.featuresignals.com/register"
                  className="group inline-flex items-center justify-center rounded-xl bg-accent px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-accent-dark hover:shadow-xl"
                >
                  Start Free — No Credit Card
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </a>
                <a
                  href="https://docs.featuresignals.com/getting-started/quickstart"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-white/10"
                >
                  <Play className="h-4 w-4" />
                  Self-Host in 3 Minutes
                </a>
              </div>

              <p className="mt-6 text-sm text-stone-400 font-mono">
                Apache-2.0 &middot; 8 SDKs &middot; Sub-millisecond evaluation
                &middot; 14-day Pro trial
              </p>
            </div>
          </div>
        </section>
      </SectionReveal>
    </>
  );
}
