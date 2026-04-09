import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, transparent pricing for FeatureSignals. Start free with unlimited flags and evaluations. Upgrade to Pro for team features, or Enterprise for dedicated support and compliance.",
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
