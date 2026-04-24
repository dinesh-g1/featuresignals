import Link from "next/link";
import type { Metadata } from "next";
import { Sparkles, ArrowRight, Calendar, User, Tag } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Engineering insights, product updates, and best practices for feature flag management. Written by the FeatureSignals team.",
};

const posts = [
  {
    title: "Introducing the AI Janitor: Automated Stale Flag Cleanup",
    excerpt:
      "Feature flag rot is one of the biggest sources of technical debt in modern software delivery. The AI Janitor automatically detects stale flags, scans your codebase for references, and generates cleanup PRs — so you don't have to.",
    date: "2026-01-15",
    author: "Dinesh G",
    category: "Product",
    slug: "introducing-ai-janitor",
    readTime: "5 min read",
  },
  {
    title: "Migrating from LaunchDarkly: A Complete Guide",
    excerpt:
      "Thinking about migrating away from LaunchDarkly? We walk through the entire process — from API key setup and flag mapping to targeting rule translation and validation. Includes migration checklists for each phase.",
    date: "2026-01-10",
    author: "Sai K",
    category: "Engineering",
    slug: "migrating-from-launchdarkly-guide",
    readTime: "8 min read",
  },
  {
    title: "How We Achieve Sub-Millisecond Flag Evaluation",
    excerpt:
      "Feature flag evaluation sits on every request path — latency matters. Here's how we optimized our evaluation engine to achieve <1ms p99 latency through caching, lock-free data structures, and query optimization.",
    date: "2026-01-05",
    author: "Priya M",
    category: "Engineering",
    slug: "sub-millisecond-flag-evaluation",
    readTime: "12 min read",
  },
  {
    title: "Multi-IaC Provider Support: Terraform, Pulumi, and Ansible",
    excerpt:
      "Infrastructure as Code is the standard for managing modern infrastructure. FeatureSignals now supports Terraform, Pulumi, and Ansible — with Crossplane and CDKTF coming soon. Here's how it works.",
    date: "2025-12-28",
    author: "Arun R",
    category: "Product",
    slug: "multi-iac-provider-support",
    readTime: "6 min read",
  },
  {
    title: "OpenFeature Standard: Why Interoperability Matters",
    excerpt:
      "The OpenFeature standard is transforming the feature flag ecosystem by enabling provider-agnostic SDKs. FeatureSignals is proud to be a native OpenFeature provider. Here's what that means for your team.",
    date: "2025-12-20",
    author: "Neha S",
    category: "Engineering",
    slug: "openfeature-interoperability",
    readTime: "7 min read",
  },
  {
    title: "Building a SOC 2 Compliant Feature Flag Platform",
    excerpt:
      "Security and compliance are table stakes for enterprise software. We share our journey to SOC 2 Type II certification — the controls we implemented, the audits we passed, and what it means for our customers.",
    date: "2025-12-15",
    author: "Rahul V",
    category: "Security",
    slug: "soc2-compliant-feature-flags",
    readTime: "10 min read",
  },
  {
    title: "The Cost of Flag Rot: Quantifying Technical Debt",
    excerpt:
      "Every stale feature flag in your codebase carries a cost — cognitive load, code complexity, testing overhead, and deployment risk. We built a calculator to quantify this debt and predict cleanup ROI.",
    date: "2025-12-10",
    author: "Dinesh G",
    category: "Best Practices",
    slug: "cost-of-flag-rot",
    readTime: "6 min read",
  },
  {
    title: "Progressive Delivery: Beyond Feature Flags",
    excerpt:
      "Feature flags are just the beginning. Progressive delivery combines flags with targeted rollouts, automated canary analysis, and observability to create a safer, faster release process.",
    date: "2025-12-05",
    author: "Sai K",
    category: "Best Practices",
    slug: "progressive-delivery-beyond-flags",
    readTime: "9 min read",
  },
];

const categories = [
  "All",
  "Product",
  "Engineering",
  "Security",
  "Best Practices",
];

export default function BlogPage() {
  return (
    <>
      {/* BreadcrumbList JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: "https://featuresignals.com",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Blog",
                item: "https://featuresignals.com/blog",
              },
            ],
          }),
        }}
      />
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-stone-200 bg-stone-50">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-1.5 text-xs font-semibold text-stone-500 mb-6">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Engineering insights &amp; product updates
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-stone-900 mb-6">
              The <span className="text-accent">FeatureSignals</span> Blog
            </h1>
            <p className="text-lg sm:text-xl text-stone-600 max-w-2xl mx-auto leading-relaxed">
              Engineering insights, product updates, and best practices for
              shipping software with confidence.
            </p>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex flex-wrap gap-3 justify-center">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  cat === "All"
                    ? "bg-accent text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="border-b border-stone-200 bg-stone-50">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:py-16">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {posts.map((post) => (
              <article
                key={post.slug}
                className="group rounded-xl border border-stone-200 bg-white overflow-hidden transition-all hover:shadow-lg hover:border-accent/20"
              >
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent">
                      <Tag className="h-3 w-3" strokeWidth={2.5} />
                      {post.category}
                    </span>
                    <span className="text-[11px] text-stone-400">
                      {post.readTime}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-stone-900 mb-2 group-hover:text-accent transition-colors">
                    <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                  </h2>
                  <p className="text-sm text-stone-600 leading-relaxed mb-4">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-stone-100">
                    <div className="flex items-center gap-2 text-xs text-stone-400">
                      <Calendar className="h-3 w-3" strokeWidth={1.5} />
                      {post.date}
                      <span className="mx-1">·</span>
                      <User className="h-3 w-3" strokeWidth={1.5} />
                      {post.author}
                    </div>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="text-accent hover:text-accent-dark transition-colors"
                    >
                      <ArrowRight className="h-4 w-4" strokeWidth={2} />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-stone-900">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Stay updated
          </h2>
          <p className="text-stone-400 max-w-xl mx-auto mb-8">
            Get the latest posts delivered to your inbox. No spam — just
            engineering insights and product updates.
          </p>
          <form
            className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto"
            action="#"
            method="post"
          >
            <input
              type="email"
              placeholder="you@company.com"
              className="w-full rounded-xl border border-stone-700 bg-stone-800 px-4 py-3 text-sm text-white placeholder-stone-500 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
              required
            />
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-white hover:bg-accent-dark transition-colors shadow-md shrink-0"
            >
              Subscribe
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
