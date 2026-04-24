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
  Link as LinkIcon,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import posts from "@/data/blog-content";

// ─── Generate static params for all blog posts ─────────────────────────────

export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

// ─── Dynamic metadata per post ─────────────────────────────────────────────

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const post = posts.find((p) => p.slug === params.slug);
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

// ─── Share button component ────────────────────────────────────────────────

function ShareButton({ url, title }: { url: string; title: string }) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
        Share
      </span>
      <a
        href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-lg p-2 text-stone-400 transition-colors hover:bg-accent/10 hover:text-accent"
        aria-label="Share on X (Twitter)"
      >
        <svg
          className="h-4 w-4"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </a>
      <a
        href={`https://linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-lg p-2 text-stone-400 transition-colors hover:bg-accent/10 hover:text-accent"
        aria-label="Share on LinkedIn"
      >
        <svg
          className="h-4 w-4"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      </a>
      <button
        onClick={() => {
          navigator.clipboard.writeText(url);
        }}
        className="rounded-lg p-2 text-stone-400 transition-colors hover:bg-accent/10 hover:text-accent"
        aria-label="Copy link"
      >
        <LinkIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Reading progress bar ──────────────────────────────────────────────────

function ReadingProgress() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-0.5 bg-stone-100">
      <div
        id="reading-progress"
        className="h-full bg-accent transition-all duration-150 ease-out"
        style={{ width: "0%" }}
      />
    </div>
  );
}

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

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = posts.find((p) => p.slug === params.slug);
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
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('scroll', function() {
              const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
              const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
              const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
              const bar = document.getElementById('reading-progress');
              if (bar) bar.style.width = progress + '%';
            });
          `,
        }}
      />

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
            <form
              className="flex flex-col sm:flex-row items-center justify-center gap-3"
              action="#"
              method="post"
            >
              <input
                type="email"
                placeholder="you@company.com"
                className="w-full rounded-xl border border-stone-700 bg-stone-800 px-5 py-3.5 text-sm text-white placeholder-stone-500 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
                required
              />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-7 py-3.5 text-sm font-bold text-white hover:bg-accent-dark transition-colors shadow-md shrink-0"
              >
                Subscribe
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}

// ─── Helper: renders content with auto-generated heading IDs ───────────────

function ContentWithIds({ children }: { children: React.ReactNode }) {
  function addIds(node: React.ReactNode): React.ReactNode {
    if (!node || typeof node !== "object") return node;
    if (Array.isArray(node)) return node.map(addIds);

    const element = node as React.ReactElement & {
      props: { children?: React.ReactNode };
    };

    if (
      (element.type === "h2" || element.type === "h3") &&
      typeof element.props.children === "string"
    ) {
      const id = element.props.children
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      // Return early with a fragment if we can't clone
      if (typeof element.type !== "string") return element;

      // We know element.type is a string ('h2' or 'h3'), so it's safe to clone
      const Tag = element.type as "h2" | "h3";
      return <Tag id={id}>{element.props.children}</Tag>;
    }

    if (element.props?.children) {
      const newChildren = addIds(element.props.children);
      // We can't easily clone without React.cloneElement
      // Return the element as-is with children replaced
      if (typeof element.type === "string") {
        const Tag = element.type as keyof React.JSX.IntrinsicElements;
        const { children: _, ...rest } = element.props;
        return <Tag {...rest}>{newChildren}</Tag>;
      }
    }

    return element;
  }

  return <>{addIds(children)}</>;
}
