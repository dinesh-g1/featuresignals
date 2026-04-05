import type { Metadata } from "next";
import Link from "next/link";
import { SectionReveal } from "@/components/section-reveal";

export const metadata: Metadata = {
  title: "Blog",
};

export default function BlogPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20 text-center">
      <SectionReveal>
        <div className="inline-block rounded-full bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700 mb-6 ring-1 ring-indigo-100">
          Coming Soon
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
          Blog
        </h1>
        <p className="mt-4 text-base text-slate-500 max-w-xl mx-auto leading-relaxed">
          We&apos;re working on articles about feature management best practices,
          engineering culture, and product updates. Check back soon.
        </p>
        <div className="mt-10">
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
