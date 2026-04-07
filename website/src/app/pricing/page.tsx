"use client";

import { SectionReveal } from "@/components/section-reveal";
import pricingData from "@/data/pricing.json";
import { Check, Minus, Play } from "lucide-react";
import { useState } from "react";

function renderCell(value: string) {
  if (value === "yes") return <Check className="mx-auto h-4 w-4 text-emerald-500" aria-label="Included" />;
  if (value === "no") return <Minus className="mx-auto h-4 w-4 text-slate-300" aria-label="Not included" />;
  return <span className="text-sm font-medium text-slate-700">{value}</span>;
}

const free = pricingData.plans.free;
const pro = pricingData.plans.pro;
const enterprise = pricingData.plans.enterprise;

const providers = pricingData.self_hosting.providers;
type ProviderKey = keyof typeof providers;
const providerKeys = Object.keys(providers) as ProviderKey[];

export default function PricingPage() {
  const [activeProvider, setActiveProvider] = useState<ProviderKey>(
    providerKeys[0]
  );

  const active = providers[activeProvider];

  const providerEntries = providerKeys.map((key) => ({
    key,
    name: providers[key].name,
  }));

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
        <div className="text-center">
          <div className="mb-6 inline-block rounded-full bg-indigo-50 px-4 py-1.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100 sm:text-sm">
            Simple, transparent pricing
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
            Start free. Scale as you grow.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-500 sm:text-lg">
            Every plan gets the core flag engine. Pro unlocks team features,
            and Enterprise adds dedicated support and compliance.
          </p>
          <p className="mt-3 text-sm text-slate-400">
            Not sure yet?{" "}
            <a
              href="https://app.featuresignals.com/register"
              className="font-medium text-indigo-600 underline decoration-indigo-300 hover:text-indigo-700"
            >
              Start a free trial
            </a>{" "}
            — 14 days with full Pro features.
          </p>
        </div>

        <SectionReveal className="mt-10 sm:mt-16">
          <div className="mx-auto grid max-w-5xl grid-cols-1 items-start gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-left transition-all hover:border-slate-300 hover:shadow-lg sm:p-8">
              <h3 className="text-lg font-semibold text-slate-900">
                {free.name}
              </h3>
              <p className="mt-1 text-sm text-slate-500">{free.tagline}</p>
              <p className="mt-4 text-4xl font-bold text-slate-900">
                {free.display_price}
                <span className="text-base font-normal text-slate-500">
                  {" "}
                  / {free.billing_period}
                </span>
              </p>
              <ul className="mt-8 space-y-3 text-sm text-slate-600">
                {free.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check
                      className="h-4 w-4 shrink-0 text-emerald-500"
                      strokeWidth={2}
                      aria-hidden
                    />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href={free.cta_url}
                className="mt-8 block rounded-lg border border-slate-300 py-3 text-center text-sm font-semibold text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50"
              >
                {free.cta_label}
              </a>
            </div>

            <div className="relative rounded-2xl border-2 border-indigo-600 bg-white p-6 text-left shadow-xl shadow-indigo-100 sm:p-8 lg:-mt-4 lg:pb-10">
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-4 py-1 text-xs font-semibold text-white">
                Most Popular
              </span>
              <h3 className="text-lg font-semibold text-slate-900">
                {pro.name}
              </h3>
              <p className="mt-1 text-sm text-slate-500">{pro.tagline}</p>
              <p className="mt-4 text-4xl font-bold text-slate-900">
                {pro.display_price}
                <span className="text-base font-normal text-slate-500">
                  {" "}
                  / {pro.billing_period}
                </span>
              </p>
              <ul className="mt-8 space-y-3 text-sm text-slate-600">
                {pro.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check
                      className="h-4 w-4 shrink-0 text-indigo-500"
                      strokeWidth={2}
                      aria-hidden
                    />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href={pro.cta_url}
                className="mt-8 block rounded-lg bg-indigo-600 py-3 text-center text-sm font-semibold text-white transition-all hover:bg-indigo-700 hover:shadow-md"
              >
                {pro.cta_label}
              </a>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-left transition-all hover:border-slate-300 hover:shadow-lg sm:p-8">
              <h3 className="text-lg font-semibold text-slate-900">
                {enterprise.name}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {enterprise.tagline}
              </p>
              <p className="mt-4 text-4xl font-bold text-slate-900">
                {enterprise.display_price}
              </p>
              <ul className="mt-8 space-y-3 text-sm text-slate-600">
                {enterprise.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check
                      className="h-4 w-4 shrink-0 text-indigo-500"
                      strokeWidth={2}
                      aria-hidden
                    />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href={enterprise.cta_url}
                className="mt-8 block rounded-lg border border-slate-300 py-3 text-center text-sm font-semibold text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50"
              >
                {enterprise.cta_label}
              </a>
            </div>
          </div>
        </SectionReveal>

        {/* Compliance trust strip */}
        <SectionReveal className="mt-10 sm:mt-14">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-3 rounded-xl border border-slate-200 bg-white px-6 py-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Security built in
            </span>
            {[
              { label: "TLS Encryption", color: "text-emerald-700 bg-emerald-50" },
              { label: "RBAC & MFA", color: "text-blue-700 bg-blue-50" },
              { label: "SSO (SAML/OIDC)", color: "text-teal-700 bg-teal-50" },
              { label: "Audit Trails", color: "text-amber-700 bg-amber-50" },
              { label: "Multi-Region Data", color: "text-violet-700 bg-violet-50" },
              { label: "OpenFeature", color: "text-indigo-700 bg-indigo-50" },
            ].map((b) => (
              <a
                key={b.label}
                href="/security"
                className={`rounded-full px-3 py-1 text-[11px] font-bold transition-opacity hover:opacity-80 ${b.color}`}
              >
                {b.label}
              </a>
            ))}
          </div>
        </SectionReveal>

        <div className="mt-12 text-center">
          <p className="text-sm text-slate-500">Want to explore first?</p>
          <a
            href="https://app.featuresignals.com/register"
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-5 py-2.5 text-sm font-semibold text-indigo-700 ring-1 ring-indigo-100 transition-all hover:bg-indigo-100 hover:ring-indigo-200"
          >
            <Play className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            Start a Free Trial — 14 Days, Full Pro Features
          </a>
        </div>
      </section>

      <section className="border-t border-slate-100 bg-slate-50 py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionReveal>
            <h2 className="text-center text-xl font-bold text-slate-900 sm:text-2xl">
              Core flag engine — included in every plan
            </h2>
            <p className="mt-2 text-center text-sm text-slate-500 sm:text-base">
              The evaluation engine is the same on Free, Pro, and Enterprise. No
              limits on flags or evaluations.
            </p>
            <div className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-3 sm:mt-10 sm:grid-cols-2 sm:gap-4 md:grid-cols-4">
              {pricingData.common_features.map((f) => (
                <div
                  key={f}
                  className="rounded-lg border border-slate-200 bg-white p-4 text-center transition-all hover:shadow-md"
                >
                  <p className="text-sm font-semibold text-slate-900">{f}</p>
                </div>
              ))}
            </div>

            {/* Comparison matrix */}
            <div className="mx-auto mt-12 max-w-4xl overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="pb-3 pr-6 font-semibold text-slate-900">Feature</th>
                    <th className="pb-3 px-4 text-center font-semibold text-slate-900">Free</th>
                    <th className="pb-3 px-4 text-center font-semibold text-indigo-600">Pro</th>
                    <th className="pb-3 px-4 text-center font-semibold text-slate-900">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {([
                    ["Feature flags & evaluations", "Unlimited", "Unlimited", "Unlimited"],
                    ["Projects", "1", "Unlimited", "Unlimited"],
                    ["Environments", "2", "Unlimited", "Unlimited"],
                    ["Team members", "3", "Unlimited", "Unlimited"],
                    ["A/B experimentation", "yes", "yes", "yes"],
                    ["SDKs (8 languages)", "yes", "yes", "yes"],
                    ["Real-time SSE streaming", "yes", "yes", "yes"],
                    ["Kill switch", "yes", "yes", "yes"],
                    ["RBAC & per-env permissions", "no", "yes", "yes"],
                    ["Audit logs & export", "no", "yes", "yes"],
                    ["Approval workflows", "no", "yes", "yes"],
                    ["Webhooks & scheduling", "no", "yes", "yes"],
                    ["Relay proxy", "no", "yes", "yes"],
                    ["SSO (SAML/OIDC)", "no", "no", "yes"],
                    ["SCIM provisioning", "no", "no", "yes"],
                    ["IP allowlist", "no", "no", "yes"],
                    ["Custom roles", "no", "no", "yes"],
                    ["MFA enforcement", "no", "no", "yes"],
                    ["Dedicated support (4h SLA)", "no", "no", "yes"],
                    ["Support", "Community", "Priority email", "Dedicated + SLA"],
                  ] as const).map(([label, f, p, e]) => (
                    <tr key={label}>
                      <td className="py-2.5 pr-6 text-slate-700">{label}</td>
                      <td className="py-2.5 px-4 text-center">{renderCell(f)}</td>
                      <td className="py-2.5 px-4 text-center">{renderCell(p)}</td>
                      <td className="py-2.5 px-4 text-center">{renderCell(e)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionReveal>
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionReveal>
            <h2 className="text-center text-xl font-bold text-slate-900 sm:text-2xl">
              Self-hosting cost estimates
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-slate-500 sm:text-base">
              FeatureSignals is Apache-2.0 — the software is always free. These
              are infrastructure-only costs based on real provider pricing.
            </p>

            <div className="mt-8 sm:mt-10">
              <div className="flex w-full justify-center">
                <div className="max-w-full overflow-x-auto scrollbar-hide">
                  <div
                    role="tablist"
                    aria-label="Self-hosting providers"
                    className="inline-flex min-w-min rounded-lg border border-slate-200 bg-slate-50 p-1"
                  >
                  {providerEntries.map(({ key, name }) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={key === activeProvider}
                      onClick={() => setActiveProvider(key)}
                      className={
                        key === activeProvider
                          ? "shrink-0 rounded-md bg-white px-3 py-2 text-xs font-medium whitespace-nowrap text-slate-900 shadow-sm sm:px-4 sm:text-sm"
                          : "shrink-0 rounded-md px-3 py-2 text-xs font-medium whitespace-nowrap text-slate-500 transition-all hover:text-slate-700 sm:px-4 sm:text-sm"
                      }
                    >
                      {name}
                    </button>
                  ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 sm:mt-8">
                <p className="mb-4 text-center text-xs text-slate-400 sm:mb-6">
                  Region: {active.region} &middot; Prices as of April 2026
                </p>
                <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
                  {active.tiers.map((tier) => (
                    <div
                      key={tier.tier}
                      className="rounded-xl border border-slate-200 p-4 text-left transition-shadow hover:shadow-md sm:p-6"
                    >
                      <h3 className="font-semibold text-slate-900">
                        {tier.tier}
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">
                        {tier.use_case}
                      </p>
                      <p className="mt-3 text-2xl font-bold text-indigo-600 sm:text-3xl">
                        {tier.monthly_cost_inr}
                      </p>
                      <p className="text-xs text-slate-400">
                        {tier.monthly_cost} {active.currency}/mo
                      </p>
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-medium text-slate-500">
                          Instances
                        </p>
                        <p className="text-xs text-slate-600">
                          {tier.instances}
                        </p>
                        <p className="mt-2 text-xs font-medium text-slate-500">
                          Includes
                        </p>
                        <p className="text-xs text-slate-600">{tier.includes}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SectionReveal>
        </div>
      </section>

      <section className="border-t border-slate-100 py-14 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <SectionReveal>
            <h2 className="text-center text-xl font-bold text-slate-900 sm:text-2xl">
              Frequently asked questions
            </h2>
            <div className="mt-10 space-y-6">
              <div className="border-b border-slate-100 pb-6">
                <h3 className="font-semibold text-slate-900">
                  Can I try before I sign up?
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Absolutely.{" "}
                  <a
                    href="https://app.featuresignals.com/register"
                    className="text-indigo-600 underline hover:text-indigo-700"
                  >
                    Start a free trial
                  </a>{" "}
                  with your email to get full Pro access for 14 days. You can
                  choose a plan at any time during the trial.
                </p>
              </div>
              <div className="border-b border-slate-100 pb-6">
                <h3 className="font-semibold text-slate-900">
                  {"What's the difference between Free and Pro?"}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  The Free plan includes the core flag engine — all flag types,
                  SDKs, A/B testing, and percentage rollouts. It&apos;s limited to{" "}
                  {free.limits.projects} project(s), {free.limits.environments}{" "}
                  environments, and {free.limits.seats} team member(s). Pro
                  removes all limits and adds advanced capabilities like RBAC,
                  audit logging, webhooks, and approval workflows.
                </p>
              </div>
              <div className="border-b border-slate-100 pb-6">
                <h3 className="font-semibold text-slate-900">
                  Can I self-host instead of using the cloud?
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Yes. FeatureSignals is Apache-2.0 licensed and designed for
                  self-hosting. Use Docker Compose, Kubernetes, or a single
                  binary on any VPS. The{" "}
                  <a
                    href="https://docs.featuresignals.com/getting-started/quickstart"
                    className="text-indigo-600 underline hover:text-indigo-700"
                  >
                    quickstart guide
                  </a>{" "}
                  gets you running in under 5 minutes.
                </p>
              </div>
              <div className="border-b border-slate-100 pb-6">
                <h3 className="font-semibold text-slate-900">
                  How does billing work?
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Billing is handled via Stripe or PayU depending on your region.
                  You can upgrade to Pro from the dashboard at any time.
                  Subscriptions are monthly and can be cancelled anytime.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">
                  Do you offer discounts for startups or open-source projects?
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Yes.{" "}
                  <a
                    href="mailto:support@featuresignals.com"
                    className="text-indigo-600 underline hover:text-indigo-700"
                  >
                    Contact us
                  </a>{" "}
                  {"and we'll work something out."}
                </p>
              </div>
            </div>
          </SectionReveal>
        </div>
      </section>

      <section className="bg-gradient-to-br from-indigo-600 to-indigo-800 px-4 py-12 text-center text-white sm:px-6 sm:py-16">
        <SectionReveal>
          <h2 className="text-2xl font-bold sm:text-3xl">See it in action</h2>
          <p className="mt-3 text-sm text-indigo-200 sm:text-base">
            No credit card required. 14-day free trial with full Pro features.
          </p>
          <div className="mt-6 flex flex-col flex-wrap items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <a
              href="https://app.featuresignals.com/register"
              className="inline-block w-full rounded-lg bg-white px-6 py-3 text-sm font-semibold text-indigo-600 shadow-sm transition-all hover:bg-indigo-50 hover:shadow-md sm:w-auto"
            >
              Start Free — No Credit Card
            </a>
            <a
              href="https://docs.featuresignals.com/getting-started/quickstart"
              className="inline-block w-full rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10 sm:w-auto"
            >
              Self-Host in 5 Minutes
            </a>
          </div>
        </SectionReveal>
      </section>
    </>
  );
}
