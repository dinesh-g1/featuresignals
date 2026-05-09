import type { Metadata } from "next";
import Link from "next/link";
import {
  HardDrive,
  Database,
  Globe,
  Repeat,
  Shield,
  ArrowRight,
} from "lucide-react";
import Callout from "@/components/docs/Callout";

export const metadata: Metadata = {
  title: "Disaster Recovery",
  description:
    "Disaster recovery plan — RPO/RTO targets, backup strategy, restore procedures, regional failover, and testing DR for FeatureSignals deployments.",
};

export default function DisasterRecoveryPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        Disaster Recovery
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        This disaster recovery plan defines the recovery objectives, backup strategy,
        restore procedures, and failover processes for FeatureSignals. It applies to
        FeatureSignals Cloud, Dedicated Cloud, and provides guidance for self-hosted
        deployments.
      </p>

      <Callout variant="warning">
        This is a living document. It is reviewed quarterly and updated after every
        significant architecture change or incident. Last reviewed: Q1 2026.
      </Callout>

      {/* RPO / RTO */}
      <SectionHeading>Recovery Objectives (RPO / RTO)</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Recovery objectives define how much data loss is acceptable (RPO) and how quickly
        service must be restored (RTO):
      </p>
      <div className="overflow-x-auto border border-[var(--signal-border-default)] rounded-lg shadow-[var(--signal-shadow-sm)] mb-6">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)]">
              <th className="px-4 py-3 font-semibold text-[var(--signal-fg-primary)]">Scenario</th>
              <th className="px-4 py-3 font-semibold text-[var(--signal-fg-primary)]">RPO</th>
              <th className="px-4 py-3 font-semibold text-[var(--signal-fg-primary)]">RTO</th>
              <th className="px-4 py-3 font-semibold text-[var(--signal-fg-primary)]">Target</th>
            </tr>
          </thead>
          <tbody>
            {[
              {
                scenario: "Database corruption (single AZ)",
                rpo: "< 5 minutes (WAL shipping)",
                rto: "< 30 minutes",
                target: "FeatureSignals Cloud",
              },
              {
                scenario: "Full region failure",
                rpo: "< 1 hour (cross-region backup)",
                rto: "< 4 hours",
                target: "FeatureSignals Cloud",
              },
              {
                scenario: "Dedicated Cloud — instance failure",
                rpo: "< 5 minutes (WAL shipping)",
                rto: "< 15 minutes (auto-failover)",
                target: "Dedicated Cloud",
              },
              {
                scenario: "Self-hosted — complete rebuild",
                rpo: "Customer-defined backup schedule",
                rto: "Customer-driven",
                target: "Self-Hosted",
              },
            ].map((row) => (
              <tr
                key={row.scenario}
                className="border-b border-[var(--signal-border-default)] last:border-b-0"
              >
                <td className="px-4 py-3 font-medium text-[var(--signal-fg-primary)]">
                  {row.scenario}
                </td>
                <td className="px-4 py-3 text-[var(--signal-fg-secondary)]">{row.rpo}</td>
                <td className="px-4 py-3 text-[var(--signal-fg-secondary)]">{row.rto}</td>
                <td className="px-4 py-3 text-[var(--signal-fg-secondary)]">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)]">
                    {row.target}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Backup Strategy */}
      <SectionHeading>Backup Strategy</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        FeatureSignals employs a layered backup strategy to meet the RPO targets:
      </p>
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        {[
          {
            icon: Database,
            title: "PostgreSQL WAL Archiving",
            description:
              "Continuous Write-Ahead Log (WAL) archiving to cloud object storage (S3-compatible). Point-in-time recovery with 5-minute granularity. WAL segments are shipped every 60 seconds or when they reach 16 MB.",
          },
          {
            icon: HardDrive,
            title: "Daily Full Backups",
            description:
              "Full pg_dump backups taken daily at 03:00 UTC during low-traffic window. Encrypted at rest with AES-256. Retained for 30 days. Stored in a separate region from the primary database.",
          },
          {
            icon: Globe,
            title: "Cross-Region Replication",
            description:
              "Backups replicated to a secondary cloud region within 1 hour. For Dedicated Cloud, customers can configure an additional replication target in their own object storage account.",
          },
          {
            icon: Shield,
            title: "Immutable Backups",
            description:
              "Backups stored with object lock (WORM — write once, read many) for 7 days. This protects against ransomware and accidental deletion. Compliance mode prevents even root accounts from deleting locked backups.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="p-4 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] shadow-[var(--signal-shadow-sm)]"
          >
            <div className="flex items-start gap-3">
              <item.icon
                size={18}
                className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0"
              />
              <div>
                <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
                  {item.title}
                </h3>
                <p className="text-sm text-[var(--signal-fg-secondary)] leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Restore Procedures */}
      <SectionHeading>Restore Procedures</SectionHeading>

      <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mt-6 mb-3">
        1. Database Restore from Backup
      </h3>
      <ol className="list-decimal pl-6 space-y-2 text-[var(--signal-fg-primary)] mb-6">
        <li>Provision a new PostgreSQL instance (same version as backup).</li>
        <li>Download the latest daily backup from object storage.</li>
        <li>Restore with <InlineCode>pg_restore</InlineCode> to the new instance.</li>
        <li>Apply WAL segments forward to the desired point-in-time.</li>
        <li>Update DNS or connection strings to point to the new instance.</li>
        <li>Verify flag evaluations return expected results from a test SDK.</li>
      </ol>

      <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mt-6 mb-3">
        2. Full Stack Recovery
      </h3>
      <ol className="list-decimal pl-6 space-y-2 text-[var(--signal-fg-primary)] mb-6">
        <li>Provision new compute instances in the target region.</li>
        <li>Restore PostgreSQL database (follow procedure above).</li>
        <li>Deploy the latest FeatureSignals release via CI/CD or Helm chart.</li>
        <li>Populate Redis cache by restarting the server (auto-warms from database).</li>
        <li>Verify health endpoints: <InlineCode>GET /health</InlineCode> and <InlineCode>GET /ready</InlineCode>.</li>
        <li>Run the integration test suite against the restored environment.</li>
        <li>Switch DNS or load balancer traffic to the new stack.</li>
      </ol>

      {/* Regional Failover */}
      <SectionHeading>Regional Failover</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        FeatureSignals Cloud uses active-passive regional failover for disaster recovery:
      </p>
      <ul className="list-disc pl-6 space-y-2 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>Primary region:</strong> All traffic served from the primary cloud region.
          Database is the source of truth.
        </li>
        <li>
          <strong>Standby region:</strong> Infrastructure pre-provisioned (compute, database
          instance, object storage). Database restored from the latest cross-region backup.
          Not serving traffic in normal operation.
        </li>
        <li>
          <strong>Failover trigger:</strong> Manual decision by the on-call engineer after
          confirming the primary region is unrecoverable within RTO. Failover is not automatic
          to prevent split-brain scenarios.
        </li>
        <li>
          <strong>DNS cutover:</strong> Update DNS records to point to the standby region.
          TTL is set to 60 seconds to allow fast propagation.
        </li>
      </ul>

      {/* Testing DR */}
      <SectionHeading>Testing Disaster Recovery</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        DR procedures are only as good as their last test. We run the following DR tests
        on a regular cadence:
      </p>
      <div className="overflow-x-auto border border-[var(--signal-border-default)] rounded-lg shadow-[var(--signal-shadow-sm)] mb-8">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)]">
              <th className="px-4 py-3 font-semibold text-[var(--signal-fg-primary)]">Test Type</th>
              <th className="px-4 py-3 font-semibold text-[var(--signal-fg-primary)]">Frequency</th>
              <th className="px-4 py-3 font-semibold text-[var(--signal-fg-primary)]">Scope</th>
            </tr>
          </thead>
          <tbody>
            {[
              {
                test: "Backup verification",
                freq: "Weekly (automated)",
                scope: "Verify latest backup is restorable. Checksum validation.",
              },
              {
                test: "Tabletop exercise",
                freq: "Monthly",
                scope: "Walk through DR procedures with the engineering team. No actual failover.",
              },
              {
                test: "Database restore drill",
                freq: "Quarterly",
                scope: "Restore database from backup in an isolated environment. Run integration tests.",
              },
              {
                test: "Full regional failover",
                freq: "Biannually",
                scope: "Complete failover to standby region. Serve production traffic for 24 hours. Fail back.",
              },
            ].map((row) => (
              <tr
                key={row.test}
                className="border-b border-[var(--signal-border-default)] last:border-b-0"
              >
                <td className="px-4 py-3 font-medium text-[var(--signal-fg-primary)]">
                  {row.test}
                </td>
                <td className="px-4 py-3 text-[var(--signal-fg-secondary)]">{row.freq}</td>
                <td className="px-4 py-3 text-[var(--signal-fg-secondary)]">{row.scope}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Self-Hosted Guidance */}
      <SectionHeading>Self-Hosted DR Guidance</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        If you&apos;re running FeatureSignals self-hosted, you are responsible for your own
        DR plan. Here&apos;s what we recommend:
      </p>
      <ul className="list-disc pl-6 space-y-2 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>Automate PostgreSQL backups</strong> — Use{" "}
          <InlineCode>pg_dump</InlineCode> or your cloud provider&apos;s managed backup
          service. Schedule daily full backups with WAL archiving for PITR.
        </li>
        <li>
          <strong>Store backups off-site</strong> — Replicate backups to a different
          region, cloud provider, or on-premises location.
        </li>
        <li>
          <strong>Document your restore procedure</strong> — Write down the exact
          steps. The person restoring at 3 AM may not be the person who set it up.
        </li>
        <li>
          <strong>Test regularly</strong> — Restore from backup into a staging
          environment quarterly. A backup you haven&apos;t tested is not a backup.
        </li>
        <li>
          <strong>Monitor backup health</strong> — Alert if backups fail, if WAL
          shipping lags, or if backup storage is approaching capacity.
        </li>
      </ul>

      <Callout variant="info">
        For Dedicated Cloud customers, DR is configured as part of onboarding. Your
        solutions engineer will work with you to define RPO/RTO targets, configure
        cross-region replication, and schedule the first DR test within 30 days of go-live.
      </Callout>

      {/* Learn More */}
      <SectionHeading>Learn More</SectionHeading>
      <ul className="space-y-2">
        {[
          { label: "Incident Runbook", href: "/docs/operations/incident-runbook" },
          { label: "Architecture Overview", href: "/docs/architecture/overview" },
          { label: "Deployment Guide", href: "/docs/deployment/docker-compose" },
          { label: "Security & Compliance", href: "/docs/compliance/security-overview" },
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
