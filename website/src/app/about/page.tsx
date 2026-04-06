import type { Metadata } from "next";
import Link from "next/link";
import { SectionReveal } from "@/components/section-reveal";

export const metadata: Metadata = {
  title: "About",
  description:
    "About FeatureSignals — an open-source feature management platform by Vivekananda Technology Labs.",
};

export default function AboutPage() {
  return (
    <section className="mx-auto max-w-4xl px-4 sm:px-6 py-16 sm:py-24">
      <SectionReveal>
        <div className="text-center">
          <div className="inline-block rounded-full bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700 mb-6 ring-1 ring-indigo-100">
            About Us
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            About FeatureSignals
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
            The feature management platform built for developers who want
            control, transparency, and zero vendor lock-in.
          </p>
        </div>
      </SectionReveal>

      <div className="mt-12 sm:mt-16 space-y-10">
        <SectionReveal delay={0.06}>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Who we are</h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              <strong className="text-slate-800">FeatureSignals</strong> is a
              product of{" "}
              <strong className="text-slate-800">
                Vivekananda Technology Labs
              </strong>
              . We build open-source developer tools focused on feature
              management, experimentation, and safe software delivery.
            </p>
          </div>
        </SectionReveal>

        <SectionReveal delay={0.1}>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">What we do</h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              FeatureSignals is an open-source{" "}
              <strong className="text-slate-800">
                feature flag and feature management platform
              </strong>
              . It enables engineering teams to control feature rollouts, run A/B
              experiments, and manage configurations in real time — without
              expensive SaaS contracts.
            </p>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-900 text-sm">
                  Feature Flags
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Boolean, string, number, JSON, and A/B flag types with
                  targeting rules and percentage rollouts.
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-900 text-sm">
                  A/B Experimentation
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Consistent hashing, weighted splits, mutual exclusion groups,
                  and impression tracking.
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-900 text-sm">
                  SDKs for Every Stack
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Go, Node.js, Python, Java, C#, Ruby, React, and Vue with
                  OpenFeature providers.
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-900 text-sm">
                  Self-Hosted
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Apache-2.0 licensed. Deploy with Docker Compose, Kubernetes, or
                  a single Go binary.
                </p>
              </div>
            </div>
          </div>
        </SectionReveal>

        <SectionReveal delay={0.12}>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Pricing</h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              We offer a <strong className="text-slate-800">Free</strong> plan, a{" "}
              <strong className="text-slate-800">Pro</strong> plan at{" "}
              <strong className="text-slate-800">₹999/month</strong>, and an{" "}
              <strong className="text-slate-800">Enterprise</strong> plan with
              custom pricing. All plans include the full feature set. See our{" "}
              <Link
                href="/pricing"
                className="font-medium text-indigo-600 underline decoration-indigo-200 hover:text-indigo-700"
              >
                Pricing page
              </Link>{" "}
              for details.
            </p>
          </div>
        </SectionReveal>

        <SectionReveal delay={0.14}>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-slate-900">
              Business Details
            </h2>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="font-semibold text-slate-700">Legal Name</dt>
                <dd className="mt-0.5 text-slate-600">
                  Vivekananda Technology Labs
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-700">
                  Proprietor / Authorized Signatory
                </dt>
                <dd className="mt-0.5 text-slate-600">Gillala Dinesh</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-700">Trade Name</dt>
                <dd className="mt-0.5 text-slate-600">FeatureSignals</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-700">
                  Registered Address
                </dt>
                <dd className="mt-0.5 text-slate-600">
                  Flat no 308, L5-Block, LIG, Chitrapuri Colony, Manikonda,
                  Hyderabad, Telangana - 500089, India
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-700">Contact</dt>
                <dd className="mt-0.5 text-slate-600">
                  <a
                    href="mailto:support@featuresignals.com"
                    className="font-medium text-indigo-600 underline decoration-indigo-200 hover:text-indigo-700"
                  >
                    support@featuresignals.com
                  </a>
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-700">
                  Nature of Business
                </dt>
                <dd className="mt-0.5 text-slate-600">
                  IT Services — Cloud-hosted software, APIs, SDKs, and developer
                  tools for feature management.
                </dd>
              </div>
            </dl>
          </div>
        </SectionReveal>

        <SectionReveal delay={0.16}>
          <div className="text-center pt-4">
            <p className="text-sm text-slate-500 mb-4">
              Questions? We&apos;d love to hear from you.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="mailto:support@featuresignals.com"
                className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 hover:border-slate-400"
              >
                Contact Us
              </a>
              <Link
                href="/"
                className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-indigo-700 hover:shadow-md"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}
