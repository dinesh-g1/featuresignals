import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle,
  Building,
  Shield,
  Users,
  Key,
  ClipboardCheck,
  ArrowRight,
} from "lucide-react";
import Callout from "@/components/docs/Callout";

export const metadata: Metadata = {
  title: "Enterprise Onboarding",
  description:
    "Onboarding guide for enterprise customers — SSO setup, organization structure, team provisioning, security review, and go-live checklist.",
};

const checklistItems = [
  {
    phase: "Week 1: Setup & Configuration",
    tasks: [
      "Create your FeatureSignals Enterprise organization",
      "Configure SAML SSO with your identity provider (Okta, Azure AD, Google Workspace, etc.)",
      "Set up SCIM provisioning for automated user lifecycle management",
      "Define your organization structure — projects, environments, and naming conventions",
      "Configure IP allowlisting to restrict dashboard and API access",
    ],
  },
  {
    phase: "Week 2: Integrations & Security",
    tasks: [
      "Create custom IAM roles matching your team's permission model",
      "Set up audit log export to your SIEM or data warehouse",
      "Configure webhook endpoints for flag change notifications",
      "Complete security questionnaire and review shared responsibility model",
      "Integrate SDKs into your application stack (one environment at a time)",
    ],
  },
  {
    phase: "Week 3: Migration & Training",
    tasks: [
      "Migrate existing flags from your current provider or homegrown solution",
      "Set up Terraform/Pulumi/Ansible for IaC flag management",
      "Train your engineering team on flag lifecycle best practices",
      "Configure the AI Janitor for automatic stale flag detection",
      "Create your first percentage rollout targeting rule",
    ],
  },
  {
    phase: "Week 4: Go-Live & Handoff",
    tasks: [
      "Run the production readiness checklist (see below)",
      "Schedule a joint go-live war room with FeatureSignals support",
      "Verify monitoring dashboards and alerting thresholds",
      "Document your internal flag management runbook",
      "Quarterly business review scheduled with your solutions engineer",
    ],
  },
];

const goLiveChecklist = [
  "All SAML/SCIM users can successfully authenticate",
  "IP allowlisting is enabled and verified from an external IP",
  "Custom IAM roles are assigned and tested by each team",
  "Audit logs are flowing to your SIEM",
  "SDKs are returning correct flag evaluations in staging",
  "At least one percentage rollout has been tested end-to-end",
  "Rollback procedure has been documented and practiced",
  "On-call rotation is aware of FeatureSignals escalation path",
  "Production flag change notifications are reaching the right Slack channel",
  "Backup admin account (non-SSO) exists for emergency break-glass access",
];

