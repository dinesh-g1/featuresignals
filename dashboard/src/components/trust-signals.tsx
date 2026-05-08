"use client";

import React, { useId } from "react";
import {
  Shield,
  Code,
  Database,
  Globe,
  EyeOff,
  Heart,
  BadgeCheck,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Trust Signal Definitions ────────────────────────────────────────────────

interface TrustSignal {
  icon: React.ElementType;
  title: string;
  description: string;
  tooltip?: string;
}

const SIGNALS: TrustSignal[] = [
  {
    icon: EyeOff,
    title: "No dark patterns",
    description:
      "We never use fake scarcity, countdown timers, hidden fees, or manipulative design. What you see is what you get.",
    tooltip:
      "Dark patterns are UI tricks designed to manipulate users. We explicitly reject them — every purchase decision should be informed and voluntary.",
  },
  {
    icon: Database,
    title: "Data residency",
    description:
      "Your data stays in your chosen region. We never sell, share, or monetize your data — it's yours, period.",
    tooltip:
      "Choose where your data is stored. Production data never leaves the region you select during signup.",
  },
  {
    icon: Code,
    title: "Open Source",
    description:
      "Core features are Apache 2.0 licensed. You can inspect the code, self-host, or contribute back.",
    tooltip:
      "The feature flag engine, evaluation pipeline, and all SDKs are open source. Only enterprise features (SSO, priority support) are closed.",
  },
  {
    icon: Globe,
    title: "OpenFeature native",
    description:
      "Zero vendor lock-in. Switch providers by changing one line of code. All SDKs are OpenFeature-compliant.",
    tooltip:
      "OpenFeature is the CNCF standard for feature flagging. We designed all 8 SDKs with OpenFeature providers as first-class citizens.",
  },
  {
    icon: Shield,
    title: "Security & privacy",
    description:
      "We're building toward SOC 2 compliance. TLS 1.3 everywhere, AES-256 at rest, bcrypt for secrets.",
    tooltip:
      "We follow security best practices aligned with SOC 2 and GDPR frameworks. Certification audits are on our roadmap.",
  },
  {
    icon: Heart,
    title: "Built for engineers",
    description:
      "Built by engineers who care about craft. Honest pricing, fast evaluation, clean APIs.",
    tooltip:
      "FeatureSignals was built because existing feature flag tools were either too expensive, too complex, or both. We're fixing that.",
  },
];

// ── Individual Signal Card ──────────────────────────────────────────────────

function TrustCard({ signal }: { signal: TrustSignal }) {
  const _id = useId();

  return (
    <div className="group relative rounded-[var(--radius-medium)] border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] p-4 transition-all duration-200 hover:border-[var(--signal-border-accent-muted)] hover:shadow-[var(--signal-shadow-sm)]">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--signal-bg-accent-muted)] transition-colors group-hover:bg-[var(--signal-bg-accent-emphasis)]/15">
          <signal.icon className="h-4 w-4 text-[var(--signal-fg-accent)] transition-colors group-hover:text-[var(--color-accent-dark)]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="text-sm font-semibold text-[var(--signal-fg-primary)]">
              {signal.title}
            </h4>
            {signal.tooltip && (
              <span
                className="hidden sm:inline-flex"
                tabIndex={0}
                role="tooltip"
                aria-label={signal.tooltip}
                data-tooltip={signal.tooltip}
              >
                <Info className="h-3.5 w-3.5 text-[var(--signal-fg-tertiary)] transition-colors hover:text-[var(--signal-fg-secondary)]" />
              </span>
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[var(--signal-fg-secondary)]">
            {signal.description}
          </p>
        </div>
      </div>

      {/* Tooltip on hover (desktop) */}
      {signal.tooltip && (
        <div
          className="pointer-events-none absolute -top-2 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full rounded-[var(--radius-small)] bg-[var(--signal-bg-inverse)] px-3 py-2 text-xs leading-relaxed text-[var(--signal-fg-on-emphasis)] opacity-0 shadow-[var(--signal-shadow-md)] transition-all duration-150 group-hover:block group-hover:opacity-100 sm:w-72"
          role="tooltip"
        >
          {signal.tooltip}
          <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[var(--signal-bg-inverse)]" />
        </div>
      )}
    </div>
  );
}

// ── No Dark Patterns Badge ──────────────────────────────────────────────────

function NoDarkPatternsBadge() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--signal-border-success-muted)] bg-[var(--signal-bg-success-muted)] px-3 py-1.5 text-xs font-medium text-[var(--signal-fg-success)] transition-colors hover:border-[var(--signal-border-success-emphasis)]/40">
      <BadgeCheck className="h-3.5 w-3.5" />
      No dark patterns
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

interface TrustSignalsProps {
  /** Whether to include the "No dark patterns" badge prominently */
  showBadge?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Number of signals to show. Default: all */
  limit?: number;
  /** Whether to show in a compact single-row layout */
  compact?: boolean;
}

export function TrustSignals({
  showBadge = true,
  className,
  limit,
  compact = false,
}: TrustSignalsProps) {
  const id = useId();
  const signals = limit ? SIGNALS.slice(0, limit) : SIGNALS;

  return (
    <section
      className={cn("w-full", className)}
      aria-labelledby={`${id}-heading`}
    >
      <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2
            id={`${id}-heading`}
            className="text-xl font-bold text-[var(--signal-fg-primary)]"
          >
            Built on trust
          </h2>
          <p className="mt-1 text-sm text-[var(--signal-fg-secondary)]">
            We believe software should respect its users. Here&apos;s how.
          </p>
        </div>
        {showBadge && <NoDarkPatternsBadge />}
      </div>

      <div
        className={cn(
          "grid gap-4",
          compact
            ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        )}
      >
        {signals.map((signal) => (
          <TrustCard key={signal.title} signal={signal} />
        ))}
      </div>
    </section>
  );
}

// ── Named Exports ───────────────────────────────────────────────────────────

export { NoDarkPatternsBadge, SIGNALS };
export type { TrustSignal };
