import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@primer/octicons-react";
import { CodeBlock } from "@/components/ui/code-editor";

export const metadata: Metadata = {
  title: "HIPAA Compliance",
  description:
    "How FeatureSignals approaches HIPAA compliance with technical safeguards for healthcare organizations.",
};

export default function HipaaPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--fgColor-default)] mb-3"
      >
        HIPAA Compliance
      </h1>
      <p className="text-sm text-[var(--fgColor-muted)] mb-4">
        Last updated: April 2026
      </p>
      <div className="p-4 mb-8 rounded-lg border border-[var(--borderColor-accent-muted)] bg-[var(--bgColor-accent-muted)]">
        <p className="text-sm text-[var(--fgColor-muted)]">
          This document describes the technical controls FeatureSignals
          implements that map to HIPAA requirements. Organizations requiring
          HIPAA compliance should evaluate these controls against their specific
          requirements.
        </p>
      </div>

      <SectionHeading>Business Associate Agreement (BAA)</SectionHeading>
      <p className="text-[var(--fgColor-default)] mb-4">
        Enterprise customers requiring HIPAA compliance must execute a BAA
        before processing PHI. Contact{" "}
        <a
          href="/contact?reason=sales"
          className="text-[var(--fgColor-accent)] hover:underline"
        >
          sales@featuresignals.com
        </a>{" "}
        to request one.
      </p>

      <SectionHeading>Technical Safeguards (§164.312)</SectionHeading>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Requirement</Th>
            <Th>Implementation</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>Access Control</Td>
            <Td>
              UUID-based user IDs, JWT expiration (1h), AES-256 at rest, TLS 1.3
            </Td>
          </Tr>
          <Tr>
            <Td>Audit Controls</Td>
            <Td>
              Every action logged with actor/IP/timestamp, SHA-256 integrity
              hashing
            </Td>
          </Tr>
          <Tr>
            <Td>Integrity</Td>
            <Td>
              Parameterized SQL, transaction isolation, audit log integrity
            </Td>
          </Tr>
          <Tr>
            <Td>Authentication</Td>
            <Td>Password + MFA (TOTP), SSO (SAML/OIDC)</Td>
          </Tr>
          <Tr>
            <Td>Transmission Security</Td>
            <Td>TLS 1.3, HTTPS enforced, HSTS headers</Td>
          </Tr>
        </tbody>
      </SimpleTable>

      <SectionHeading>Recommended Architecture</SectionHeading>
      <ul className="list-disc pl-6 space-y-1 text-[var(--fgColor-default)] mb-4">
        <li>
          <strong>Do not include PHI</strong> in evaluation context — use opaque
          identifiers
        </li>
        <li>
          <strong>Deploy on-premises</strong> for maximum control
        </li>
        <li>
          <strong>Enable audit logging</strong> for HIPAA audit trail
        </li>
        <li>
          <strong>Enforce MFA</strong> for all team members
        </li>
        <li>
          <strong>Configure IP allowlisting</strong> to restrict management API
          access
        </li>
      </ul>

      <SectionHeading>Contact</SectionHeading>
      <p className="text-[var(--fgColor-default)] mb-6">
        For HIPAA compliance inquiries:{" "}
        <a
          href="/contact?reason=security"
          className="text-[var(--fgColor-accent)] hover:underline"
        >
          compliance@featuresignals.com
        </a>
      </p>

      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[
          { label: "GDPR", href: "/docs/compliance/gdpr" },
          { label: "SOC 2", href: "/docs/compliance/soc2" },
          {
            label: "Security Overview",
            href: "/docs/compliance/security-overview",
          },
        ].map((step) => (
          <li key={step.href}>
            <Link
              href={step.href}
              className="flex items-center gap-2 text-[var(--fgColor-accent)] hover:underline text-sm font-medium"
            >
              <ArrowRightIcon size={14} />
              <span>{step.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

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
