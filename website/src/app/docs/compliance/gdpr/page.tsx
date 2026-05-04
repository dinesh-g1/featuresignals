import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@primer/octicons-react";
import { CodeBlock } from "@/components/ui/code-editor";

export const metadata: Metadata = {
  title: "GDPR Compliance",
  description:
    "How to exercise GDPR data subject rights with FeatureSignals including access, deletion, and portability.",
};

export default function GdprPage() {
  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--fgColor-default)] mb-3"
      >
        GDPR Data Subject Rights
      </h1>
      <p className="text-sm text-[var(--fgColor-muted)] mb-8">
        Last updated: April 2026
      </p>

      <SectionHeading>Right of Access (Article 15)</SectionHeading>
      <p className="text-[var(--fgColor-default)] mb-4">
        Obtain a copy of all personal data we hold about you:
      </p>
      <CodeBlock
        language="bash"
        code={`# Via API (instant)
curl -X GET https://api.featuresignals.com/v1/users/me/data \\
  -H "Authorization: Bearer $TOKEN"

# Via email
# Send request to: privacy@featuresignals.com`}
      />

      <SectionHeading>Right to Erasure (Article 17)</SectionHeading>
      <CodeBlock
        language="bash"
        code={`# Initiate account deletion with 30-day grace period
curl -X DELETE https://api.featuresignals.com/v1/users/me \\
  -H "Authorization: Bearer $TOKEN"`}
      />
      <ol className="list-decimal pl-6 space-y-1 text-[var(--fgColor-default)] mb-6">
        <li>Account is soft-deleted immediately (cannot log in)</li>
        <li>30-day grace period allows recovery by contacting support</li>
        <li>After 30 days, all personal data is permanently deleted</li>
        <li>Audit log entries are anonymized</li>
      </ol>

      <SectionHeading>Right to Data Portability (Article 20)</SectionHeading>
      <p className="text-[var(--fgColor-default)] mb-4">
        Email{" "}
        <a
          href="/contact?reason=support"
          className="text-[var(--fgColor-accent)] hover:underline"
        >
          privacy@featuresignals.com
        </a>{" "}
        for a structured data export.
      </p>

      <SectionHeading>Data Protection Officer</SectionHeading>
      <p className="text-[var(--fgColor-default)] mb-6">
        For GDPR inquiries:{" "}
        <a
          href="/contact?reason=support"
          className="text-[var(--fgColor-accent)] hover:underline"
        >
          dpo@featuresignals.com
        </a>
      </p>

      <SectionHeading>Next Steps</SectionHeading>
      <ul className="space-y-2">
        {[
          { label: "SOC 2 Controls", href: "/docs/compliance/soc2" },
          { label: "HIPAA", href: "/docs/compliance/hipaa" },
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
