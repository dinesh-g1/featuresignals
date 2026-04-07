"use client";

import { CodeTabs } from "@/components/code-tabs";
import { SectionReveal } from "@/components/section-reveal";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BarChart3,
  Code,
  FlaskConical,
  Layers,
  Tag,
  UserSearch,
  Users,
} from "lucide-react";

const colorMap: Record<
  string,
  {
    bg: string;
    text: string;
    ring: string;
    stepBg: string;
    stepText: string;
  }
> = {
  indigo: {
    bg: "bg-indigo-50",
    text: "text-indigo-600",
    ring: "ring-indigo-100",
    stepBg: "bg-indigo-50",
    stepText: "text-indigo-700",
  },
  violet: {
    bg: "bg-violet-50",
    text: "text-violet-600",
    ring: "ring-violet-100",
    stepBg: "bg-violet-50",
    stepText: "text-violet-700",
  },
  red: {
    bg: "bg-red-50",
    text: "text-red-600",
    ring: "ring-red-100",
    stepBg: "bg-red-50",
    stepText: "text-red-700",
  },
  emerald: {
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    ring: "ring-emerald-100",
    stepBg: "bg-emerald-50",
    stepText: "text-emerald-700",
  },
  amber: {
    bg: "bg-amber-50",
    text: "text-amber-600",
    ring: "ring-amber-100",
    stepBg: "bg-amber-50",
    stepText: "text-amber-700",
  },
  sky: {
    bg: "bg-sky-50",
    text: "text-sky-600",
    ring: "ring-sky-100",
    stepBg: "bg-sky-50",
    stepText: "text-sky-700",
  },
  rose: {
    bg: "bg-rose-50",
    text: "text-rose-600",
    ring: "ring-rose-100",
    stepBg: "bg-rose-50",
    stepText: "text-rose-700",
  },
  teal: {
    bg: "bg-teal-50",
    text: "text-teal-600",
    ring: "ring-teal-100",
    stepBg: "bg-teal-50",
    stepText: "text-teal-700",
  },
};

type CodeTab = { lang: string; label: string; code: string };

type UseCase = {
  title: string;
  subtitle: string;
  description: string;
  steps: string[];
  icon: LucideIcon;
  color: keyof typeof colorMap;
  code: CodeTab[];
};

