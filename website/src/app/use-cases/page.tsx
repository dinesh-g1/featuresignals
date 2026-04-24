import Link from "next/link";
import type { Metadata } from "next";
import {
  Rocket,
  ShieldOff,
  FlaskConical,
  GitBranch,
  Zap,
  ArrowRight,
  Sparkles,
  Users,
  BarChart3,
  Activity,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Use Cases",
  description:
    "Feature flags power CI/CD pipelines, canary releases, kill switches, A/B experimentation, and progressive delivery. See how teams use FeatureSignals.",
};

const useCases = [
  {
    title: "CI/CD & Continuous Delivery",
    slug: "ci-cd",
    summary:
      "Decouple deployment from release. Ship code to production behind a feature flag, then enable it when ready — without a separate deployment.",
    icon: Rocket,
    benefits: [
      "Merge incomplete features without breaking production",
      "Test in production with internal beta users first",
      "Instant rollback by toggling a flag off — no redeploy needed",
      "Short-lived flags for trunk-based development workflows",
      "Integrate with GitHub Actions, GitLab CI, or Jenkins",
    ],
    example: (
      <div className="rounded-lg bg-stone-900 p-4 font-mono text-xs text-stone-300 overflow-x-auto">
        <div className="text-stone-500 mb-2">
          # deploy new checkout flow behind a flag
        </div>
        <div>git push origin feature/new-checkout</div>
        <div># PR reviewed, merged, deployed to production (flag OFF)</div>
        <div className="text-accent">
          # QA verifies in production — flag ON for internal team
        </div>
        <div className="text-emerald-400">
          # Rollout to 10%, then 50%, then 100%
        </div>
      </div>
    ),
  },
  {
    title: "Canary Releases & Progressive Delivery",
    slug: "canary-releases",
    summary:
      "Roll out changes gradually to reduce risk. Start with 1% of users, monitor metrics, and increase the percentage automatically.",
    icon: GitBranch,
    benefits: [
      "Target by user ID, email domain, region, or custom attribute",
      "Percentage-based rollouts with consistent hashing",
      "Automatic rollback if error rates spike",
      "Scheduled rollouts for time-zone aware releases",
      "A/B comparison between canary and control groups",
    ],
    example: (
      <div className="rounded-lg bg-stone-900 p-4 font-mono text-xs text-stone-300 overflow-x-auto">
        <div className="text-stone-500 mb-2">
          # Progressive rollout strategy
        </div>
        <div>{"{"}</div>
        <div> "flag": "new-recommendations",</div>
        <div> "rollout": [</div>
        <div> {'{ "pct": 1, "hold": "30m", "action": "monitor" }'},</div>
        <div> {'{ "pct": 10, "hold": "1h", "action": "monitor" }'},</div>
        <div> {'{ "pct": 50, "hold": "2h", "action": "monitor" }'},</div>
        <div> {'{ "pct": 100, "action": "complete" }'}</div>
        <div> ]</div>
        <div>{"}"}</div>
      </div>
    ),
  },
  {
    title: "Kill Switches & Incident Response",
    slug: "kill-switches",
    summary:
      "Instant circuit breakers for production incidents. Disable a feature across all users with a single toggle — no code changes, no redeployments.",
    icon: ShieldOff,
    benefits: [
      "Disable problematic features in under 1 second",
      "Granular kill switches per environment or region",
      "Audit log of every toggle event for post-mortem analysis",
      "Automatic re-enable after incident resolution",
      "Scheduled kill switch activation for maintenance windows",
    ],
    example: (
      <div className="rounded-lg bg-stone-900 p-4 font-mono text-xs text-stone-300 overflow-x-auto">
        <div className="text-stone-500 mb-2">
          # Kill switch activated during incident
        </div>
        <div className="text-red-400">
          POST /api/v1/flags/payment-v3/toggle OFF
        </div>
        <div className="text-stone-500">
          # All traffic instantly falls back to payment-v2
        </div>
        <div className="text-stone-500">
          # No deploy. No revert. No cache invalidation.
        </div>
      </div>
    ),
  },
  {
    title: "A/B Testing & Experimentation",
    slug: "ab-testing",
    summary:
      "Run controlled experiments with statistical significance. Test variations, measure impact, and make data-driven decisions.",
    icon: FlaskConical,
    benefits: [
      "Multi-variant experiments (A/B/n testing)",
      "Sticky bucketing for consistent user experience",
      "Built-in statistical significance calculator",
      "Integration with analytics platforms (Mixpanel, Amplitude)",
      "Automated winner selection and rollout",
    ],
    example: (
      <div className="rounded-lg bg-stone-900 p-4 font-mono text-xs text-stone-300 overflow-x-auto">
        <div className="text-stone-500 mb-2">
          # A/B experiment configuration
        </div>
        <div>{"{"}</div>
        <div> "flag": "checkout-redesign",</div>
        <div> "type": "ab_experiment",</div>
        <div> "variations": [</div>
        <div> {'{ "name": "Control", "weight": 50 }'},</div>
        <div> {'{ "name": "Variant A", "weight": 30 }'},</div>
        <div> {'{ "name": "Variant B", "weight": 20 }'}</div>
        <div> ],</div>
        <div> "metrics": ["conversion_rate", "revenue_per_user"]</div>
        <div>{"}"}</div>
      </div>
    ),
  },
  {
    title: "Progressive Delivery & GitOps",
    slug: "progressive-delivery",
    summary:
      "Manage flag state as code. Declare your desired flag configuration in Git and let FeatureSignals reconcile the actual state automatically.",
    icon: Activity,
    benefits: [
      "Terraform provider for Infrastructure-as-Code workflows",
      "Git-based flag management with pull request reviews",
      "Flag state versioning and change history",
      "Automated flag cleanup after Git branch merge",
      "Policy-as-code for approval workflows",
    ],
    example: (
      <div className="rounded-lg bg-stone-900 p-4 font-mono text-xs text-stone-300 overflow-x-auto">
        <div className="text-stone-500 mb-2">
          # Terraform: Feature flags as code
        </div>
        <div>resource "featuresignals_flag" "dark_mode" {"{"}</div>
        <div> project_slug = "my-app"</div>
        <div> key = "dark-mode"</div>
        <div> name = "Dark Mode"</div>
        <div> flag_type = "boolean"</div>
        <div> default_value = "false"</div>
        <div>{"}"}</div>
      </div>
    ),
  },
  {
    title: "Team Collaboration & Governance",
    slug: "team-collaboration",
    summary:
      "Define who can create, modify, enable, or delete flags. Implement approval workflows for production changes with full audit trail.",
    icon: Users,
    benefits: [
      "Role-based access control (Admin, Developer, Viewer)",
      "Custom approval workflows (CAB) for production flags",
      "Audit logging with export for compliance",
      "Environment-level permissions and isolation",
      "Slack notifications for flag changes",
    ],
    example: (
      <div className="rounded-lg bg-stone-900 p-4 font-mono text-xs text-stone-300 overflow-x-auto">
        <div className="text-stone-500 mb-2">
          # Approval workflow for production
        </div>
        <div className="text-stone-500">
          # 1. Developer enables flag in staging
        </div>
        <div className="text-stone-500">
          # 2. PR created to enable in production
        </div>
        <div className="text-stone-500">
          # 3. CAB approves via Slack + audit trail
        </div>
        <div className="text-accent">
          # 4. Flag automatically enabled in production
        </div>
      </div>
    ),
  },
];

