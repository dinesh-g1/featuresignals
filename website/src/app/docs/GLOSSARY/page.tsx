import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen } from "lucide-react";

export const metadata: Metadata = {
  title: "Glossary",
  description: "A comprehensive glossary of feature flag and FeatureSignals terminology.",
};

interface GlossaryTerm {
  term: string;
  definition: string;
  seeAlso?: string;
}

const terms: GlossaryTerm[] = [
  {
    term: "Feature Flag",
    definition:
      "A conditional switch in your code that lets you enable or disable functionality without deploying new code. Also called a feature toggle. FeatureSignals supports boolean, string, number, JSON, and A/B flag types.",
    seeAlso: "/docs/core-concepts/feature-flags",
  },
  {
    term: "Toggle Category",
    definition:
      "A classification for feature flags that determines their expected lifespan and staleness thresholds. The four categories are: release (days to weeks), experiment (weeks to months), ops (indefinite), and permission (indefinite). Modeled after Martin Fowler's feature toggle taxonomy.",
    seeAlso: "/docs/core-concepts/toggle-categories",
  },
  {
    term: "Targeting",
    definition:
      "The mechanism that determines which users receive which flag variation. Targeting rules evaluate user attributes (email, plan, region, custom properties) against conditions to decide whether to serve a specific value or proceed to the next rule.",
    seeAlso: "/docs/core-concepts/targeting-and-segments",
  },
  {
    term: "Segment",
    definition:
      "A reusable, named group of users defined by a set of rules. Segments can be shared across multiple flags. For example, a 'Premium Users' segment matches users whose plan attribute equals 'premium'.",
    seeAlso: "/docs/core-concepts/targeting-and-segments",
  },
  {
    term: "Rollout",
    definition:
      "The process of gradually increasing the percentage of users who see a new feature. FeatureSignals supports percentage-based rollouts using consistent hashing — a given user always receives the same assignment throughout the rollout.",
    seeAlso: "/docs/core-concepts/percentage-rollouts",
  },
  {
    term: "A/B Experiment",
    definition:
      "A controlled test where users are split into groups (variants) and each group sees a different version of a feature. FeatureSignals tracks impressions and supports weighted variant assignment so you can measure the impact of each variant.",
    seeAlso: "/docs/core-concepts/ab-experimentation",
  },
  {
    term: "Mutual Exclusion",
    definition:
      "A constraint that prevents two or more flags from being enabled for the same user at the same time. Used when running concurrent experiments that could interfere with each other. Flags in the same mutual exclusion group are evaluated in order — only the first matching flag wins.",
    seeAlso: "/docs/core-concepts/mutual-exclusion",
  },
  {
    term: "Prerequisites",
    definition:
      "Flags that must be enabled for a dependent flag to evaluate. Think of it as a dependency chain: flag B depends on flag A. If flag A is not enabled, flag B returns its default value regardless of its own configuration.",
    seeAlso: "/docs/core-concepts/prerequisites",
  },
  {
    term: "Flag Lifecycle",
    definition:
      "The progression of a feature flag through statuses: active → rolled_out → deprecated → archived. Each status conveys whether a flag is in use, fully released, scheduled for removal, or permanently retired.",
    seeAlso: "/docs/core-concepts/flag-lifecycle",
  },
  {
    term: "Environment",
    definition:
      "An isolated context for flag evaluation — typically dev, staging, and production. Each environment has its own flag states, targeting rules, and rollouts. The same flag can be ON in dev and OFF in production.",
    seeAlso: "/docs/core-concepts/projects-and-environments",
  },
  {
    term: "Project",
    definition:
      "A logical grouping of environments and flags. Projects typically map to applications or services. Each project has its own set of environments, flags, API keys, and team permissions.",
    seeAlso: "/docs/core-concepts/projects-and-environments",
  },
  {
    term: "Organization",
    definition:
      "The top-level tenant boundary in FeatureSignals. An organization contains projects, users, API keys, and billing. All data is scoped through the organization chain: Organization → Project → Environment → Flag.",
  },
  {
    term: "SDK",
    definition:
      "A client library that integrates with your application to evaluate feature flags. FeatureSignals provides OpenFeature-native server SDKs (Go, Node.js, Python, Java, Ruby, .NET) and client SDKs (JavaScript, React, iOS, Android).",
    seeAlso: "/docs/sdks",
  },
  {
    term: "API Key",
    definition:
      "A secret token used by SDKs to authenticate with the FeatureSignals evaluation API. Server SDKs use server-side keys (full access to flag data). Client SDKs use environment-scoped keys (limited to the flags exposed to that environment).",
    seeAlso: "/docs/sdks",
  },
  {
    term: "Evaluation",
    definition:
      "The process of determining which value a flag should return for a given user and context. The evaluation engine runs through the evaluation order: flag existence check → environment enabled check → mutual exclusion → prerequisites → targeting rules → percentage rollout → variant assignment.",
    seeAlso: "/docs/architecture/evaluation-engine",
  },
  {
    term: "Relay Proxy",
    definition:
      "A lightweight sidecar that sits between your application and the FeatureSignals API. It caches flag rulesets locally, reducing latency and eliminating dependency on the FeatureSignals cloud for each evaluation. Ideal for high-throughput or air-gapped environments.",
    seeAlso: "/docs/architecture/overview",
  },
  {
    term: "AI Janitor",
    definition:
      "FeatureSignals' automated flag hygiene system. It scans your flags for staleness patterns — flags that haven't been evaluated recently, flags that always return the same value, unreachable targeting conditions, and zombie flags from removed code paths — and surfaces actionable cleanup recommendations.",
  },
  {
    term: "Audit Log",
    definition:
      "An immutable record of every change made to flags, environments, segments, and permissions. Each entry includes who made the change, when, what changed, and the previous value. Used for compliance (SOC 2, ISO 27001), debugging, and change review.",
  },
  {
    term: "Webhook",
    definition:
      "An HTTP callback that FeatureSignals sends to your URL when specific events occur — flag created, flag toggled, environment state changed, or stale flag detected. Use webhooks to integrate with CI/CD pipelines, incident management tools, and chat platforms.",
  },
  {
    term: "RBAC",
    definition:
      "Role-Based Access Control. FeatureSignals Enterprise Edition includes predefined roles (Owner, Admin, Member, Viewer) and supports custom roles. Each role defines what actions a user can perform on which resources within an organization.",
  },
  {
    term: "Idempotency Key",
    definition:
      "A unique identifier sent with mutating API requests (billing, provisioning) to ensure the operation is performed exactly once, even if the request is retried. If a request with the same idempotency key is retried, the server returns the original result instead of duplicating the operation.",
  },
];

