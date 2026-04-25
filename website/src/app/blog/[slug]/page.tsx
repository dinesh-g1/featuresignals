import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  Calendar,
  User,
  Tag,
  ArrowLeft,
  Clock,
  ArrowRight,
  BookOpen,
  Sparkles,
  Share2,
  MessageSquare,
  ExternalLink,
  Mail,
} from "lucide-react";
import posts from "@/data/blog-content";
import { ShareButton } from "@/components/blog/share-button";
import { ReadingProgress } from "@/components/blog/reading-progress";
import { ContentWithIds } from "@/components/blog/content-with-ids";

// ─── Generate static params for all blog posts ─────────────────────────────

export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

// ─── Dynamic metadata per post ─────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: `${post.title} | FeatureSignals Blog`,
      description: post.excerpt,
      type: "article",
      publishedTime: new Date(post.date).toISOString(),
      authors: [post.author],
      tags: post.keywords,
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title} | FeatureSignals`,
      description: post.excerpt,
    },
    keywords: post.keywords.join(", "),
  };
}

// ─── Share button component is now in @/components/blog/share-button.tsx ──
// ─── Reading progress is now in @/components/blog/reading-progress.tsx ────

// ─── Table of contents extractor ───────────────────────────────────────────

function extractHeadings(children: React.ReactNode): Array<{
  text: string;
  level: number;
}> {
  const headings: Array<{ text: string; level: number }> = [];

  function walk(node: React.ReactNode) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    const element = node as React.ReactElement & {
      props: { children?: React.ReactNode };
    };
    if (element.type === "h2" && typeof element.props.children === "string") {
      headings.push({ text: element.props.children, level: 2 });
    }
    if (element.type === "h3" && typeof element.props.children === "string") {
      headings.push({ text: element.props.children, level: 3 });
    }
    if (element.props?.children) {
      walk(element.props.children);
    }
  }

  walk(children);
  return headings;
}

// ─── Page component ────────────────────────────────────────────────────────

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) notFound();

  const headings = extractHeadings(post.content);
  const postUrl = `https://featuresignals.com/blog/${post.slug}`;
  const currentIndex = posts.findIndex((p) => p.slug === post.slug);
  const prevPost = currentIndex > 0 ? posts[currentIndex - 1] : null;
  const nextPost =
    currentIndex < posts.length - 1 ? posts[currentIndex + 1] : null;

  // Related posts (same category, excluding current)
  const relatedPosts = posts
    .filter((p) => p.slug !== post.slug && p.category === post.category)
    .slice(0, 2);

  // If not enough related by category, add recent posts
  while (relatedPosts.length < 2) {
    const candidate = posts.find(
      (p) =>
        p.slug !== post.slug && !relatedPosts.find((r) => r.slug === p.slug),
    );
    if (candidate) relatedPosts.push(candidate);
    else break;
  }

  return (
    <>
      <ReadingProgress />

      {/* ── Reading progress script ── */}
      <script />

      {/* ── JSON-LD Article Schema ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description: post.excerpt,
            author: {
              "@type": "Person",
              name: post.author,
            },
            datePublished: new Date(post.date).toISOString(),
            dateModified: new Date(post.date).toISOString(),
            publisher: {
              "@type": "Organization",
              name: "FeatureSignals",
              logo: {
                "@type": "ImageObject",
                url: "https://featuresignals.com/favicon.svg",
              },
            },
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": postUrl,
            },
            keywords: post.keywords.join(", "),
          }),
        }}
      />

      {/* ── Breadcrumb ── */}
      <nav
        aria-label="Breadcrumb"
        className="mx-auto max-w-3xl px-6 pt-8 sm:pt-12"
      >
        <ol className="flex items-center gap-2 text-sm text-stone-400">
          <li>
            <Link href="/" className="hover:text-stone-600 transition-colors">
              Home
            </Link>
          </li>
          <span className="text-stone-300">/</span>
          <li>
            <Link
              href="/blog"
              className="hover:text-stone-600 transition-colors"
            >
              Blog
            </Link>
          </li>
          <span className="text-stone-300">/</span>
          <li className="text-stone-600 truncate max-w-[200px] sm:max-w-xs">
            {post.title}
          </li>
        </ol>
      </nav>

      {/* ── Article Header ── */}
      <article className="mx-auto max-w-4xl px-6 pb-24">
        <header className="pt-8 sm:pt-12 pb-10 sm:pb-14 border-b border-stone-100">
          {/* Category badge */}
          <div className="flex items-center gap-3 mb-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3.5 py-1 text-xs font-semibold text-accent tracking-wide">
              <Sparkles className="h-3 w-3" strokeWidth={2.5} />
              {post.category}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-stone-400">
              <Clock className="h-3 w-3" strokeWidth={1.5} />
              {post.readTime}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-stone-900 leading-[1.15] mb-6">
            {post.title}
          </h1>

          {/* Excerpt */}
          <p className="text-lg sm:text-xl text-stone-500 leading-relaxed max-w-3xl">
            {post.excerpt}
          </p>

          {/* Meta bar */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-sm text-stone-500">
              <span className="flex items-center gap-1.5">
                <User className="h-4 w-4" strokeWidth={1.5} />
                <span className="font-medium text-stone-700">
                  {post.author}
                </span>
              </span>
              <span className="text-stone-300">·</span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" strokeWidth={1.5} />
                {new Date(post.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              <span className="text-stone-300">·</span>
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" strokeWidth={1.5} />
                {post.readTime}
              </span>
            </div>

            <ShareButton url={postUrl} title={post.title} />
          </div>
        </header>

        {/* ── Two-column layout: TOC + Content ── */}
        <div className="relative mt-10 lg:grid lg:grid-cols-[220px_1fr] lg:gap-12 xl:gap-16">
          {/* Sticky table of contents (desktop) */}
          {headings.length > 0 && (
            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-widest text-stone-400">
                  On this page
                </h4>
                <nav className="space-y-1.5 border-l-2 border-stone-100 pl-4">
                  {headings.map((heading, i) => (
                    <a
                      key={i}
                      href={`#${heading.text
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/(^-|-$)/g, "")}`}
                      className={`block text-sm transition-colors duration-150 hover:text-accent ${
                        heading.level === 3
                          ? "pl-3 text-stone-400"
                          : "text-stone-600 font-medium"
                      }`}
                    >
                      {heading.text}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          )}

          {/* Main content */}
          <div className="min-w-0">
            <div className="prose prose-stone max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-stone-900 prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-5 prose-h2:pb-2 prose-h2:border-b prose-h2:border-stone-100 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-p:text-stone-600 prose-p:leading-relaxed prose-p:text-base sm:prose-p:text-lg prose-p:mb-5 prose-a:text-accent prose-a:no-underline hover:prose-a:underline prose-strong:text-stone-900 prose-strong:font-semibold prose-code:text-accent prose-code:bg-accent/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-normal prose-pre:bg-stone-900 prose-pre:text-stone-100 prose-pre:rounded-xl prose-pre:border prose-pre:border-stone-800 prose-pre:shadow-lg prose-pre:p-5 prose-pre:overflow-x-auto prose-pre:text-sm prose-ol:space-y-3 prose-ol:text-stone-600 prose-ol:text-base sm:prose-ol:text-lg prose-ol:leading-relaxed prose-ul:space-y-2 prose-ul:text-stone-600 prose-ul:text-base sm:prose-ul:text-lg prose-ul:leading-relaxed prose-li:marker:text-accent">
              {/* Render content with IDs on headings for TOC linking */}
              <ContentWithIds>{post.content}</ContentWithIds>
            </div>

            {/* ── Tags / Keywords ── */}
            <div className="mt-12 pt-8 border-t border-stone-100">
              <div className="flex flex-wrap items-center gap-2">
                <Tag className="h-4 w-4 text-stone-400" strokeWidth={1.5} />
                {post.keywords.slice(0, 5).map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600 hover:bg-accent/10 hover:text-accent transition-colors cursor-default"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>

            {/* ── Share bar (bottom) ── */}
            <div className="mt-8 flex items-center justify-between py-6 border-y border-stone-100">
              <div className="flex items-center gap-2 text-sm text-stone-500">
                <Share2 className="h-4 w-4" strokeWidth={1.5} />
                <span>Share this article</span>
              </div>
              <ShareButton url={postUrl} title={post.title} />
            </div>
          </div>
        </div>
      </article>

      {/* ── Author card ── */}
      <section className="border-y border-stone-100 bg-stone-50">
        <div className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
          <div className="flex items-start gap-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent text-lg font-bold text-white shadow-sm">
              {post.author
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-stone-900">
                {post.author}
              </h3>
              <p className="text-sm text-stone-500 leading-relaxed max-w-lg">
                {post.category === "Product"
                  ? "Building products that make engineering teams more productive."
                  : post.category === "Security"
                    ? "Ensuring FeatureSignals meets the highest security standards."
                    : "Engineering the future of feature flag management."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Prev / Next navigation ── */}
      <section className="border-b border-stone-100">
        <div className="mx-auto max-w-4xl px-6 py-8 sm:py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {prevPost ? (
              <Link
                href={`/blog/${prevPost.slug}`}
                className="group rounded-xl border border-stone-200 bg-white p-6 transition-all hover:shadow-lg hover:border-accent/20"
              >
                <span className="flex items-center gap-1 text-xs font-semibold text-stone-400 mb-2 uppercase tracking-wider">
                  <ArrowLeft className="h-3 w-3" />
                  Previous article
                </span>
                <span className="block text-sm font-semibold text-stone-900 group-hover:text-accent transition-colors">
                  {prevPost.title}
                </span>
              </Link>
            ) : (
              <div />
            )}

            {nextPost && (
              <Link
                href={`/blog/${nextPost.slug}`}
                className="group rounded-xl border border-stone-200 bg-white p-6 text-right transition-all hover:shadow-lg hover:border-accent/20 sm:col-start-2"
              >
                <span className="flex items-center justify-end gap-1 text-xs font-semibold text-stone-400 mb-2 uppercase tracking-wider">
                  Next article
                  <ArrowRight className="h-3 w-3" />
                </span>
                <span className="block text-sm font-semibold text-stone-900 group-hover:text-accent transition-colors">
                  {nextPost.title}
                </span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── Related posts ── */}
      {relatedPosts.length > 0 && (
        <section className="bg-stone-50">
          <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
            <div className="mb-10 text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
                Continue reading
              </h2>
              <p className="mt-2 text-stone-500">
                More articles from the FeatureSignals blog
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {relatedPosts.map((related) => (
                <Link
                  key={related.slug}
                  href={`/blog/${related.slug}`}
                  className="group rounded-xl border border-stone-200 bg-white p-6 sm:p-8 transition-all hover:shadow-lg hover:border-accent/20"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent">
                      <Tag className="h-3 w-3" strokeWidth={2.5} />
                      {related.category}
                    </span>
                    <span className="text-[11px] text-stone-400">
                      {related.readTime}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-stone-900 mb-2 group-hover:text-accent transition-colors">
                    {related.title}
                  </h3>
                  <p className="text-sm text-stone-500 leading-relaxed line-clamp-2">
                    {related.excerpt}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-stone-400">
                    <Calendar className="h-3 w-3" strokeWidth={1.5} />
                    {related.date}
                    <span className="mx-1">·</span>
                    <User className="h-3 w-3" strokeWidth={1.5} />
                    {related.author}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Newsletter CTA ── */}
      <section className="bg-stone-900">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:py-16 text-center">
          <div className="mx-auto max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-stone-700 bg-stone-800 px-4 py-1.5 text-xs font-semibold text-stone-400 mb-6">
              <MessageSquare className="h-3.5 w-3.5 text-accent" />
              Never miss a post
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 tracking-tight">
              Stay ahead of the curve
            </h2>
            <p className="text-stone-400 leading-relaxed mb-8">
              Get engineering insights, product updates, and best practices
              delivered to your inbox. No spam — just depth.
            </p>
            <a
              href="mailto:sales@featuresignals.com?subject=Blog%20Newsletter%20Subscription"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-7 py-3.5 text-sm font-bold text-white hover:bg-accent-dark transition-colors shadow-md"
            >
              <Mail className="h-4 w-4" strokeWidth={2} />
              Subscribe via Email
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

// ─── ContentWithIds is now in @/components/blog/content-with-ids.tsx ─────
