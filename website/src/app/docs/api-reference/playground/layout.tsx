import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Playground",
  description:
    "Interactive API playground — test FeatureSignals REST API endpoints directly in your browser with the OpenAPI-powered Scalar reference UI.",
  openGraph: {
    title: "API Playground | FeatureSignals Documentation",
    description:
      "Interactive API playground — test FeatureSignals REST API endpoints directly in your browser.",
  },
};

export default function PlaygroundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
