import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Wifi,
  RefreshCw,
  Database,
  Radio,
  Clock,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Real-Time Updates",
  description:
    "How FeatureSignals streams flag changes to SDKs in real-time using WebSockets, polling, and PG LISTEN/NOTIFY for cache invalidation.",
};

const mechanisms = [
  {
    icon: Wifi,
    title: "WebSocket Streaming",
    description:
      "SDKs establish a persistent WebSocket connection to the FeatureSignals API. When a flag is created, updated, or toggled, the server pushes a change event to all connected SDKs. The SDK invalidates its local cache and re-fetches the affected ruleset.",
    latency: "< 500ms end-to-end",
  },
  {
    icon: RefreshCw,
    title: "Polling Fallback",
    description:
      "For environments where WebSockets are blocked (firewalls, proxies) or for SDKs that don't support persistent connections, SDKs fall back to periodic polling. The poll interval is configurable — typically 30 seconds for server SDKs, 60 seconds for client SDKs.",
    latency: "Up to poll interval (30–60s configurable)",
  },
  {
    icon: Database,
    title: "PG LISTEN/NOTIFY (Server-Side)",
    description:
      "When a flag is mutated, PostgreSQL emits a NOTIFY event on a dedicated channel. Every API server instance listens on this channel. Upon receiving a notification, each instance invalidates the relevant Redis cache entry. This ensures all instances stay synchronized without a centralized cache coordinator.",
    latency: "< 100ms for cache invalidation across all instances",
  },
  {
    icon: Radio,
    title: "SSE (Server-Sent Events)",
    description:
      "For browser-based SDKs that can't use raw WebSockets, FeatureSignals supports Server-Sent Events. The browser opens a one-way stream from the API, receiving flag change events as they happen. SSE is simpler than WebSockets and works through most corporate firewalls.",
    latency: "< 1s end-to-end",
  },
];