const useCases: UseCase[] = [
  {
    title: "Progressive Rollouts",
    subtitle: "Ship to 1% of users, then scale to 100%",
    description:
      "Roll out new features gradually using percentage-based targeting with consistent hashing. The same user always sees the same variant, so their experience stays stable as you increase the rollout. If something breaks, dial it back instantly.",
    steps: [
      "Create a boolean flag for your new feature",
      "Set a 1% rollout in production",
      "Monitor error rates and user feedback",
      "Increase to 10%, 50%, then 100%",
    ],
    icon: BarChart3,
    color: "indigo",
    code: [
      {
        lang: "curl",
        label: "Set Rollout",
        code: `# Set 10% rollout in production
curl -X PUT https://api.featuresignals.com/v1/projects/proj-1/flags/new-checkout/environments/env-prod \\
  -H "Authorization: Bearer <token>" \\
  -d '{
    "enabled": true,
    "rollout_percentage": 10
  }'

# Increase to 100% when confident
curl -X PUT .../flags/new-checkout/environments/env-prod \\
  -H "Authorization: Bearer <token>" \\
  -d '{ "enabled": true, "rollout_percentage": 100 }'`,
      },
      {
        lang: "go",
        label: "Go SDK",
        code: `client := fs.NewClient("YOUR_API_KEY")

// Consistent hashing: same user always gets the same result
enabled := client.IsEnabled("new-checkout",
    fs.User{Key: "user-42"})
// At 10% rollout: ~10% of users see the new checkout
// At 100%: everyone sees it`,
      },
    ],
  },
  {
    title: "A/B Testing",
    subtitle: "Data-driven decisions with variant flags",
    description:
      "Run controlled experiments with weighted variant assignment. Consistent hashing ensures each user always lands in the same bucket. Track impressions via the metrics API and pipe the data to your analytics tool of choice.",
    steps: [
      "Create a variant flag with control and treatment groups",
      "Set weights (e.g., 50/50 or 90/10)",
      "Instrument your app with impression callbacks",
      "Analyze conversion rates and pick the winner",
    ],
    icon: FlaskConical,
    color: "violet",
    code: [
      {
        lang: "react",
        label: "React",
        code: `import { useStringFlagDetails } from "@featuresignals/react";

function PricingPage() {
  const { value } = useStringFlagDetails(
    "pricing-experiment", "control"
  );

  useEffect(() => {
    analytics.track("pricing_impression", { variant: value });
  }, [value]);

  return value === "treatment-a"
    ? <NewPricing />
    : <CurrentPricing />;
}`,
      },
      {
        lang: "node",
        label: "Node.js",
        code: `const variant = await client.getStringDetails(
  "pricing-experiment", "control",
  { key: "user-42" }
);

// variant.value === "treatment-a" or "control"
analytics.track("pricing_impression", {
  variant: variant.value,
});`,
      },
    ],
  },
  {
    title: "Kill Switch",
    subtitle: "Instant rollback when things go wrong",
    description:
      "Wrap risky features in a flag and disable them in one click during incidents. No redeployment, no waiting for CI. The change propagates to all connected SDKs in seconds via SSE streaming.",
    steps: [
      "Wrap the risky code path behind a flag",
      "Deploy with the flag enabled",
      "If an incident occurs, toggle the flag off in the Flag Engine",
      "All SDKs receive the update in seconds via SSE",
    ],
    icon: AlertTriangle,
    color: "red",
    code: [
      {
        lang: "curl",
        label: "One-Click Kill",
        code: `# Emergency disable — takes effect in seconds
curl -X POST https://api.featuresignals.com/v1/projects/proj-1/flags/payments-v2/kill \\
  -H "Authorization: Bearer <token>" \\
  -d '{ "env_id": "env-production" }'

# All SDKs receive the update via SSE within seconds
# No redeploy needed`,
      },
    ],
  },
  {
    title: "Trunk-Based Development",
    subtitle: "Merge to main every day, release when ready",
    description:
      "Feature flags decouple deployment from release. Engineers merge incomplete work behind flags daily, eliminating long-lived branches and painful merge conflicts. Product decides when to flip the switch.",
    steps: [
      "Developers wrap work-in-progress behind a flag",
      "Merge to main daily — the flag keeps it hidden",
      "QA tests by enabling the flag in staging",
      "Product enables the flag in production when ready",
    ],
    icon: Code,
    color: "emerald",
    code: [
      {
        lang: "node",
        label: "Node.js",
        code: `// Work-in-progress code merged to main daily
if (await client.isEnabled("new-payment-flow", { key: userId })) {
  // New incomplete feature — hidden from users
  return processPaymentV2(order);
}
// Stable code path — everyone sees this
return processPaymentV1(order);`,
      },
      {
        lang: "bash",
        label: "CI Pipeline",
        code: `# In CI, the stale flag scanner ensures cleanup
featuresignals scan --dir ./src --ci --api-key $FS_API_KEY

# Flags older than 30 days without evaluations are flagged:
# ⚠ old-banner: STALE (last eval: 45 days ago)
# ✓ new-payment-flow: ACTIVE (last eval: 2 hours ago)`,
      },
    ],
  },
  {
    title: "Beta Programs & Early Access",
    subtitle: "Give power users early access to new features",
    description:
      "Use segment-based targeting to enable features for specific user groups. Create a 'beta-testers' segment, add users by email or attribute, and they'll see the new feature while everyone else sees the stable version.",
    steps: [
      "Create a segment for beta testers",
      "Add rules: email ends with @company.com, or plan = 'enterprise'",
      "Create a flag targeting that segment",
      "Beta users see the feature, everyone else sees the default",
    ],
    icon: Users,
    color: "amber",
    code: [
      {
        lang: "node",
        label: "Node.js",
        code: `// Beta users automatically see the new feature
const enabled = await client.isEnabled("ai-assistant", {
  key: userId,
  attributes: {
    email: "power-user@enterprise.com",
    plan: "enterprise",
  },
});
// Server-side targeting rules:
//   segment "beta-testers" → email endsWith "@enterprise.com"
//   OR attribute "plan" equals "enterprise"`,
      },
    ],
  },
  {
    title: "Multi-Environment Promotion",
    subtitle: "Test in staging, promote to production with confidence",
    description:
      "Each environment has its own flag states and targeting rules. Test thoroughly in development and staging before promoting to production. Use Environment Comparison to spot drift and bulk-sync changes across environments.",
    steps: [
      "Enable the flag in development and iterate",
      "Use Env Comparison to verify staging matches dev",
      "Bulk-sync selected flags from staging to production",
      "Full rollout after validation",
    ],
    icon: Layers,
    color: "sky",
    code: [
      {
        lang: "curl",
        label: "Compare & Sync",
        code: `# Compare flag states between staging and production
curl "https://api.featuresignals.com/v1/projects/proj-1/flags/compare-environments\\
?source_env_id=env-staging&target_env_id=env-production" \\
  -H "Authorization: Bearer <token>"

# Bulk-sync selected flags from staging to production
curl -X POST .../flags/sync-environments \\
  -H "Authorization: Bearer <token>" \\
  -d '{
    "source_env_id": "env-staging",
    "target_env_id": "env-production",
    "flag_keys": ["new-checkout", "dark-mode"]
  }'`,
      },
    ],
  },
  {
    title: "Customer Support Debugging",
    subtitle: '"What does this user see?" — answered in seconds',
    description:
      "When a customer reports an issue, use Entity Inspector to see exactly what flags they experience. Compare two users side-by-side to understand why one sees a feature and another doesn't. No code reading required.",
    steps: [
      "Customer reports: 'I can't see the new dashboard'",
      "Open Entity Inspector, enter their user key and attributes",
      "Instantly see all flag evaluations with reasons",
      "Compare with a working user to find the difference",
    ],
    icon: UserSearch,
    color: "rose",
    code: [
      {
        lang: "curl",
        label: "Inspect Entity",
        code: `# See exactly what user-42 experiences
curl -X POST https://api.featuresignals.com/v1/projects/proj-1/environments/env-prod/inspect-entity \\
  -H "Authorization: Bearer <token>" \\
  -d '{
    "entity_key": "user-42",
    "attributes": { "plan": "free", "country": "US" }
  }'

# Returns: flag_key, value, reason for every flag
# → "new-dashboard": false, reason: "ROLLOUT" (not in 10% bucket)`,
      },
      {
        lang: "curl",
        label: "Compare Users",
        code: `# Why does user-42 not see the feature but user-99 does?
curl -X POST .../environments/env-prod/compare-entities \\
  -H "Authorization: Bearer <token>" \\
  -d '{
    "entity_a": { "key": "user-42", "attributes": { "plan": "free" } },
    "entity_b": { "key": "user-99", "attributes": { "plan": "enterprise" } }
  }'
# Diff shows: user-99 matched "enterprise" targeting rule`,
      },
    ],
  },
  {
    title: "Toggle Lifecycle Management",
    subtitle: "Categorize, track, and clean up flags systematically",
    description:
      "Classify every flag into one of four categories — release, experiment, ops, or permission — each with tailored staleness thresholds and management guidance. Track lifecycle status from active through archived. Never let technical debt from stale flags accumulate again.",
    steps: [
      "Assign a category when creating each flag",
      "Flag Health uses category-aware staleness thresholds",
      "Move flags through active → rolled_out → deprecated → archived",
      "CI pipeline scans for stale flags and fails the build",
    ],
    icon: Tag,
    color: "teal",
    code: [
      {
        lang: "json",
        label: "Categories",
        code: `// Four toggle categories with different lifecycles:
//
// RELEASE    → 14-day staleness threshold
//               Trunk-based dev, canary rollouts
//
// EXPERIMENT → 30-day staleness threshold
//               A/B tests, multivariate experiments
//
// OPS        → 90-day staleness threshold
//               Circuit breakers, maintenance modes
//
// PERMISSION → 90-day staleness threshold
//               Plan gating, feature entitlements`,
      },
    ],
  },
];