export default function GlossaryPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        Glossary
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        A comprehensive reference of feature flag and FeatureSignals terminology. Each term links
        to its in-depth documentation page where available.
      </p>

      {/* Callout */}
      <div className="p-4 mb-8 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-accent-muted)]">
        <div className="flex items-start gap-3">
          <BookOpen size={18} className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
              New to Feature Flags?
            </p>
            <p className="text-sm text-[var(--signal-fg-secondary)]">
              Start with the{" "}
              <Link
                href="/docs/intro"
                className="text-[var(--signal-fg-accent)] hover:underline font-medium"
              >
                What is FeatureSignals?
              </Link>{" "}
              introduction, then explore the{" "}
              <Link
                href="/docs/core-concepts/feature-flags"
                className="text-[var(--signal-fg-accent)] hover:underline font-medium"
              >
                Feature Flags
              </Link>{" "}
              core concept page.
            </p>
          </div>
        </div>
      </div>

      {/* Glossary List */}
      <dl className="space-y-6">
        {terms.map((entry) => (
          <div key={entry.term}>
            <dt className="text-base font-semibold text-[var(--signal-fg-primary)] mb-1">
              <InlineCode>{entry.term}</InlineCode>
            </dt>
            <dd className="text-sm text-[var(--signal-fg-secondary)] leading-relaxed">
              {entry.definition}
              {entry.seeAlso && (
                <span>
                  {" "}
                  <Link
                    href={entry.seeAlso}
                    className="text-[var(--signal-fg-accent)] hover:underline font-medium"
                  >
                    Learn more →
                  </Link>
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 text-[0.85em] font-mono rounded bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-primary)] border border-[var(--signal-border-default)]">
      {children}
    </code>
  );
}
