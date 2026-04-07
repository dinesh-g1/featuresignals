export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  category: "engineering" | "product" | "guide" | "changelog";
  readingTime: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "what-are-feature-flags",
    title: "What Are Feature Flags? A Complete Guide for Engineering Teams",
    description:
      "Feature flags decouple deployment from release. Learn what they are, why every engineering team needs them, and how to implement them without creating technical debt.",
    date: "2026-04-07",
    author: "FeatureSignals Team",
    category: "guide",
    readingTime: "8 min read",
  },
  {
    slug: "progressive-rollouts-best-practices",
    title: "Progressive Rollouts: Ship Faster Without Breaking Things",
    description:
      "Percentage-based rollouts let you ship to 1% of users, validate, and scale to 100%. This guide covers best practices, common pitfalls, and real-world strategies.",
    date: "2026-04-06",
    author: "FeatureSignals Team",
    category: "engineering",
    readingTime: "7 min read",
  },
  {
    slug: "feature-flags-vs-environment-variables",
    title: "Feature Flags vs Environment Variables: When to Use Which",
    description:
      "Environment variables and feature flags both control behavior, but they solve different problems. Learn when each is appropriate and why mixing them creates risk.",
    date: "2026-04-05",
    author: "FeatureSignals Team",
    category: "engineering",
    readingTime: "6 min read",
  },
  {
    slug: "managing-feature-flag-lifecycle",
    title: "Managing the Feature Flag Lifecycle: From Creation to Cleanup",
    description:
      "Feature flags left unchecked become technical debt. Learn a systematic approach to flag lifecycle management with categories, staleness rules, and deprecation workflows.",
    date: "2026-04-04",
    author: "FeatureSignals Team",
    category: "guide",
    readingTime: "9 min read",
  },
  {
    slug: "open-source-vs-saas-feature-flags",
    title: "Open-Source vs SaaS Feature Flags: Making the Right Choice",
    description:
      "Self-hosted open-source or managed SaaS? Compare total cost, control, compliance, and operational overhead for feature flag platforms.",
    date: "2026-04-03",
    author: "FeatureSignals Team",
    category: "product",
    readingTime: "7 min read",
  },
];
