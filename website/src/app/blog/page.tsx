import type { Metadata } from "next";
import { BlogContent } from "./blog-content";
import { posts } from "@/lib/blog-posts";

export const metadata: Metadata = {
  title: "Engineering Blog",
  description:
    "Stories about feature flags, release infrastructure, and building better software — from the FeatureSignals engineering team.",
};

/* ==========================================================================
   Page (Server Component)
   ========================================================================== */

export default function BlogPage() {
  return (
    <>
      <BlogHero />
      <BlogContent posts={posts} />
    </>
  );
}

/* ==========================================================================
   Hero (Server Component — no interactivity needed)
   ========================================================================== */

function BlogHero() {
  return (
    <section
      id="hero"
      className="py-20 sm:py-28 bg-[var(--bgColor-default)]"
      aria-labelledby="blog-hero-heading"
    >
      <div className="mx-auto max-w-3xl px-6 text-center">
        <p className="text-xs font-semibold text-[var(--fgColor-accent)] uppercase tracking-wider mb-4">
          Blog
        </p>
        <h1
          id="blog-hero-heading"
          className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--fgColor-default)] tracking-tight mb-4"
        >
          Engineering Blog
        </h1>
        <p className="text-lg text-[var(--fgColor-muted)] max-w-xl mx-auto">
          Stories about feature flags, release infrastructure, and building
          better software.
        </p>
      </div>
    </section>
  );
}
