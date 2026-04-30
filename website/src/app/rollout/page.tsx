import type { Metadata } from "next";
import { RolloutPageContent } from "./content";

export const metadata: Metadata = {
  title: "Gradual Rollouts & Canary Releases",
  description:
    "Ship with confidence. Gradual percentage rollouts, canary releases, and ring deployments for feature flags.",
};

export default function RolloutPage() {
  return <RolloutPageContent />;
}
