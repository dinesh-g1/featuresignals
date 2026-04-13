"use client";

import { SectionReveal } from "@/components/section-reveal";
import { appUrl } from "@/lib/urls";
import pricingData from "@/data/pricing.json";
import { detectCurrency, fmtINR, FX } from "@/lib/currency";
import { Check, Minus, Play, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const PRO_PRICE_INR = 999;
const free = pricingData.plans.free;
const enterprise = pricingData.plans.enterprise;

function resolveCtaUrl(path: string): string {
  if (path.startsWith("/register")) return appUrl.resolve(path);
  return path;
}

function renderCell(value: string) {
  if (value === "yes")
    return (
      <Check
        className="mx-auto h-4 w-4 text-emerald-500"
        aria-label="Included"
      />
    );
  if (value === "no")
    return (
      <Minus
        className="mx-auto h-4 w-4 text-slate-300"
        aria-label="Not included"
      />
    );
  return <span className="text-sm font-medium text-slate-700">{value}</span>;
}

/* ── currency options for the switcher ── */
const CURRENCY_OPTIONS = Object.entries(FX).map(([code, v]) => ({
  code,
  label: `${v.symbol} ${code}`,
}));

/* ── self-hosting providers ── */
const providers = pricingData.self_hosting.providers;
type ProviderKey = keyof typeof providers;
const providerKeys = Object.keys(providers) as ProviderKey[];

export default function PricingPage() {
  const [activeProvider, setActiveProvider] = useState<ProviderKey>(
    providerKeys[0],
  );
  const [cur, setCur] = useState<string>("INR");

  const active = providers[activeProvider];
  const providerEntries = providerKeys.map((key) => ({
    key,
    name: providers[key].name,
  }));

  /* detect user currency on mount */
  useEffect(() => {
    setCur(detectCurrency());
  }, []);

  const fx = FX[cur] ?? FX.INR;
  const proLabel =
    cur === "INR" ? "₹999/month" : fmtINR(PRO_PRICE_INR, cur) + "/month";

  /* convert self-hosting tier costs */
  const convertTier = (tier: (typeof active.tiers)[number]) => {
    /* strip "~₹" or "~$" and parse the numeric INR portion */
    const raw = tier.monthly_cost_inr.replace(/[^0-9,]/g, "").replace(/,/g, "");
    const inr = parseInt(raw, 10) || 0;
    const converted = Math.round(inr * fx.rate);
    return {
      ...tier,
      display_monthly:
        cur === "INR"
          ? tier.monthly_cost_inr
          : `${fx.symbol}${converted.toLocaleString(fx.locale)}`,
      display_monthly_short:
        cur === "INR"
          ? tier.monthly_cost
          : `${fx.symbol}${converted.toLocaleString(fx.locale)}`,
    };
  };

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
        <div className="text-center">
          <div className="mb-6 inline-block rounded-full bg-indigo-50 px-4 py-1.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100 sm:text-sm">
            Simple, transparent pricing
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
            Unlimited flags. Unlimited evaluations. {proLabel}.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-500 sm:text-lg">
            Every plan gets the core flag engine. Pro unlocks team features, and
            Enterprise adds dedicated support and compliance.
          </p>
          <p className="mt-3 text-sm text-slate-400">
            LaunchDarkly charges $12 per Kubernetes pod. You do the math.{" "}
            <a
              href={appUrl.register}
              className="font-medium text-indigo-600 underline decoration-indigo-300 hover:text-indigo-700"
            >
              Start a free trial
            </a>{" "}
            — 14 days with full Pro features.
          </p>
        </div>

        <SectionReveal className="mt-10 sm:mt-16">
          {/* Currency switcher */}
          <div className="mb-8 flex items-center justify-center gap-3">
            <label
              htmlFor="currency-select"
              className="text-sm font-medium text-slate-500"
            >
              Prices shown in:
            </label>
            <select
              id="currency-select"
              value={cur}
              onChange={(e) => setCur(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mx-auto grid max-w-5xl grid-cols-1 items-start gap-6 lg:grid-cols-3">
            {/* Free */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-left transition-all hover:border-slate-300 hover:shadow-lg sm:p-8">
              <h3 className="text-lg font-semibold text-slate-900">
                {free.name}
              </h3>
              <p className="mt-1 text-sm text-slate-500">{free.tagline}</p>
              <p className="mt-4 text-4xl font-bold text-slate-900">Free</p>
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
                href={resolveCtaUrl(free.cta_url)}
                className="mt-8 block rounded-lg border border-slate-300 py-3 text-center text-sm font-semibold text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50"
              >
                {free.cta_label}
              </a>
            </div>

            {/* Pro */}
            <div className="relative rounded-2xl border-2 border-indigo-600 bg-white p-6 text-left shadow-xl shadow-indigo-100 sm:p-8 lg:-mt-4 lg:pb-10">
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-4 py-1 text-xs font-semibold text-white">
                Most Popular
              </span>
              <h3 className="text-lg font-semibold text-slate-900">Pro</h3>
              <p className="mt-1 text-sm text-slate-500">
                For growing engineering teams
              </p>
              <p className="mt-4 text-4xl font-bold text-slate-900">
                {fmtINR(PRO_PRICE_INR, cur)}
                <span className="text-base font-normal text-slate-500">
                  {" "}
                  / month
                </span>
              </p>
              <ul className="mt-8 space-y-3 text-sm text-slate-600">
                {[
                  "Unlimited projects",
                  "Unlimited environments",
                  "Unlimited team members",
                  "Unlimited feature flags & evaluations",
                  "A/B experimentation",
                  "RBAC, audit logs & approvals",
                  "Webhooks & scheduling",
                  "Relay proxy",
                  "Priority email support",
                ].map((f) => (
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
                href={resolveCtaUrl("/register?plan=pro")}
                className="mt-8 block rounded-lg bg-indigo-600 py-3 text-center text-sm font-semibold text-white transition-all hover:bg-indigo-700 hover:shadow-md"
              >
                Get Started with Pro
              </a>
            </div>

            {/* Enterprise */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-left transition-all hover:border-slate-300 hover:shadow-lg sm:p-8">
              <h3 className="text-lg font-semibold text-slate-900">
                {enterprise.name}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {enterprise.tagline}
              </p>
              <p className="mt-4 text-4xl font-bold text-slate-900">Custom</p>
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
                href={resolveCtaUrl(enterprise.cta_url)}
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
              {
                label: "TLS Encryption",
                color: "text-emerald-700 bg-emerald-50",
              },
              { label: "RBAC & MFA", color: "text-blue-700 bg-blue-50" },
              { label: "SSO (SAML/OIDC)", color: "text-teal-700 bg-teal-50" },
              { label: "Audit Trails", color: "text-amber-700 bg-amber-50" },
              {
                label: "Multi-Region Data",
                color: "text-violet-700 bg-violet-50",
              },
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
            href={appUrl.register}
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
                    <th className="pb-3 pr-6 font-semibold text-slate-900">
                      Feature
                    </th>
                    <th className="pb-3 px-4 text-center font-semibold text-slate-900">
                      Free
                    </th>
                    <th className="pb-3 px-4 text-center font-semibold text-indigo-600">
                      Pro
                    </th>
                    <th className="pb-3 px-4 text-center font-semibold text-slate-900">
                      Enterprise
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(
                    [
                      [
                        "Feature flags & evaluations",
                        "Unlimited",
                        "Unlimited",
                        "Unlimited",
                      ],
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
                      [
                        "Support",
                        "Community",
                        "Priority email",
                        "Dedicated + SLA",
                      ],
                    ] as const
                  ).map(([label, f, p, e]) => (
                    <tr key={label}>
                      <td className="py-2.5 pr-6 text-slate-700">{label}</td>
                      <td className="py-2.5 px-4 text-center">
                        {renderCell(f)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {renderCell(p)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {renderCell(e)}
                      </td>
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
                  Region: {active.region} &middot; Prices in {cur} as of April
                  2026
                </p>
                <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
                  {active.tiers.map((tier) => {
                    const converted = convertTier(tier);
                    return (
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
                          {converted.display_monthly}
                        </p>
                        <p className="text-xs text-slate-400">
                          {converted.display_monthly_short} /mo
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
                          <p className="text-xs text-slate-600">
                            {tier.includes}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* Competitive Comparison */}
      <section className="border-t border-slate-100 bg-slate-50 py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionReveal>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                How FeatureSignals compares
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-500 sm:text-base">
                Honest, feature-by-feature comparison based on publicly
                available documentation as of April 2026.
              </p>
            </div>
          </SectionReveal>

          <SectionReveal delay={0.05}>
            <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left font-semibold text-slate-700">
                      Feature
                    </th>
                    <th className="px-3 py-3 text-center font-semibold text-indigo-700">
                      FeatureSignals
                    </th>
                    <th className="px-3 py-3 text-center font-semibold text-slate-700">
                      LaunchDarkly
                    </th>
                    <th className="px-3 py-3 text-center font-semibold text-slate-700">
                      Unleash
                    </th>
                    <th className="px-3 py-3 text-center font-semibold text-slate-700">
                      Flagsmith
                    </th>
                    <th className="px-3 py-3 text-center font-semibold text-slate-700">
                      Split.io
                    </th>
                    <th className="px-3 py-3 text-center font-semibold text-slate-700">
                      ConfigCat
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(
                    [
                      {
                        feature: "Open-source (Apache 2.0)",
                        fs: true,
                        ld: false,
                        ul: true,
                        fl: true,
                        sp: false,
                        cc: false,
                      },
                      {
                        feature: "Self-hosted option",
                        fs: true,
                        ld: false,
                        ul: true,
                        fl: true,
                        sp: false,
                        cc: false,
                      },
                      {
                        feature: "A/B experimentation",
                        fs: true,
                        ld: true,
                        ul: false,
                        fl: false,
                        sp: true,
                        cc: false,
                      },
                      {
                        feature: "Mutual exclusion groups",
                        fs: true,
                        ld: true,
                        ul: false,
                        fl: false,
                        sp: false,
                        cc: false,
                      },
                      {
                        feature: "OpenFeature SDK support",
                        fs: true,
                        ld: false,
                        ul: true,
                        fl: true,
                        sp: false,
                        cc: false,
                      },
                      {
                        feature: "Real-time SSE streaming",
                        fs: true,
                        ld: true,
                        ul: true,
                        fl: true,
                        sp: true,
                        cc: false,
                      },
                      {
                        feature: "Relay proxy (edge caching)",
                        fs: true,
                        ld: true,
                        ul: true,
                        fl: true,
                        sp: false,
                        cc: true,
                      },
                      {
                        feature: "Approval workflows",
                        fs: true,
                        ld: true,
                        ul: false,
                        fl: false,
                        sp: false,
                        cc: false,
                      },
                      {
                        feature: "Tamper-evident audit logs",
                        fs: true,
                        ld: true,
                        ul: true,
                        fl: false,
                        sp: false,
                        cc: false,
                      },
                      {
                        feature: "Target inspector (per-user eval)",
                        fs: true,
                        ld: false,
                        ul: false,
                        fl: false,
                        sp: false,
                        cc: false,
                      },
                      {
                        feature: "AI flag cleanup",
                        fs: true,
                        ld: false,
                        ul: false,
                        fl: false,
                        sp: false,
                        cc: false,
                      },
                      {
                        feature: "Flag scheduling",
                        fs: true,
                        ld: true,
                        ul: true,
                        fl: false,
                        sp: false,
                        cc: true,
                      },
                      {
                        feature: "Environment comparison",
                        fs: true,
                        ld: false,
                        ul: false,
                        fl: false,
                        sp: false,
                        cc: false,
                      },
                      {
                        feature: "Stale flag scanner (CLI)",
                        fs: true,
                        ld: false,
                        ul: false,
                        fl: false,
                        sp: false,
                        cc: false,
                      },
                      {
                        feature: "Unlimited evaluations",
                        fs: true,
                        ld: false,
                        ul: true,
                        fl: true,
                        sp: false,
                        cc: false,
                      },
                      {
                        feature: "No per-seat pricing",
                        fs: true,
                        ld: false,
                        ul: false,
                        fl: false,
                        sp: false,
                        cc: false,
                      },
                      {
                        feature: "Starting price (Pro)",
                        fs: "₹999/mo",
                        ld: "$8.33/seat/mo",
                        ul: "$80/mo",
                        fl: "$45/mo",
                        sp: "$36/user/mo",
                        cc: "$26/seat/mo",
                      },
                    ] as const
                  ).map((row) => (
                    <tr key={row.feature} className="hover:bg-slate-50/70">
                      <td className="sticky left-0 z-10 bg-white px-4 py-2.5 font-medium text-slate-700 group-hover:bg-slate-50">
                        {row.feature}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {typeof row.fs === "boolean" ? (
                          <ComparisonCheck value={row.fs} />
                        ) : (
                          <span className="text-xs font-semibold text-indigo-600">
                            {row.fs}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {typeof row.ld === "boolean" ? (
                          <ComparisonCheck value={row.ld} muted />
                        ) : (
                          <span className="text-xs text-slate-500">
                            {row.ld}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {typeof row.ul === "boolean" ? (
                          <ComparisonCheck value={row.ul} muted />
                        ) : (
                          <span className="text-xs text-slate-500">
                            {row.ul}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {typeof row.fl === "boolean" ? (
                          <ComparisonCheck value={row.fl} muted />
                        ) : (
                          <span className="text-xs text-slate-500">
                            {row.fl}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {typeof row.sp === "boolean" ? (
                          <ComparisonCheck value={row.sp} muted />
                        ) : (
                          <span className="text-xs text-slate-500">
                            {row.sp}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {typeof row.cc === "boolean" ? (
                          <ComparisonCheck value={row.cc} muted />
                        ) : (
                          <span className="text-xs text-slate-500">
                            {row.cc}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-center text-xs text-slate-400">
              Data based on publicly available vendor documentation as of April
              2026. Pricing shown is the lowest available self-serve plan.
            </p>
          </SectionReveal>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="border-t border-slate-100 py-14 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <SectionReveal>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Frequently asked questions
              </h2>
              <p className="mt-3 text-sm text-slate-500 sm:text-base">
                Everything you need to know before getting started. Can&apos;t
                find what you&apos;re looking for?{" "}
                <a
                  href="mailto:support@featuresignals.com"
                  className="font-medium text-indigo-600 underline decoration-indigo-300 hover:text-indigo-700"
                >
                  Ask us a question
                </a>
                .
              </p>
            </div>

            <div className="mt-10 space-y-1">
              {(
                [
                  {
                    q: "Is there really a free plan with no catch?",
                    a: `Yes. The Free plan includes the full core flag engine — all 5 flag types, all 8 SDKs, A/B experimentation, and unlimited evaluations. It's limited to ${free.limits.projects} project(s), ${free.limits.environments} environments, and ${free.limits.seats} team members so you can evaluate the platform thoroughly before upgrading. We don't charge per-evaluation or per-MAU, ever.`,
                  },
                  {
                    q: "How is FeatureSignals different from LaunchDarkly or Unleash?",
                    a: "Three key differences: (1) Predictable pricing — Rs 999/month for unlimited everything vs. per-seat or per-connection fees that can surprise you. (2) Open-source Apache-2.0 — self-host on your own infrastructure, full code access, no vendor lock-in. (3) AI-powered flag lifecycle management — AI scans your codebase for stale flags, detects anomalies, and suggests incident rollback. Human always approves.",
                  },
                  {
                    q: "Can I migrate from LaunchDarkly or another provider?",
                    a: "Yes. We're building a one-click migration tool that imports your flags, segments, and environments directly from LaunchDarkly, Unleash, and Flagsmith. All SDKs ship with OpenFeature providers so you can switch without changing your application code.",
                  },
                  {
                    q: "What happens after my 14-day Pro trial ends?",
                    a: "You can subscribe to Pro at any time during or after the trial. If you don't subscribe, your account automatically transitions to the Free plan — no data is lost, no flags are deleted. You'll just have the Free plan limits applied.",
                  },
                  {
                    q: "Can I self-host on my own infrastructure?",
                    a: "Absolutely. FeatureSignals is Apache-2.0 licensed and designed for self-hosting. Deploy with Docker Compose in under 5 minutes, use our Helm chart for Kubernetes, or run a single Go binary on any VPS. The software is always free — you only pay for your infrastructure.",
                  },
                  {
                    q: "How does the AI flag cleanup work?",
                    a: "AI scans your codebase for flag references, cross-references with evaluation usage data, and identifies flags that haven't been evaluated recently. It then generates cleanup pull requests that remove the flag and its dead code paths. You review and approve every change — AI never makes autonomous production changes.",
                  },
                  {
                    q: "Is my data secure? What compliance certifications do you have?",
                    a: "Security is built into every layer: TLS 1.3 in transit, AES-256 at rest, SHA-256 hashed API keys, tamper-evident audit logs with chain hashing, RBAC with per-environment permissions, and approval workflows. We've implemented controls mapped to SOC 2 Type II, GDPR, CCPA/CPRA, HIPAA, and ISO 27001. Enterprise plans include SSO (SAML/OIDC), SCIM, and IP allowlisting.",
                  },
                  {
                    q: "Which SDKs do you support?",
                    a: "Go, Node.js, Python, Java, C# (.NET), Ruby, React, and Vue. All SDKs include OpenFeature providers so you can switch flag providers without changing your application code. We also offer a relay proxy for edge deployments.",
                  },
                  {
                    q: "How does billing work and can I cancel anytime?",
                    a: "Billing is via Stripe or PayU depending on your region. Subscriptions are monthly with no annual contracts. You can upgrade, downgrade, or cancel at any time from the dashboard — no hidden fees, no prorated charges, no questions asked.",
                  },
                  {
                    q: "Do you offer discounts for startups or open-source projects?",
                    a: "Yes. Reach out to us and we'll work something out. We believe in making feature management accessible to teams that are building great things.",
                  },
                ] as const
              ).map(({ q, a }) => (
                <FAQItem key={q} question={q} answer={a} />
              ))}
            </div>
          </SectionReveal>

          {/* Ask a question */}
          <SectionReveal>
            <div className="mt-10 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-6 text-center sm:p-8">
              <h3 className="text-lg font-bold text-slate-900 sm:text-xl">
                Still have a question?
              </h3>
              <p className="mt-2 text-sm text-slate-600 sm:text-base">
                Can&apos;t find what you&apos;re looking for? We&apos;d love to
                help.
              </p>
              <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <a
                  href="mailto:support@featuresignals.com"
                  className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md"
                >
                  Email us at support@featuresignals.com
                </a>
                <a
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50"
                >
                  Contact Sales
                </a>
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
              href={appUrl.register}
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

/* ── FAQ Accordion Item ── */

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-slate-100">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-4 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-slate-900 sm:text-base">
          {question}
        </span>
        <ChevronDown
          className={cn(
            "ml-4 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          open ? "max-h-96 pb-4" : "max-h-0",
        )}
      >
        <p className="text-sm leading-relaxed text-slate-600">{answer}</p>
      </div>
    </div>
  );
}

/* ── Comparison Table Check/X ── */

function ComparisonCheck({
  value,
  muted = false,
}: {
  value: boolean;
  muted?: boolean;
}) {
  if (value) {
    return (
      <Check
        className={cn(
          "mx-auto h-4 w-4",
          muted ? "text-slate-400" : "text-emerald-500",
        )}
        aria-label="Yes"
      />
    );
  }
  return <Minus className="mx-auto h-4 w-4 text-slate-300" aria-label="No" />;
}
