import type { Metadata } from "next";
import Link from "next/link";
import { appUrl } from "@/lib/urls";
import {
  ArrowRight,
  Shield,
  ShieldCheck,
  Lock,
  Eye,
  Users,
  Key,
  FileCheck,
  Check,
  AlertTriangle,
  Info,
} from "lucide-react";
import { FeatureCard } from "@/components/feature-card";
import { SectionReveal } from "@/components/section-reveal";

export const metadata: Metadata = {
  title: "Security & Governance — Enterprise-Grade Controls | FeatureSignals",
  description:
    "RBAC, tamper-evident audit logs, approval workflows, SSO, SCIM, IP allowlists. Security built into the product, not bolted on.",
};

const securityControls = [
  {
    id: "rbac",
    title: "Role-Based Access Control",
    description:
      "Four built-in roles (Owner, Admin, Developer, Viewer) with per-environment permissions. Custom roles for fine-grained control over who can toggle flags, edit rules, and approve changes.",
    icon: <Users className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} />,
    features: [
      "Owner, Admin, Developer, Viewer roles",
      "Per-environment permissions",
      "Custom role definitions",
      "Principle of least privilege",
    ],
  },
  {
    id: "audit",
    title: "Tamper-Evident Audit Logs",
    description:
      "Every action logged with actor, IP, user agent, before/after state, and SHA-256 chain hashing. Integrity verifiable end-to-end. Exportable in JSON and CSV.",
    icon: <Eye className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} />,
    features: [
      "SHA-256 chain integrity verification",
      "Before/after diffs for every change",
      "Actor, IP, user agent tracking",
      "JSON and CSV export",
      "Tamper detection",
    ],
  },
  {
    id: "approvals",
    title: "Approval Workflows",
    description:
      "Require explicit approval before production flag changes take effect. Full audit trail on every review. Perfect for regulated environments and change management processes.",
    icon: <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} />,
    features: [
      "Production change gating",
      "Multi-step approval chains",
      "Review comments and notes",
      "Full audit trail preservation",
    ],
    code: {
      lang: "curl",
      label: "Approval Flow",
      code: `# Developer requests approval
curl -X POST https://api.featuresignals.com/v1/approvals \\
  -H "Authorization: Bearer <dev-token>" \\
  -d '{
    "flag_id": "flag-uuid",
    "change_type": "toggle",
    "payload": { "enabled": true }
  }'

# Admin approves
curl -X POST .../v1/approvals/{id}/review \\
  -d '{ "action": "approve", "note": "LGTM" }'`,
    },
  },
  {
    id: "sso",
    title: "SSO & Identity",
    description:
      "SAML 2.0 and OIDC support for Okta, Azure AD, OneLogin, and any compliant identity provider. TOTP-based MFA for all users. SCIM provisioning for automated user lifecycle management.",
    icon: <Key className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} />,
    features: [
      "SAML 2.0 and OIDC",
      "Okta, Azure AD, OneLogin support",
      "TOTP-based MFA",
      "SCIM provisioning",
      "Brute-force protection",
    ],
  },
  {
    id: "ip",
    title: "IP Allowlisting",
    description:
      "Restrict management API access to specific CIDR ranges. Evaluation API remains open for SDK connectivity. Perfect for enterprise network security policies.",
    icon: <Lock className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} />,
    features: [
      "CIDR range restrictions",
      "Management API protection",
      "SDK connectivity preserved",
      "Enterprise network compliance",
    ],
  },
  {
    id: "encryption",
    title: "Encryption Everywhere",
    description:
      "TLS 1.3 for data in transit. AES-256 encryption at rest. API keys stored as SHA-256 hashes — never in plaintext. Security headers (CSP, HSTS, X-Frame-Options) on all endpoints.",
    icon: <Lock className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} />,
    features: [
      "TLS 1.3 for data in transit",
      "AES-256 encryption at rest",
      "SHA-256 hashed API keys",
      "CSP, HSTS, X-Frame-Options",
    ],
  },
];

