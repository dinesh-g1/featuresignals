import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  Phone,
  RotateCcw,
  FileText,
  ArrowRight,
} from "lucide-react";
import Callout from "@/components/docs/Callout";

export const metadata: Metadata = {
  title: "Incident Runbook",
  description:
    "Production incident response procedures — severity levels, escalation paths, rollback procedures, communication templates, and post-mortem process.",
};

const severityLevels = [
  {
    level: "P0 — Critical",
    color: "danger" as const,
    description: "FeatureSignals is completely unavailable. Flag evaluations are failing for all customers. Data loss or security breach in progress.",
    response: "Immediate. On-call engineer acknowledges within 5 minutes. War room initiated within 15 minutes.",
    escalation: "CTO notified immediately. CEO notified within 30 minutes if unresolved.",
  },
  {
    level: "P1 — High",
    color: "danger" as const,
    description: "Major feature degraded. Evaluation latency exceeds 5s p99. SDKs returning stale data. Single customer experiencing complete outage on Dedicated Cloud.",
    response: "On-call engineer acknowledges within 15 minutes. Investigation begins within 30 minutes.",
    escalation: "Engineering manager notified within 1 hour. VP Engineering if unresolved after 4 hours.",
  },
  {
    level: "P2 — Medium",
    color: "warning" as const,
    description: "Partial degradation. Dashboard UI slow but functional. Webhook deliveries delayed. Non-critical API endpoints returning errors.",
    response: "Acknowledged within 1 hour. Fix deployed within next business day.",
    escalation: "Engineering manager notified within 4 hours.",
  },
  {
    level: "P3 — Low",
    color: "info" as const,
    description: "Minor issues. Cosmetic UI bugs. Documentation errors. Non-production environment issues. Feature requests misclassified as bugs.",
    response: "Triaged within 1 business day. Scheduled for next sprint or backlog.",
    escalation: "No escalation required. Tracked in issue tracker.",
  },
];

const rollbackSteps = [
  "Identify the last known-good deployment from the deployment history in your CI/CD pipeline.",
  "Redeploy the previous version. One-click rollback is available in the Ops Portal.",
  "Verify health endpoints return 200 and evaluation latency returns to baseline.",
  "Confirm with affected customers that service is restored.",
  "Preserve all logs, metrics, and traces from the incident window for post-mortem analysis.",
];

const communicationTemplate = `Subject: [INCIDENT] FeatureSignals {SEVERITY} — {BRIEF_TITLE}

Status: {INVESTIGATING | MONITORING | RESOLVED}
Incident ID: {INCIDENT_ID}
Start Time: {START_TIME_UTC}
Impact: {DESCRIPTION_OF_IMPACT}

Current Status:
{WHAT_WE_KNOW_AND_WHAT_WE'RE_DOING}

Next Update: {EXPECTED_UPDATE_TIME}

FeatureSignals Incident Response Team`;

