import type { Metadata } from "next";
import { PartnersPageContent } from "./content";

export const metadata: Metadata = {
  title: "Partners",
  description:
    "Partner with FeatureSignals — technology integrations, solution partnerships, and cloud marketplaces. Unlock new opportunities with the open-source feature flag platform.",
  openGraph: {
    title: "FeatureSignals Partners — Technology, Solution & Cloud Partnerships",
    description:
      "Unlock new opportunities by integrating with the open-source feature flag platform. Technology partners, solution partners, and cloud marketplaces.",
  },
};

export default function PartnersPage() {
  return <PartnersPageContent />;
}
