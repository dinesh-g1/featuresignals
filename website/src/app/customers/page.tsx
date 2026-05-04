import type { Metadata } from "next";
import { CustomersPageContent } from "./content";

export const metadata: Metadata = {
  title: "Customer Stories",
  description:
    "See how engineering teams use FeatureSignals to ship faster, reduce technical debt, and maintain compliance. Trusted by 500+ teams processing 10M+ evaluations per day.",
  openGraph: {
    title: "FeatureSignals Customer Stories — Trusted by engineering teams worldwide",
    description:
      "See how teams use FeatureSignals to ship faster, reduce technical debt, and maintain compliance.",
  },
};

export default function CustomersPage() {
  return <CustomersPageContent />;
}
