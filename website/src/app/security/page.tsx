import type { Metadata } from "next";
import { SectionReveal } from "@/components/section-reveal";
import {
  Shield,
  Lock,
  Eye,
  Server,
  FileCheck,
  Users,
  Key,
  Globe,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Security & Trust",
  description:
    "Learn how FeatureSignals protects your data with enterprise-grade security controls and privacy-by-design architecture.",
};

const securityFeatures = [
  {
    icon: Lock,
    title: "Encryption Everywhere",
    description:
      "TLS 1.3 for data in transit. AES-256 encryption at rest. API keys stored as SHA-256 hashes — never in plaintext.",
  },
  {
    icon: Users,
    title: "Role-Based Access Control",
    description:
      "Four built-in roles (Owner, Admin, Developer, Viewer) with per-environment permissions for fine-grained control over who can toggle flags and edit rules.",
  },
  {
    icon: Key,
    title: "Multi-Factor Authentication",
    description:
      "TOTP-based MFA for all users. SSO enforcement via SAML 2.0 and OIDC for Enterprise customers. Brute-force protection on all auth endpoints.",
  },
  {
    icon: Eye,
    title: "Complete Audit Trail",
    description:
      "Every action is logged with actor, IP, user agent, before/after state, and tamper-evident SHA-256 chain hashing. Exportable in JSON and CSV.",
  },
  {
    icon: Server,
    title: "Infrastructure Security",
    description:
      "IP allowlisting for management API. Rate limiting on all endpoints. Security headers (CSP, HSTS, X-Frame-Options). Container image scanning.",
  },
  {
    icon: Globe,
    title: "Self-Hosted Option",
    description:
      "Deploy on your own infrastructure for complete data sovereignty. Docker, Kubernetes (Helm), and Terraform deployment options available.",
  },
];

const complianceItems = [
  {
    icon: FileCheck,
    title: "GDPR",
    description:
      "Privacy-by-design architecture, tenant isolation, audit trail, encryption, and Data Processing Agreement template. Data subject rights APIs on our roadmap.",
    status: "Controls Implemented",
  },
  {
    icon: FileCheck,
    title: "SOC 2 Type II",
    description:
      "Technical controls mapped to Trust Service Criteria including access control, audit logging with integrity hashing, and change management.",
    status: "Controls Mapped",
  },
  {
    icon: FileCheck,
    title: "CCPA / CPRA",
    description:
      "No sale or sharing of personal information. Privacy notice with required disclosures. Data deletion capabilities.",
    status: "Controls Mapped",
  },
  {
    icon: FileCheck,
    title: "ISO 27001",
    description:
      "Security controls aligned with Annex A requirements. Formal ISMS certification on our roadmap.",
    status: "Roadmap",
  },
  {
    icon: FileCheck,
    title: "HIPAA",
    description:
      "Technical safeguards including access controls, audit logging, and encryption. BAA template and formal compliance on our roadmap.",
    status: "Roadmap",
  },
  {
    icon: FileCheck,
    title: "CSA STAR",
    description:
      "Cloud Controls Matrix alignment for cloud-native security assurance. Formal self-assessment on our roadmap.",
    status: "Roadmap",
  },
];

