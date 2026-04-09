import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { appUrl } from "@/lib/urls";
import { SectionReveal } from "@/components/section-reveal";
import { blogPosts } from "@/data/blog-posts";
import { blogContent } from "@/data/blog-content";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) return { title: "Not Found" };
  return {
    title: `${post.title} — FeatureSignals Blog`,
    description: post.description,
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) notFound();

  const content = blogContent[slug];
  if (!content) notFound();

  const relatedPosts = blogPosts.filter((p) => p.slug !== slug).slice(0, 2);

  return (
    <article className="mx-auto max-w-3xl px-6 py-20">
      <SectionReveal>
        <Link
          href="/blog"
          className="mb-8 inline-flex items-center text-sm text-slate-500 transition-colors hover:text-indigo-600"
        >
          &larr; Back to Blog
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100">
            {post.category}
          </span>
          <time className="text-sm text-slate-400">{post.date}</time>
          <span className="text-sm text-slate-400">{post.readingTime}</span>
        </div>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {post.title}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-500">
          {post.description}
        </p>
        <p className="mt-2 text-sm text-slate-400">By {post.author}</p>
      </SectionReveal>

      <SectionReveal delay={0.1}>
        <div
          className="prose prose-slate prose-indigo mt-12 max-w-none prose-headings:font-semibold prose-a:text-indigo-600 prose-code:rounded prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:text-sm prose-code:before:content-none prose-code:after:content-none"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </SectionReveal>

      <SectionReveal delay={0.15}>
        <div className="mt-16 rounded-xl border border-indigo-100 bg-indigo-50/50 p-8 text-center">
          <h2 className="text-lg font-semibold text-slate-900">
            Ready to try FeatureSignals?
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Open-source feature flags with real-time updates, A/B testing, and
            SDKs for every stack.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link
              href={appUrl.register}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              Start Free
            </Link>
            <Link
              href="https://docs.featuresignals.com"
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Read the Docs
            </Link>
          </div>
        </div>
      </SectionReveal>

      {relatedPosts.length > 0 && (
        <SectionReveal delay={0.2}>
          <div className="mt-12">
            <h3 className="text-lg font-semibold text-slate-900">
              Related Articles
            </h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {relatedPosts.map((rp) => (
                <Link
                  key={rp.slug}
                  href={`/blog/${rp.slug}`}
                  className="group rounded-lg border border-slate-200 p-4 transition-all hover:border-slate-300 hover:shadow-sm"
                >
                  <h4 className="text-sm font-semibold text-slate-900 transition-colors group-hover:text-indigo-600">
                    {rp.title}
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                    {rp.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </SectionReveal>
      )}
    </article>
  );
}
