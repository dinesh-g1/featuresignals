import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

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
    <html lang="en" className={`${inter.variable} h-full scroll-smooth`}>
      <head />
      <body className="min-h-full flex flex-col bg-[var(--bgColor-default)] text-[var(--fgColor-default)] font-sans antialiased selection:bg-[var(--bgColor-accent-emphasis)] selection:text-white">
        {children}
      </body>
    </html>
  );
}
