import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Server, Database, Cpu, Radio, Zap, Layers } from "lucide-react";

export const metadata: Metadata = {
  title: "Architecture Overview",
  description:
    "FeatureSignals architecture — hexagonal architecture, evaluation engine, real-time updates, and deployment topology.",
};

const components = [
  {
    icon: Server,
    title: "Go API Server",
    description:
      "The core application server. Handles REST APIs, authentication, authorization, and webhook delivery. Built with hexagonal architecture — domain logic is fully isolated from infrastructure adapters.",
  },
  {
    icon: Database,
    title: "PostgreSQL",
    description:
      "Primary data store for organizations, projects, flags, segments, audit logs, and user accounts. Every query uses parameterized statements; every foreign key is indexed.",
  },
  {
    icon: Cpu,
    title: "Redis Cache",
    description:
      "In-memory cache for compiled flag rulesets. Evaluation requests never touch the database — they read from Redis. Cache invalidation uses PG LISTEN/NOTIFY for real-time propagation across all server instances.",
  },
  {
    icon: Zap,
    title: "Evaluation Engine",
    description:
      "The hot path. A stateless, allocation-minimizing Go engine that evaluates flags in <1ms p99. Runs the evaluation order: existence check → environment state → mutual exclusion → prerequisites → targeting → rollout → variant assignment.",
  },
  {
    icon: Radio,
    title: "Relay Proxy",
    description:
      "Optional sidecar that caches flag rules locally. Eliminates network hops for evaluation in high-throughput or air-gapped environments. Syncs via WebSocket or polling.",
  },
  {
    icon: Layers,
    title: "SDKs",
    description:
      "OpenFeature-native client libraries for Go, Node.js, Python, Java, Ruby, .NET, JavaScript, React, iOS, and Android. Each SDK handles caching, retries, and graceful degradation independently.",
  },
];