export default function IncidentRunbookPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        Incident Runbook
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        Production incident response procedures for FeatureSignals. Severity classification,
        escalation paths, rollback procedures, communication templates, and the blameless
        post-mortem process — everything you need when things go sideways at 3 AM.
      </p>

      <Callout variant="warning">
        This runbook covers both FeatureSignals-hosted incidents and guidance for self-hosted
        customers responding to their own deployments. For self-hosted deployments, you own
        the response process — we provide tools and support.
      </Callout>

      {/* Severity Levels */}
      <SectionHeading>Severity Levels</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Incidents are classified by scope, impact, and urgency. Use these definitions to
        triage quickly and consistently:
      </p>

      <div className="space-y-4 mb-8">
        {severityLevels.map((sev) => (
          <Callout key={sev.level} variant={sev.color} title={sev.level}>
            <div className="space-y-2">
              <div>
                <strong className="text-[var(--signal-fg-primary)]">Definition:</strong>{" "}
                {sev.description}
              </div>
              <div>
                <strong className="text-[var(--signal-fg-primary)]">Response:</strong>{" "}
                {sev.response}
              </div>
              <div>
                <strong className="text-[var(--signal-fg-primary)]">Escalation:</strong>{" "}
                {sev.escalation}
              </div>
            </div>
          </Callout>
        ))}
      </div>

      {/* First Response */}
      <SectionHeading>First Response Checklist</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        When an alert fires or an incident is reported, the first responder runs this checklist:
      </p>
      <ol className="list-decimal pl-6 space-y-3 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>Acknowledge the alert</strong> — Silence the pager. Acknowledge in the
          incident Slack channel. This buys you time to think.
        </li>
        <li>
          <strong>Assess blast radius</strong> — How many customers are affected? Which
          services? Is this a partial or complete outage?
        </li>
        <li>
          <strong>Declare severity</strong> — Use the severity definitions above. Err on
          the side of over-classifying — you can downgrade later.
        </li>
        <li>
          <strong>Start the incident timer</strong> — Note the start time (UTC). This
          feeds SLA reporting.
        </li>
        <li>
          <strong>Open an incident channel</strong> — Create a dedicated Slack channel
          (#incident-{'{number}'}) or Zoom war room for P0/P1.
        </li>
        <li>
          <strong>Send initial communication</strong> — Use the template below to notify
          affected customers and internal stakeholders.
        </li>
        <li>
          <strong>Begin investigation</strong> — Check dashboards (SigNoz), recent deploys,
          database metrics, and error logs.
        </li>
      </ol>

      {/* Rollback */}
      <SectionHeading>Rollback Procedures</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        If a recent deployment caused the incident, rollback is your fastest path to
        recovery. Don&apos;t debug in production — roll back first, investigate later.
      </p>
      <ol className="list-decimal pl-6 space-y-2 text-[var(--signal-fg-primary)] mb-6">
        {rollbackSteps.map((step, idx) => (
          <li key={idx}>
            <strong>Step {idx + 1}:</strong> {step}
          </li>
        ))}
      </ol>

      <Callout variant="info" title="Ops Portal Rollback">
        For FeatureSignals Cloud and Dedicated Cloud, one-click rollback is available in the
        Ops Portal at{" "}
        <InlineCode>https://ops.featuresignals.com/deployments</InlineCode>. Select the
        deployment, click &ldquo;Rollback,&rdquo; and confirm. The platform handles canary
        traffic shifting and health verification automatically.
      </Callout>

      {/* Communication Template */}
      <SectionHeading>Communication Templates</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Consistent communication reduces panic. Use this template for all customer-facing
        incident updates:
      </p>
      <div className="p-5 mb-6 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)] font-mono text-xs leading-relaxed text-[var(--signal-fg-primary)] overflow-x-auto">
        <pre className="whitespace-pre-wrap">{communicationTemplate}</pre>
      </div>

      <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mt-6 mb-3">
        Status Update Cadence
      </h3>
      <div className="overflow-x-auto border border-[var(--signal-border-default)] rounded-lg shadow-[var(--signal-shadow-sm)] mb-6">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)]">
              <th className="px-4 py-3 font-semibold text-[var(--signal-fg-primary)]">Severity</th>
              <th className="px-4 py-3 font-semibold text-[var(--signal-fg-primary)]">Update Frequency</th>
              <th className="px-4 py-3 font-semibold text-[var(--signal-fg-primary)]">Channel</th>
            </tr>
          </thead>
          <tbody>
            {[
              { severity: "P0", freq: "Every 30 minutes", channel: "Status page + Slack + Email" },
              { severity: "P1", freq: "Every 1 hour", channel: "Status page + Slack" },
              { severity: "P2", freq: "Every 4 hours", channel: "Status page" },
              { severity: "P3", freq: "On resolution", channel: "Issue tracker" },
            ].map((row) => (
              <tr
                key={row.severity}
                className="border-b border-[var(--signal-border-default)] last:border-b-0"
              >
                <td className="px-4 py-3 font-semibold text-[var(--signal-fg-primary)]">
                  {row.severity}
                </td>
                <td className="px-4 py-3 text-[var(--signal-fg-secondary)]">{row.freq}</td>
                <td className="px-4 py-3 text-[var(--signal-fg-secondary)]">{row.channel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Post-Mortem */}
      <SectionHeading>Post-Mortem Process</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Every P0 and P1 incident requires a blameless post-mortem within 48 hours of
        resolution. The goal is understanding, not blame:
      </p>
      <ol className="list-decimal pl-6 space-y-3 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>Timeline</strong> — Construct a minute-by-minute timeline from alerts,
          logs, chat messages, and deployment records.
        </li>
        <li>
          <strong>Root cause</strong> — What specifically caused the incident? Use the
          5 Whys technique to trace back to process or systemic gaps.
        </li>
        <li>
          <strong>Impact assessment</strong> — Duration, affected customers, evaluation
          failures, SLA impact.
        </li>
        <li>
          <strong>What went well</strong> — Acknowledge effective detection, fast response,
          good communication. Celebrate smart decisions under pressure.
        </li>
        <li>
          <strong>What could be better</strong> — Detection gaps, unclear runbooks, tooling
          deficiencies, training needs.
        </li>
        <li>
          <strong>Action items</strong> — Specific, assigned, time-boxed remediation tasks.
          Each action item links to a GitHub issue.
        </li>
        <li>
          <strong>Review</strong> — Post-mortem presented at the next engineering all-hands.
          Action items tracked to completion.
        </li>
      </ol>

      {/* Learn More */}
      <SectionHeading>Learn More</SectionHeading>
      <ul className="space-y-2">
        {[
          { label: "Disaster Recovery Plan", href: "/docs/operations/disaster-recovery" },
          { label: "Architecture Overview", href: "/docs/architecture/overview" },
          { label: "Deployment Guide", href: "/docs/deployment/docker-compose" },
          { label: "Contact Support", href: "/contact" },
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
