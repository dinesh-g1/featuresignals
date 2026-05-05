"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRightIcon, RssIcon, ClockIcon } from "@primer/octicons-react";
import type { BlogPost, BlogCategory } from "@/lib/blog-posts";
import { allCategories } from "@/lib/blog-posts";
import { cn } from "@/lib/utils";

/* ==========================================================================
   Category Config
   ========================================================================== */

const categoryConfig: Record<
  BlogCategory,
  { fg: string; bg: string; border: string }
> = {
  Engineering: {
    fg: "var(--fgColor-accent)",
    bg: "var(--bgColor-accent-muted)",
    border: "var(--borderColor-accent-muted)",
  },
  Product: {
    fg: "var(--fgColor-success)",
    bg: "var(--bgColor-success-muted)",
    border: "var(--borderColor-success-muted)",
  },
  Guides: {
    fg: "var(--fgColor-done)",
    bg: "var(--bgColor-done-muted)",
    border: "var(--borderColor-accent-muted)",
  },
  Security: {
    fg: "var(--fgColor-attention)",
    bg: "var(--bgColor-attention-muted)",
    border: "var(--borderColor-attention-muted)",
  },
  DevOps: {
    fg: "var(--fgColor-muted)",
    bg: "var(--bgColor-muted)",
    border: "var(--borderColor-default)",
  },
  "Open Source": {
    fg: "var(--fgColor-done)",
    bg: "var(--bgColor-done-muted)",
    border: "var(--borderColor-accent-muted)",
  },
};

const allCategoriesWithAll: Array<BlogCategory | "All"> = [
  "All",
  ...allCategories,
];

/* ==========================================================================
   Animation Presets
   ========================================================================== */

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-64px" },
  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
};

/* ==========================================================================
   BlogContent
   ========================================================================== */

export function BlogContent({ posts }: { posts: BlogPost[] }) {
  const [activeCategory, setActiveCategory] = useState<BlogCategory | "All">(
    "All",
  );

  const filteredPosts = useMemo(() => {
    if (activeCategory === "All") return posts;
    return posts.filter((p) => p.category === activeCategory);
  }, [activeCategory, posts]);

  return (
    <>
      {/* Category Filter */}
      <div className="bg-[var(--bgColor-default)] border-b border-[var(--borderColor-default)]">
        <div className="mx-auto max-w-7xl px-6">
          <div
            className="flex items-center gap-1.5 py-4 overflow-x-auto scrollbar-hide"
            role="tablist"
            aria-label="Blog categories"
          >
            {allCategoriesWithAll.map((cat) => (
              <button
                key={cat}
                role="tab"
                aria-selected={activeCategory === cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "shrink-0 px-3.5 py-2 rounded-full text-xs font-medium transition-colors duration-150",
                  activeCategory === cat
                    ? "bg-[var(--bgColor-accent-emphasis)] text-[var(--fgColor-onEmphasis)]"
                    : "text-[var(--fgColor-muted)] hover:text-[var(--fgColor-default)] bg-[var(--bgColor-muted)] hover:bg-[#eff2f5]",
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Blog Posts Grid */}
      <div className="py-16 sm:py-20 bg-[var(--bgColor-inset)]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPosts.map((post, i) => (
              <PostCard key={post.slug} post={post} index={i} />
            ))}
          </div>
        </div>
      </div>

      {/* Subscribe */}
      <SubscribeSection />
    </>
  );
}

/* ==========================================================================
   Post Card
   ========================================================================== */

function PostCard({ post, index }: { post: BlogPost; index: number }) {
  const colors = categoryConfig[post.category];

  return (
    <motion.article
      className="group rounded-xl border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] p-6 premium-card glass-card-hover flex flex-col"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration: 0.4,
        delay: index * 0.06,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {/* Category pill */}
      <div className="mb-3">
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
          style={{
            color: colors.fg,
            backgroundColor: colors.bg,
            border: `1px solid ${colors.border}`,
          }}
        >
          {post.category}
        </span>
      </div>

      {/* Title */}
      <h2 className="text-base font-semibold text-[var(--fgColor-default)] mb-2 leading-snug group-hover:text-[var(--fgColor-accent)] transition-colors">
        <Link href={`/blog/${post.slug}`} className="hover:underline">
          {post.title}
        </Link>
      </h2>

      {/* Description */}
      <p className="text-sm text-[var(--fgColor-muted)] leading-relaxed mb-4 flex-1">
        {post.description}
      </p>

      {/* Meta row */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--borderColor-default)]">
        <div className="flex items-center gap-3 text-xs text-[var(--fgColor-muted)]">
          <span>{post.date}</span>
          <span className="flex items-center gap-1">
            <ClockIcon size={12} />
            {post.readTime}
          </span>
        </div>
        <Link
          href={`/blog/${post.slug}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--fgColor-accent)] hover:underline shrink-0"
        >
          Read more
          <ArrowRightIcon size={12} />
        </Link>
      </div>
    </motion.article>
  );
}

/* ==========================================================================
   Subscribe Section
   ========================================================================== */

function SubscribeSection() {
  return (
    <section
      id="subscribe"
      className="py-16 sm:py-20 bg-[var(--bgColor-default)]"
      aria-labelledby="subscribe-heading"
    >
      <div className="mx-auto max-w-xl px-6 text-center">
        <motion.div {...fadeUp}>
          <div className="w-12 h-12 rounded-xl bg-[var(--bgColor-accent-muted)] flex items-center justify-center mx-auto mb-5">
            <RssIcon size={22} className="text-[var(--fgColor-accent)]" />
          </div>
          <h2
            id="subscribe-heading"
            className="text-xl sm:text-2xl font-bold text-[var(--fgColor-default)] tracking-tight mb-3"
          >
            Subscribe to our blog
          </h2>
          <p className="text-sm text-[var(--fgColor-muted)] mb-6">
            Get the latest posts delivered to your inbox. No spam. Unsubscribe
            anytime.
          </p>
          <a
            href="/blog/rss.xml"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-[var(--fgColor-accent)] bg-[var(--bgColor-accent-muted)] hover:bg-[#cae8ff] transition-colors"
          >
            <RssIcon size={16} />
            RSS Feed
          </a>
        </motion.div>
      </div>
    </section>
  );
}
