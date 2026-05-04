import type { Metadata } from "next";
import { PricingPageContent } from "./content";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "FeatureSignals pricing: Free to start, $29/month flat for unlimited seats. Self-hosted is free forever under Apache 2.0. No per-seat penalties, no hidden fees.",
  openGraph: {
    title: "FeatureSignals Pricing — Free to start, flat-rate Pro, no per-seat penalties",
    description:
      "Free for individuals and small teams. Pro at $29/month flat (unlimited seats). Enterprise with custom pricing. Self-hosted free forever under Apache 2.0.",
  },
};

export default function PricingPage() {
  return <PricingPageContent />;
}
