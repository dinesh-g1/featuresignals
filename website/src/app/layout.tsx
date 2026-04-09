import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://featuresignals.com"),
  title: {
    template: "%s | FeatureSignals",
    default: "FeatureSignals | Open-Source Feature Flag Management",
  },
  description:
    "Open-source feature flag management platform. Self-hosted, Apache-2.0 licensed, with A/B experimentation, real-time updates, and SDKs for every stack.",
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
        alt: "FeatureSignals — Open-Source Feature Flag Management",
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
    "open source",
    "self-hosted",
    "SDKs",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} scroll-smooth`}>
      <body className="min-h-screen flex flex-col bg-white text-slate-900 font-sans antialiased">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