export default function UseCasesPage() {
  return (
    <>
      {/* BreadcrumbList JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: "https://featuresignals.com",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Use Cases",
                item: "https://featuresignals.com/use-cases",
              },
            ],
          }),
        }}
      />
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-stone-200 bg-stone-50">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-1.5 text-xs font-semibold text-stone-500 mb-6">
              <Zap className="h-3.5 w-3.5 text-accent" />
              Real-world applications
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-stone-900 mb-6">
              Feature flags for{" "}
              <span className="text-accent">every workflow</span>
            </h1>
            <p className="text-lg sm:text-xl text-stone-600 max-w-2xl mx-auto leading-relaxed">
              From CI/CD pipelines to incident response to A/B testing —
              FeatureSignals adapts to your team&apos;s unique workflow.
            </p>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      {useCases.map((useCase, i) => {
        const Icon = useCase.icon;
        return (
          <section
            key={useCase.slug}
            className={`border-b border-stone-200 ${
              i % 2 === 0 ? "bg-white" : "bg-stone-50"
            }`}
          >
            <div className="mx-auto max-w-7xl px-6 py-12 sm:py-16">
              <div className="mx-auto max-w-5xl">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                  <div>
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent mb-6">
                      <Icon className="h-7 w-7" strokeWidth={1.5} />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-4">
                      {useCase.title}
                    </h2>
                    <p className="text-stone-600 leading-relaxed mb-6">
                      {useCase.summary}
                    </p>
                    <ul className="space-y-3 mb-8">
                      {useCase.benefits.map((benefit) => (
                        <li
                          key={benefit}
                          className="flex items-start gap-3 text-sm text-stone-600"
                        >
                          <span className="mt-1.5 flex h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="hidden lg:block">{useCase.example}</div>
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {/* Stats */}
      <section className="border-b border-stone-200 bg-stone-900">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-accent mb-1">&lt;1ms</div>
              <div className="text-sm text-stone-400">
                p99 evaluation latency
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-accent mb-1">99.95%</div>
              <div className="text-sm text-stone-400">uptime SLA</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-accent mb-1">8</div>
              <div className="text-sm text-stone-400">SDK languages</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-accent mb-1">50K+</div>
              <div className="text-sm text-stone-400">flags managed</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-4">
            Ready to ship with confidence?
          </h2>
          <p className="text-stone-500 max-w-xl mx-auto mb-8">
            Start free, no credit card required. Full Pro features for 14 days.
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
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-xl border border-stone-300 px-8 py-3.5 text-sm font-semibold text-stone-700 hover:border-accent hover:text-accent transition-colors"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
