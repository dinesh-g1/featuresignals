import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Users,
  FileSearch,
  Fingerprint,
  Building2,
  KeyRound,
  ScrollText,
  CheckCircle2,
  ArrowRight,
  Eye,
  Siren,
  FileClock,
  Globe,
  Smartphone,
  UserCheck,
  Shield,
  ChevronRight,
} from "lucide-react";

export const metadata = {
  title: "Security & Governance",
  description:
    "Enterprise-grade security: RBAC, tamper-evident audit logs, SSO/SAML/OIDC, SCIM provisioning, approval workflows, and compliance certifications for FeatureSignals.",
  openGraph: {
    title: "Security & Governance | FeatureSignals",
    description:
      "RBAC, audit logs, SSO, approval workflows, and compliance certifications for mission-critical feature flag management.",
  },
};

const governanceFeatures = [
  {
    title: "Role-Based Access Control (RBAC)",
    description:
      "Granular permissions across organizations, projects, and environments. Define custom roles with precise resource-level actions — read, write, approve, or administer.",
    icon: Users,
    details: [
      "Predefined roles: Admin, Engineer, Operator, Viewer",
      "Custom roles with up to 50 granular permissions",
      "Environment-scoped access (dev, staging, production)",
      "Time-bound temporary role grants for incident response",
    ],
  },
  {
    title: "Tamper-Evident Audit Logs",
    description:
      "Every flag change, evaluation, configuration update, and access event is cryptographically chained and immutable. No retroactive edits possible.",
    icon: FileSearch,
    details: [
      "SHA-256 chained log entries for tamper evidence",
      "Real-time streaming to your SIEM via webhook",
      "Configurable retention: 90 days (default) to 7 years",
      "Export in JSON, CSV, or syslog-compatible format",
    ],
  },
  {
    title: "SSO & SCIM Provisioning",
    description:
      "Single sign-on via SAML 2.0 or OIDC. Automatic user provisioning and de-provisioning via SCIM 2.0. Directory sync from Okta, Azure AD, Google Workspace, and OneLogin.",
    icon: KeyRound,
    details: [
      "SAML 2.0 and OIDC-compliant identity providers",
      "SCIM 2.0 user provisioning and group sync",
      "Just-in-Time (JIT) user provisioning on first login",
      "Session policies: max lifetime, idle timeout, MFA enforcement",
    ],
  },
  {
    title: "Approval Workflows (CAB)",
    description:
      "Change Advisory Board workflows for production flag changes. Require approvals from designated reviewers before flags can be toggled in sensitive environments.",
    icon: ScrollText,
    details: [
      "Multi-stage approval chains (2-stage, 3-stage)",
      "Parallel and sequential reviewer assignment",
      "Automatic escalation on approval timeout",
      "Integration with Slack, Jira, and PagerDuty for notifications",
    ],
  },
  {
    title: "IP Allowlists & Network Policies",
    description:
      "Restrict access to the management API and dashboard by IP address or CIDR range. Enforce network-level segmentation for production environments.",
    icon: Lock,
    details: [
      "Per-environment IP allowlisting",
      "API key IP restrictions for evaluation endpoints",
      "VPC peering support for self-hosted deployments",
      "TLS 1.3 enforced for all API and SDK communication",
    ],
  },
  {
    title: "Compliance Certifications",
    description:
      "FeatureSignals maintains SOC 2 Type II certification and is designed to support GDPR, HIPAA, and SOC 2 compliance requirements from day one.",
    icon: ShieldCheck,
    details: [
      "SOC 2 Type II audited annually",
      "GDPR-compliant data processing agreement (DPA)",
      "HIPAA BAA available for healthcare customers",
      "Data residency in US, EU, and India regions",
    ],
  },
];

const complianceStandards = [
  { name: "SOC 2 Type II", status: "Certified", icon: ShieldCheck },
  { name: "GDPR", status: "Compliant", icon: Globe },
  { name: "HIPAA", status: "BAA Available", icon: Building2 },
  { name: "ISO 27001", status: "In Progress", icon: FileClock },
];

