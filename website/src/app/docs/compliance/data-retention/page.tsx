import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Archive, Trash2, Settings, ArrowRight } from "lucide-react";
import Callout from "@/components/docs/Callout";

export const metadata: Metadata = {
  title: "Data Retention Policy",
  description:
    "Data retention periods for evaluation events, audit logs, user data, and deleted resources. Configurable retention settings for Enterprise customers.",
};

const retentionPeriods = [
  {
    dataType: "Evaluation events",
    defaultPeriod: "30 days",
    configurable: true,
    description:
      "Individual flag evaluation records (flag key, user key, evaluation result, timestamp). Used for analytics and debugging. Aggregated metrics are retained indefinitely.",
  },
  {
    dataType: "Audit logs",
    defaultPeriod: "1 year",
    configurable: true,
    description:
      "Immutable record of all mutations — flag creation, updates, toggles, deletions, API key rotations, and permission changes. Essential for compliance and security investigations.",
  },
  {
    dataType: "User accounts",
    defaultPeriod: "Until deletion",
    configurable: false,
    description:
      "Active user accounts and their associated data (email, name, role, team membership). Retained until you delete the account or your organization is deprovisioned.",
  },
  {
    dataType: "Deleted resources (soft delete)",
    defaultPeriod: "30 days",
    configurable: true,
    description:
      "Flags, segments, and environments remain recoverable for 30 days after deletion. After this period, data is permanently purged from all systems including backups.",
  },
  {
    dataType: "Backups",
    defaultPeriod: "30 days",
    configurable: false,
    description:
      "Daily database backups retained for 30 days in a separate region. Immutable backups (WORM) retained for 7 days. See Disaster Recovery plan for details.",
  },
  {
    dataType: "API access logs",
    defaultPeriod: "90 days",
    configurable: true,
    description:
      "API request metadata (endpoint, method, status, latency, IP address). Used for rate limiting, abuse detection, and debugging. Does not include request bodies.",
  },
  {
    dataType: "Webhook delivery logs",
    defaultPeriod: "30 days",
    configurable: true,
    description:
      "Webhook delivery attempts, success/failure status, response codes, and retry counts. Useful for debugging webhook integration issues.",
  },
  {
    dataType: "Session tokens",
    defaultPeriod: "7 days (refresh) / 1 hour (access)",
    configurable: true,
    description:
      "JWT access tokens expire after 1 hour. Refresh tokens are valid for 7 days. All tokens are invalidated on password change or account deactivation.",
  },
];

