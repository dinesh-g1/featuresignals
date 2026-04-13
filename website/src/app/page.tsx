import type { Metadata } from "next";
import Link from "next/link";
import { appUrl } from "@/lib/urls";
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
  Users,
  GitBranch,
  TrendingUp,
} from "lucide-react";
import { SectionReveal } from "@/components/section-reveal";
import {
  LocalizedPrice,
  LocalizedSelfHostCost,
} from "@/components/localized-price";
import { trustedBy, logoPlaceholders, trustMetrics } from "@/data/testimonials";

export const metadata: Metadata = {
  title: "AI-Powered Feature Flag Management | FeatureSignals",
  description:
    "Open-source feature flag platform with AI-powered lifecycle management. Ship faster, clean stale flags automatically, and deploy anywhere. Starts free.",
};

const terminalHtml = [
  '<span class="text-slate-500"># Start in under 5 minutes</span>',
  '<span class="text-emerald-400">git clone</span> https://github.com/dinesh-g1/featuresignals',
  '<span class="text-emerald-400">cd</span> featuresignals',
  '<span class="text-emerald-400">docker compose up</span> -d',
  "",
  '<span class="text-slate-500"># Evaluate flags from any language</span>',
  `<span class="text-indigo-400">import</span> featuresignals <span class="text-indigo-400">from</span> <span class="text-emerald-400">'@featuresignals/node'</span>;`,
  `<span class="text-indigo-400">const</span> client = featuresignals.init(<span class="text-emerald-400">'sdk-key'</span>, { envKey: <span class="text-emerald-400">'production'</span> });`,
  `client.boolVariation(<span class="text-emerald-400">'new-checkout'</span>, user, <span class="text-amber-400">false</span>);`,
].join("<br />");

/* ── Pain points we solve ── */
const painPoints = [
  {
    problem: "Stale flags pile up as technical debt",
    solution:
      "AI scans your codebase, finds unused flags, and generates cleanup PRs for your review.",
  },
  {
    problem: "Surprise bills from per-seat pricing",
    solution:
      "Rs 999/month for unlimited everything. No per-seat, per-MAU, or per-evaluation fees.",
  },
  {
    problem: "Vendor lock-in with proprietary systems",
    solution:
      "Apache-2.0 open source. Self-host anywhere. OpenFeature SDKs — switch without code changes.",
  },
];

/* ── How it works steps ── */
const howItWorks = [
  {
    step: "1",
    title: "Create a flag",
    description:
      "Define your flag with targeting rules, percentage rollouts, and environment-specific states.",
    icon: Code,
    link: "https://docs.featuresignals.com/getting-started/create-your-first-flag",
  },
  {
    step: "2",
    title: "Integrate your SDK",
    description:
      "Drop in one of our 8 SDKs (Go, Node, Python, Java, C#, Ruby, React, Vue). All support OpenFeature.",
    icon: GitBranch,
    link: "https://docs.featuresignals.com/sdks/overview",
  },
  {
    step: "3",
    title: "Ship with confidence",
    description:
      "Roll out gradually, A/B test, use kill switches. AI monitors and cleans up stale flags automatically.",
    icon: Rocket,
    link: "https://docs.featuresignals.com/core-concepts/implementation-patterns",
  },
];