const complianceFrameworks = [
  {
    name: "GDPR",
    status: "Controls Implemented",
    description:
      "Privacy-by-design architecture, tenant isolation, audit trail, encryption, and Data Processing Agreement template.",
  },
  {
    name: "SOC 2 Type II",
    status: "Controls Mapped",
    description:
      "Technical controls mapped to Trust Service Criteria including access control, audit logging with integrity hashing, and change management.",
  },
  {
    name: "CCPA / CPRA",
    status: "Controls Mapped",
    description:
      "No sale or sharing of personal information. Privacy notice with required disclosures. Data deletion capabilities.",
  },
  {
    name: "ISO 27001",
    status: "Roadmap",
    description:
      "Security controls aligned with Annex A requirements. Formal ISMS certification on our roadmap.",
  },
  {
    name: "HIPAA",
    status: "Roadmap",
    description:
      "Technical safeguards including access controls, audit logging, and encryption. BAA template on our roadmap.",
  },
  {
    name: "CSA STAR",
    status: "Roadmap",
    description:
      "Cloud Controls Matrix alignment for cloud-native security assurance. Formal self-assessment on our roadmap.",
  },
];

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "Controls Implemented"
      ? "bg-emerald-50 text-emerald-700"
      : status === "Controls Mapped"
        ? "bg-slate-100 text-slate-700"
        : "bg-amber-50 text-amber-700";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}
    >
      {status === "Controls Implemented" && <Check className="h-3 w-3" />}
      {status}
    </span>
  );
}

