import React from 'react';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';

const cards = [
  {
    title: 'Integration Guide',
    description: 'Get started with FeatureSignals — install the SDK, create your first flag, and learn core concepts.',
    link: '/getting-started/quickstart',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
  {
    title: 'API Playground',
    description: 'Explore the full REST API with an interactive playground. Try requests and see responses live.',
    link: '/api-playground',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    title: 'SDKs',
    description: 'Official SDKs for Go, Node.js, Python, Java, .NET, Ruby, React, Vue, and OpenFeature.',
    link: '/sdks/overview',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
        <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
        <line x1="6" y1="6" x2="6.01" y2="6" />
        <line x1="6" y1="18" x2="6.01" y2="18" />
      </svg>
    ),
  },
  {
    title: 'Tutorials',
    description: 'Step-by-step guides: feature-flag a checkout, run A/B tests, progressive rollouts, and kill switches.',
    link: '/tutorials/feature-flag-checkout',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
];

export default function Home(): React.JSX.Element {
  return (
    <Layout title="Developer Documentation" description="FeatureSignals developer documentation — feature flag management for modern teams">
      <main className="docs-landing">
        <h1>FeatureSignals Developer Documentation</h1>
        <p className="subtitle">
          Everything you need to ship features safely with feature flags, targeting, A/B testing, and real-time updates.
        </p>
        <div className="cards">
          {cards.map((card) => (
            <a key={card.title} className="card" href={useBaseUrl(card.link)}>
              <span style={{color: 'var(--ifm-color-primary)'}}>{card.icon}</span>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </a>
          ))}
        </div>
      </main>
    </Layout>
  );
}
