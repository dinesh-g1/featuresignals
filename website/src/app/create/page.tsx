import type { Metadata } from "next";
import { CreatePageContent } from "./content";

export const metadata: Metadata = {
  title: "Create Feature Flags",
  description:
    "Every feature flag has a lifecycle. Start here — create and configure feature flags with FeatureSignals' flag editor.",
};

export default function CreatePage() {
  return <CreatePageContent />;
}
