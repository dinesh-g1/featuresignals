import type { Metadata } from "next";
import Link from "next/link";
import { SectionReveal } from "@/components/section-reveal";

export const metadata: Metadata = {
  title: "Blog — FeatureSignals",
  description: "Feature management insights, engineering best practices, and product updates from the FeatureSignals team.",
};

export default function BlogPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20 text-center">
      <SectionReveal>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Blog
        </h1>
        <p className="mt-4 text-base text-slate-500 max-w-xl mx-auto leading-relaxed">
          We are preparing articles on feature management best practices,
          progressive rollout strategies, and engineering culture. In the
          meantime, explore our documentation.
        </p>
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="https://docs.featuresignals.com"
            className="inline-flex rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-indigo-700"
          >
            Read the Docs
          </Link>
          <Link
            href="/"
            className="inline-flex rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 hover:border-slate-400"
          >
            Back to Home
          </Link>
        </div>
      </SectionReveal>
    </section>
  );
}
