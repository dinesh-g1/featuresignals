import Link from "next/link";
import type { Metadata } from "next";
import { Check, ArrowRight, Zap, Shield, Building2, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, transparent pricing for teams of all sizes. Free tier included. No per-MAU pricing. Enterprise-grade feature flags starting at $0.",
};

const tiers = [
  {
    name: "Free",
    id: "free",
    price: "$0",
    description: "Perfect for side projects and small teams getting started.",
    features: [
      "Up to 100 feature flags",
      "3 team members",
      "2 environments",
      "Basic targeting rules",
      "Community support",
      "REST API access",
      "7-day evaluation history",
    ],
    cta: "Get Started Free",
    href: "https://app.featuresignals.com/signup",
    highlighted: false,
  },
  {
    name: "Pro",
    id: "pro",
    price: "$99",
    period: "/month",
    description: "For growing teams that need advanced flag management.",
    features: [
      "Unlimited feature flags",
      "Up to 25 team members",
      "Unlimited environments",
      "Advanced targeting (segments, % rollouts)",
      "A/B experimentation engine",
      "AI Janitor (stale flag detection)",
      "Slack & webhook integrations",
      "90-day evaluation history",
      "SOC 2 compliance",
      "Priority email support",
    ],
    cta: "Start Pro Trial",
    href: "https://app.featuresignals.com/signup?plan=pro",
    highlighted: true,
  },
  {
    name: "Enterprise",
    id: "enterprise",
    price: "Custom",
    description: "For organizations that need dedicated infrastructure and control.",
    features: [
      "Everything in Pro, plus:",
      "Unlimited team members & projects",
      "Single sign-on (SAML/OIDC)",
      "Custom approval workflows (CAB)",
      "Audit logging with export",
      "Self-hosted / private cloud deployment",
      "99.95% SLA with dedicated support",
      "On-premise relay proxy",
      "Custom contract terms",
      "Dedicated account manager",
      "Name-customizable rate limits",
    ],
    cta: "Contact Sales",
    href: "/contact",
    highlighted: false,
  },
];

const comparisons = [
  {
    feature: "Feature Flags",
    free: "100",
    pro: "Unlimited",
    enterprise: "Unlimited",
  },
  {
    feature: "Team Members",
    free: "3",
    pro: "25",
    enterprise: "Unlimited",
  },
  {
    feature: "Environments",
    free: "2",
    pro: "Unlimited",
    enterprise: "Unlimited",
  },
  {
    feature: "Targeting Rules",
    free: "Basic",
    pro: "Advanced",
    enterprise: "Advanced",
  },
  {
    feature: "A/B Experimentation",
    free: "—",
    pro: "✓",
    enterprise: "✓",
  },
  {
    feature: "AI Janitor",
    free: "—",
    pro: "✓",
    enterprise: "✓",
  },
  {
    feature: "Audit Log",
    free: "7 days",
    pro: "90 days",
    enterprise: "Unlimited",
  },
  {
    feature: "SSO (SAML/OIDC)",
    free: "—",
    pro: "—",
    enterprise: "✓",
  },
  {
    feature: "Approval Workflows",
    free: "—",
    pro: "—",
    enterprise: "✓",
  },
  {
    feature: "Self-Hosted",
    free: "—",
    pro: "—",
    enterprise: "✓",
  },
  {
    feature: "Support",
    free: "Community",
    pro: "Email (4h)",
    enterprise: "Dedicated (1h)",
  },
  {
    feature: "SLA",
    free: "—",
    pro: "99.9%",
    enterprise: "99.95%",
  },
];

const faqs = [
  {
    q: "How is pricing calculated?",
    a: "We charge a flat monthly fee per workspace — never per seat, never per MAU (monthly active users). This means your bill stays predictable as your user base grows. The Free tier is and always will be free with no time limit.",
  },
  {
    q: "Can I self-host FeatureSignals?",
    a: "Yes. Enterprise plans include self-hosted deployment via Docker Compose or Kubernetes. Community Edition is also available under Apache 2.0 license for self-hosting with basic features.",
  },
  {
    q: "Is there a free trial for Pro?",
    a: "Yes! You get a 14-day free trial of Pro with no credit card required. Full access to all Pro features including the AI Janitor, A/B experimentation, and advanced targeting.",
  },
  {
    q: "What happens when I exceed the Free tier limits?",
    a: "You'll receive in-app notifications and can upgrade to Pro at any time. No data is lost during the transition — your flags, segments, and configurations are preserved.",
  },
  {
    q: "Do you offer academic or open-source discounts?",
    a: "Yes. We offer a 50% discount for verified academic institutions and free Pro access for qualified open-source projects. Contact our sales team for details.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Absolutely. No long-term contracts. Cancel anytime and your subscription remains active until the end of the current billing period. Your data is exportable at any time.",
  },
];

