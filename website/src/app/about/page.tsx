import Link from "next/link";
import type { Metadata } from "next";
import { Sparkles, Shield, Users, Globe, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "About",
  description:
    "FeatureSignals is built by Vivekananda Technology Labs. We're on a mission to make feature management accessible, secure, and developer-friendly.",
};

const stats = [
  { label: "Flags Managed", value: "50K+" },
  { label: "Active Organizations", value: "500+" },
  { label: "Open Source Contributors", value: "120+" },
  { label: "Avg. Evaluation Latency", value: "<1ms" },
];

const values = [
  {
    title: "Open Source First",
    description:
      "We believe in transparent, community-driven development. FeatureSignals is Apache 2.0 licensed — you can audit, modify, and self-host every line of code.",
    icon: Sparkles,
  },
  {
    title: "No Vendor Lock-In",
    description:
      "Your data belongs to you. Export flags, migrate between providers, or self-host entirely. We use OpenFeature standard for SDK interoperability.",
    icon: Globe,
  },
  {
    title: "Enterprise Security",
    description:
      "SOC 2 Type II compliant, encrypted at rest and in transit, with RBAC, audit logging, and SSO. Built for organizations that take security seriously.",
    icon: Shield,
  },
  {
    title: "Developer Experience",
    description:
      "Sub-millisecond evaluation latency, native SDKs in 8 languages, Terraform provider, and a powerful API. Feature flags should never slow you down.",
    icon: Users,
  },
];

const team = [
  { name: "Dinesh G", role: "Founder & CEO", initials: "DG" },
  { name: "Sai K", role: "CTO", initials: "SK" },
  { name: "Priya M", role: "Head of Engineering", initials: "PM" },
  { name: "Arun R", role: "Head of Product", initials: "AR" },
  { name: "Neha S", role: "Head of Design", initials: "NS" },
  { name: "Rahul V", role: "Head of Security", initials: "RV" },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-stone-200 bg-stone-50">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-1.5 text-xs font-semibold text-stone-500 mb-6">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Behind FeatureSignals
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-stone-900 mb-6">
              Built by engineers,{" "}
              <span className="text-accent">for engineers</span>
            </h1>
            <p className="text-lg sm:text-xl text-stone-600 max-w-2xl mx-auto leading-relaxed">
              FeatureSignals is developed by Vivekananda Technology Labs, a
              Hyderabad-based software company founded in 2023. We build
              infrastructure software that makes shipping software safer,
              faster, and more collaborative.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-accent mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-stone-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="border-b border-stone-200 bg-stone-50">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 text-center mb-12">
              Our Principles
            </h2>
            <div className="grid sm:grid-cols-2 gap-8">
              {values.map((v) => {
                const Icon = v.icon;
                return (
                  <div
                    key={v.title}
                    className="rounded-xl border border-stone-200 bg-white p-8 transition-all hover:shadow-md hover:border-accent/20"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent mb-4">
                      <Icon className="h-6 w-6" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-lg font-bold text-stone-900 mb-2">
                      {v.title}
                    </h3>
                    <p className="text-sm text-stone-600 leading-relaxed">
                      {v.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 text-center mb-12">
              Leadership Team
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {team.map((member) => (
                <div
                  key={member.name}
                  className="rounded-xl border border-stone-200 bg-stone-50 p-6 text-center transition-all hover:shadow-md"
                >
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent text-lg font-bold text-white">
                    {member.initials}
                  </div>
                  <h3 className="font-semibold text-stone-900">{member.name}</h3>
                  <p className="text-sm text-stone-500">{member.role}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Office */}
      <section className="border-b border-stone-200 bg-stone-50">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-4">
              Our Office
            </h2>
            <p className="text-stone-600 leading-relaxed mb-2">
              Vivekananda Technology Labs
            </p>
            <p className="text-stone-500 text-sm">
              Flat no 308, L5-Block, LIG, Chitrapuri Colony, Manikonda,
              Hyderabad, Telangana - 500089, India
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-stone-900">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Want to join our mission?
          </h2>
          <p className="text-stone-400 max-w-xl mx-auto mb-8">
            We're always looking for talented engineers, designers, and product
            people who want to shape the future of software delivery.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-8 py-3.5 text-sm font-bold text-white hover:bg-accent-dark transition-colors shadow-lg"
            >
              Get in Touch
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
            <a
              href="https://github.com/dinesh-g1/featuresignals"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-stone-700 px-8 py-3.5 text-sm font-semibold text-stone-300 hover:bg-stone-800 hover:text-white transition-colors"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