export default function UseCasesPage() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
          How teams use{" "}
          <span className="bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent">
            FeatureSignals
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-500 sm:text-lg">
          Real workflows that help engineering teams ship faster, test safely,
          and recover from incidents in seconds.
        </p>
      </div>

      <div className="mt-10 space-y-8 sm:mt-16 sm:space-y-12">
        {useCases.map((uc, i) => {
          const c = colorMap[uc.color];
          const Icon = uc.icon;
          return (
            <SectionReveal key={uc.title}>
              <div className="group rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-200 hover:border-slate-300 hover:shadow-xl sm:p-8">
                <div className="flex flex-col gap-4 sm:gap-6 md:flex-row md:items-start md:gap-8">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl sm:h-14 sm:w-14 ${c.bg} ${c.text} ring-1 ${c.ring}`}
                  >
                    <Icon
                      className="h-6 w-6 sm:h-7 sm:w-7"
                      strokeWidth={1.5}
                      aria-hidden
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-3">
                      <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                        {uc.title}
                      </h2>
                      <span
                        className={`self-start rounded-full ${c.bg} px-3 py-0.5 text-xs font-medium ${c.stepText} ring-1 ${c.ring}`}
                      >
                        {uc.subtitle}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                      {uc.description}
                    </p>
                    <div className="mt-4 sm:mt-5">
                      <h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                        How it works
                      </h3>
                      <ol className="mt-3 space-y-2">
                        {uc.steps.map((step, j) => (
                          <li
                            key={step}
                            className="flex items-start gap-2 sm:gap-3"
                          >
                            <span
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${c.bg} text-xs font-bold ${c.stepText}`}
                            >
                              {j + 1}
                            </span>
                            <span className="text-sm text-slate-600">
                              {step}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                    {uc.code.length > 0 && (
                      <div className="mt-4 sm:mt-5">
                        <h3 className="mb-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                          See it in code
                        </h3>
                        <CodeTabs tabs={uc.code} id={`usecase-${i}`} />
                      </div>
                    )}
                    <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
                      <a
                        href="https://app.featuresignals.com/register"
                        className="text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700"
                      >
                        Try this workflow free &rarr;
                      </a>
                      <span className="text-slate-300">|</span>
                      <a
                        href="https://docs.featuresignals.com/getting-started/quickstart"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-slate-500 transition-colors hover:text-slate-700"
                      >
                        Quickstart guide
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </SectionReveal>
          );
        })}
      </div>

      <SectionReveal className="mt-10 sm:mt-16">
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 text-center text-white sm:p-10">
          <h2 className="text-xl font-bold sm:text-2xl">
            Ready to try it yourself?
          </h2>
          <p className="mt-2 text-sm text-indigo-200 sm:text-base">
            Start a 14-day free trial — full Pro features, no credit card
            required.
          </p>
          <div className="mt-6 flex flex-col flex-wrap items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <a
              href="https://app.featuresignals.com/register"
              className="w-full rounded-lg bg-white px-6 py-3 text-sm font-semibold text-indigo-600 shadow-sm transition-all hover:bg-indigo-50 hover:shadow-md sm:w-auto"
            >
              Start Free Trial
            </a>
            <a
              href="https://app.featuresignals.com/register"
              className="w-full rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10 sm:w-auto"
            >
              Sign Up Free
            </a>
            <a
              href="/pricing"
              className="w-full rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10 sm:w-auto"
            >
              View Pricing
            </a>
          </div>
        </div>
      </SectionReveal>
    </section>
  );
}