export default function RealTimeUpdatesPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        Real-Time Updates
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        FeatureSignals propagates flag changes to all connected SDKs in
        real-time. Multiple mechanisms work together to ensure every SDK has the
        latest flag configuration — from instant WebSocket push to reliable
        polling fallback, backed by PG-driven cache invalidation across all
        server instances.
      </p>

      {/* How Updates Flow */}
      <SectionHeading>How an Update Flows</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        When someone toggles a flag in the Flag Engine, API, or via SDK,
        here&apos;s what happens:
      </p>
      <ol className="list-decimal pl-6 space-y-2 text-[var(--signal-fg-primary)] mb-8">
        <li>
          <strong>Mutation committed.</strong> The flag change is written to
          PostgreSQL in a transaction. A <InlineCode>NOTIFY</InlineCode> event
          fires on the <InlineCode>flag_changes</InlineCode> channel.
        </li>
        <li>
          <strong>All API server instances receive the notification.</strong>{" "}
          Each instance&apos;s PG listener picks up the event and invalidates
          the affected Redis cache key.
        </li>
        <li>
          <strong>WebSocket/SSE push.</strong> Each API server pushes a change
          event to all SDKs connected via WebSocket or SSE. The event payload
          includes the flag key, project ID, and environment key.
        </li>
        <li>
          <strong>SDK invalidates and re-fetches.</strong> The SDK marks the
          stale flag in its local cache and schedules a re-fetch. For WebSocket
          clients, this is immediate. For polling clients, it happens on the
          next poll cycle.
        </li>
        <li>
          <strong>Evaluation continues uninterrupted.</strong> If the re-fetch
          fails, the SDK keeps using the last known good configuration — it
          never returns stale errors to the application.
        </li>
      </ol>

      {/* Latency Guarantees */}
      <SectionHeading>Latency Guarantees</SectionHeading>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Mechanism</Th>
            <Th>Typical End-to-End Latency</Th>
            <Th>Failure Mode</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td className="font-semibold">WebSocket</Td>
            <Td>&lt; 500ms</Td>
            <Td>Falls back to polling</Td>
          </Tr>
          <Tr>
            <Td className="font-semibold">SSE</Td>
            <Td>&lt; 1s</Td>
            <Td>Falls back to polling</Td>
          </Tr>
          <Tr>
            <Td className="font-semibold">Polling</Td>
            <Td>Up to configured interval (30–60s)</Td>
            <Td>Exponential backoff on failure</Td>
          </Tr>
          <Tr>
            <Td className="font-semibold">PG LISTEN/NOTIFY</Td>
            <Td>&lt; 100ms (server-side cache invalidation)</Td>
            <Td>Redis cache has TTL fallback</Td>
          </Tr>
        </tbody>
      </SimpleTable>

      {/* Mechanism Details */}
      <SectionHeading>Update Mechanisms</SectionHeading>
      <div className="space-y-4 mb-8">
        {mechanisms.map((m) => (
          <div
            key={m.title}
            className="p-4 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] shadow-[var(--signal-shadow-sm)]"
          >
            <div className="flex items-start gap-3">
              <m.icon
                size={18}
                className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                    {m.title}
                  </p>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)]">
                    <Clock size={10} />
                    {m.latency}
                  </span>
                </div>
                <p className="text-sm text-[var(--signal-fg-secondary)]">
                  {m.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Configuration */}
      <SectionHeading>SDK Configuration</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Each SDK exposes configuration for real-time updates. The exact API
        varies by language, but the concepts are consistent:
      </p>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Option</Th>
            <Th>Default</Th>
            <Th>Description</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>
              <InlineCode>updateMode</InlineCode>
            </Td>
            <Td>
              <InlineCode>websocket</InlineCode>
            </Td>
            <Td>
              Transport: <InlineCode>websocket</InlineCode>,{" "}
              <InlineCode>sse</InlineCode>, or <InlineCode>polling</InlineCode>
            </Td>
          </Tr>
          <Tr>
            <Td>
              <InlineCode>pollIntervalMs</InlineCode>
            </Td>
            <Td>30000</Td>
            <Td>
              Poll interval in milliseconds (when using polling mode or as
              fallback)
            </Td>
          </Tr>
          <Tr>
            <Td>
              <InlineCode>cacheTtlMs</InlineCode>
            </Td>
            <Td>60000</Td>
            <Td>Maximum age of cached flag data before a forced refresh</Td>
          </Tr>
          <Tr>
            <Td>
              <InlineCode>reconnectBackoffMs</InlineCode>
            </Td>
            <Td>1000</Td>
            <Td>
              Initial backoff for WebSocket/SSE reconnection (exponential with
              jitter)
            </Td>
          </Tr>
        </tbody>
      </SimpleTable>

      {/* Graceful Degradation */}
      <SectionHeading>Graceful Degradation</SectionHeading>
      <div className="flex items-start gap-3 p-4 mb-8 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-accent-muted)]">
        <CheckCircle
          size={18}
          className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0"
        />
        <div>
          <p className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
            SDKs never return errors due to stale data
          </p>
          <p className="text-sm text-[var(--signal-fg-secondary)]">
            If the WebSocket disconnects, the SDK uses the last known
            configuration. If polling fails, it uses the cached ruleset. If the
            cache expires during an outage, the SDK returns the fallback value
            you provide in your code. Your application keeps running normally
            regardless of connectivity to FeatureSignals.
          </p>
        </div>
      </div>

      {/* Next Steps */}
      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[
          {
            label: "Architecture Overview — System topology",
            href: "/docs/architecture/overview",
          },
          {
            label: "Evaluation Engine — How flags resolve in <1ms",
            href: "/docs/architecture/evaluation-engine",
          },
          {
            label: "SDKs — Configure real-time updates in your language",
            href: "/docs/sdks",
          },
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

function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td
      className={cn("px-4 py-2.5 text-[var(--signal-fg-primary)]", className)}
    >
      {children}
    </td>
  );
}
