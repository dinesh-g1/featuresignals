import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://featuresignals.com"),
  title: {
    template: "%s | FeatureSignals",
    default:
      "FeatureSignals | Mission-Critical Feature Flags — Zero Vendor Lock-In",
  },
  description:
    "The control plane for software delivery. Sub-millisecond latency. Automated tech-debt cleanup. OpenFeature native, Terraform-integrated. Flat pricing — never per MAU.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    type: "website",
    siteName: "FeatureSignals",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "FeatureSignals — Enterprise Feature Flag Platform",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "./" },
  keywords: [
    "feature flags",
    "feature flag management",
    "feature toggles",
    "A/B testing",
    "LaunchDarkly alternative",
    "open source",
    "self-hosted",
    "enterprise feature flags",
    "flag rot",
    "AI janitor",
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
    <html
      lang="en"
      className={`${inter.variable} scroll-smooth`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-screen flex flex-col bg-stone-50 text-stone-900 font-sans antialiased selection:bg-accent selection:text-white">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
