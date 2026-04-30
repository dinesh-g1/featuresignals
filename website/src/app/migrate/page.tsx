import type { Metadata } from "next";
import { MigratePageContent } from "./content";

export const metadata: Metadata = {
  title: "Migrate from Other Feature Flag Platforms",
  description:
    "Already using another platform? Migrate your feature flags to FeatureSignals in minutes with our automated migration tools.",
};

export default function MigratePage() {
  return <MigratePageContent />;
}
