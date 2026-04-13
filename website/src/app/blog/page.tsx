import type { Metadata } from "next";
import Link from "next/link";
import { SectionReveal } from "@/components/section-reveal";
import { blogPosts } from "@/data/blog-posts";

export const metadata: Metadata = {
  title: "Blog — FeatureSignals",
  description:
    "Feature management insights, engineering best practices, and product updates from the FeatureSignals team.",
};

const categoryColors: Record<string, string> = {
  engineering: "bg-blue-50 text-blue-700 ring-blue-100",
  product: "bg-purple-50 text-purple-700 ring-purple-100",
  guide: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  changelog: "bg-amber-50 text-amber-700 ring-amber-100",
};

export default function BlogPage() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
      <SectionReveal>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Blog
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-500">
          Feature management insights, engineering best practices, and product
          updates from the FeatureSignals team.
        </p>
      </SectionReveal>

      <div className="mt-12 space-y-8">
        {blogPosts.map((post, i) => (
          <SectionReveal key={post.slug} delay={i * 0.05}>
            <Link
              href={`/blog/${post.slug}`}
              className="group block rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${categoryColors[post.category] ?? categoryColors.guide}`}
                >
                  {post.category}
                </span>
                <time className="text-xs text-slate-400">{post.date}</time>
                <span className="text-xs text-slate-400">
                  {post.readingTime}
                </span>
              </div>
              <h2 className="mt-3 text-xl font-semibold text-slate-900 transition-colors group-hover:text-indigo-600">
                {post.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {post.description}
              </p>
              <span className="mt-4 inline-block text-sm font-medium text-indigo-600">
                Read more &rarr;
              </span>
            </Link>
          </SectionReveal>
        ))}
      </div>

      <SectionReveal delay={0.3}>
        <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 px-6 py-8 text-center sm:px-10">
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
              Stay in the loop
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
              Get product updates, feature announcements, and engineering
              insights. No spam, unsubscribe anytime.
            </p>
            <div
              className="mx-auto mt-5 flex max-w-sm flex-col gap-2 sm:flex-row"
            >
              <input
                type="email"
                placeholder="you@company.com"
                
                className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-base placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                
                className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                Subscribe
              </button>
            </div>
          </div>
        </section>
      </SectionReveal>
    </section>
  );
}