export default function DataRetentionPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        Data Retention Policy
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        FeatureSignals retains data only as long as necessary to provide the service and meet
        compliance obligations. This policy defines retention periods for each data category.
        Enterprise customers can configure retention periods to align with their internal policies.
      </p>

      <Callout variant="info">
        Enterprise customers on Dedicated Cloud or Self-Hosted plans have full control over
        data retention. Contact your solutions engineer to customize retention periods for
        your deployment.
      </Callout>

      {/* Retention Table */}
      <SectionHeading>Retention Periods</SectionHeading>
      <div className="overflow-x-auto border border-[var(--signal-border-default)] rounded-lg shadow-[var(--signal-shadow-sm)] mb-8">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)]">
              <th className="px-4 py-3 font-semibold text-[var(--signal-fg-primary)]">Data Type</th>
              <th className="px-4 py-3 font-semibold text-[var(--signal-fg-primary)]">Default Retention</th>
              <th className="px-4 py-3 font-semibold text-[var(--signal-fg-primary)]">Configurable</th>
              <th className="px-4 py-3 font-semibold text-[var(--signal-fg-primary)]">Description</th>
            </tr>
          </thead>
          <tbody>
            {retentionPeriods.map((row) => (
              <tr
                key={row.dataType}
                className="border-b border-[var(--signal-border-default)] last:border-b-0"
              >
                <td className="px-4 py-3 font-semibold text-[var(--signal-fg-primary)]">
                  {row.dataType}
                </td>
                <td className="px-4 py-3 text-[var(--signal-fg-secondary)]">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock size={14} className="text-[var(--signal-fg-accent)]" />
                    {row.defaultPeriod}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {row.configurable ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--signal-bg-success-muted)] text-[var(--signal-fg-success)]">
                      Configurable
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-tertiary)]">
                      Fixed
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-[var(--signal-fg-secondary)]">
                  {row.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Data Lifecycle */}
      <SectionHeading>Data Lifecycle</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Data in FeatureSignals moves through three stages:
      </p>
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {[
          {
            icon: Archive,
            title: "1. Active",
            description:
              "Data actively used by the service. Reads, writes, and queries operate against active data. This is the data you see in FlagEngine and the API.",
          },
          {
            icon: Clock,
            title: "2. Retained",
            description:
              "Data past its active use window but retained for compliance, auditing, or recovery. Audit logs and backups fall into this category. Not queryable via standard APIs.",
          },
          {
            icon: Trash2,
            title: "3. Purged",
            description:
              "Data permanently deleted from all systems — database, backups, caches, and logs. Cannot be recovered. Purge happens automatically on schedule or on explicit request.",
          },
        ].map((stage) => (
          <div
            key={stage.title}
            className="p-4 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] shadow-[var(--signal-shadow-sm)]"
          >
            <stage.icon size={20} className="text-[var(--signal-fg-accent)] mb-3" />
            <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
              {stage.title}
            </h3>
            <p className="text-sm text-[var(--signal-fg-secondary)] leading-relaxed">
              {stage.description}
            </p>
          </div>
        ))}
      </div>

      {/* Automated Cleanup */}
      <SectionHeading>Automated Data Cleanup</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        FeatureSignals runs automated cleanup jobs to enforce retention policies:
      </p>
      <ul className="list-disc pl-6 space-y-2 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>Evaluation event pruning</strong> — Runs daily. Deletes evaluation events
          older than the configured retention period. Aggregated metrics are preserved.
        </li>
        <li>
          <strong>Audit log archival</strong> — Runs weekly. Audit entries older than the
          retention period are exported to cold storage (object storage) before deletion.
          Enterprise customers can configure their own S3 bucket for archival.
        </li>
        <li>
          <strong>Soft-delete cleanup</strong> — Runs daily. Permanently deletes flags,
          segments, and environments that have been soft-deleted for longer than the
          configured recovery window.
        </li>
        <li>
          <strong>Session cleanup</strong> — Expired tokens are cleaned from the database
          hourly. Active sessions are unaffected.
        </li>
      </ul>

      {/* Configuring Retention */}
      <SectionHeading>Configuring Retention (Enterprise)</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Enterprise customers can customize retention periods from FlagEngine:
      </p>
      <ol className="list-decimal pl-6 space-y-2 text-[var(--signal-fg-primary)] mb-6">
        <li>
          Navigate to <InlineCode>Settings &rarr; Organization &rarr; Data Retention</InlineCode>.
        </li>
        <li>Adjust retention periods for each data category. Minimum and maximum values
          are enforced based on your plan and compliance requirements.</li>
        <li>Changes take effect at the next cleanup cycle (within 24 hours).</li>
        <li>Data already past the new retention period will be purged in the next cleanup job.</li>
      </ol>

      <Callout variant="warning">
        Reducing retention periods may permanently delete data needed for compliance audits.
        Consult your legal and compliance teams before making changes. FeatureSignals
        recommends keeping audit logs for at least 1 year to satisfy SOC 2 and ISO 27001
        requirements.
      </Callout>

      {/* Deletion on Account Closure */}
      <SectionHeading>Data Deletion on Account Closure</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        When you close your FeatureSignals account or terminate your contract:
      </p>
      <ul className="list-disc pl-6 space-y-2 text-[var(--signal-fg-primary)] mb-6">
        <li>All active data is marked for deletion immediately.</li>
        <li>Data remains recoverable for 30 days (grace period) in case of accidental closure.</li>
        <li>After 30 days, all data is permanently purged from all systems.</li>
        <li>Backups containing your data cycle out within 30 days of the purge.</li>
        <li>You may request an export of your data before the purge completes.</li>
      </ul>

      {/* Learn More */}
      <SectionHeading>Learn More</SectionHeading>
      <ul className="space-y-2">
        {[
          { label: "Privacy Policy", href: "/docs/compliance/privacy-policy" },
          { label: "Data Processing Agreement", href: "/docs/compliance/dpa-template" },
          { label: "Disaster Recovery", href: "/docs/operations/disaster-recovery" },
          { label: "Security Overview", href: "/docs/compliance/security-overview" },
        ].map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="flex items-center gap-2 text-[var(--signal-fg-accent)] hover:underline text-sm font-medium"
            >
              <ArrowRight size={14} />
              <span>{link.label}</span>
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
