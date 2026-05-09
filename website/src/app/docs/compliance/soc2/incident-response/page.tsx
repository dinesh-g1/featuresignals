import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, AlertTriangle, Search, Shield, Send, Wrench, FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "SOC 2 Incident Response",
  description:
    "Incident response procedures aligned with SOC 2 requirements — detection, containment, investigation, notification, and remediation.",
};

export default function Soc2IncidentResponsePage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        SOC 2 Incident Response
      </h1>
      <p className="text-sm text-[var(--signal-fg-secondary)] mb-4">
        Last updated: April 2026
      </p>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        SOC 2 CC7.4 requires documented incident response procedures.
        FeatureSignals maintains a comprehensive incident response program
        covering the full lifecycle — from detection through post-mortem — with
        defined severity levels, response SLAs, and communication protocols.
      </p>

      <div className="p-4 mb-8 rounded-lg border border-[var(--signal-border-accent-muted)] bg-[var(--signal-bg-accent-muted)]">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="text-[var(--signal-fg-accent)] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[var(--signal-fg-primary)] mb-1">
              Report a Security Incident
            </p>
            <p className="text-sm text-[var(--signal-fg-secondary)]">
              If you believe you&apos;ve discovered a security vulnerability or
              are experiencing a security incident, contact{" "}
              <a href="mailto:security@featuresignals.com" className="text-[var(--signal-fg-accent)] hover:underline font-medium">
                security@featuresignals.com
              </a>{" "}
              immediately. Do not file a public issue.
            </p>
          </div>
        </div>
      </div>

      {/* Severity Levels */}
      <SectionHeading>Incident Severity Levels</SectionHeading>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Severity</Th>
            <Th>Definition</Th>
            <Th>Acknowledgment</Th>
            <Th>Resolution Target</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>
              <span className="inline-flex items-center gap-1 font-bold text-[var(--signal-fg-error)]">
                P0
              </span>
            </Td>
            <Td>Complete service outage, data breach, or critical vulnerability under active exploit</Td>
            <Td>15 minutes</Td>
            <Td>4 hours</Td>
          </Tr>
          <Tr>
            <Td>
              <span className="inline-flex items-center gap-1 font-bold text-[var(--signal-fg-warning)]">
                P1
              </span>
            </Td>
            <Td>Major feature outage, significant degradation, or confirmed vulnerability with known exploit</Td>
            <Td>1 hour</Td>
            <Td>24 hours</Td>
          </Tr>
          <Tr>
            <Td>
              <span className="inline-flex items-center gap-1 font-bold text-[var(--signal-fg-accent)]">
                P2
              </span>
            </Td>
            <Td>Partial feature degradation, non-critical bug affecting multiple users</Td>
            <Td>4 hours</Td>
            <Td>5 business days</Td>
          </Tr>
          <Tr>
            <Td>
              <span className="text-[var(--signal-fg-secondary)] font-bold">
                P3
              </span>
            </Td>
            <Td>Minor issue affecting single user, cosmetic bug, or feature request</Td>
            <Td>1 business day</Td>
            <Td>Next release</Td>
          </Tr>
        </tbody>
      </SimpleTable>

      {/* Incident Lifecycle */}
      <SectionHeading>Incident Response Lifecycle</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Every incident follows a five-phase response lifecycle aligned with
        NIST SP 800-61 and SOC 2 CC7.3–CC7.5:
      </p>

      <div className="space-y-4 mb-8">
        {[
          {
            phase: 1,
            icon: Search,
            title: "Detection &amp; Triage",
            description:
              "Incidents are detected through automated monitoring (SigNoz alerts, health check failures, error rate spikes), customer reports, or security researcher disclosures. The on-call engineer triages within the acknowledgment SLA — assessing scope, impact, and severity.",
            actions: [
              "Acknowledge alert within SLA timeframe",
              "Assess whether this is a security incident or operational issue",
              "Assign severity level (P0–P3)",
              "Create incident channel (Slack) and incident document",
              "Notify on-call commander for P0/P1",
            ],
          },
          {
            phase: 2,
            icon: Shield,
            title: "Containment",
            description:
              "The immediate priority is stopping the bleeding. For security incidents, this may mean revoking compromised credentials, isolating affected systems, or blocking an attack vector. For operational incidents, this means stopping the cascade failure.",
            actions: [
              "Revoke compromised credentials or API keys immediately",
              "Isolate affected systems if necessary",
              "Apply WAF rules or rate limits to block attack traffic",
              "Fail over to standby if primary is compromised",
              "Preserve forensic evidence before making changes",
            ],
          },
          {
            phase: 3,
            icon: Search,
            title: "Investigation",
            description:
              "Root cause analysis begins in parallel with containment. The investigation team analyzes logs, audit trails, and system state to determine: what happened, when it started, what data was affected, and whether the attack vector is still open.",
            actions: [
              "Review audit logs, access logs, and system metrics",
              "Determine timeline — when did the incident begin?",
              "Identify affected data, systems, and customers",
              "Document findings in the incident document",
              "Preserve evidence with chain of custody",
            ],
          },
          {
            phase: 4,
            icon: Send,
            title: "Notification &amp; Communication",
            description:
              "Affected parties are notified according to regulatory requirements and contractual obligations. Internal stakeholders receive regular status updates. External communication is coordinated through a designated incident commander.",
            actions: [
              "Notify affected customers within regulatory timeframe (GDPR: 72 hours)",
              "Update status page within 30 minutes of confirmation",
              "Send internal status updates every hour for P0, every 4 hours for P1",
              "Coordinate external messaging with legal/comms",
              "File regulatory notifications if required (data breach, DORA)",
            ],
          },
          {
            phase: 5,
            icon: Wrench,
            title: "Remediation &amp; Recovery",
            description:
              "The root cause is fixed, systems are restored to normal operation, and verification confirms the fix is effective. For security incidents, additional hardening is applied to prevent recurrence.",
            actions: [
              "Deploy fix with verified effectiveness",
              "Rotate all secrets and credentials that may have been exposed",
              "Restore services and verify with health checks",
              "Update WAF rules and monitoring to detect similar attacks",
              "Close incident after 24 hours of stable operation",
            ],
          },
        ].map((stage) => (
          <div
            key={stage.phase}
            className="flex items-start gap-4 p-4 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] shadow-[var(--signal-shadow-sm)]"
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold select-none"
              style={{
                backgroundColor: "var(--signal-bg-accent-emphasis)",
                color: "var(--signal-fg-on-emphasis)",
              }}
              aria-hidden="true"
            >
              {stage.phase}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <stage.icon size={16} className="text-[var(--signal-fg-accent)]" />
                <p className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                  {stage.title}
                </p>
              </div>
              <p className="text-sm text-[var(--signal-fg-secondary)] mb-2">
                {stage.description}
              </p>
              <ul className="list-disc pl-5 space-y-0.5">
                {stage.actions.map((action) => (
                  <li key={action} className="text-xs text-[var(--signal-fg-secondary)]">
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Post-Mortem */}
      <SectionHeading>Post-Mortem Process</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Every P0 and P1 incident produces a blameless post-mortem within 48
        hours of resolution. The post-mortem document covers:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--signal-fg-primary)] mb-4">
        <li>
          <strong>Timeline:</strong> Minute-by-minute account from detection to
          resolution
        </li>
        <li>
          <strong>Root cause:</strong> The underlying cause, not just the
          trigger
        </li>
        <li>
          <strong>Impact assessment:</strong> Customers affected, data exposed,
          duration of impact
        </li>
        <li>
          <strong>What went well:</strong> Processes that helped contain or
          resolve quickly
        </li>
        <li>
          <strong>What went poorly:</strong> Gaps in detection, response, or
          communication
        </li>
        <li>
          <strong>Action items:</strong> Specific, assigned, time-bound
          remediation items with tracking
        </li>
      </ul>
      <p className="text-sm text-[var(--signal-fg-secondary)] mb-6">
        Post-mortems are shared internally with the engineering team and, when
        appropriate, published as public incident reports to build customer
        trust.
      </p>

      {/* SOC 2 Alignment */}
      <SectionHeading>SOC 2 Criteria Alignment</SectionHeading>
      <SimpleTable>
        <thead>
          <tr>
            <Th>SOC 2 Criteria</Th>
            <Th>Requirement</Th>
            <Th>How We Meet It</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>CC7.3</Td>
            <Td>Evaluate security events</Td>
            <Td>Automated alerting, on-call triage, severity classification</Td>
          </Tr>
          <Tr>
            <Td>CC7.4</Td>
            <Td>Respond to incidents</Td>
            <Td>Documented 5-phase lifecycle, defined SLAs, incident commander role</Td>
          </Tr>
          <Tr>
            <Td>CC7.5</Td>
            <Td>Recover from incidents</Td>
            <Td>Automated backup/restore, DR runbook, quarterly DR testing</Td>
          </Tr>
          <Tr>
            <Td>CC9.2</Td>
            <Td>Assess vendor risks</Td>
            <Td>Sub-processor incident notification requirements in DPAs</Td>
          </Tr>
        </tbody>
      </SimpleTable>

      {/* Contact */}
      <SectionHeading>Security Contact</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-6">
        For incident reporting, vulnerability disclosure, or security inquiries:{" "}
        <a
          href="mailto:security@featuresignals.com"
          className="text-[var(--signal-fg-accent)] hover:underline font-medium"
        >
          security@featuresignals.com
        </a>
      </p>

      {/* Next Steps */}
      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[
          { label: "SOC 2 Controls Matrix", href: "/docs/compliance/soc2/controls-matrix" },
          { label: "SOC 2 Evidence Collection", href: "/docs/compliance/soc2/evidence-collection" },
          { label: "DORA Compliance", href: "/docs/compliance/dora" },
          { label: "Security Overview", href: "/docs/compliance/security-overview" },
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

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-4 py-2.5 text-[var(--signal-fg-primary)]">{children}</td>
  );
}
