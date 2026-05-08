import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://app.featuresignals.com"),
  title: {
    template: "%s | FeatureSignals",
    default: "FeatureSignals | Enterprise Feature FlagIcon Control Plane",
  },
  description:
    "The enterprise control plane for mission-critical feature flags. Sub-millisecond evaluation, automated tech-debt cleanup, OpenFeature native, Terraform-integrated.",
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    type: "website",
    siteName: "FeatureSignals",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "FeatureSignals — Enterprise Feature FlagIcon Platform",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  keywords: [
    "feature flags",
    "feature flag management",
    "enterprise feature flags",
    "LaunchDarkly alternative",
    "flag rot",
    "GitOps",
    "OpenFeature",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <head />
      <body className="min-h-full flex flex-col bg-[var(--signal-bg-primary)] text-[var(--signal-fg-primary)] font-sans antialiased selection:bg-[var(--signal-bg-accent-emphasis)] selection:text-white">
        {/* Skip-to-content link — visible on focus for keyboard users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-md focus:bg-[var(--signal-bg-accent-emphasis)] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg focus:outline-none"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