const securityPractices = [
  {
    title: "Data Encryption",
    description:
      "All data is encrypted at rest using AES-256 and in transit using TLS 1.3. Encryption keys are managed through a dedicated HSM-backed key management system with automatic rotation.",
    icon: Lock,
  },
  {
    title: "Vulnerability Management",
    description:
      "Continuous dependency scanning via govulncheck and Snyk. Weekly penetration testing of the control plane. Bug bounty program with rewards up to $5,000 for qualifying findings.",
    icon: Siren,
  },
  {
    title: "Access Reviews",
    description:
      "Automated quarterly access reviews with remediation workflows. Privileged access is time-bound, approved by management, and logged in the audit trail for full traceability.",
    icon: Eye,
  },
  {
    title: "Secure SDLC",
    description:
      "Every code change undergoes automated security scanning, dependency analysis, and peer review before deployment. Infrastructure is managed as code with Terraform, ensuring repeatable and auditable deployments.",
    icon: Fingerprint,
  },
];

const faqs = [
  {
    q: "How long are audit logs retained?",
    a: "By default, audit logs are retained for 90 days. Pro and Enterprise plans offer configurable retention periods up to 7 years for compliance requirements.",
  },
  {
    q: "Can we self-host to maintain full data control?",
    a: "Yes. FeatureSignals is Apache-2.0 licensed and can be self-hosted on your infrastructure. Enterprise customers can opt for an air-gapped deployment with no outbound network access required.",
  },
  {
    q: "Do you support multiple identity providers?",
    a: "Yes. You can configure multiple IdPs simultaneously. This is useful for merger scenarios, contractor access, or gradual migration between identity providers.",
  },
  {
    q: "What happens to our data if we cancel?",
    a: "You retain full access to your self-hosted data indefinitely. For cloud-hosted customers, we provide a 30-day data export window and a complete migration tool to self-host or another provider.",
  },
];

