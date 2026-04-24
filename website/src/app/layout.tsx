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
    "FeatureSignals is the open-source feature flag platform built for mission-critical delivery. Sub-millisecond evaluation latency, automated stale flag cleanup via AI, flat-rate pricing with no per-MAU fees, and OpenFeature-native SDKs. Self-host or use our cloud. The LaunchDarkly alternative that frees you from vendor lock-in.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    type: "website",
    siteName: "FeatureSignals",
    locale: "en_US",
    images: [
      {
        url: "/favicon.svg",
        width: 1200,
        height: 630,
        alt: "FeatureSignals — Open-Source Feature Flag Platform",
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
    "LaunchDarkly competitor",
    "open source feature flags",
    "self-hosted feature flags",
    "enterprise feature flags",
    "flag rot",
    "AI janitor",
    "stale flag cleanup",
    "progressive delivery",
    "canary releases",
    "GitOps feature flags",
    "OpenFeature",
    "feature flag platform",
    "Terraform feature flags",
    "free feature flags",
    "flat-rate feature flags",
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
        {/* JSON-LD Structured Data for Google Rich Results */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "SoftwareApplication",
                  name: "FeatureSignals",
                  applicationCategory: "DeveloperApplication",
                  operatingSystem: "Linux, macOS, Windows",
                  description:
                    "Open-source feature flag platform with sub-millisecond evaluation, AI-powered stale flag cleanup, flat-rate pricing, and OpenFeature-native SDKs. Self-host or cloud.",
                  url: "https://featuresignals.com",
                  offers: {
                    "@type": "Offer",
                    price: "0",
                    priceCurrency: "USD",
                    priceValidUntil: new Date(
                      new Date().setFullYear(new Date().getFullYear() + 1),
                    ).toISOString(),
                    availability: "https://schema.org/InStock",
                  },
                  author: {
                    "@type": "Organization",
                    name: "Vivekananda Technology Labs",
                    url: "https://featuresignals.com/about",
                  },
                },
                {
                  "@type": "Organization",
                  name: "FeatureSignals",
                  url: "https://featuresignals.com",
                  description:
                    "Open-source enterprise feature flag platform. Sub-millisecond latency, AI janitor for stale flags, flat-rate pricing, OpenFeature-native.",
                  logo: "https://featuresignals.com/favicon.svg",
                  foundingDate: "2024",
                  founders: [
                    {
                      "@type": "Person",
                      name: "Dinesh G",
                    },
                  ],
                  address: {
                    "@type": "PostalAddress",
                    streetAddress:
                      "Plot no 308, L5-Block, LIG, Chitrapuri Colony, Manikonda",
                    addressLocality: "Hyderabad",
                    addressRegion: "Telangana",
                    postalCode: "500089",
                    addressCountry: "IN",
                  },
                  contactPoint: {
                    "@type": "ContactPoint",
                    email: "sales@featuresignals.com",
                    contactType: "sales",
                    availableLanguage: ["English"],
                  },
                  sameAs: [
                    "https://github.com/dinesh-g1/featuresignals",
                    "https://linkedin.com/company/featuresignals",
                    "https://x.com/featuresignals",
                    "https://discord.gg/featuresignals",
                  ],
                },
                {
                  "@type": "WebSite",
                  name: "FeatureSignals",
                  url: "https://featuresignals.com",
                  potentialAction: {
                    "@type": "SearchAction",
                    target: {
                      "@type": "EntryPoint",
                      urlTemplate:
                        "https://featuresignals.com/search?q={search_term_string}",
                    },
                    "query-input": "required name=search_term_string",
                  },
                },
              ],
            }),
          }}
        />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
