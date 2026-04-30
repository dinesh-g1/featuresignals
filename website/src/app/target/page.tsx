import type { Metadata } from "next";
import { TargetPageContent } from "./content";

export const metadata: Metadata = {
  title: "Target Users & Segments",
  description:
    "Precision targeting for feature flags. Route features to the right users based on any attribute — plan, country, email domain, or custom properties.",
};

export default function TargetPage() {
  return <TargetPageContent />;
}
