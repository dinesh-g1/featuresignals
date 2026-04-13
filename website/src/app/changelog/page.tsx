import type { Metadata } from "next";
import Link from "next/link";
import { SectionReveal } from "@/components/section-reveal";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Product updates, new features, and improvements.",
};

export default function ChangelogPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <SectionReveal>
        <h1 className="text-4xl font-bold text-slate-900">Changelog</h1>
        <p className="mt-4 text-slate-500 leading-relaxed">
          Product updates, new features, and improvements.
        </p>
      </SectionReveal>

      <div className="mt-12 space-y-12">
        <SectionReveal delay={0.05}>
          <article>
            <div className="flex items-center gap-3">
              <time className="text-sm font-medium text-indigo-600">
                April 2026
              </time>
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100">
                Latest
              </span>
            </div>
            <h2 className="mt-3 text-xl font-semibold text-slate-900">
              Flag Engine & Toggle Categories
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-600 list-disc list-inside">
              <li>
                <strong>Dashboard renamed to Flag Engine</strong> — The
                management UI is now called the Flag Engine across all pages,
                docs, and navigation
              </li>
              <li>
                <strong>Toggle Categories</strong> — Classify flags as release,
                experiment, ops, or permission with category-aware staleness
                thresholds (14d, 30d, 90d, 90d)
              </li>
              <li>
                <strong>Flag Lifecycle Status</strong> — Track flags through
                active → rolled_out → deprecated → archived
              </li>
              <li>
                <strong>Environment Comparison</strong> — Compare and bulk-sync
                flag states across environments
              </li>
              <li>
                <strong>Target Inspector</strong> — See exactly what a specific
                user experiences across all flags
              </li>
              <li>
                <strong>Target Comparison</strong> — Compare flag evaluations
                for two users side-by-side
              </li>
              <li>
                <strong>Usage Insights</strong> — View value distribution
                percentages (true/false) per flag per environment
              </li>
              <li>
                <strong>SOLID Architecture</strong> — Core engine refactored
                with interface-driven design, evaluation middleware chain,
                operator registry, and domain error hierarchy
              </li>
            </ul>
          </article>
        </SectionReveal>

        <SectionReveal delay={0.08}>
          <article>
            <div className="flex items-center gap-3">
              <time className="text-sm font-medium text-indigo-600">
                April 2026
              </time>
            </div>
            <h2 className="mt-3 text-xl font-semibold text-slate-900">
              API Security Hardening
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-600 list-disc list-inside">
              <li>
                <strong>Broken Object Level Authorization fix</strong> — API key
                revocation now verifies org ownership to prevent cross-tenant
                access
              </li>
              <li>
                <strong>JWT token type enforcement</strong> — Refresh tokens can
                no longer be used as access tokens (issuer claim validation)
              </li>
              <li>
                <strong>User data minimization</strong> — Login and register
                responses no longer expose sensitive fields like password hash
                or internal flags
              </li>
              <li>
                <strong>API key expiration</strong> — Optional{" "}
                <code>expires_in_days</code> parameter on key creation; expired
                keys rejected at evaluation time
              </li>
              <li>
                <strong>Rate limit headers</strong> —{" "}
                <code>X-RateLimit-Limit</code>,{" "}
                <code>X-RateLimit-Remaining</code>, and{" "}
                <code>X-RateLimit-Reset</code> on all rate-limited responses
              </li>
              <li>
                <strong>Content-Type enforcement</strong> — POST/PUT/PATCH
                requests must use <code>application/json</code> (415 otherwise)
              </li>
              <li>
                <strong>Content-Security-Policy header</strong> — Added{" "}
                <code>{`default-src 'none'; frame-ancestors 'none'`}</code> to
                all responses
              </li>
              <li>
                <strong>SSRF protection</strong> — Webhook URLs block private
                IPs, localhost, and internal hostnames
              </li>
              <li>
                <strong>Bulk evaluation limit</strong> — <code>flag_keys</code>{" "}
                array capped at 100 items
              </li>
              <li>
                <strong>PII masking in logs</strong> — Emails, tokens, and phone
                numbers are masked in server logs
              </li>
              <li>
                <strong>Security audit logging</strong> —{" "}
                <code>api_key.created</code>, <code>api_key.revoked</code>{" "}
                actions tracked in audit trail
              </li>
              <li>
                <strong>JWT secret startup check</strong> — Server refuses to
                start with default secret in non-debug environments
              </li>
              <li>
                <strong>Database SSL enforcement</strong> — Default connection
                string now requires <code>sslmode=require</code>
              </li>
              <li>
                <strong>SSE CORS fix</strong> — Removed hardcoded{" "}
                <code>Access-Control-Allow-Origin: *</code> from SSE server
              </li>
              <li>
                <strong>Request ID in errors</strong> — Error responses include{" "}
                <code>request_id</code> for correlation
              </li>
              <li>
                <strong>Comprehensive test suite</strong> — 50+ new tests
                covering auth flows, middleware, org isolation, and security
                boundaries
              </li>
            </ul>
          </article>
        </SectionReveal>

        <SectionReveal delay={0.1}>
          <article>
            <div className="flex items-center gap-3">
              <time className="text-sm font-medium text-indigo-600">
                Phase 3 — April 2026
              </time>
            </div>
            <h2 className="mt-3 text-xl font-semibold text-slate-900">
              Scale & Differentiation
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-600 list-disc list-inside">
              <li>
                <strong>A/B Experimentation</strong> — New <code>ab</code> flag
                type with weighted variants, consistent hashing assignment, and
                impression tracking API
              </li>
              <li>
                <strong>Relay Proxy</strong> — Lightweight Go binary for edge
                caching with SSE or polling sync
              </li>
              <li>
                <strong>Mutual Exclusion Groups</strong> — Prevent experiment
                interference with deterministic winner selection
              </li>
              <li>
                <strong>Evaluation Metrics</strong> — In-memory counters, Flag
                Engine visualization with top-flags chart and reason breakdown
              </li>
              <li>
                <strong>Eval Metrics page</strong> — Per-environment counts,
                reason distribution, top evaluated flags
              </li>
              <li>
                <strong>Mutex group editor</strong> — Inline editor in flag
                detail with group member count
              </li>
              <li>
                <strong>Stale Flag Scanner</strong> — CLI tool to find unused
                flag references in code, CI mode with exit code
              </li>
              <li>
                <strong>Documentation Site</strong> — 35+ page Docusaurus site
                covering getting started, concepts, SDKs, API reference, and
                deployment
              </li>
            </ul>
          </article>
        </SectionReveal>

        <SectionReveal delay={0.12}>
          <article>
            <div className="flex items-center gap-3">
              <time className="text-sm font-medium text-indigo-600">
                Phase 2 — March 2026
              </time>
            </div>
            <h2 className="mt-3 text-xl font-semibold text-slate-900">
              Enterprise Readiness
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-600 list-disc list-inside">
              <li>
                <strong>Python SDK</strong> — Client with polling/SSE,
                OpenFeature provider
              </li>
              <li>
                <strong>Java SDK</strong> — Maven project with polling/SSE,
                OpenFeature provider, JUnit 5 tests
              </li>
              <li>
                <strong>Approval Workflows</strong> — Request-review flow for
                production changes with automatic application
              </li>
              <li>
                <strong>Webhook Dispatch</strong> — Background dispatcher with
                HMAC-SHA256 signatures, exponential retry, delivery logging
              </li>
              <li>
                <strong>Flag Scheduling</strong> — Auto-enable/disable at
                specified times with 30-second granularity
              </li>
              <li>
                <strong>Kill Switch</strong> — Emergency flag disable with
                one-click Flag Engine button
              </li>
              <li>
                <strong>Flag Promotion</strong> — Copy flag configuration
                between environments
              </li>
              <li>
                <strong>Flag Health</strong> — Health scores, stale flags,
                expiring flags, missing descriptions
              </li>
              <li>
                <strong>Prerequisite Flags</strong> — Recursive dependency
                evaluation
              </li>
              <li>
                <strong>RBAC</strong> — Owner/admin/developer/viewer roles with
                per-environment permissions
              </li>
              <li>
                <strong>Audit Logging</strong> — Tamper-evident log with
                before/after state diffs
              </li>
              <li>
                <strong>CI/CD Pipeline</strong> — GitHub Actions for all SDK
                tests, server tests, Flag Engine build, Docker build
              </li>
            </ul>
          </article>
        </SectionReveal>

        <SectionReveal delay={0.14}>
          <article>
            <div className="flex items-center gap-3">
              <time className="text-sm font-medium text-indigo-600">
                Phase 1 — February 2026
              </time>
            </div>
            <h2 className="mt-3 text-xl font-semibold text-slate-900">
              Core Platform (MVP)
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-600 list-disc list-inside">
              <li>
                <strong>Evaluation Engine</strong> — Targeting rules, segments,
                percentage rollout with MurmurHash3
              </li>
              <li>
                <strong>Management API</strong> — Full CRUD for projects,
                environments, flags, segments, API keys
              </li>
              <li>
                <strong>SSE Streaming</strong> — Real-time flag updates via
                PostgreSQL LISTEN/NOTIFY
              </li>
              <li>
                <strong>Go SDK</strong> — Polling, SSE, local eval, OpenFeature
                provider
              </li>
              <li>
                <strong>Node.js SDK</strong> — Polling, SSE, local eval,
                OpenFeature provider
              </li>
              <li>
                <strong>React SDK</strong> — Provider component, hooks (useFlag,
                useFlags, useReady, useError)
              </li>
              <li>
                <strong>Flag Engine</strong> — Next.js with flag management,
                targeting editor, segments, environments
              </li>
              <li>
                <strong>Docker Compose</strong> — One-command local development
                setup
              </li>
            </ul>
          </article>
        </SectionReveal>
      </div>

      <SectionReveal delay={0.16}>
        <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 px-6 py-8 text-center sm:px-10">
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
              Stay in the loop
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
              Get product updates, feature announcements, and engineering
              insights. No spam, unsubscribe anytime.
            </p>
            <div
              className="mx-auto mt-5 flex max-w-sm flex-col gap-2 sm:flex-row"
            >
              <input
                type="email"
                placeholder="you@company.com"
                
                className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                
                className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                Subscribe
              </button>
            </div>
          </div>
        </section>
      </SectionReveal>
    </section>
  );
}
