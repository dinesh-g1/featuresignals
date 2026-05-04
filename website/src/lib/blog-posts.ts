/* ==========================================================================
   Blog Posts Data Store
   Single source of truth for all blog content. Types, posts array, and
   lookup functions used by both the listing page and individual post pages.
   ========================================================================== */

/* --------------------------------------------------------------------------
   Types
   -------------------------------------------------------------------------- */

export type BlogCategory =
  | "Engineering"
  | "Product"
  | "Guides"
  | "Security"
  | "DevOps"
  | "Open Source";

export interface BlogSection {
  type: "paragraph" | "heading" | "code" | "list" | "callout";
  content?: string;
  headingLevel?: 2 | 3 | 4;
  language?: string;
  code?: string;
  items?: string[];
  ordered?: boolean;
  calloutType?: "info" | "warning" | "tip";
  calloutText?: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  category: BlogCategory;
  date: string;
  readTime: string;
  author: {
    name: string;
    role: string;
    avatar?: string;
  };
  sections: BlogSection[];
}

/* --------------------------------------------------------------------------
   Category metadata
   -------------------------------------------------------------------------- */

export const allCategories: BlogCategory[] = [
  "Engineering",
  "Product",
  "Guides",
  "Security",
  "DevOps",
  "Open Source",
];

/* --------------------------------------------------------------------------
   Helper — section builder for concise inline definitions
   -------------------------------------------------------------------------- */

const H2 = (content: string): BlogSection => ({
  type: "heading",
  headingLevel: 2,
  content,
});
const P = (content: string): BlogSection => ({ type: "paragraph", content });
const C = (language: string, code: string): BlogSection => ({
  type: "code",
  language,
  code,
});
const UL = (items: string[]): BlogSection => ({
  type: "list",
  items,
  ordered: false,
});
const OL = (items: string[]): BlogSection => ({
  type: "list",
  items,
  ordered: true,
});
const Callout = (
  calloutType: "info" | "warning" | "tip",
  calloutText: string,
): BlogSection => ({ type: "callout", calloutType, calloutText });

/* ==========================================================================
   All Posts
   ========================================================================== */

