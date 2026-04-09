import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Explore FeatureSignals feature flag capabilities: boolean, string, number, and JSON flags, percentage rollouts, A/B experimentation, real-time SSE streaming, kill switches, audit logs, and SDKs for every stack.",
};

export default function FeaturesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