export default function HomePage() {
  return (
    <>
      {/* ==================== HERO SECTION ==================== */}
      <SectionReveal>
        <section className="relative overflow-hidden px-4 pt-12 pb-16 sm:px-6 sm:pt-16 sm:pb-24 lg:pt-20 lg:pb-32">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-indigo-50/50 via-transparent to-transparent" />

          <div className="relative mx-auto max-w-6xl">
            <div className="flex flex-col items-center text-center lg:flex-row lg:text-left lg:gap-16">
              <div className="flex max-w-2xl flex-col items-center lg:items-start">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100 sm:text-sm">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI-Powered Flag Lifecycle Management
                </div>

                <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                  Ship features{" "}
                  <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                    faster
                  </span>
                  .{" "}
                  <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                    Clean automatically
                  </span>
                  .
                </h1>

                <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600 sm:text-xl">
                  The open-source feature flag platform with AI-powered cleanup,
                  real-time updates, and predictable pricing. Self-host or use
                  our cloud — no per-evaluation fees, ever.
                </p>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
                  <Link
                    href={appUrl.register}
                    className="group inline-flex items-center justify-center rounded-xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-600/30"
                  >
                    Start Free — No Credit Card
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <Link
                    href="https://docs.featuresignals.com/getting-started/quickstart"
                    className="group inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-8 py-4 text-base font-semibold text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50"
                  >
                    <Play className="h-4 w-4" />
                    Self-Host in 5 Minutes
                  </Link>
                </div>

                <p className="mt-6 text-sm text-slate-500">
                  Apache-2.0 Licensed · 8 SDKs · Sub-millisecond evaluation ·
                  14-day Pro trial
                </p>
              </div>

              <div className="mt-12 w-full max-w-lg lg:mt-0 lg:w-1/2">
                <div className="overflow-hidden rounded-2xl bg-slate-950 text-left shadow-2xl ring-1 ring-white/10">
                  <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
                    <span className="h-3 w-3 rounded-full bg-red-500/90" />
                    <span className="h-3 w-3 rounded-full bg-amber-500/90" />
                    <span className="h-3 w-3 rounded-full bg-emerald-500/90" />
                    <span className="ml-auto text-xs text-slate-500">
                      terminal
                    </span>
                  </div>
                  <div
                    className="overflow-x-auto p-5 font-mono text-sm leading-relaxed text-slate-300"
                    dangerouslySetInnerHTML={{ __html: terminalHtml }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </SectionReveal>

      {/* ==================== TRUSTED BY / LOGOS ==================== */}
      <SectionReveal>
        <section className="border-y border-slate-100 bg-white py-8 sm:py-10">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="mb-6 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">
              Trusted by engineering teams at
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 sm:gap-x-12">
              {logoPlaceholders.map((name) => (
                <div
                  key={name}
                  className="text-sm font-bold text-slate-300 sm:text-base"
                >
                  {name}
                </div>
              ))}
            </div>
          </div>
        </section>
      </SectionReveal>

      {/* ==================== SOCIAL PROOF / METRICS ==================== */}
      <SectionReveal>
        <section className="border-y border-slate-100 bg-slate-50 py-10 sm:py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              {(
                [
                  [trustMetrics.evaluationsPerMonth, "Evaluations / month", ""],
                  [trustMetrics.organizations, "Organizations", ""],
                  [trustMetrics.developers, "Developers", ""],
                  [trustMetrics.uptime, "Uptime SLA", ""],
                ] as const
              ).map(([value, label]) => (
                <div key={label} className="text-center">
                  <div className="text-3xl font-extrabold text-indigo-600 sm:text-4xl">
                    {value}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
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
        <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Feature flags should solve problems, not create them
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Most teams end up with hundreds of stale flags, surprise bills, and
            vendor lock-in. FeatureSignals was built to fix all three.
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {painPoints.map(({ problem, solution }) => (
              <div
                key={problem}
                className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-red-600">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  {problem}
                </div>
                <div className="my-4 border-t border-slate-100" />
                <div className="flex items-start gap-2 text-sm text-slate-600">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  {solution}
                </div>
              </div>
            ))}
          </div>
        </section>
      </SectionReveal>

      {/* ==================== VALUE PROPOSITION (6 cards) ==================== */}
      <SectionReveal>
        <section className="mx-auto max-w-6xl px-4 pb-16 text-center sm:px-6 sm:pb-24">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Why engineering teams choose FeatureSignals
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
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
                    "No per-seat fees. No per-MAU charges. No hidden costs. Just",
                  priceEl: true,
                  link: "/pricing",
                  linkLabel: "See pricing",
                },
                {
                  Icon: Brain,
                  title: "AI-Powered Cleanup",
                  description:
                    "AI scans your codebase, identifies stale flags, analyzes usage patterns, and generates cleanup pull requests. Human reviews, AI does the grunt work.",
                  link: "/features/ai",
                  linkLabel: "Explore AI features",
                },
                {
                  Icon: ShieldCheck,
                  title: "Enterprise Ready",
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
                  title: "Real-Time Updates",
                  description:
                    "SSE streaming pushes flag changes to SDKs instantly. Sub-10ms local evaluation. Relay proxy for edge deployments.",
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
                className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 transition-colors group-hover:bg-indigo-100">
                  <Icon className="h-6 w-6" strokeWidth={1.5} />
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-900">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {description} {"priceEl" in rest ? <LocalizedPrice /> : null}
                </p>
                <Link
                  href={link}
                  {...("external" in rest
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700"
                >
                  {linkLabel}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            ))}
          </div>
        </section>
      </SectionReveal>

      {/* ==================== HOW IT WORKS ==================== */}
      <SectionReveal>
        <section className="border-y border-slate-100 bg-slate-50 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Up and running in 5 minutes
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
              Three steps from zero to shipping features safely.
            </p>

            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {howItWorks.map(
                ({ step, title, description, icon: Icon, link }, i) => (
                  <Link
                    key={step}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg"
                  >
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 transition-colors group-hover:bg-indigo-700">
                      <Icon className="h-6 w-6" strokeWidth={1.5} />
                    </div>
                    <div className="mt-3 text-xs font-bold text-indigo-600">
                      Step {step}
                    </div>
                    <h3 className="mt-1 text-lg font-bold text-slate-900">
                      {title}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">{description}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 group-hover:gap-1.5">
                      Read the docs
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </span>
                    {i < howItWorks.length - 1 && (
                      <div className="absolute -right-3 top-1/2 hidden -translate-y-1/2 sm:block">
                        <ArrowRight className="h-5 w-5 text-slate-300" />
                      </div>
                    )}
                  </Link>
                ),
              )}
            </div>
          </div>
        </section>
      </SectionReveal>

      {/* ==================== AI CAPABILITIES SPOTLIGHT ==================== */}
      <SectionReveal>
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 py-16 text-white sm:py-24">
          <div
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "40px 40px",
            }}
          />

          <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-300">
                <Brain className="h-4 w-4" />
                AI Where It Matters
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                AI-powered flag lifecycle management
              </h2>
              <p className="mt-4 text-lg text-slate-300">
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
                      "Correlates flag changes with errors, suggests rollback. Human approves.",
                    icon: ShieldCheck,
                  },
                ] as const
              ).map(({ title, description, icon: Icon }) => (
                <div
                  key={title}
                  className="group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all hover:border-indigo-400/40 hover:bg-white/10"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-400/30 transition-colors group-hover:bg-indigo-500/30">
                    <Icon className="h-6 w-6" strokeWidth={1.5} />
                  </div>
                  <h3 className="mt-4 text-lg font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
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
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              What engineering teams are saying
            </h2>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {trustedBy.map(({ quote, name, title, company }) => (
              <blockquote
                key={name}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <p className="flex-1 text-sm leading-relaxed text-slate-600">
                  &ldquo;{quote}&rdquo;
                </p>
                <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                    {name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {title}, {company}
                    </div>
                  </div>
                </div>
              </blockquote>
            ))}
          </div>
        </section>
      </SectionReveal>

      {/* ==================== HOW WE COMPARE (Kill Shot) ==================== */}
      <SectionReveal>
        <section className="border-y border-slate-100 bg-slate-50 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                FeatureSignals vs LaunchDarkly
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
                Same enterprise features. Open-source. Predictable pricing.
                One-click migration.
              </p>
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {(
                [
                  {
                    metric: <LocalizedPrice />,
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
                    metric: "AI Cleanup",
                    vs: "Manual",
                    label: "Stale flag cleanup",
                    detail: "AI scans code, generates PRs. Human approves.",
                  },
                ] as const
              ).map(({ metric, vs, label, detail }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm"
                >
                  <div className="flex items-center justify-center gap-4">
                    <div>
                      <div className="text-2xl font-extrabold text-indigo-600">
                        {typeof metric === "string" ? metric : metric}
                      </div>
                      <div className="text-xs text-slate-500">
                        FeatureSignals
                      </div>
                    </div>
                    <div className="text-slate-300">vs</div>
                    <div>
                      <div className="text-2xl font-extrabold text-slate-400">
                        {vs}
                      </div>
                      <div className="text-xs text-slate-500">LaunchDarkly</div>
                    </div>
                  </div>
                  <div className="mt-4 text-sm font-semibold text-slate-900">
                    {label}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{detail}</div>
                </div>
              ))}
            </div>

            {/* Subtle kill-shot callout */}
            <div className="mt-8">
              <div className="mx-auto max-w-xl rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-center">
                <p className="text-sm text-amber-800">
                  <span className="font-semibold">Here&apos;s the thing:</span>{" "}
                  LaunchDarkly charges $12 per connection. You do the math.
                </p>
              </div>
            </div>

            <div className="mt-8 text-center">
              <Link
                href="/pricing#comparison"
                className="group inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md"
              >
                See full comparison
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </section>
      </SectionReveal>

      {/* ==================== DEPLOY ANYWHERE ==================== */}
      <SectionReveal>
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Deploy your way
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
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
                    "Deploy on any VPS or Kubernetes cluster. Apache-2.0 licensed. Full code access. Infrastructure cost from",
                  costEl: true,
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
                  link: appUrl.register,
                  linkLabel: "Start free trial",
                },
                {
                  title: "OpenFeature Compatible",
                  description:
                    "All 8 SDKs ship with OpenFeature providers. Switch providers without code changes. Zero vendor lock-in.",
                  icon: Code,
                  link: "https://docs.featuresignals.com/sdks/openfeature",
                  linkLabel: "OpenFeature docs",
                  external: true as const,
                },
              ] as const
            ).map(
              ({
                title,
                description,
                icon: Icon,
                link,
                linkLabel,
                ...rest
              }) => (
                <div
                  key={title}
                  className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                    <Icon className="h-6 w-6" strokeWidth={1.5} />
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-slate-900">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {description}{" "}
                    {"costEl" in rest ? <LocalizedSelfHostCost /> : null}
                  </p>
                  <Link
                    href={link}
                    {...("external" in rest
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700"
                  >
                    {linkLabel}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              ),
            )}
          </div>
        </section>
      </SectionReveal>

      {/* ==================== PRICING TEASER ==================== */}
      <SectionReveal>
        <section className="border-y border-slate-100 bg-slate-50 py-16 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Start free. Scale as you grow.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
              Every plan gets the core flag engine. Pro unlocks team features.
              Enterprise adds dedicated support and compliance.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {(
                [
                  {
                    plan: "Free",
                    price: "₹0",
                    detail: "1 project, 2 environments, 3 seats",
                  },
                  {
                    plan: "Pro",
                    price: "__loc__" as const,
                    detail: "Unlimited everything",
                    highlight: true as const,
                  },
                  {
                    plan: "Enterprise",
                    price: "Custom",
                    detail: "SSO, SCIM, SLA, dedicated support",
                  },
                ] as const
              ).map(({ plan, price, detail, ...rest }) => (
                <div
                  key={plan}
                  className={`rounded-xl border p-5 text-center ${
                    "highlight" in rest
                      ? "border-indigo-600 bg-white shadow-lg"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="text-sm font-bold text-slate-900">{plan}</div>
                  <div className="mt-1 text-2xl font-extrabold text-indigo-600">
                    {price === "__loc__" ? <LocalizedPrice /> : price}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{detail}</div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={appUrl.register}
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md"
              >
                Start Free — No Credit Card
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50"
              >
                View full pricing
              </Link>
            </div>
          </div>
        </section>
      </SectionReveal>

      {/* ==================== FINAL CTA ==================== */}
      <SectionReveal>
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-800 px-6 py-16 text-center sm:px-12 sm:py-20">
            <div
              className="pointer-events-none absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                backgroundSize: "32px 32px",
              }}
            />

            <div className="relative">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Ready to ship faster?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-indigo-100 sm:text-lg">
                Start a free trial with full Pro features for 14 days, or
                self-host in under 5 minutes. No credit card required.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href={appUrl.register}
                  className="group inline-flex items-center justify-center rounded-xl bg-white px-8 py-4 text-base font-semibold text-indigo-600 shadow-lg transition-all hover:bg-indigo-50 hover:shadow-xl"
                >
                  Start Free — No Credit Card
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="https://docs.featuresignals.com/getting-started/quickstart"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-white/10"
                >
                  <Play className="h-4 w-4" />
                  Self-Host in 5 Minutes
                </Link>
              </div>

              <p className="mt-6 text-sm text-indigo-200">
                Apache-2.0 · 8 SDKs · Sub-millisecond evaluation · 14-day Pro
                trial
              </p>
            </div>
          </div>
        </section>
      </SectionReveal>
    </>
  );
}