export default function SecurityPage() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-24 px-6 border-b border-stone-200 bg-stone-50">
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#292524_1px,transparent_1px)] [background-size:20px_20px]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent" />
        <div className="max-w-6xl mx-auto text-center space-y-8 relative z-10">
          <div className="flex justify-center items-center gap-3 flex-wrap">
            <span className="bg-white border border-stone-200 text-stone-600 text-xs px-3 py-1.5 rounded-full font-mono shadow-sm">
              SOC 2 Type II
            </span>
            <span className="bg-accent/10 border border-accent/20 text-accent text-xs px-3 py-1.5 rounded-full font-mono shadow-sm font-semibold">
              Enterprise Grade
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-stone-900 leading-[1.1]">
            Security &amp;{" "}
            <span className="text-accent">Governance</span>
          </h1>
          <p className="text-xl text-stone-600 max-w-3xl mx-auto leading-relaxed">
            Enterprise-grade security controls with granular RBAC, tamper-evident
            audit logs, SSO integration, and compliance certifications — all
            built into the platform from day one.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a
              href="https://app.featuresignals.com/register"
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-md bg-accent text-white font-semibold shadow-md hover:bg-accent-dark transition-all"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <Link
              href="/contact"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-md bg-white text-stone-800 font-semibold border border-stone-200 shadow-sm hover:bg-stone-100 transition-all"
            >
              Talk to Security
            </Link>
          </div>
        </div>
      </section>

      {/* COMPLIANCE BANNER */}
      <section className="border-y border-stone-100 bg-white py-10 sm:py-14">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-8 text-center text-xs font-semibold uppercase tracking-wider text-stone-400">
            Compliance &amp; Certifications
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {complianceStandards.map(({ name, status, icon: Icon }) => (
              <div
                key={name}
                className="flex flex-col items-center rounded-xl border border-stone-200 bg-stone-50 p-6 text-center"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent mb-3">
                  <Icon className="h-6 w-6" strokeWidth={1.5} />
                </div>
                <div className="text-sm font-bold text-stone-900">{name}</div>
                <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <CheckCircle2 className="h-3 w-3" />
                  {status}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GOVERNANCE FEATURES GRID */}
      <section className="py-20 sm:py-24 px-6 border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-stone-900">
              Everything you need to govern feature flags
            </h2>
            <p className="text-lg text-stone-600">
              From startup to enterprise, our security controls scale with your
              compliance requirements. No feature gating — all governance
              features are available on Pro and above.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {governanceFeatures.map(
              ({ title, description, icon: Icon, details }) => (
                <div
                  key={title}
                  className="group flex flex-col rounded-2xl border border-stone-200 bg-stone-50 p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-accent/30 hover:shadow-lg"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/20 group-hover:bg-accent/20 transition-colors">
                    <Icon className="h-6 w-6" strokeWidth={1.5} />
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-stone-900">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">
                    {description}
                  </p>
                  <ul className="mt-4 space-y-2 flex-1">
                    {details.map((detail) => (
                      <li
                        key={detail}
                        className="flex items-start gap-2 text-xs text-stone-500"
                      >
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      {/* SECURITY PRACTICES */}
      <section className="py-20 sm:py-24 px-6 border-b border-stone-200 bg-stone-50">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-stone-900">
              Security by design
            </h2>
            <p className="text-lg text-stone-600">
              We treat security as a first-class feature, not an afterthought.
              Every layer of the FeatureSignals platform is built with
              defense-in-depth principles.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {securityPractices.map(({ title, description, icon: Icon }) => (
              <div
                key={title}
                className="flex gap-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-stone-900 text-white">
                  <Icon className="h-6 w-6" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ARCHITECTURE DIAGRAM */}
      <section className="py-20 sm:py-24 px-6 bg-white">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-stone-900">
              How security flows through the platform
            </h2>
            <p className="text-lg text-stone-600">
              Every request is authenticated, authorized, audited, and secured
              at every layer — from the browser to the database.
            </p>
          </div>

          <div className="relative bg-stone-900 rounded-2xl p-8 md:p-12 overflow-hidden">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)",
                backgroundSize: "40px 40px",
              }}
            />
            <div className="relative z-10">
              <h3 className="text-xl font-bold text-white mb-8">
                Request Security Flow
              </h3>
              <div className="grid gap-4 md:grid-cols-5">
                {[
                  {
                    step: "1",
                    label: "TLS 1.3",
                    desc: "Encrypted transport",
                    icon: Lock,
                  },
                  {
                    step: "2",
                    label: "AuthN",
                    desc: "JWT / API key / SSO",
                    icon: Fingerprint,
                  },
                  {
                    step: "3",
                    label: "AuthZ",
                    desc: "RBAC permission check",
                    icon: UserCheck,
                  },
                  {
                    step: "4",
                    label: "Audit",
                    desc: "Immutable log entry",
                    icon: ScrollText,
                  },
                  {
                    step: "5",
                    label: "Encrypt",
                    desc: "AES-256 at rest",
                    icon: Shield,
                  },
                ].map(({ step, label, desc, icon: Icon }) => (
                  <div
                    key={step}
                    className="relative rounded-xl border border-white/10 bg-white/5 p-5 text-center backdrop-blur-sm"
                  >
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20 text-accent-light mb-3">
                      <Icon className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                    <div className="text-xs font-bold text-accent-light">
                      Step {step}
                    </div>
                    <div className="text-sm font-bold text-white mt-1">
                      {label}
                    </div>
                    <div className="text-xs text-stone-400 mt-0.5">{desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 sm:py-24 px-6 border-y border-stone-100 bg-stone-50">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-stone-900 text-center mb-4">
            Frequently asked questions
          </h2>
          <p className="text-lg text-stone-600 text-center mb-12">
            Common questions about security, compliance, and governance.
          </p>
          <div className="space-y-4">
            {faqs.map(({ q, a }) => (
              <details
                key={q}
                className="group rounded-2xl border border-stone-200 bg-white p-6 shadow-sm open:border-accent/30 open:ring-1 open:ring-accent/10"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 list-none">
                  <span className="text-base font-semibold text-stone-900">
                    {q}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-stone-400 transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-4 text-sm leading-relaxed text-stone-600 border-t border-stone-100 pt-4">
                  {a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 px-6 py-16 text-center sm:px-12 sm:py-20">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)",
              backgroundSize: "32px 32px",
            }}
          />
          <div className="relative">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent-light">
              <ShieldCheck className="h-4 w-4" />
              Enterprise-ready from day one
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Ready to secure your feature flags?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-stone-300 sm:text-lg">
              Start your free trial with full security features, or contact our
              security team for a custom enterprise evaluation.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <a
                href="https://app.featuresignals.com/register"
                className="group inline-flex items-center justify-center rounded-xl bg-accent px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-accent-dark hover:shadow-xl"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-white/10"
              >
                Contact Security Team
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