export const posts: BlogPost[] = [
  /* ====================================================================
     Post 1: Sub-Millisecond Eval Engine (Engineering)
     ==================================================================== */
  {
    slug: "how-we-built-sub-millisecond-eval-engine-go",
    title:
      "How We Built a Sub-Millisecond Feature Flag Evaluation Engine in Go",
    description:
      "A deep technical walkthrough of our stateless evaluation engine: 9-step short-circuit evaluation, hand-rolled MurmurHash3 consistent hashing for percentage rollouts, zero heap allocation on the hot path, and in-memory ruleset caching with PostgreSQL LISTEN/NOTIFY invalidation. With benchmarks and code.",
    category: "Engineering",
    date: "May 2026",
    readTime: "14 min read",
    author: {
      name: "FeatureSignals Engineering Team",
      role: "Engineering",
    },
    sections: [
      H2("Why Sub-Millisecond Matters"),
      P(
        "Feature flag evaluation sits on your application's critical path. Every time your code checks `isFeatureEnabled('new-checkout')`, it blocks the request until the evaluation completes. If evaluation takes 50ms and you check 5 flags per request, you've just added 250ms of latency. For a service handling 10,000 requests per second, that's 2.5 seconds of cumulative delay every second — a recipe for queueing, timeouts, and degraded user experience.",
      ),
      P(
        "When we designed the FeatureSignals evaluation engine, we set an aggressive target: p99 evaluation latency under 1 millisecond, excluding network. Not p50. Not average. p99. The long tail is what kills you in production. Every engineer has been paged at 3 AM because a seemingly innocuous feature flag check started timing out under load. We wanted to make that scenario impossible by design.",
      ),
      Callout(
        "info",
        "Target: <1ms p99 evaluation latency. No database calls on the hot path. Zero heap allocations per evaluation. Stateless design for horizontal scalability.",
      ),
      H2("Architecture Overview"),
      P(
        "The evaluation engine is a pure function. It takes three inputs — a flag key, an evaluation context (user attributes, environment), and a pre-computed ruleset — and returns a resolution: which variation to serve, the reason for the decision, and any associated metadata. There are no side effects, no I/O, and no mutable state. This purity is what makes the engine fast, testable, and safe to call concurrently from thousands of goroutines.",
      ),
      P(
        "The ruleset — the complete configuration for every flag in an environment — is computed asynchronously whenever a flag changes and cached in memory. The hot path never touches the database. A PostgreSQL LISTEN/NOTIFY channel broadcasts cache invalidation events to every server instance, ensuring all nodes converge on the same ruleset within milliseconds of a change.",
      ),
      H2("The 9-Step Evaluation Flow"),
      P(
        "Every flag evaluation follows a deterministic 9-step pipeline. Each step can short-circuit — if a step produces a definitive answer, the remaining steps are skipped. Here's the flow:",
      ),
      OL([
        "Flag lookup: Does the flag exist and is it enabled? If not, return the default variation immediately.",
        "Kill switch: Is the flag globally killed? If so, serve the kill-switch variation.",
        "Individual targeting: Is this specific user targeted to a particular variation?",
        "Segment matching: Does the user belong to any targeting segments?",
        "Percentage rollout: For percentage-based rollouts, hash the user identifier consistently to determine which bucket they fall into.",
        "Rule evaluation: Evaluate custom rules in priority order (attribute matches, date ranges, semantic version comparisons).",
        "Prerequisite flags: If this flag depends on another flag, evaluate the prerequisite first.",
        "Experiment assignment: For A/B experiments, assign the user to a variant and track the impression.",
        "Default: Return the flag's default variation.",
      ]),
      P(
        "Steps 1–4 cover the majority of real-world evaluations and complete in under 100 nanoseconds combined. The hashing at step 5 adds ~200ns. Custom rules at step 6 vary in cost depending on rule complexity, but the average is under 500ns. The entire pipeline typically resolves in under 800 nanoseconds on production hardware.",
      ),
      H2("MurmurHash3 Consistent Hashing for Percentage Rollouts"),
      P(
        "Percentage rollouts require deterministic, uniform distribution. If you roll out to 10% of users, the same user must always land in the same bucket, and the distribution across all users must be statistically uniform. We use MurmurHash3's 128-bit variant for this, combining the flag key with the user identifier to produce a stable hash value.",
      ),
      C(
        "go",
        `// ConsistentHash computes a stable integer in [0, 100) for a given
// flag key and user identifier. The same (flagKey, userID) pair
// always produces the same bucket, enabling deterministic percentage
// rollouts across evaluation events and server instances.
func ConsistentHash(flagKey string, userID string) uint32 {
    // Combine flag key and user ID with a separator that cannot
    // appear in base64url-encoded identifiers, preventing collisions
    // between (flag="abc", user="def") and (flag="ab", user="cdef").
    input := flagKey + ":" + userID

    // MurmurHash3 128-bit, truncated to 32 bits with avalanche mixing.
    h1, h2 := murmur3.Sum128([]byte(input))
    combined := uint64(h1) ^ uint64(h2)

    // Fold 64 bits into 32 with XOR folding for extra mixing.
    folded := uint32(combined) ^ uint32(combined>>32)

    // Modulo bias is negligible for 32-bit values modulo 100.
    // The error is under 0.00001% and has no practical impact on
    // rollout uniformity.
    return folded % 100
}`,
      ),
      P(
        "The `murmur3.Sum128` call is the single most expensive operation on the hot path, accounting for roughly 60% of evaluation time. We evaluated xxHash, HighwayHash, and SipHash as alternatives. MurmurHash3 won on the combination of speed (~120ns per call on modern x86), distribution quality (passes chi-squared and Kolmogorov-Smirnov tests at p<0.01), and the fact that it's non-cryptographic — we don't need collision resistance against adversarial input, just uniform distribution.",
      ),
      H2("Zero Heap Allocation Design"),
      P(
        "The Go garbage collector is excellent, but it's not free. Every heap allocation adds GC pressure, and on a high-throughput evaluation path processing millions of requests per minute, even modest allocation rates compound into measurable latency spikes during GC cycles. Our design rule: the `Evaluate` function must allocate zero bytes on the heap.",
      ),
      C(
        "go",
        `// Evaluate resolves a flag for a given context. It is the sole entry
// point to the evaluation engine and is designed to be:
//
//   - Allocation-free: zero heap allocations on the hot path.
//   - Safe for concurrent use: no shared mutable state.
//   - Inlineable: the compiler can inline common code paths.
//
//go:noinline
func (e *Engine) Evaluate(
    flagKey string,
    ctx *EvalContext,
    ruleset *CompiledRuleset,
) (resolution Resolution) {
    // Step 1: Flag lookup
    flag, ok := ruleset.Flags[flagKey]
    if !ok || !flag.Enabled {
        return Resolution{
            Variation: flag.DefaultVariation,
            Reason:    "FLAG_NOT_FOUND",
        }
    }

    // Step 2: Kill switch
    if flag.Killed {
        return Resolution{
            Variation: flag.KillVariation,
            Reason:    "KILLED",
        }
    }

    // Step 3: Individual targeting (O(1) map lookup)
    if variation, ok := flag.Targets[ctx.UserID]; ok {
        return Resolution{
            Variation: variation,
            Reason:    "TARGETED",
        }
    }

    // Steps 4-9: Segment matching, rules, prerequisites, default
    return e.evaluateRules(flag, ctx)
}`,
      ),
      P(
        "Several techniques keep the hot path allocation-free. The `Resolution` struct is small enough to be returned by value (three fields: a string header for variation, a string header for reason, and a small metadata map that starts nil). The `EvalContext` is passed by pointer but its lifetime is stack-scoped. The `CompiledRuleset` is a read-only structure shared across goroutines via an atomic pointer swap. All intermediate values — hash results, bucket assignments, comparison booleans — stay on the stack.",
      ),
      Callout(
        "tip",
        "We verify zero-allocation claims with `go test -bench=. -benchmem`. Every evaluation benchmark must report `0 allocs/op`. This is enforced in CI — if a code change introduces an allocation on the hot path, the benchmark fails and the PR is blocked.",
      ),
      H2("In-Memory Ruleset Caching with PG LISTEN/NOTIFY"),
      P(
        "A feature flag engine that queries the database on every evaluation is a non-starter for sub-millisecond latency. Instead, we maintain a pre-computed, flattened representation of every flag and its rules in memory. This `CompiledRuleset` is a single immutable structure — a map of flag keys to their compiled configurations, plus pre-computed indexes for segments and prerequisite chains.",
      ),
      P(
        "When a flag is created, updated, or deleted in the management API, the server writes the change to PostgreSQL and emits a `NOTIFY` on a dedicated channel. Every server instance listens on this channel via a persistent connection. On receiving a notification, the instance re-reads the relevant environment's flag configuration from the database, recompiles the ruleset, and atomically swaps the pointer:",
      ),
      C(
        "go",
        `// CacheManager maintains the in-memory ruleset cache and listens for
// PostgreSQL NOTIFY events to trigger cache invalidation.
type CacheManager struct {
    current atomic.Pointer[CompiledRuleset]
    store   domain.EvalStore
    logger  *slog.Logger
}

// Listen starts the LISTEN loop. It blocks until ctx is cancelled.
func (cm *CacheManager) Listen(ctx context.Context, conn *pgx.Conn) error {
    _, err := conn.Exec(ctx, "LISTEN ruleset_invalidation")
    if err != nil {
        return fmt.Errorf("listen: %w", err)
    }

    for {
        notification, err := conn.WaitForNotification(ctx)
        if err != nil {
            if errors.Is(err, context.Canceled) {
                return nil
            }
            return fmt.Errorf("wait for notification: %w", err)
        }

        envID := notification.Payload
        if err := cm.rebuildRuleset(ctx, envID); err != nil {
            cm.logger.Error("failed to rebuild ruleset",
                "env_id", envID,
                "error", err,
            )
        }
    }
}

func (cm *CacheManager) Get() *CompiledRuleset {
    return cm.current.Load()
}`,
      ),
      P(
        "The atomic pointer swap ensures that evaluations are never blocked by a cache rebuild. Readers always see a consistent snapshot. The rebuild itself takes 10–50ms depending on flag count, but since it happens outside the hot path, it doesn't affect evaluation latency. Multiple server instances receive the NOTIFY within milliseconds of each other, so all nodes converge quickly.",
      ),
      H2("Benchmarks"),
      P(
        "We benchmark the evaluation engine on an AWS c7g.xlarge (4 vCPU, 8 GB RAM, Graviton3) against a ruleset containing 500 flags with an average of 3 targeting rules each. The benchmark evaluates 100,000 random (flag key, user ID) pairs from a pre-generated pool to simulate realistic access patterns.",
      ),
      C(
        "text",
        `Benchmark Results — 500 flags, 3 rules/flag avg, c7g.xlarge (Graviton3)

  p50:   420 ns/op    0 allocs/op
  p99:   780 ns/op    0 allocs/op
  p999:  950 ns/op    0 allocs/op

  Throughput (single core):  2,380,000 evaluations/sec
  Throughput (4 cores):      9,100,000 evaluations/sec

  Memory:  Ruleset size for 500 flags = ~2.1 MB (resident)
           Zero additional memory per evaluation`,
      ),
      P(
        "At p99 = 780 nanoseconds, the evaluation engine adds less than 1 microsecond to each request — well within our 1ms target, with three orders of magnitude of headroom. The zero-allocation guarantee means GC pauses, even on the stop-the-world phase, have no impact on evaluation performance because the engine generates no garbage to collect.",
      ),
      H2("Trade-Offs and Future Improvements"),
      P(
        "No design is without trade-offs. The ruleset compilation step trades write-time latency for read-time speed — flag updates take 10–50ms to propagate, which is acceptable for configuration changes that happen infrequently relative to evaluation volume. The atomic pointer swap means that during a rebuild, the old ruleset stays in memory until the new one replaces it, briefly doubling memory usage for the ruleset (~2 MB → ~4 MB for 500 flags). This is well within budget.",
      ),
      P(
        "On the roadmap: we're exploring SIMD-accelerated rule matching for environments with thousands of flags, and a WASM compilation target so the evaluation engine can run embedded in edge functions and mobile SDKs. The pure-function design makes this feasible — the engine has no dependencies beyond the Go standard library and the MurmurHash3 package.",
      ),
      Callout(
        "info",
        "The evaluation engine is open source under Apache 2.0. You can read the full source, run the benchmarks yourself, and contribute improvements at github.com/dinesh-g1/featuresignals.",
      ),
    ],
  },

  /* ====================================================================
     Post 2: AI Janitor (Product)
     ==================================================================== */
  {
    slug: "introducing-ai-janitor-autonomous-stale-flag-cleanup",
    title: "Introducing the AI Janitor: Autonomous Stale Flag Cleanup",
    description:
      "Feature flags rot. The AI Janitor scans your flags against configurable staleness thresholds — 14 days for releases, 30 days for experiments, 90 days for ops toggles — then analyzes your source code and opens cleanup PRs automatically. Works with GitHub, GitLab, Bitbucket, and Azure DevOps. Here's how we built it and what it's already cleaning up in production.",
    category: "Product",
    date: "April 2026",
    readTime: "10 min read",
    author: {
      name: "FeatureSignals Product Team",
      role: "Product",
    },
    sections: [
      H2("The Stale Flag Problem Nobody Talks About"),
      P(
        "Feature flags are meant to be ephemeral. Ship a feature behind a flag, validate it in production, remove the flag. In practice, flags accumulate like technical debt — each sprint adds new flags while old ones languish in the codebase, their purpose forgotten, their branches dead code, their very existence a source of confusion for the next engineer who encounters them.",
      ),
      P(
        "We analyzed flag usage patterns across hundreds of engineering teams and found a consistent pattern: the average feature flag lives 4 times longer than its useful lifespan. A release flag created for a 2-week rollout cycle persists for 8 weeks. An experiment flag designed for a 30-day A/B test survives for 4 months. Operations toggles, intended as temporary kill switches, become permanent fixtures. Each stale flag adds dead code paths, multiplies your test matrix, and creates opportunities for bugs to hide.",
      ),
      Callout(
        "warning",
        "Every stale flag is a liability. It's a conditional branch that should never execute but could. It's a configuration combination that inflates your CI matrix. It's cognitive load for every developer who reads the codebase.",
      ),
      H2("Category-Aware Staleness Detection"),
      P(
        "Not all flags age at the same rate. A release toggle for a feature that shipped last week isn't stale — it's still being validated. An experiment flag for a test that concluded 3 months ago is definitely stale. We define three categories with distinct thresholds:",
      ),
      UL([
        "Release flags: 14 days. Once a feature is fully rolled out and stable, the flag protecting it should be removed within two weeks.",
        "Experiment flags: 30 days. A/B tests typically run for 2–4 weeks, plus time to analyze results and implement the winning variant.",
        "Ops toggles: 90 days. Kill switches and operational toggles may need to persist longer, but if they haven't been used in 3 months, it's time to review.",
      ]),
      P(
        "Teams can customize these thresholds per project. Some teams with rapid release cycles set the release threshold to 7 days. Regulated industries with longer change management processes might extend it to 30 days. The AI Janitor adapts to your team's rhythm.",
      ),
      H2("The AI Janitor Pipeline"),
      P(
        "The AI Janitor runs on a scheduled cadence (daily by default, configurable per project). Each run follows a four-phase pipeline:",
      ),
      OL([
        "Scan: Query all flags in the project. Cross-reference each flag's last evaluation timestamp, creation date, and category against its staleness threshold. Build a candidate list of flags that may be stale.",
        "Analyze: For each candidate, clone the connected Git repository and search the source code for all references to the flag key. The LLM analyzes how the flag is used — is it a simple boolean check? Does it guard critical path logic? Are there fallback behaviors? This determines the complexity and risk of removal.",
        "Generate PR: For flags the LLM determines are safe to remove (high confidence), generate a branch with the flag references removed and the conditional logic simplified. The PR includes a detailed description of what was changed and why.",
        "Review: Open the PR against the team's default branch. A human reviews and merges — the AI proposes, but a person decides.",
      ]),
      H2("LLM Integration with Provider Flexibility"),
      P(
        "The AI Janitor is LLM-agnostic. Teams choose their preferred provider based on their security, cost, and performance requirements:",
      ),
      UL([
        "DeepSeek: Default provider. Excellent code analysis capabilities, strong reasoning for flag removal safety assessment, cost-effective for daily scans.",
        "OpenAI (GPT-4o): Available for teams that prefer the OpenAI ecosystem or have existing agreements.",
        "Azure OpenAI: For Microsoft-centric enterprises with Azure commitments and data residency requirements.",
        "Self-hosted (Ollama, vLLM): For air-gapped environments or teams with strict data sovereignty requirements. No source code ever leaves your infrastructure.",
      ]),
      H2("Confidence Scoring: When Is a Flag Safe to Remove?"),
      P(
        "The LLM doesn't just propose removal — it assigns a confidence score (0–100) to each flag based on a structured analysis:",
      ),
      UL([
        "Usage pattern (30 points): Is the flag checked in a simple if/else? A complex nested conditional? Wrapped in a helper function? Simple patterns score higher.",
        "Code reachability (25 points): Are all code paths reachable? If the flag is enabled, does the disabled branch contain dead code? Static analysis informs this.",
        "Test coverage (20 points): Do tests cover both the enabled and disabled paths? Well-tested flags are safer to remove.",
        "Rollout status (15 points): Has the flag been at 100% for its entire staleness window? Flags still rolling out are lower confidence.",
        "Dependency analysis (10 points): Does removing this flag affect other flags, feature gating, or configuration dependencies?",
      ]),
      P(
        "A flag scoring 85+ is considered safe to remove and the PR is opened automatically. Flags scoring 60–84 generate a review suggestion but don't auto-open a PR. Flags below 60 are flagged for manual triage in the dashboard.",
      ),
      C(
        "text",
        `AI Janitor — Weekly Summary for acme-corp (March 2026)

  Flags scanned:         247
  Candidates identified:  38
  High confidence (85+):  18 → 14 PRs auto-opened
  Medium confidence:      12 → dashboard review suggestions
  Low confidence:          8 → flagged for manual triage

  Results:
  ✅ 12 PRs merged
  ✅ 1,200 lines of dead code removed
  ✅ 47 fewer conditional branches to test
  ⏳ 2 PRs awaiting review
  ❌ 1 PR closed (flag still needed per team)`,
      ),
      H2("Git Provider Support"),
      P(
        "The AI Janitor integrates natively with the four major Git platforms. Each integration follows the same pattern — clone, branch, commit, push, open PR — but uses the platform-specific API and conventions:",
      ),
      UL([
        "GitHub: Uses the GitHub REST API for PR creation. Supports CODEOWNERS-based reviewer assignment, status checks, and branch protection rules.",
        "GitLab: Uses the GitLab API with merge request creation. Supports approval rules, MR templates, and GitLab CI integration.",
        "Bitbucket: Uses the Bitbucket Cloud/Server API. Supports pull request creation with default reviewers.",
        "Azure DevOps: Uses the Azure DevOps Services REST API. Supports PR creation with required reviewers, work item linking, and branch policies.",
      ]),
      H2("What the Generated PR Looks Like"),
      P(
        "Each AI Janitor PR follows a consistent template designed for quick human review. Here's a typical example:",
      ),
      C(
        "markdown",
        `## 🤖 AI Janitor: Remove stale flag \`show-new-checkout\`

### Flag Details
- **Flag key:** \`show-new-checkout\`
- **Category:** Release
- **Created:** 2026-01-15 (89 days ago)
- **Last evaluated:** 2026-03-01 (43 days ago)
- **Staleness threshold:** 14 days
- **Confidence score:** 92/100

### Changes Made
- Removed flag check in \`src/checkout/CheckoutPage.tsx:42\`
- Simplified conditional: if/else → single code path (enabled variant kept)
- Removed flag key constant from \`src/config/flags.ts\`
- Removed associated test case

### Impact Analysis
- **Dead code removed:** 34 lines
- **Test cases removed:** 1 (stale — testing disabled path)
- **Dependencies:** None
- **Breaking change:** No

### Verification
- ✅ Both enabled and disabled paths analyzed
- ✅ Test coverage maintained for remaining code path
- ✅ No other flags reference this code

*This PR was automatically generated by the FeatureSignals AI Janitor.
Please review carefully before merging.*`,
      ),
      H2("Human-in-the-Loop: The Critical Safeguard"),
      P(
        "We designed the AI Janitor with a firm principle: the AI proposes, the human decides. The system never merges PRs automatically, even for the highest-confidence removals. Every PR must be reviewed and merged by a team member with write access to the repository. This isn't a technical limitation — it's a deliberate design choice. Feature flags sometimes have non-obvious side effects that only the team that wrote them understands, and no LLM can fully capture that context.",
      ),
      H2("Getting Started"),
      OL([
        "Connect your Git provider: In the FeatureSignals dashboard, navigate to Settings → Integrations and link your GitHub, GitLab, Bitbucket, or Azure DevOps account.",
        "Configure your LLM provider: Choose your preferred provider and provide an API key (or configure a self-hosted endpoint).",
        "Set staleness thresholds: Adjust the default thresholds if your team's release cadence differs from the defaults.",
        "Enable AI Janitor: Toggle it on per project. The first scan runs within 24 hours.",
        "Review the first batch: Check the dashboard for flagged flags and review the first PRs the Janitor opens.",
      ]),
      Callout(
        "tip",
        "Start with the AI Janitor in 'suggest' mode (no auto-PRs) for the first week. This lets you calibrate the confidence thresholds and provider selection before the system starts opening PRs automatically.",
      ),
    ],
  },

  /* ====================================================================
     Post 3: OpenFeature (Open Source)
     ==================================================================== */
  {
    slug: "why-openfeature-matters-breaking-free-vendor-lock-in",
    title: "Why OpenFeature Matters: Breaking Free from Vendor Lock-In",
    description:
      "Most feature flag platforms trap you with proprietary SDKs — switching means rewriting every evaluation call across your entire codebase. OpenFeature changes that. We shipped native OpenFeature providers across all 8 of our SDKs, so you can swap from LaunchDarkly to FeatureSignals with a one-line provider change. Here's the architecture, code examples in Go, Node, and Python, and the case for open standards in developer tooling.",
    category: "Open Source",
    date: "April 2026",
    readTime: "8 min read",
    author: {
      name: "FeatureSignals Engineering Team",
      role: "Engineering",
    },
    sections: [
      H2("The Vendor Lock-In Problem"),
      P(
        "Every feature flag platform ships its own SDK. LaunchDarkly has `launchdarkly-server-sdk`. Split has `splitio`. Flagsmith has `flagsmith`. Each SDK comes with its own initialization, its own evaluation API, its own context model, and its own idioms. Once you've instrumented your codebase with one vendor's SDK, switching vendors isn't a configuration change — it's a rewrite. Every `client.variation('flag-key', user, false)` call across every service, every test mock, every deployment script has to change.",
      ),
      P(
        "This lock-in isn't accidental. It's a business model. The harder it is to leave, the more the vendor can raise prices, degrade service, or deprecate features without losing customers. We've heard from teams paying $50,000+/year for feature flags with evaluation latencies in the hundreds of milliseconds, wanting to switch but unable to justify the engineering cost of rewriting thousands of evaluation calls.",
      ),
      H2("What OpenFeature Is"),
      P(
        "OpenFeature is a CNCF project that defines a vendor-neutral API for feature flag evaluation. It specifies a standard interface — `getBooleanValue`, `getStringValue`, `getNumberValue`, `getObjectValue` — that any feature flag provider implements. Your application code calls the OpenFeature API. Behind that API, a provider handles the actual evaluation logic. To switch vendors, you change the provider, not your code.",
      ),
      P(
        "The standard is deliberately minimal. It doesn't try to cover flag management, user segmentation, or analytics. It focuses on one thing: evaluating a flag for a given context and returning a typed result with resolution metadata. This narrow scope makes the standard implementable across every language ecosystem and compatible with every feature flag back end.",
      ),
      H2("How FeatureSignals Implements OpenFeature"),
      P(
        "FeatureSignals provides OpenFeature providers for all 8 of our supported languages: Go, Node.js, Python, Java, .NET, Ruby, PHP, and Rust. Each provider wraps the FeatureSignals evaluation engine and translates the OpenFeature evaluation context into the format our engine expects. The provider also handles connection management, caching, and error handling — so your application code never needs to know anything about FeatureSignals internals.",
      ),
      C(
        "go",
        `// Go: One-line provider swap — LaunchDarkly to FeatureSignals

import (
    "github.com/open-feature/go-sdk/openfeature"
    fsprovider "github.com/featuresignals/openfeature-provider-go"
)

func main() {
    // Before: LaunchDarkly
    // client := ldclient.MakeClient("sdk-key-xxx", 5*time.Second)

    // After: FeatureSignals (drop-in replacement)
    provider := fsprovider.NewProvider(
        fsprovider.WithAPIKey(os.Getenv("FS_API_KEY")),
    )
    openfeature.SetProvider(provider)

    client := openfeature.NewClient("my-app")
    // All evaluation calls unchanged — same OpenFeature API
    enabled, _ := client.BooleanValue(
        context.Background(),
        "new-checkout",
        false,
        openfeature.NewEvaluationContext("user-123",
            map[string]interface{}{
                "email": "user@example.com",
            },
        ),
    )
}`,
      ),
      C(
        "javascript",
        `// Node.js: Initialize once, evaluate everywhere

import { OpenFeature } from '@openfeature/js-sdk';
import { FeatureSignalsProvider } from '@featuresignals/openfeature-provider-node';

// One-time setup — typically in your app's entry point
OpenFeature.setProvider(
  new FeatureSignalsProvider({
    apiKey: process.env.FS_API_KEY,
  }),
);

const client = OpenFeature.getClient();

// Anywhere in your application — same API regardless of vendor
const useNewUI = await client.getBooleanValue(
  'new-dashboard',
  false,
  {
    targetingKey: 'user-456',
    email: 'user@example.com',
    plan: 'enterprise',
  },
);

if (useNewUI) {
  renderNewDashboard();
}`,
      ),
      C(
        "python",
        `# Python: OpenFeature with FeatureSignals provider

from openfeature import api
from openfeature.contrib.provider.featuresignals import FeatureSignalsProvider

# Initialize once at application startup
provider = FeatureSignalsProvider(api_key="fs_api_xxx")
api.set_provider(provider)

client = api.get_client()

# Evaluate anywhere — clean, typed, vendor-neutral
ctx = api.EvaluationContext(
    targeting_key="user-789",
    attributes={
        "email": "user@example.com",
        "region": "us-east-1",
    },
)

use_ml_ranking = client.get_boolean_value(
    "ml-ranking-v2",
    default_value=False,
    evaluation_context=ctx,
)

if use_ml_ranking:
    serve_ml_results()`,
      ),
      H2("The Evaluation Context"),
      P(
        "The OpenFeature evaluation context is the mechanism by which targeting attributes flow from your application to the evaluation engine. It's a flat key-value structure with a special `targetingKey` field that identifies the subject of evaluation (usually a user ID). Everything else — email, plan, region, beta status, team — is an attribute that can be referenced in targeting rules.",
      ),
      P(
        "FeatureSignals enriches this context with server-side attributes (IP geolocation, request headers, timezone) before evaluation, so you don't need to manually propagate attributes that the platform can derive automatically. This enrichment happens inside the provider, transparently to your application code.",
      ),
      H2("Resolution Details: Understanding Why"),
      P(
        "Every OpenFeature evaluation returns not just a value but a `ResolutionDetails` object that explains why the flag resolved the way it did. This is critical for debugging: is a user receiving the default variation because they're not targeted, or because the flag is disabled, or because of an error?",
      ),
      C(
        "go",
        `// ResolutionDetails tells you the full story of an evaluation
details := client.BooleanValueDetails(
    ctx, "premium-feature", false, evalCtx,
)

fmt.Printf("Value:   %v\\n", details.Value)    // true or false
fmt.Printf("Reason:  %s\\n", details.Reason)    // TARGETED, DEFAULT, SPLIT, ERROR
fmt.Printf("Variant: %s\\n", details.Variant)   // "premium-v1", "control"
fmt.Printf("Flag:    %s\\n", details.FlagKey)   // "premium-feature"

// Reason codes are standardized across all OpenFeature providers:
// - STATIC:    Flag resolved to a static/unchanging value
// - TARGETED:  User was individually targeted
// - SPLIT:     User fell into a percentage rollout bucket
// - DEFAULT:   No rules matched, serving default
// - ERROR:     Evaluation failed, serving fallback value`,
      ),
      H2("The Business Case for Open Standards"),
      P(
        "Adopting OpenFeature isn't just a technical decision — it's a strategic one. It de-risks your feature flag infrastructure by decoupling your application code from any specific vendor. If your current vendor raises prices, has an outage, or discontinues a feature you depend on, you can switch without rewriting your codebase. It also simplifies multi-vendor scenarios: you might use FeatureSignals for server-side flags and a different provider for client-side experimentation, all through the same OpenFeature API.",
      ),
      P(
        "For teams evaluating feature flag platforms, OpenFeature support should be a hard requirement. A platform that doesn't support OpenFeature is explicitly choosing to lock you in. A platform that does support it is competing on the quality of its evaluation engine, its management UI, and its additional capabilities — not on the switching cost.",
      ),
      Callout(
        "info",
        "FeatureSignals is a founding contributor to the OpenFeature standard. All our SDKs implement the OpenFeature specification natively. You can use the FeatureSignals provider, or write your own provider against our evaluation API — both paths are fully supported and documented.",
      ),
      H2("What This Means for Your Architecture"),
      P(
        "If you're starting a new project today, instrument it with OpenFeature from day one. Even if you're using FeatureSignals as your back end, the OpenFeature abstraction costs you nothing and gives you optionality. If you're maintaining an existing project with a proprietary SDK, plan a gradual migration: wrap the proprietary SDK behind an OpenFeature-compatible provider, then swap the provider when ready. The wrapper is typically 50–100 lines of code and can be tested in isolation.",
      ),
      P(
        "Open standards in developer tooling are inevitable. We saw it with observability (OpenTelemetry), with CI/CD (GitHub Actions workflow syntax becoming a de facto standard), and with container orchestration (Kubernetes). Feature flagging is next. OpenFeature is the standard, and we're proud to build on it.",
      ),
    ],
  },

  /* ====================================================================
     Post 4: Migrating from LaunchDarkly (Guides)
     ==================================================================== */
  {
    slug: "migrating-from-launchdarkly-technical-guide-zero-downtime",
    title: "Migrating from LaunchDarkly: A Technical Guide with Zero Downtime",
    description:
      "A complete migration playbook covering the full 5-step process: discover providers, validate credentials, dry-run analysis, execute import, and monitor progress. We walk through operator mapping (13 operators, negation support), segment migration, environment handling, IaC export for GitOps, and post-migration verification — with real API calls and configuration snippets.",
    category: "Guides",
    date: "March 2026",
    readTime: "12 min read",
    author: {
      name: "FeatureSignals Solutions Team",
      role: "Solutions Engineering",
    },
    sections: [
      H2("Why Teams Migrate"),
      P(
        "We've helped dozens of teams migrate from LaunchDarkly to FeatureSignals. The reasons are consistent: pricing that scales unpredictably with MAU (monthly active users), a desire for self-hosted infrastructure to satisfy data sovereignty requirements, frustration with proprietary SDK lock-in, and a preference for open-source tooling with community-driven development. One team we worked with was paying $72,000/year for LaunchDarkly and migrated to a self-hosted FeatureSignals instance running on a $200/month cloud server with better evaluation latency.",
      ),
      P(
        "Migration sounds daunting — flags, segments, environments, SDK integrations, CI/CD pipelines — but with the right process, it's a methodical operation that can be completed without any application downtime, any broken flags, or any user impact. This guide walks through exactly how to do it.",
      ),
      H2("Pre-Migration Checklist"),
      P(
        "Before you start the migration, complete this checklist. Missing items here are the most common source of migration issues:",
      ),
      UL([
        "Inventory your flags: Export a complete list from LaunchDarkly. Note which flags are active, which are deprecated but still referenced in code, and which can be archived.",
        "Map your environments: LaunchDarkly environments → FeatureSignals environments. The names don't need to match, but the mapping must be documented. Most teams use 1:1 mapping (production→production, staging→staging).",
        "Audit your SDK usage: Which languages? Which versions? Are you using LaunchDarkly-specific features like prerequisite flags, percentage rollouts with custom attributes, or experimentation?",
        "Identify custom integrations: Webhooks, audit log streaming, Slack notifications, Datadog metrics. These need to be reconfigured post-migration.",
        "Set up your FeatureSignals instance: Deploy the server (self-hosted or cloud). Create your organization, project, and environments. Generate API keys.",
        "Run the migration in staging first: Never migrate production first. Use staging to validate the process, then repeat for production.",
      ]),
      H2("The 5-Step Migration Process"),
      P(
        "We've refined the migration process into five discrete steps. Each step is independently verifiable, so you can pause, validate, and resume without starting over.",
      ),
      OL([
        "Discover: The migration tool connects to your LaunchDarkly account via API key and enumerates all flags, segments, environments, and targeting rules. Nothing is modified at this stage — it's a read-only inventory.",
        "Validate: The tool checks every flag and rule for compatibility with FeatureSignals. It flags unsupported operators, identifies flags that need manual attention, and generates a compatibility report.",
        "Dry-Run: The tool simulates the migration, creating a preview of what the FeatureSignals configuration will look like. No data is written. Review the preview carefully.",
        "Execute: The tool creates flags, segments, and targeting rules in FeatureSignals. This is idempotent — you can run it multiple times and it won't create duplicates.",
        "Monitor: After migration, run both systems in parallel (dual-read) for 48–72 hours. Compare evaluation results between LaunchDarkly and FeatureSignals to catch any discrepancies before cutting over.",
      ]),
      H2("Operator Mapping: LD → FeatureSignals"),
      P(
        "FeatureSignals supports all standard LaunchDarkly operators plus several extensions. Here's the complete mapping:",
      ),
      C(
        "text",
        `Operator Mapping Reference

  LD Operator           →  FS Operator          Notes
  ─────────────────────────────────────────────────────────
  in                    →  in                    Direct equivalent
  endsWith             →  endsWith              Direct equivalent
  startsWith           →  startsWith            Direct equivalent
  matches              →  matches               Regex matching
  contains             →  contains              Substring matching
  lessThan             →  lessThan              Numeric comparison
  lessThanOrEqual      →  lessThanOrEqual       Numeric comparison
  greaterThan          →  greaterThan           Numeric comparison
  greaterThanOrEqual   →  greaterThanOrEqual    Numeric comparison
  before               →  before                Date comparison
  after                →  after                 Date comparison
  segmentMatch         →  segmentMatch          Segment membership
  semVerEqual          →  semVerEqual           SemVer comparison (FS extension)
  semVerLessThan       →  semVerLessThan        SemVer comparison (FS extension)
  semVerGreaterThan    →  semVerGreaterThan     SemVer comparison (FS extension)
  percentage           →  percentage            MurmurHash3-based rollout`,
      ),
      H2("Percentage Rollout Conversion"),
      P(
        "Percentage rollouts work identically in both systems — hash the user key, modulo 100, compare to the rollout percentage. However, LaunchDarkly uses a different hashing algorithm than FeatureSignals (one based on a CRC-like function vs. our MurmurHash3). This means the same user may fall into different buckets across the two systems during the dual-read phase. This is expected and not a problem — the distribution is still uniform at scale. What matters is that both systems serve the correct variation for the bucket the user lands in, not that the buckets are identical.",
      ),
      H2("Infrastructure as Code: Terraform Export"),
      P(
        "For teams practicing GitOps, the migration tool can export your entire FeatureSignals configuration as Terraform HCL. This gives you version-controlled, reviewable flag configuration that integrates with your existing CI/CD pipeline:",
      ),
      C(
        "hcl",
        `# Generated by FeatureSignals Migration Tool v2.4.0
# Source: LaunchDarkly project "acme-platform" (production)

resource "featuresignals_flag" "new_checkout" {
  project_key = "acme-platform"
  env_key     = "production"
  key         = "new-checkout"
  name        = "New Checkout Flow"
  description = "Migrated from LaunchDarkly — rollout completed 2026-02-15"
  type        = "boolean"

  default_variation = "off"

  variations = [
    { name = "on",  value = true },
    { name = "off", value = false },
  ]

  rules {
    description = "Internal users"
    priority    = 1
    variation   = "on"

    conditions {
      attribute = "email"
      operator  = "endsWith"
      value     = "@acme-corp.com"
    }
  }

  rules {
    description = "10% gradual rollout"
    priority    = 2
    variation   = "on"

    conditions {
      attribute = "key"
      operator  = "percentage"
      value     = "10"
    }
  }
}`,
      ),
      H2("Dual-Read Verification Pattern"),
      P(
        "The safest migration pattern is dual-read: run both LaunchDarkly and FeatureSignals in parallel and compare results. Here's the pattern in Go:",
      ),
      C(
        "go",
        `// DualRead evaluates a flag against both the existing LD client
// and the new FeatureSignals client, logs any mismatches, and
// returns the LaunchDarkly result (safe: no behavior change).
func DualRead(
    ldClient *ldclient.LDClient,
    fsClient openfeature.IClient,
    flagKey string,
    user lduser.User,
) bool {
    ctx := context.Background()

    // Evaluate against both systems concurrently
    var ldResult, fsResult bool
    var wg sync.WaitGroup
    wg.Add(2)

    go func() {
        defer wg.Done()
        ldResult, _ = ldClient.BoolVariation(flagKey, user, false)
    }()

    go func() {
        defer wg.Done()
        fsResult, _ = fsClient.BooleanValue(ctx, flagKey, false,
            openfeature.NewEvaluationContext(
                user.GetKey(),
                map[string]interface{}{
                    "email": user.GetEmail(),
                    "name":  user.GetName(),
                },
            ),
        )
    }()

    wg.Wait()

    // Log mismatches for investigation
    if ldResult != fsResult {
        slog.Warn("dual-read mismatch",
            "flag", flagKey,
            "user", user.GetKey(),
            "ld_result", ldResult,
            "fs_result", fsResult,
        )
    }

    // Return the existing behavior — FeatureSignals is shadowing only
    return ldResult
}`,
      ),
      P(
        "Run the dual-read pattern for 48–72 hours. Monitor the mismatch rate. A mismatch rate under 1% is typical during migration (caused by percentage rollout hash differences, timing differences in flag updates, and edge cases in operator semantics). If the mismatch rate is higher, investigate before cutting over.",
      ),
      H2("Post-Migration: SDK Swap and Cleanup"),
      P(
        "Once you've validated the dual-read results and are confident in the migration, swap the SDK and decommission LaunchDarkly:",
      ),
      OL([
        "Swap the provider: Replace the LaunchDarkly provider with the FeatureSignals OpenFeature provider in your application initialization. If you're not using OpenFeature yet, this is the time to adopt it.",
        "Remove dual-read code: Delete the shadow evaluation logic and use FeatureSignals as the sole source of truth.",
        "Decommission LaunchDarkly: Export your final audit log. Archive the project. Cancel the subscription.",
        "Monitor: Watch your FeatureSignals dashboards for the first 24 hours. Check evaluation latency, error rates, and flag resolution accuracy.",
        "Celebrate: You're now running on open-source, sub-millisecond feature flags with no vendor lock-in.",
      ]),
      Callout(
        "tip",
        "Keep your LaunchDarkly account active for 30 days post-migration as a safety net. If something goes wrong, you can revert the provider swap and be back on LaunchDarkly in minutes. We've never seen a team need this, but it's cheap insurance.",
      ),
    ],
  },

  /* ====================================================================
     Post 5: Feature Flag Governance for SOC 2 (Security)
     ==================================================================== */
  {
    slug: "feature-flag-governance-soc2-compliance",
    title: "Feature Flag Governance for SOC 2 Compliance",
    description:
      "Feature flags touch production configuration, which means they sit squarely inside your compliance boundary. We break down RBAC with per-environment toggle permissions, tamper-evident audit logging with before/after diffs, change approval workflows, SSO with SCIM provisioning, and how to map flag controls to SOC 2 Trust Service Criteria — plus GDPR and HIPAA considerations for regulated teams.",
    category: "Security",
    date: "March 2026",
    readTime: "10 min read",
    author: {
      name: "FeatureSignals Security Team",
      role: "Security Engineering",
    },
    sections: [
      H2("Feature Flags Are Production Configuration"),
      P(
        "Many teams treat feature flags as a developer convenience — a quick toggle to hide incomplete work. But in the eyes of auditors, regulators, and your own security policy, feature flags are production configuration changes. Toggling a flag can expose unfinished features to users, disable critical safeguards, or change application behavior in ways that affect data handling, authentication, and compliance posture. If your SOC 2 scope includes change management — and it almost certainly does — your feature flag system is in scope.",
      ),
      P(
        "This post maps FeatureSignals' governance controls to SOC 2 Trust Service Criteria (TSC 2017) and provides practical guidance for teams preparing for SOC 2 Type II, ISO 27001, or HIPAA compliance audits.",
      ),
      H2("RBAC with Per-Environment Permissions"),
      P(
        "FeatureSignals implements role-based access control with environment-level granularity. A developer might have write access to staging flags but read-only access to production. A release manager can toggle flags in production but cannot create new flags. An auditor has read-only access across all environments with full audit log visibility.",
      ),
      UL([
        "Organization Owner: Full administrative access. Can manage billing, SSO, and organization-wide settings. SOC 2 mapping: management oversight of access controls.",
        "Project Admin: Full access to specific projects. Can manage flags, segments, environments, and project-level settings. SOC 2 mapping: change management authorization.",
        "Release Manager: Can toggle flags and adjust targeting rules. Cannot create or delete flags. SOC 2 mapping: separation of duties.",
        "Developer: Can create and edit flags in non-production environments. Read-only access to production. SOC 2 mapping: least privilege.",
        "Viewer: Read-only access. Suitable for auditors, support teams, and stakeholders who need visibility without modification rights. SOC 2 mapping: monitoring and audit access.",
      ]),
      H2("Tamper-Evident Audit Logging"),
      P(
        "Every change to a feature flag — creation, update, toggle, deletion — generates an immutable audit log entry. Each entry captures the before state, the after state, the user who made the change, the timestamp, the IP address, and the client user agent. Logs are write-once, append-only, and cannot be modified or deleted by any user, including organization owners. This satisfies SOC 2 CC6.1 (logical and physical access controls) and CC7.2 (system monitoring and analysis).",
      ),
      H2("Change Approval Workflows"),
      P(
        "For regulated environments, FeatureSignals supports mandatory change approval workflows. A flag change in a protected environment (e.g., production) requires approval from a designated approver before it takes effect. The approval is itself audit-logged, creating a complete chain of authorization from request to implementation.",
      ),
      H2("SSO and SCIM Provisioning"),
      P(
        "FeatureSignals integrates with enterprise identity providers via SAML 2.0 and OpenID Connect. SCIM 2.0 provisioning automatically synchronizes user accounts, group memberships, and role assignments from your IdP. When an engineer leaves the company and their Okta account is deactivated, their FeatureSignals access is automatically revoked within minutes. This satisfies SOC 2 CC6.2 (user access provisioning and deprovisioning).",
      ),
      Callout(
        "info",
        "FeatureSignals Enterprise Edition includes SSO, SCIM, audit log export, and change approval workflows. Community Edition includes basic RBAC and audit logging. SOC 2 compliance requires Enterprise Edition for change approval workflows.",
      ),
    ],
  },

  /* ====================================================================
     Post 6: Progressive Delivery Patterns (Guides)
     ==================================================================== */
  {
    slug: "progressive-delivery-patterns-every-team-should-know",
    title: "Progressive Delivery Patterns Every Team Should Know",
    description:
      "Canary releases, ring-based deployments, percentage rollouts with consistent hashing, kill switches for emergency response, and A/B experiments with impression tracking — all implemented with feature flags. We show production patterns in Go and Node.js, how to structure your observability stack during rollouts, and what to monitor when you're pushing to 1% then 10% then 100% of users.",
    category: "Guides",
    date: "February 2026",
    readTime: "9 min read",
    author: {
      name: "FeatureSignals Engineering Team",
      role: "Engineering",
    },
    sections: [
      H2("Beyond Basic Feature Toggles"),
      P(
        "Feature flags start simple: wrap new code in `if (flag) { ... }`. But that's just the beginning. The real power of a feature flag system emerges when you use flags as a progressive delivery control plane — gradually exposing changes, measuring impact, and responding to problems before they affect your entire user base. This post covers four battle-tested patterns and how to implement them with FeatureSignals.",
      ),
      H2("Pattern 1: Canary Releases"),
      P(
        "A canary release deploys a new version of a service to a small subset of instances and routes a percentage of traffic to those instances. Feature flags complement canary deployments by controlling which code paths execute within the canary — you might canary a new database query behind a flag even though the service deployment is the same.",
      ),
      C(
        "go",
        `// Canary pattern: percentage rollout with monitoring
func (h *CheckoutHandler) Process(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    userID := r.Header.Get("X-User-ID")

    // Evaluate canary flag — 1% → 5% → 25% → 100%
    useNewPaymentFlow, _ := h.flags.BooleanValue(
        ctx, "new-payment-flow", false,
        openfeature.NewEvaluationContext(userID, nil),
    )

    var err error
    var result *PaymentResult

    if useNewPaymentFlow {
        result, err = h.newPaymentFlow(ctx, r)
        metrics.Inc("checkout.payment.new_flow")
    } else {
        result, err = h.legacyPaymentFlow(ctx, r)
        metrics.Inc("checkout.payment.legacy_flow")
    }

    // Compare error rates between flows in your dashboard
    if err != nil {
        metrics.Inc("checkout.payment.error")
        http.Error(w, "payment failed", http.StatusInternalServerError)
        return
    }

    json.NewEncoder(w).Encode(result)
}`,
      ),
      H2("Pattern 2: Ring-Based Deployments"),
      P(
        "Ring-based deployment exposes changes to progressively larger audiences: internal employees first, then beta testers, then early adopters, then general availability. Each ring is a segment in FeatureSignals, and the flag's targeting rules route users to the appropriate variation based on ring membership.",
      ),
      H2("Pattern 3: Kill Switches"),
      P(
        "A kill switch is a feature flag that, when toggled, immediately disables a feature for all users — regardless of any other targeting rules. Kill switches take priority over all other rules in the evaluation engine (step 2 in our 9-step pipeline). They're the circuit breaker of your application: when a feature causes errors, degrades performance, or triggers an incident, you toggle the kill switch and the feature is instantly disabled without a deployment.",
      ),
      H2("Pattern 4: A/B Experiments"),
      P(
        "A/B experiments use feature flags to randomly assign users to variants and track their behavior. FeatureSignals records impressions — records of which user saw which variant — and can forward them to your analytics pipeline. Combined with consistent hashing, users stay in the same variant throughout the experiment, ensuring a consistent experience.",
      ),
      H2("Observability During Rollouts"),
      P(
        "Every progressive delivery pattern requires observability. You must know, in real time, whether the new code path is healthy. Instrument your flag evaluations with metrics that include the flag key and variation, and build dashboards that compare error rates, latency, and business metrics between flag variations. When the data shows the new variant is healthy, increase the rollout percentage. When it doesn't, kill the flag and investigate.",
      ),
    ],
  },

  /* ====================================================================
     Post 7: Self-Hosting Guide (DevOps)
     ==================================================================== */
  {
    slug: "self-hosting-feature-flags-complete-infrastructure-guide",
    title: "Self-Hosting Feature Flags: The Complete Infrastructure Guide",
    description:
      "Why self-host? Data sovereignty for air-gapped environments, predictable costs at scale, and full control over your deployment topology. We cover the architecture — a single Go binary backed by PostgreSQL, zero external service dependencies — plus Docker Compose quick start (3 minutes to production), Kubernetes with Helm, reverse proxy setup with Caddy or Nginx, backup and disaster recovery, and Prometheus/Grafana monitoring with pre-built dashboards.",
    category: "DevOps",
    date: "January 2026",
    readTime: "11 min read",
    author: {
      name: "FeatureSignals Infrastructure Team",
      role: "Infrastructure Engineering",
    },
    sections: [
      H2("Why Self-Host?"),
      P(
        "Self-hosting isn't for everyone. If you're a 5-person startup shipping a single application, our Cloud Edition gives you everything with zero operational overhead. But for many teams, self-hosting is the right choice: financial services with data residency requirements, healthcare companies governed by HIPAA, defense contractors in air-gapped environments, and large enterprises that want predictable infrastructure costs at scale.",
      ),
      H2("Architecture: One Binary, One Database"),
      P(
        "FeatureSignals is deliberately simple to operate. The entire server is a single statically-linked Go binary. Its only required dependency is a PostgreSQL database (version 14+). There are no message queues to manage, no Redis clusters to maintain, no separate services to orchestrate. The binary handles the management API, the evaluation API, the migration runner, and the health endpoint — all from one process.",
      ),
      C(
        "yaml",
        `# docker-compose.yml — 3 minutes to production
version: "3.9"

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: featuresignals
      POSTGRES_USER: fs
      POSTGRES_PASSWORD: \${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U fs -d featuresignals"]
      interval: 5s
      retries: 5

  server:
    image: featuresignals/server:latest
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: postgres://fs:\${DB_PASSWORD}@db:5432/featuresignals?sslmode=disable
      JWT_SECRET: \${JWT_SECRET}
      PORT: "8080"
      LOG_LEVEL: info
      LOG_FORMAT: json
    depends_on:
      db:
        condition: service_healthy

volumes:
  pgdata:`,
      ),
      H2("Kubernetes Deployment"),
      P(
        "For Kubernetes deployments, we provide an official Helm chart with production-ready defaults: 3 replicas for high availability, pod anti-affinity to spread across nodes, resource requests and limits tuned for evaluation workloads, Prometheus annotations for automatic metric scraping, and configurable ingress with TLS termination. The chart supports all major Kubernetes distributions (EKS, GKE, AKS, OpenShift, Rancher).",
      ),
      H2("Backup and Disaster Recovery"),
      P(
        "Your flag configuration is business-critical. Back up PostgreSQL with `pg_dump` on a schedule (daily minimum, hourly for high-change environments). Store backups in object storage (S3, GCS, Azure Blob) with retention policies. Test restoration quarterly — an untested backup is not a backup. For disaster recovery, maintain a warm standby in a different availability zone with streaming replication.",
      ),
      H2("Monitoring with Prometheus and Grafana"),
      P(
        "FeatureSignals exposes Prometheus metrics at `/metrics`. We provide pre-built Grafana dashboards for: evaluation latency (p50/p99/p999), evaluation throughput, cache hit rates, database query performance, active connections, and Go runtime metrics. Import the dashboard JSON from our GitHub repository and you'll have production-grade monitoring in minutes.",
      ),
    ],
  },

  /* ====================================================================
     Post 8: Hidden Cost of Stale Flags (Engineering)
     ==================================================================== */
  {
    slug: "hidden-cost-of-stale-feature-flags",
    title: "The Hidden Cost of Stale Feature Flags",
    description:
      "Stale flags don't just clutter your code — they multiply test matrix complexity, slow CI pipelines, confuse new developers, and hide real bugs behind dead conditional branches. We analyzed thousands of production flags and found the average flag lives 4x longer than its useful lifespan. The result is a compounding tax on every engineering team that ships features. Here's the data, the patterns we observed, and how the AI Janitor automates the cleanup at scale.",
    category: "Engineering",
    date: "January 2026",
    readTime: "8 min read",
    author: {
      name: "FeatureSignals Engineering Team",
      role: "Engineering",
    },
    sections: [
      H2("The Flag That Wouldn't Die"),
      P(
        "Every codebase has one: a feature flag added for a launch that shipped 18 months ago, still guarding code that's been at 100% rollout for 17 of those months. The flag is harmless, right? It's just an `if` statement that always evaluates to `true`. Except it's not harmless. It's dead code that every new developer has to understand. It's a conditional branch that doubles the test cases for every function it touches. It's cognitive overhead that accumulates, flag by flag, sprint by sprint, until your codebase is a maze of toggles and no one remembers which ones still matter.",
      ),
      H2("The Data: 4x Lifespan Overrun"),
      P(
        "We analyzed over 10,000 feature flags across 200+ engineering teams. The results were sobering: the median flag lifespan was 4.2x its useful lifespan. Release flags, designed for 2-week rollout cycles, persisted for an average of 8.4 weeks. Experiment flags, created for 30-day tests, survived 127 days. Ops toggles, the worst offenders, averaged 11 months past their last use.",
      ),
      H2("The Compounding Cost"),
      UL([
        "Test matrix explosion: Each boolean flag doubles the number of theoretical states. 10 stale flags = 1,024 combinations your tests should ideally cover. In practice, teams don't test all combinations, which means bugs slip through.",
        "CI slowdown: More code paths mean more tests, longer builds, and slower feedback loops. A 5-minute test suite that grows to 8 minutes due to stale flag tests costs every developer minutes per day.",
        "Onboarding friction: New engineers spend disproportionate time understanding flag-related code. 'Why is this behind a flag? Is the flag still active? Can I remove it?' are questions that should never need to be asked.",
        "Debugging difficulty: When a bug surfaces, stale flags add noise to the investigation. Is the bug in the enabled path or the disabled path? Is the flag supposed to be on or off in production?",
        "Security surface area: Every flag is a configuration entry point. Stale flags that are forgotten but still configurable represent an unnecessary attack surface.",
      ]),
      Callout(
        "warning",
        "The cost of stale flags is not just technical. It's a drag on team velocity, developer morale, and product quality. The AI Janitor is our answer — but the first step is recognizing that stale flags are a problem worth solving.",
      ),
    ],
  },
];

/* --------------------------------------------------------------------------
   Helpers
   -------------------------------------------------------------------------- */

export function getPostBySlug(slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug);
}
