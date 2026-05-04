import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, ShieldCheckIcon } from "@primer/octicons-react";

export const metadata: Metadata = {
  title: "Security Overview",
  description:
    "FeatureSignals security controls overview including encryption, authentication, access control, and infrastructure hardening.",
};

export default function SecurityOverviewPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--fgColor-default)] mb-3"
      >
        Security Overview
      </h1>
      <p className="text-sm text-[var(--fgColor-muted)] mb-6">
        <em>Last updated: April 2026</em>
      </p>
      <p className="text-lg text-[var(--fgColor-muted)] mb-8 leading-relaxed">
        FeatureSignals is designed as critical infrastructure for your
        applications. This document provides a comprehensive overview of the
        security controls built into the product.
      </p>

      {/* Info callout */}
      <div className="p-4 mb-8 rounded-lg border border-[var(--borderColor-accent-muted)] bg-[var(--bgColor-accent-muted)]">
        <div className="flex items-start gap-3">
          <ShieldCheckIcon
            size={18}
            className="text-[var(--fgColor-accent)] mt-0.5 shrink-0"
          />
          <div>
            <p className="text-sm text-[var(--fgColor-muted)]">
              This document describes technical security controls that are
              implemented in FeatureSignals. Where we reference compliance
              frameworks (SOC 2, GDPR, HIPAA, ISO 27001), we describe how our
              controls map to those framework requirements. This does not
              constitute a formal certification unless explicitly stated.
            </p>
          </div>
        </div>
      </div>

      {/* Architecture Security */}
      <SectionHeading>Architecture Security</SectionHeading>

      <h3 className="text-base font-semibold text-[var(--fgColor-default)] mt-6 mb-3">
        Hexagonal Architecture
      </h3>
      <p className="text-[var(--fgColor-default)] mb-4">
        FeatureSignals uses a hexagonal (ports &amp; adapters) architecture that
        enforces strict separation of concerns:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--fgColor-default)] mb-4">
        <li>
          <strong>Domain layer</strong>: Pure business logic with zero
          infrastructure dependencies
        </li>
        <li>
          <strong>Handlers</strong>: HTTP adapter — validates input, delegates
          to domain
        </li>
        <li>
          <strong>Store</strong>: Database adapter — implements persistence
          contracts
        </li>
        <li>
          <strong>Evaluator</strong>: Stateless flag evaluation engine
        </li>
      </ul>
      <p className="text-[var(--fgColor-default)] mb-4">
        This architecture prevents common vulnerability classes:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--fgColor-muted)] mb-6">
        <li>
          SQL injection is impossible in domain/handler code (no SQL there)
        </li>
        <li>Business logic cannot be bypassed via infrastructure shortcuts</li>
        <li>Each layer can be independently tested and audited</li>
      </ul>

      <h3 className="text-base font-semibold text-[var(--fgColor-default)] mt-6 mb-3">
        Multi-Tenancy Isolation
      </h3>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Mechanism</Th>
            <Th>Description</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>Middleware enforcement</Td>
            <Td>
              Organization ID extracted from JWT, injected into context, checked
              on every request
            </Td>
          </Tr>
          <Tr>
            <Td>Query scoping</Td>
            <Td>
              All database queries include <InlineCode>org_id</InlineCode> in
              WHERE clause
            </Td>
          </Tr>
          <Tr>
            <Td>404 for cross-org access</Td>
            <Td>
              Returns &quot;not found&quot; (not &quot;forbidden&quot;) to
              prevent entity existence leakage
            </Td>
          </Tr>
        </tbody>
      </SimpleTable>

      {/* Authentication & Authorization */}
      <SectionHeading>Authentication &amp; Authorization</SectionHeading>

      <h3 className="text-base font-semibold text-[var(--fgColor-default)] mt-6 mb-3">
        Authentication Methods
      </h3>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Method</Th>
            <Th>Use Case</Th>
            <Th>Implementation</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>JWT (access token)</Td>
            <Td>Flag Engine / Management API</Td>
            <Td>1-hour TTL, refresh token rotation (7 days)</Td>
          </Tr>
          <Tr>
            <Td>API Key</Td>
            <Td>Server SDKs / Evaluation API</Td>
            <Td>SHA-256 hashed, shown once at creation</Td>
          </Tr>
          <Tr>
            <Td>SSO (SAML 2.0)</Td>
            <Td>Enterprise identity provider</Td>
            <Td>Okta, Azure AD, OneLogin, etc.</Td>
          </Tr>
          <Tr>
            <Td>SSO (OIDC)</Td>
            <Td>Enterprise identity provider</Td>
            <Td>Any OIDC-compliant IdP</Td>
          </Tr>
          <Tr>
            <Td>MFA (TOTP)</Td>
            <Td>Second factor</Td>
            <Td>RFC 6238 TOTP, compatible with Google Authenticator, Authy</Td>
          </Tr>
        </tbody>
      </SimpleTable>

      <h3 className="text-base font-semibold text-[var(--fgColor-default)] mt-8 mb-3">
        Authorization Model
      </h3>
      <p className="text-[var(--fgColor-default)] mb-4">
        Four built-in roles with escalating privileges:
      </p>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Permission</Th>
            <Th>Viewer</Th>
            <Th>Developer</Th>
            <Th>Admin</Th>
            <Th>Owner</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>Read flags, projects, segments</Td>
            <Td>
              <Check />
            </Td>
            <Td>
              <Check />
            </Td>
            <Td>
              <Check />
            </Td>
            <Td>
              <Check />
            </Td>
          </Tr>
          <Tr>
            <Td>Create/edit flags</Td>
            <Td>
              <Cross />
            </Td>
            <Td>
              <Check />
            </Td>
            <Td>
              <Check />
            </Td>
            <Td>
              <Check />
            </Td>
          </Tr>
          <Tr>
            <Td>Toggle flags (production)</Td>
            <Td>
              <Cross />
            </Td>
            <Td>Per-env</Td>
            <Td>
              <Check />
            </Td>
            <Td>
              <Check />
            </Td>
          </Tr>
          <Tr>
            <Td>Manage team members</Td>
            <Td>
              <Cross />
            </Td>
            <Td>
              <Cross />
            </Td>
            <Td>
              <Check />
            </Td>
            <Td>
              <Check />
            </Td>
          </Tr>
          <Tr>
            <Td>Billing, API keys, SSO</Td>
            <Td>
              <Cross />
            </Td>
            <Td>
              <Cross />
            </Td>
            <Td>
              <Cross />
            </Td>
            <Td>
              <Check />
            </Td>
          </Tr>
        </tbody>
      </SimpleTable>

      {/* Data Protection */}
      <SectionHeading>Data Protection</SectionHeading>

      <h3 className="text-base font-semibold text-[var(--fgColor-default)] mt-6 mb-3">
        Encryption
      </h3>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Layer</Th>
            <Th>Standard</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>In transit</Td>
            <Td>TLS 1.3 (minimum TLS 1.2)</Td>
          </Tr>
          <Tr>
            <Td>At rest</Td>
            <Td>AES-256 (database, backups)</Td>
          </Tr>
          <Tr>
            <Td>Passwords</Td>
            <Td>bcrypt (cost factor 12)</Td>
          </Tr>
          <Tr>
            <Td>API keys</Td>
            <Td>SHA-256 one-way hash</Td>
          </Tr>
          <Tr>
            <Td>Audit integrity</Td>
            <Td>SHA-256 chain hashing</Td>
          </Tr>
        </tbody>
      </SimpleTable>

      <h3 className="text-base font-semibold text-[var(--fgColor-default)] mt-8 mb-3">
        Input Validation
      </h3>
      <ul className="list-disc pl-6 space-y-1 text-[var(--fgColor-default)] mb-6">
        <li>
          All JSON decoders use <InlineCode>DisallowUnknownFields()</InlineCode>{" "}
          to prevent mass-assignment
        </li>
        <li>Request body limited to 1 MB</li>
        <li>SQL queries use parameterized statements exclusively</li>
        <li>User input never interpolated into queries</li>
      </ul>

      <h3 className="text-base font-semibold text-[var(--fgColor-default)] mt-8 mb-3">
        Security Headers
      </h3>
      <p className="text-[var(--fgColor-default)] mb-3">
        All responses include:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--fgColor-default)] mb-6">
        <li>
          <InlineCode>Content-Security-Policy</InlineCode>
        </li>
        <li>
          <InlineCode>Strict-Transport-Security</InlineCode> (HSTS, max-age 1
          year, includeSubDomains)
        </li>
        <li>
          <InlineCode>X-Content-Type-Options: nosniff</InlineCode>
        </li>
        <li>
          <InlineCode>X-Frame-Options: DENY</InlineCode>
        </li>
        <li>
          <InlineCode>
            Referrer-Policy: strict-origin-when-cross-origin
          </InlineCode>
        </li>
        <li>
          <InlineCode>Permissions-Policy</InlineCode> (restricted camera,
          microphone, geolocation, payment)
        </li>
        <li>
          <InlineCode>Cross-Origin-Opener-Policy: same-origin</InlineCode>
        </li>
        <li>
          <InlineCode>Cross-Origin-Resource-Policy: same-origin</InlineCode>
        </li>
        <li>
          <InlineCode>Cross-Origin-Embedder-Policy: require-corp</InlineCode>
        </li>
      </ul>

      {/* Network Security */}
      <SectionHeading>Network Security</SectionHeading>

      <h3 className="text-base font-semibold text-[var(--fgColor-default)] mt-6 mb-3">
        Rate Limiting
      </h3>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Endpoint Type</Th>
            <Th>Limit</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>Authentication (login, register)</Td>
            <Td>20 requests/minute</Td>
          </Tr>
          <Tr>
            <Td>Management API</Td>
            <Td>100 requests/minute</Td>
          </Tr>
          <Tr>
            <Td>Evaluation API</Td>
            <Td>1,000 requests/minute</Td>
          </Tr>
        </tbody>
      </SimpleTable>

      <h3 className="text-base font-semibold text-[var(--fgColor-default)] mt-8 mb-3">
        IP Allowlisting (Enterprise)
      </h3>
      <p className="text-[var(--fgColor-default)] mb-6">
        Restrict management API access to specific IP ranges (CIDR notation).
        The evaluation API is not restricted to ensure SDK connectivity.
      </p>

      {/* Audit & Monitoring */}
      <SectionHeading>Audit &amp; Monitoring</SectionHeading>

      <h3 className="text-base font-semibold text-[var(--fgColor-default)] mt-6 mb-3">
        Audit Trail
      </h3>
      <p className="text-[var(--fgColor-default)] mb-3">
        Every mutating operation is recorded with:
      </p>
      <ul className="list-disc pl-6 space-y-1 text-[var(--fgColor-default)] mb-6">
        <li>Timestamp (UTC, RFC 3339)</li>
        <li>Actor identity (user ID, email)</li>
        <li>Action name and resource type/ID</li>
        <li>Before/after state for modifications</li>
        <li>Client IP address and user agent</li>
        <li>SHA-256 integrity hash (chain-linked to previous entry)</li>
      </ul>

      <h3 className="text-base font-semibold text-[var(--fgColor-default)] mt-8 mb-3">
        Structured Logging
      </h3>
      <ul className="list-disc pl-6 space-y-1 text-[var(--fgColor-default)] mb-6">
        <li>JSON-formatted logs to stdout (12-factor compliant)</li>
        <li>Request ID correlation across all log entries</li>
        <li>Organization/tenant scoping on all log entries</li>
        <li>No secrets, tokens, or PII in log output</li>
      </ul>

      {/* Responsible Disclosure */}
      <SectionHeading>Responsible Disclosure</SectionHeading>
      <p className="text-[var(--fgColor-default)] mb-6">
        Report vulnerabilities to{" "}
        <a
          href="/contact?reason=security"
          className="text-[var(--fgColor-accent)] hover:underline font-medium"
        >
          security@featuresignals.com
        </a>
        . We respond within 48 hours and coordinate disclosure timelines with
        reporters.
      </p>

      {/* Next Steps */}
      <SectionHeading>Next Steps</SectionHeading>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { label: "GDPR Compliance", href: "/docs/compliance/gdpr" },
          { label: "SOC 2", href: "/docs/compliance/soc-2" },
          { label: "HIPAA", href: "/docs/compliance/hipaa" },
          {
            label: "Self-Hosted Security",
            href: "/docs/deployment/self-hosting",
          },
        ].map((step) => (
          <Link
            key={step.href}
            href={step.href}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-[var(--fgColor-accent)] hover:bg-[var(--bgColor-accent-muted)] transition-colors font-medium"
          >
            <ArrowRightIcon size={14} />
            <span>{step.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-semibold text-[var(--fgColor-default)] mt-10 mb-4 pb-2 border-b border-[var(--borderColor-default)]">
      {children}
    </h2>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 text-[0.85em] font-mono rounded bg-[var(--bgColor-inset)] text-[var(--fgColor-default)] border border-[var(--borderColor-default)]">
      {children}
    </code>
  );
}

function SimpleTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto border border-[var(--borderColor-default)] rounded-lg mb-6">
      <table className="w-full text-sm text-left">{children}</table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 font-semibold bg-[var(--bgColor-inset)] border-b border-[var(--borderColor-default)] text-[var(--fgColor-default)]">
      {children}
    </th>
  );
}

function Tr({ children }: { children: React.ReactNode }) {
  return (
    <tr className="border-b border-[var(--borderColor-default)] last:border-b-0">
      {children}
    </tr>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-4 py-2.5 text-[var(--fgColor-default)]">{children}</td>
  );
}

function Check() {
  return (
    <span className="text-[var(--fgColor-success)] font-bold" aria-label="Yes">
      ✓
    </span>
  );
}

function Cross() {
  return (
    <span className="text-[var(--fgColor-muted)]" aria-label="No">
      —
    </span>
  );
}
