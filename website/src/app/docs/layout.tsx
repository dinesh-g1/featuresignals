import type { Metadata } from "next";
import { DocsSidebar } from "@/components/docs-sidebar";

export const metadata: Metadata = {
  title: {
    default: "Documentation",
    template: "%s | FeatureSignals Docs",
  },
  description:
    "FeatureSignals documentation — learn about feature flags, SDKs, API reference, AI Janitor, deployment, and compliance.",
  openGraph: {
    title: "FeatureSignals Documentation",
    description:
      "The control plane for software delivery. Sub-millisecond feature flags, AI-powered stale flag detection, and OpenFeature-native SDKs.",
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="lg:grid lg:grid-cols-[280px_1fr] min-h-screen">
      <DocsSidebar />

      {/* Main content area — scrolls alongside sticky sidebar on desktop */}
      <main className="min-h-screen" aria-labelledby="docs-main-heading">
        <div className="mx-auto max-w-4xl px-6 py-8 sm:py-10 lg:px-10 lg:py-12">
          {children}
        </div>
      </main>
    </div>
  );
}
