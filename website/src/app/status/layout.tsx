import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "System Status",
  description:
    "Real-time health and uptime status of FeatureSignals infrastructure across all regions. Monitor API, database, evaluation engine, and streaming service availability.",
};

export default function StatusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