export default function ArchitectureOverviewPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        Architecture Overview
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        FeatureSignals is built on a hexagonal architecture with a Go API server at the core,
        PostgreSQL for persistence, Redis for evaluation caching, and a stateless evaluation
        engine that serves sub-millisecond flag resolutions. This page gives you the
        high-level picture.
      </p>

      {/* System Diagram (Text) */}
      <SectionHeading>System Topology</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        A FeatureSignals deployment typically looks like this:
      </p>
      <div className="p-6 mb-8 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)] font-mono text-xs leading-relaxed text-[var(--signal-fg-primary)] overflow-x-auto">
        <pre className="whitespace-pre">
{`┌──────────────────────────────────────────────────────────────┐
│                     LOAD BALANCER                             │
│                  (NGINX / Cloud LB)                           │
└──────────┬─────────────────────────────────────┬─────────────┘
           │                                     │
    ┌──────▼──────┐  ┌──────────┐       ┌──────▼──────┐
    │ API Server 1 │  │   ...    │       │ API Server N│
    │  (Go, chi)   │  │          │       │  (Go, chi)  │
    └──────┬───────┘  └──────────┘       └──────┬───────┘
           │                                     │
    ┌──────▼──────┐                       ┌──────▼──────┐
    │    Redis    │◄──── PG LISTEN ──────►│    Redis    │
    │  (Cache)    │       /NOTIFY         │  (Cache)    │
    └─────────────┘                       └─────────────┘
           │                                     │
           └──────────────┬──────────────────────┘
                          │
                   ┌──────▼──────┐
                   │ PostgreSQL  │
                   │  (Primary)  │
                   └─────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   ┌────▼────┐     ┌─────▼─────┐     ┌────▼────┐
   │  SDK    │     │  Relay    │     │ Webhooks│
   │ Clients │     │  Proxy    │     │  (Async)│
   └─────────┘     └───────────┘     └─────────┘`}
        </pre>
      </div>
      <p className="text-sm text-[var(--signal-fg-secondary)] mb-8">
        All server instances are stateless and interchangeable. The Redis cache is populated
        at startup and invalidated in real-time via PostgreSQL{" "}
        <InlineCode>LISTEN/NOTIFY</InlineCode>. SDKs connect to the API or Relay Proxy for
        flag evaluation.
      </p>

      {/* Core Components */}
      <SectionHeading>Core Components</SectionHeading>
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        {components.map((comp) => (
          <div
            key={comp.title}
            className="p-4 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] shadow-[var(--signal-shadow-sm)]"
          >
            <div className="flex items-start gap-3">
              <comp.icon
                size={18}
                className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0"
              />
              <div>
                <p className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
                  {comp.title}
                </p>
                <p className="text-sm text-[var(--signal-fg-secondary)]">
                  {comp.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Hexagonal Architecture */}
      <SectionHeading>Hexagonal Architecture</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        The Go server follows a ports-and-adapters (hexagonal) architecture. Domain logic sits
        at the center with zero dependencies on infrastructure:
      </p>
      <div className="p-4 mb-6 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-accent-muted)] font-mono text-xs text-[var(--signal-fg-primary)] overflow-x-auto">
        <pre className="whitespace-pre">
{`handlers (HTTP) ──→ domain interfaces (ports) ←── store/postgres (DB adapter)
                 ──→ domain entities & logic  ←── cache adapter
                 ──→ eval engine              ←── webhook adapter`}
        </pre>
      </div>
      <ul className="list-disc pl-6 space-y-1.5 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>Handlers</strong> only import domain interfaces — never concrete
          implementations.
        </li>
        <li>
          <strong>Domain logic</strong> is pure Go with no database, HTTP, or cache dependencies.
        </li>
        <li>
          <strong>Adapters</strong> (PostgreSQL store, Redis cache, webhook sender) implement
          domain interfaces and are wired in at startup.
        </li>
        <li>
          This means you can swap PostgreSQL for another database, or add gRPC alongside REST,
          without touching business logic.
        </li>
      </ul>

      {/* Evaluation Hot Path */}
      <SectionHeading>Evaluation Hot Path</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        The flag evaluation path is the most performance-critical code in the system. It&apos;s
        designed for sub-millisecond latencies:
      </p>
      <ol className="list-decimal pl-6 space-y-1.5 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>SDK checks local cache.</strong> If the flag ruleset is cached and fresh,
          evaluate locally. No network call.
        </li>
        <li>
          <strong>SDK calls evaluation API.</strong> If the local cache is stale or missing, the
          SDK calls <InlineCode>POST /v1/evaluate</InlineCode> or the client-side evaluation
          endpoint.
        </li>
        <li>
          <strong>API server reads from Redis.</strong> The compiled ruleset is fetched from
          Redis. No database query.
        </li>
        <li>
          <strong>Evaluation engine resolves the flag.</strong> A stateless, allocation-minimizing
          Go engine runs the evaluation order and returns the result.
        </li>
        <li>
          <strong>SDK caches the result.</strong> The SDK updates its local cache and returns
          the value to the application.
        </li>
      </ol>

      {/* Deployment Models */}
      <SectionHeading>Deployment Models</SectionHeading>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Model</Th>
            <Th>Description</Th>
            <Th>Best For</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td className="font-semibold">FeatureSignals Cloud</Td>
            <Td>Fully managed SaaS. Multi-tenant, SOC 2 compliant, 99.95% SLA.</Td>
            <Td>Most teams. Fastest time to value.</Td>
          </Tr>
          <Tr>
            <Td className="font-semibold">Dedicated Cloud</Td>
            <Td>Single-tenant instance in your cloud (AWS, GCP, Azure). Isolated infrastructure.</Td>
            <Td>Enterprises with compliance or data residency requirements.</Td>
          </Tr>
          <Tr>
            <Td className="font-semibold">Self-Hosted</Td>
            <Td>Deploy in your own infrastructure. Full control over data, networking, and upgrades.</Td>
            <Td>Regulated industries, air-gapped environments, or teams that require full control.</Td>
          </Tr>
        </tbody>
      </SimpleTable>

      {/* Deep Dives */}
      <SectionHeading>Deep Dives</SectionHeading>
      <ul className="space-y-2">
        {[
          { label: "Evaluation Engine — How flags resolve in <1ms", href: "/docs/architecture/evaluation-engine" },
          { label: "Real-Time Updates — WebSocket streaming and polling", href: "/docs/architecture/real-time-updates" },
          { label: "SDKs — Client libraries for every stack", href: "/docs/sdks" },
        ].map((step) => (
          <li key={step.href}>
            <Link
              href={step.href}
              className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"
            >
              <ArrowRight size={14} />
              <span>{step.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-semibold text-[var(--signal-fg-primary)] mt-10 mb-4 pb-2 border-b border-[var(--signal-border-default)]">
      {children}
    </h2>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 text-[0.85em] font-mono rounded bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-primary)] border border-[var(--signal-border-default)]">
      {children}
    </code>
  );
}

function SimpleTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto border border-[var(--signal-border-default)] rounded-lg mb-6">
      <table className="w-full text-sm text-left">{children}</table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 font-semibold bg-[var(--signal-bg-secondary)] border-b border-[var(--signal-border-default)] text-[var(--signal-fg-primary)]">
      {children}
    </th>
  );
}

function Tr({ children }: { children: React.ReactNode }) {
  return (
    <tr className="border-b border-[var(--signal-border-default)] last:border-b-0">
      {children}
    </tr>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`px-4 py-2.5 text-[var(--signal-fg-primary)] ${className || ""}`}>
      {children}
    </td>
  );
}
