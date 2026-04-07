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
    <section className="mx-auto max-w-4xl px-6 py-20">
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
        <div className="mt-16 rounded-xl border border-indigo-100 bg-indigo-50/50 p-8 text-center">
          <h2 className="text-lg font-semibold text-slate-900">
            Stay in the loop
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Follow our{" "}
            <Link
              href="/changelog"
              className="font-medium text-indigo-600 underline hover:text-indigo-700"
            >
              changelog
            </Link>{" "}
            for product updates, or star us on{" "}
            <a
              href="https://github.com/featuresignals/featuresignals"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-indigo-600 underline hover:text-indigo-700"
            >
              GitHub
            </a>{" "}
            to get notified of new releases.
          </p>
        </div>
      </SectionReveal>
    </section>
  );
}