export default function EnterpriseOnboardingPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        Enterprise Onboarding
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        Your guided path to running FeatureSignals Enterprise in production. This 4-week
        onboarding plan covers SSO setup, organization structure, team provisioning, security
        review, and go-live — with a dedicated solutions engineer supporting you at every step.
      </p>

      <Callout variant="info" title="Your Solutions Engineer">
        Every Enterprise customer is paired with a named solutions engineer who knows your
        stack, your compliance requirements, and your timeline. They&apos;re available via a
        dedicated Slack channel with a 1-hour response SLA for P1 issues. You are never alone
        in this process.
      </Callout>

      {/* Organization Structure */}
      <SectionHeading>Organization Structure</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Before creating flags, define your organization&apos;s structure. FeatureSignals uses a
        hierarchical model that maps naturally to how engineering teams work:
      </p>
      <div className="p-5 mb-6 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)] font-mono text-xs leading-relaxed text-[var(--signal-fg-primary)] overflow-x-auto">
        <pre className="whitespace-pre">
{`Organization (your company)
├── Project: webapp
│   ├── Environment: development
│   ├── Environment: staging
│   └── Environment: production
├── Project: mobile-app
│   ├── Environment: development
│   └── Environment: production
└── Project: backend-services
    ├── Environment: staging
    └── Environment: production`}
        </pre>
      </div>
      <ul className="list-disc pl-6 space-y-2 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>Organization</strong> — Top-level tenant boundary. Billing, SSO, and
          global settings live here.
        </li>
        <li>
          <strong>Project</strong> — Maps to an application or service. Flags and segments
          are scoped to a project.
        </li>
        <li>
          <strong>Environment</strong> — Development, staging, production, or custom.
          Flag values can differ per environment.
        </li>
      </ul>

      {/* SSO Setup */}
      <SectionHeading>SSO Setup</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        FeatureSignals supports SAML 2.0 for single sign-on. Here&apos;s the typical setup flow:
      </p>
      <ol className="list-decimal pl-6 space-y-3 text-[var(--signal-fg-primary)] mb-6">
        <li>
          <strong>Initiate setup</strong> — From FlagEngine, navigate to{" "}
          <InlineCode>Settings &rarr; Organization &rarr; SSO</InlineCode> and click
          &ldquo;Configure SAML.&rdquo;
        </li>
        <li>
          <strong>Exchange metadata</strong> — Provide your IdP&apos;s SAML metadata XML.
          FeatureSignals returns its SP metadata for your IdP configuration.
        </li>
        <li>
          <strong>Map attributes</strong> — Map SAML assertions (email, name, groups)
          to FeatureSignals user attributes.
        </li>
        <li>
          <strong>Test</strong> — Use the test mode to verify authentication before
          enforcing SSO for all users.
        </li>
        <li>
          <strong>Enforce</strong> — Once verified, enable SSO enforcement. Existing
          password-based users are migrated to SSO authentication.
        </li>
      </ol>

      {/* SCIM */}
      <SectionHeading>SCIM Provisioning</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        SCIM 2.0 automates user provisioning and deprovisioning. When someone joins your team,
        they get FeatureSignals access automatically. When they leave, access is revoked across
        all systems:
      </p>
      <ul className="list-disc pl-6 space-y-2 text-[var(--signal-fg-primary)] mb-6">
        <li>Create users in your IdP &rarr; automatically provisioned in FeatureSignals</li>
        <li>Add users to IdP groups &rarr; automatically assigned FeatureSignals roles</li>
        <li>Remove users from IdP &rarr; automatically deactivated in FeatureSignals</li>
        <li>Supported IdPs: Okta, Azure AD, OneLogin, JumpCloud, and any SCIM 2.0-compatible provider</li>
      </ul>

      {/* 4-Week Plan */}
      <SectionHeading>4-Week Onboarding Plan</SectionHeading>
      {checklistItems.map((phase) => (
        <div key={phase.phase} className="mb-6">
          <h3 className="text-base font-semibold text-[var(--signal-fg-primary)] mb-3 flex items-center gap-2">
            <Building size={16} className="text-[var(--signal-fg-accent)]" />
            {phase.phase}
          </h3>
          <ul className="space-y-2 ml-4">
            {phase.tasks.map((task) => (
              <li
                key={task}
                className="flex items-start gap-2.5 text-sm text-[var(--signal-fg-primary)]"
              >
                <CheckCircle
                  size={16}
                  className="text-[var(--signal-fg-success)] mt-0.5 shrink-0"
                />
                <span>{task}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/* Go-Live Checklist */}
      <SectionHeading>Go-Live Checklist</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        Before flipping the switch in production, verify every item on this list:
      </p>
      <div className="p-5 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] shadow-[var(--signal-shadow-sm)] mb-6">
        {goLiveChecklist.map((item, idx) => (
          <div
            key={item}
            className="flex items-start gap-3 py-2 border-b border-[var(--signal-border-default)] last:border-b-0 last:pb-0 first:pt-0"
          >
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--signal-bg-accent-muted)] text-xs font-bold text-[var(--signal-fg-accent)] shrink-0 mt-0.5">
              {idx + 1}
            </span>
            <span className="text-sm text-[var(--signal-fg-primary)]">{item}</span>
          </div>
        ))}
      </div>

      <Callout variant="warning">
        Keep a non-SSO backup admin account. If your IdP experiences an outage, you still
        need access to FeatureSignals to manage flags during the incident. Store these
        credentials in your company&apos;s emergency access vault.
      </Callout>

      {/* Learn More */}
      <SectionHeading>Learn More</SectionHeading>
      <ul className="space-y-2">
        {[
          { label: "Enterprise Overview", href: "/docs/enterprise/overview" },
          { label: "Security & Compliance", href: "/docs/compliance/security-overview" },
          { label: "Architecture Overview", href: "/docs/architecture/overview" },
          { label: "SDK Integration Guide", href: "/docs/sdks/overview" },
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