export default function SecurityPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative bg-gradient-to-b from-slate-50 to-white py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <SectionReveal>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 sm:h-16 sm:w-16">
              <Shield className="h-7 w-7 text-indigo-600 sm:h-8 sm:w-8" />
            </div>
            <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
              Security & Governance
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 sm:text-lg">
              Security built into the product, not bolted on. Every control
              ships in the core product — no enterprise upsell, no feature
              gating.
            </p>
          </SectionReveal>
        </div>
      </section>

      {/* Security Controls */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <SectionReveal>
            <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Enterprise-Grade Security Controls
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
              Concrete capabilities shipping in every deployment today.
            </p>
          </SectionReveal>

          <div className="mt-10 space-y-6 sm:space-y-8">
            {securityControls
              .filter(
                (c) =>
                  c.id === "rbac" || c.id === "audit" || c.id === "approvals",
              )
              .map((control, i) => (
                <SectionReveal key={control.id} delay={i * 0.05}>
                  <FeatureCard
                    icon={control.icon}
                    title={control.title}
                    description={control.description}
                    features={control.features}
                    code={control.code}
                    reverse={i % 2 === 1}
                  />
                </SectionReveal>
              ))}
          </div>
        </div>
      </section>

      {/* Mid-page CTA */}
      <SectionReveal>
        <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 px-6 py-10 text-center sm:px-10 sm:py-12">
            <h2 className="text-xl font-bold text-white sm:text-2xl">
              Secure your flag management
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-indigo-100 sm:text-base">
              RBAC, audit logs, approval workflows — all included in Pro and
              Enterprise.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={appUrl.register}
                className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-indigo-600 shadow-sm transition-colors hover:bg-indigo-50 sm:text-base"
              >
                Start Free
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-lg border border-white/30 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </section>
      </SectionReveal>

      {/* Remaining Security Controls */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="mt-10 space-y-6 sm:space-y-8">
            {securityControls
              .filter(
                (c) => c.id === "sso" || c.id === "ip" || c.id === "encryption",
              )
              .map((control, i) => (
                <SectionReveal key={control.id} delay={i * 0.05}>
                  <FeatureCard
                    icon={control.icon}
                    title={control.title}
                    description={control.description}
                    features={control.features}
                    code={control.code}
                    reverse={i % 2 === 1}
                  />
                </SectionReveal>
              ))}
          </div>
        </div>
      </section>

      {/* Compliance */}
      <section className="bg-slate-50 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionReveal>
            <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Compliance Posture
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
              We implement the technical controls required by major security and
              privacy frameworks. Formal certifications are on our roadmap.
            </p>
          </SectionReveal>

          <SectionReveal>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {complianceFrameworks.map((fw) => (
                <div
                  key={fw.name}
                  className="rounded-xl border border-slate-200 bg-white p-6"
                >
                  <div className="flex items-center justify-between">
                    <FileCheck className="h-5 w-5 text-indigo-600 sm:h-6 sm:w-6" />
                    <StatusBadge status={fw.status} />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">
                    {fw.name}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {fw.description}
                  </p>
                </div>
              ))}
            </div>
          </SectionReveal>

          <SectionReveal>
            <div className="mt-8 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
              <p className="text-sm text-blue-800">
                &quot;Controls Implemented&quot; means the technical controls
                are built into the product. &quot;Controls Mapped&quot; means we
                have documented how our controls align to the framework.
                &quot;Roadmap&quot; items are planned for formal certification
                as we grow. For details, see our{" "}
                <a
                  href="https://docs.featuresignals.com/compliance/security-overview"
                  className="font-medium underline decoration-blue-300 hover:text-blue-900"
                >
                  security documentation
                </a>
                .
              </p>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* Responsible Disclosure + Status */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* System Status */}
            <SectionReveal>
              <a
                href="/status"
                className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 sm:p-6 lg:p-8 transition-shadow hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                  </span>
                  <h2 className="text-xl font-bold text-slate-900">
                    System Status
                  </h2>
                </div>
                <p className="mt-3 flex-1 text-slate-600">
                  Real-time visibility into the health of every FeatureSignals
                  component — Management API, Evaluation API, Dashboard, SSE
                  streaming, and webhook delivery.
                </p>
                <p className="mt-4 text-sm font-semibold text-indigo-600 transition-colors group-hover:text-indigo-700">
                  View status page &rarr;
                </p>
              </a>
            </SectionReveal>

            {/* Responsible Disclosure */}
            <SectionReveal delay={0.05}>
              <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-8">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-amber-500" />
                  <h2 className="text-xl font-bold text-slate-900">
                    Responsible Disclosure
                  </h2>
                </div>
                <p className="mt-3 flex-1 text-slate-600">
                  Found a vulnerability? We respond within 48 hours. Report to{" "}
                  <a
                    href="mailto:security@featuresignals.com"
                    className="font-medium text-indigo-600 underline decoration-indigo-200 hover:text-indigo-700"
                  >
                    security@featuresignals.com
                  </a>
                  . Do not open a Public GitHub issue.
                </p>
                <div className="mt-4 rounded-lg bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Include in your report
                  </h3>
                  <ul className="mt-2 space-y-1 text-sm text-slate-600">
                    <li>- Description of the vulnerability</li>
                    <li>- Steps to reproduce</li>
                    <li>- Potential impact assessment</li>
                  </ul>
                </div>
              </div>
            </SectionReveal>
          </div>
        </div>
      </section>

      {/* Related features */}
      <section className="border-t border-slate-100 bg-slate-50 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <SectionReveal>
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Explore more capabilities
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-500 sm:text-base">
              Security is just one piece of the platform. Discover the core flag
              engine, AI-powered cleanup, and 50+ integrations.
            </p>
          </SectionReveal>

          <SectionReveal>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {(
                [
                  {
                    title: "Core Features",
                    description:
                      "Flag engine, targeting, rollouts, A/B testing, kill switches",
                    href: "/features",
                  },
                  {
                    title: "AI Capabilities",
                    description:
                      "AI flag cleanup, anomaly detection, and incident response",
                    href: "/features/ai",
                  },
                  {
                    title: "Integrations",
                    description: "Slack, GitHub, Jira, Datadog, and more",
                    href: "/features/integrations",
                  },
                ] as const
              ).map(({ title, description, href }) => (
                <Link
                  key={title}
                  href={href}
                  className="group rounded-xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
                >
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600">
                    {title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">{description}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-600">
                    Learn more
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* Final CTA */}
      <SectionReveal>
        <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 px-6 py-10 text-center sm:px-10 sm:py-12">
            <h2 className="text-xl font-bold text-white sm:text-2xl">
              Deploy with confidence
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-indigo-100 sm:text-base">
              Start free with full Pro features for 14 days. Security controls
              included in Pro and Enterprise.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={appUrl.register}
                className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-indigo-600 shadow-sm transition-colors hover:bg-indigo-50 sm:text-base"
              >
                Start Free
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-lg border border-white/30 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </section>
      </SectionReveal>
    </>
  );
}
