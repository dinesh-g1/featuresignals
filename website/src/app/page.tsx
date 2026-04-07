import type { Metadata } from "next";
import Link from "next/link";
import {
  Cloud,
  Code,
  DollarSign,
  FlaskConical,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { SectionReveal } from "@/components/section-reveal";

export const metadata: Metadata = {
  title: "Open-Source Feature Flag Management",
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

export default function HomePage() {
  return (
    <>
      <SectionReveal>
        <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-20 md:py-24">
          <div className="mx-auto flex max-w-3xl flex-col items-center">
            <span className="inline-flex rounded-full bg-indigo-50 px-4 py-1.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100 sm:text-sm">
              Open-source · Apache-2.0 · Self-hosted
            </span>
            <h1 className="mt-6 text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl">
              Feature flags
              <br />
              <span className="bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent">
                without the $50K bill
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              FeatureSignals is an open-source feature management platform with
              A/B experimentation, real-time updates, and SDKs for every stack.
              Self-hosted on your infrastructure.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="https://app.featuresignals.com/register"
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
              >
                Start Free — No Credit Card
              </Link>
              <Link
                href="https://docs.featuresignals.com/getting-started/quickstart"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Quickstart Guide
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              14-day Pro trial included. Self-host or use our cloud. Open source, Apache 2.0.
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-3xl overflow-hidden rounded-xl bg-slate-950 text-left shadow-xl ring-1 ring-white/10">
            <div className="flex gap-2 border-b border-white/10 px-4 py-3">
              <span
                className="h-3 w-3 rounded-full bg-red-500/90"
                aria-hidden
              />
              <span
                className="h-3 w-3 rounded-full bg-amber-500/90"
                aria-hidden
              />
              <span
                className="h-3 w-3 rounded-full bg-emerald-500/90"
                aria-hidden
              />
            </div>
            <div
              className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-slate-300 sm:text-sm"
              dangerouslySetInnerHTML={{ __html: terminalHtml }}
            />
          </div>
        </section>
      </SectionReveal>

      <SectionReveal>
        <section className="border-y border-slate-100 bg-slate-50 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Why FeatureSignals?
            </h2>
            <p className="mt-3 text-center text-sm text-slate-500 sm:text-base">
              Everything your engineering team needs. No vendor lock-in.
            </p>
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {(
                [
                  {
                    Icon: DollarSign,
                    title: "100% Free & Open Source",
                    description:
                      "Apache-2.0 licensed. No per-seat pricing. No per-MAU charges. Self-host on a $10/month VPS.",
                  },
                  {
                    Icon: FlaskConical,
                    title: "A/B Experimentation",
                    description:
                      "Built-in variant assignment with consistent hashing, weighted splits, and impression tracking.",
                  },
                  {
                    Icon: Zap,
                    title: "Real-Time Updates",
                    description:
                      "SSE streaming pushes flag changes to SDKs instantly. Sub-10ms local evaluation.",
                  },
                  {
                    Icon: Code,
                    title: "SDKs for Every Stack",
                    description:
                      "Go, Node.js, Python, Java, C#, Ruby, React, Vue. All with OpenFeature providers for zero vendor lock-in.",
                  },
                  {
                    Icon: ShieldCheck,
                    title: "Enterprise Ready",
                    description:
                      "RBAC, audit logs, approval workflows, webhooks, kill switches, and mutual exclusion groups.",
                  },
                  {
                    Icon: Cloud,
                    title: "Deploy Anywhere",
                    description:
                      "Docker Compose, VPS, Kubernetes. Plus a relay proxy for edge deployments. Single Go binary.",
                  },
                ] as const
              ).map(({ Icon, title, description }) => (
                <div
                  key={title}
                  className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Icon className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </SectionReveal>

      <SectionReveal>
        <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Built for developers, by developers
          </h2>
          <p className="mt-3 text-sm text-slate-500 sm:text-base max-w-2xl mx-auto">
            Everything you need to ship features safely. Nothing you don&apos;t.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {(
              [
                ["5 Flag Types", "Boolean, string, number, JSON, A/B"],
                ["8 SDKs", "Go, Node, Python, Java, C#, Ruby, React, Vue"],
                ["13 Targeting Operators", "eq, neq, contains, in, regex, gt..."],
                [
                  "Percentage Rollouts",
                  "Consistent hashing, 0.01% granularity",
                ],
                ["Mutual Exclusion", "Run safe, non-overlapping experiments"],
                ["Kill Switch", "Emergency disable in one click"],
                ["Relay Proxy", "Edge caching, low-latency evaluation"],
                ["Stale Flag Scanner", "CI tool to find unused flags in code"],
              ] as const
            ).map(([title, body]) => (
              <div
                key={title}
                className="rounded-lg border border-slate-200 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div className="text-sm font-semibold text-slate-900">
                  {title}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </section>
      </SectionReveal>

      <SectionReveal>
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24">
          <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 px-6 py-12 text-center sm:px-10 sm:py-16">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Ready to ship faster?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm text-indigo-100 sm:text-base">
              Start a free trial with sample data, or self-host in under 5
              minutes.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="https://app.featuresignals.com/register"
                className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-sm font-semibold text-indigo-600 shadow-sm transition-colors hover:bg-indigo-50"
              >
                Start Free — No Credit Card
              </Link>
              <Link
                href="https://docs.featuresignals.com/getting-started/quickstart"
                className="inline-flex items-center justify-center rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Self-Host in 5 Minutes
              </Link>
            </div>
          </div>
        </section>
      </SectionReveal>
    </>
  );
}
