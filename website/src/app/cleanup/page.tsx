import type { Metadata } from "next";
import { CleanupPageContent } from "./content";

export const metadata: Metadata = {
  title: "AI Janitor — Automated Stale Flag Cleanup",
  description:
    "Flags that outlive their purpose become technical debt. FeatureSignals AI Janitor automatically detects and removes stale feature flags.",
};

export default function CleanupPage() {
  return <CleanupPageContent />;
}