export default function SecurityPage() {
  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative bg-gradient-to-b from-slate-50 to-white py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <SectionReveal>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100">
              <Shield className="h-8 w-8 text-indigo-600" />
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Security & Trust
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
              FeatureSignals is built with security at every layer. Your feature
              flags are critical infrastructure — we treat them that way.
            </p>
          </SectionReveal>
        </div>
      </section>

      {/* Security Features */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <SectionReveal>
            <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Enterprise-Grade Security Controls
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
              Every security control is built into the core product, not bolted
              on as an afterthought.
            </p>
          </SectionReveal>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {securityFeatures.map((feature, i) => (
              <SectionReveal key={feature.title} delay={i * 0.05}>
                <div className="group rounded-xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-md">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 group-hover:bg-indigo-100 transition-colors">
                    <feature.icon className="h-5 w-5 text-indigo-600" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {feature.description}
                  </p>
                </div>
              </SectionReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance */}
      <section className="bg-slate-50 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <SectionReveal>
            <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Compliance Posture
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
              We implement the technical controls required by major security and
              privacy frameworks. Formal certifications are on our roadmap as we
              scale.
            </p>
          </SectionReveal>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {complianceItems.map((item, i) => (
              <SectionReveal key={item.title} delay={i * 0.05}>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <div className="flex items-center justify-between">
                    <item.icon className="h-6 w-6 text-indigo-600" />
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        item.status === "Controls Implemented"
                          ? "bg-blue-50 text-blue-700"
                          : item.status === "Controls Mapped"
                            ? "bg-slate-100 text-slate-700"
                            : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {item.status === "Controls Implemented" && (
                        <CheckCircle className="h-3 w-3" />
                      )}
                      {item.status}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {item.description}
                  </p>
                </div>
              </SectionReveal>
            ))}
          </div>

          <SectionReveal delay={0.2}>
            <div className="mt-8 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
              <p className="text-sm text-blue-800">
                &quot;Controls Implemented&quot; means the technical controls
                are built into the product. &quot;Controls Mapped&quot; means we
                have documented how our controls align to the framework.
                &quot;Roadmap&quot; items are planned for formal certification as
                we grow. For details, see our{" "}
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

      {/* What We Actually Build */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <SectionReveal>
            <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Security Built Into the Product
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
              These are the concrete security capabilities implemented in
              FeatureSignals today — not aspirational, not planned, but shipping
              in every deployment.
            </p>
          </SectionReveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                name: "Tamper-Evident Audit",
                org: "Built-in",
                description:
                  "Every action logged with SHA-256 chain hashing. Exportable in JSON and CSV. Integrity verifiable end-to-end.",
              },
              {
                name: "SSO (SAML & OIDC)",
                org: "Enterprise",
                description:
                  "SAML 2.0 and OIDC support for Okta, Azure AD, OneLogin, and any compliant identity provider.",
              },
              {
                name: "SCIM Provisioning",
                org: "Enterprise",
                description:
                  "Automated user provisioning and deprovisioning synced with your identity provider.",
              },
              {
                name: "MFA (TOTP)",
                org: "Pro & Enterprise",
                description:
                  "Time-based one-time passwords compatible with Google Authenticator, Authy, and any RFC 6238 app.",
              },
              {
                name: "IP Allowlisting",
                org: "Enterprise",
                description:
                  "Restrict management API access to specific CIDR ranges. Evaluation API remains open for SDK connectivity.",
              },
              {
                name: "Webhook HMAC Signing",
                org: "Pro & Enterprise",
                description:
                  "All outbound webhooks signed with HMAC-SHA256. Verify authenticity of every event delivery.",
              },
              {
                name: "Approval Workflows",
                org: "Pro & Enterprise",
                description:
                  "Require explicit approval before production flag changes take effect. Full audit trail on every review.",
              },
              {
                name: "OpenFeature",
                org: "CNCF Standard",
                description:
                  "All 8 SDKs ship with OpenFeature providers. Zero vendor lock-in — switch providers without code changes.",
              },
            ].map((item, i) => (
              <SectionReveal key={item.name} delay={i * 0.04}>
                <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {item.org}
                    </span>
                  </div>
                  <h3 className="mt-2 text-base font-bold text-slate-900">
                    {item.name}
                  </h3>
                  <p className="mt-1.5 flex-1 text-xs leading-relaxed text-slate-500">
                    {item.description}
                  </p>
                </div>
              </SectionReveal>
            ))}
          </div>
        </div>
      </section>

      {/* System Status + Responsible Disclosure */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* System Status */}
            <SectionReveal>
              <a
                href="/status"
                className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-8 transition-shadow hover:shadow-md"
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
                  . Do not open a public GitHub issue.
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
    </div>
  );
}
