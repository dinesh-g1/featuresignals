import React from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";

/**
 * FeatureSignals Developer Documentation — Landing Page
 *
 * Design system: GitHub Primer
 * Matches: website (featuresignals.com), dashboard (app.featuresignals.com), GitHub
 *
 * Uses staggered CSS animations (stagger-1 through stagger-5) defined in custom.css
 * for progressive content reveal — no JavaScript animation library needed.
 */

const cards = [
  {
    title: "Integration Guide",
    description:
      "Get started with FeatureSignals. Install the SDK, create your first feature flag, and learn core concepts like targeting, rollouts, and environments.",
    link: "/getting-started/quickstart",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
    iconClass: "docs-card-icon",
  },
  {
    title: "API Playground",
    description:
      "Explore the full REST API with an interactive playground. Try requests, see responses live, and test authentication flows.",
    link: "/api-playground",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    iconClass: "docs-card-icon docs-card-icon--attention",
  },
  {
    title: "SDKs",
    description:
      "Official SDKs for Go, Node.js, Python, Java, .NET, Ruby, React, Vue, and OpenFeature. All sub-millisecond evaluation.",
    link: "/sdks/overview",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
        <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
        <line x1="6" y1="6" x2="6.01" y2="6" />
        <line x1="6" y1="18" x2="6.01" y2="18" />
      </svg>
    ),
    iconClass: "docs-card-icon docs-card-icon--done",
  },
  {
    title: "Tutorials",
    description:
      "Step-by-step guides: feature-flag a checkout flow, run A/B tests, progressive rollouts, and configure kill switches.",
    link: "/tutorials/feature-flag-checkout",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    iconClass: "docs-card-icon docs-card-icon--success",
  },
  {
    title: "Architecture",
    description:
      "Understand the evaluation engine, real-time updates, cache invalidation, and the hexagonal architecture powering FeatureSignals.",
    link: "/architecture/overview",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    iconClass: "docs-card-icon docs-card-icon--danger",
  },
  {
    title: "Self-Hosting",
    description:
      "Deploy FeatureSignals on your own infrastructure. Docker Compose, Kubernetes, or bare metal. Full control, zero data egress.",
    link: "/self-hosting/onboarding-guide",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    ),
    iconClass: "docs-card-icon",
  },
];

export default function Home(): React.JSX.Element {
  return (
    <Layout
      title="Developer Documentation"
      description="FeatureSignals developer documentation — feature flag management, SDKs, API reference, tutorials, and architecture"
    >
      <main className="docs-landing">
        {/* Hero — staggered entrance */}
        <div className="docs-landing-hero animate-slide-up">
          <h1>FeatureSignals Developer Documentation</h1>
          <p className="subtitle">
            Everything you need to ship features safely. Feature flags,
            targeting, A/B testing, gradual rollouts, and AI-powered stale flag
            cleanup — all with sub-millisecond evaluation.
          </p>
        </div>

        {/* Card Grid — staggered progressive reveal */}
        <div className="docs-card-grid">
          {cards.map((card, i) => (
            <Link
              key={card.title}
              to={card.link}
              className={`docs-card stagger-${i + 1}`}
              style={{ animationDelay: `${0.05 + i * 0.07}s` }}
            >
              <div className={card.iconClass}>{card.icon}</div>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
              <span className="docs-card-arrow">
                Explore
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </main>
    </Layout>
  );
}
