import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Use Cases",
  description:
    "Discover how engineering teams use FeatureSignals for progressive rollouts, A/B testing, kill switches, trunk-based development, beta programs, and more.",
};

export default function UseCasesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
