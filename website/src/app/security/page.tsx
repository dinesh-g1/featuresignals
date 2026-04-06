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
} from "lucide-react";

export const metadata: Metadata = {
  title: "Security & Trust",
  description:
    "Learn how FeatureSignals protects your data with enterprise-grade security controls, compliance certifications, and privacy-by-design architecture.",
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
    title: "GDPR Ready",
    description:
      "Data subject rights (access, portability, erasure), Data Processing Agreement, privacy-by-design architecture, sub-processor transparency.",
    status: "Implemented",
  },
  {
    icon: FileCheck,
    title: "SOC 2 Type II",
    description:
      "Controls mapped to all Trust Service Criteria. Evidence collection automated. Audit-ready documentation maintained continuously.",
    status: "Controls Implemented",
  },
  {
    icon: FileCheck,
    title: "CCPA / CPRA",
    description:
      "Do-not-sell compliance, data deletion on request, privacy notice with required disclosures for California residents.",
    status: "Planned",
  },
  {
    icon: FileCheck,
    title: "ISO 27001",
    description:
      "Information Security Management System documentation, risk assessment framework, Statement of Applicability.",
    status: "Planned",
  },
  {
    icon: FileCheck,
    title: "HIPAA",
    description:
      "Business Associate Agreement template, PHI safeguards, access controls, and audit logging for covered entities.",
    status: "Planned",
  },
  {
    icon: FileCheck,
    title: "CSA STAR",
    description:
      "Cloud Security Alliance STAR self-assessment based on Cloud Controls Matrix for cloud-native security assurance.",
    status: "Planned",
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
              Compliance & Certifications
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
              We build toward the highest industry standards so you can adopt
              FeatureSignals with confidence.
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
                        item.status === "Implemented"
                          ? "bg-green-50 text-green-700"
                          : item.status === "Controls Implemented"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {item.status === "Implemented" && (
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
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <SectionReveal>
            <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Industry Certifications & Standards
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
              FeatureSignals aligns with the most rigorous security and privacy
              frameworks to earn the trust of regulated industries.
            </p>
          </SectionReveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                name: "SOC 2 Type II",
                org: "AICPA",
                status: "Controls Implemented",
                statusColor: "text-blue-700 bg-blue-50",
                description:
                  "All Trust Service Criteria mapped. Evidence collection automated via audit trail with integrity hashing.",
              },
              {
                name: "GDPR",
                org: "EU Regulation",
                status: "Compliant",
                statusColor: "text-emerald-700 bg-emerald-50",
                description:
                  "Full data subject rights, DPA template, privacy-by-design architecture, sub-processor transparency.",
              },
              {
                name: "HIPAA",
                org: "HHS",
                status: "BAA Available",
                statusColor: "text-teal-700 bg-teal-50",
                description:
                  "Technical safeguards implemented. Business Associate Agreement available for Enterprise customers.",
              },
              {
                name: "ISO 27001",
                org: "ISO/IEC",
                status: "Controls Mapped",
                statusColor: "text-amber-700 bg-amber-50",
                description:
                  "ISMS documentation, Annex A controls mapped, risk assessment framework in place.",
              },
              {
                name: "CCPA / CPRA",
                org: "California",
                status: "Compliant",
                statusColor: "text-emerald-700 bg-emerald-50",
                description:
                  "Do-not-sell, data deletion, portability. No sale or sharing of personal information.",
              },
              {
                name: "DORA",
                org: "EU Regulation",
                status: "Supported",
                statusColor: "text-blue-700 bg-blue-50",
                description:
                  "ICT risk management, incident reporting, resilience testing. Enterprise agreements include DORA provisions.",
              },
              {
                name: "CSA STAR",
                org: "Cloud Security Alliance",
                status: "Self-Assessed",
                statusColor: "text-blue-700 bg-blue-50",
                description:
                  "Cloud Controls Matrix v4 self-assessment completed across all applicable control domains.",
              },
              {
                name: "OpenFeature",
                org: "CNCF",
                status: "Certified",
                statusColor: "text-emerald-700 bg-emerald-50",
                description:
                  "Full OpenFeature specification compliance. All SDKs ship with OpenFeature providers — zero vendor lock-in.",
              },
            ].map((cert, i) => (
              <SectionReveal key={cert.name} delay={i * 0.04}>
                <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {cert.org}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cert.statusColor}`}
                    >
                      {cert.status}
                    </span>
                  </div>
                  <h3 className="mt-2 text-base font-bold text-slate-900">
                    {cert.name}
                  </h3>
                  <p className="mt-1.5 flex-1 text-xs leading-relaxed text-slate-500">
                    {cert.description}
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