function CheckIcon() {
  return <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" strokeWidth={2.5} />;
}

export default function PricingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-stone-200 bg-stone-50">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-1.5 text-xs font-semibold text-stone-500 mb-6">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Simple, predictable pricing — never per MAU
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-stone-900 mb-6">
              Pricing that scales with{" "}
              <span className="text-accent">your team</span>
            </h1>
            <p className="text-lg sm:text-xl text-stone-600 max-w-2xl mx-auto leading-relaxed">
              No per-MAU fees. No hidden costs. Flat-rate pricing for every
              team size — from indie devs to Fortune 500 enterprises.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {tiers.map((tier) => (
              <div
                key={tier.id}
                className={`relative flex flex-col rounded-2xl border p-8 transition-all duration-200 ${
                  tier.highlighted
                    ? "border-accent/30 bg-white shadow-lg shadow-accent/5 scale-105"
                    : "border-stone-200 bg-white hover:shadow-md"
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-[11px] font-bold text-white tracking-wide">
                    <Zap className="h-3 w-3" />
                    MOST POPULAR
                  </div>
                )}
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-stone-900 mb-1">
                    {tier.name}
                  </h2>
                  <p className="text-sm text-stone-500">{tier.description}</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-stone-900">
                    {tier.price}
                  </span>
                  {tier.period && (
                    <span className="text-sm text-stone-400 ml-1">
                      {tier.period}
                    </span>
                  )}
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-stone-600">
                      <CheckIcon />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={tier.href}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
                    tier.highlighted
                      ? "bg-accent text-white hover:bg-accent-dark shadow-md"
                      : "border border-stone-300 text-stone-700 hover:border-accent hover:text-accent hover:bg-accent/5"
                  }`}
                >
                  {tier.cta}
                  <ArrowRight className="h-4 w-4" strokeWidth={2} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="border-b border-stone-200 bg-stone-50">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 text-center mb-8">
              Compare plans in detail
            </h2>
            <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50">
                    <th className="text-left px-6 py-4 font-semibold text-stone-700">Feature</th>
                    <th className="text-center px-6 py-4 font-semibold text-stone-700">Free</th>
                    <th className="text-center px-6 py-4 font-semibold text-accent">Pro</th>
                    <th className="text-center px-6 py-4 font-semibold text-stone-700">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisons.map((row, i) => (
                    <tr key={row.feature} className={i < comparisons.length - 1 ? "border-b border-stone-100" : ""}>
                      <td className="px-6 py-3.5 text-stone-700 font-medium">{row.feature}</td>
                      <td className="px-6 py-3.5 text-center text-stone-500">{row.free}</td>
                      <td className="px-6 py-3.5 text-center text-accent font-medium">{row.pro}</td>
                      <td className="px-6 py-3.5 text-center text-stone-700">{row.enterprise}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 text-center mb-12">
              Frequently asked questions
            </h2>
            <div className="space-y-6">
              {faqs.map((faq) => (
                <details
                  key={faq.q}
                  className="group rounded-xl border border-stone-200 bg-white open:border-accent/30 open:shadow-sm transition-all"
                >
                  <summary className="flex items-center justify-between px-6 py-4 cursor-pointer list-none text-sm font-semibold text-stone-800 hover:text-accent transition-colors">
                    {faq.q}
                    <svg
                      className="h-4 w-4 text-stone-400 group-open:rotate-180 transition-transform shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="px-6 pb-4 text-sm text-stone-600 leading-relaxed">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-stone-900">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Ready to get started?
          </h2>
          <p className="text-stone-400 max-w-xl mx-auto mb-8">
            Start free. No credit card required. Upgrade when you grow.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="https://app.featuresignals.com/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-8 py-3.5 text-sm font-bold text-white hover:bg-accent-dark transition-colors shadow-lg"
            >
              <Sparkles className="h-4 w-4" />
              Start Free Trial
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-xl border border-stone-700 px-8 py-3.5 text-sm font-semibold text-stone-300 hover:bg-stone-800 hover:text-white transition-colors"
            >
              Talk to Sales
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
