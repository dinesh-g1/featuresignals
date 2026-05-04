import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import {
  AnnouncementBanner,
  DEFAULT_ANNOUNCEMENT,
} from "@/components/announcement-banner";

export const metadata: Metadata = {
  metadataBase: new URL("https://featuresignals.com"),
  title: {
    template: "%s | FeatureSignals",
    default:
      "FeatureSignals | Release Infrastructure Platform — Sub-Millisecond Feature Flags",
  },
  description:
    "The control plane for software delivery. FeatureSignals provides sub-millisecond feature flags, AI-powered stale flag detection, A/B experimentation, and OpenFeature-native SDKs — open source, self-hosted or cloud. Enterprise-grade release infrastructure for teams that ship.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    type: "website",
    siteName: "FeatureSignals",
    locale: "en_US",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "FeatureSignals — The LaunchDarkly Alternative. Sub-millisecond. Open-source. Flat-rate pricing.",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "https://featuresignals.com" },
  keywords: [
    "feature flags",
    "LaunchDarkly alternative",
    "LaunchDarkly competitor",
    "LaunchDarkly pricing comparison",
    "open source feature flags",
    "self-hosted feature flags",
    "feature flag management",
    "feature toggles",
    "flat-rate feature flags",
    "free feature flags",
    "A/B testing",
    "AI janitor",
    "stale flag cleanup",
    "flag rot",
    "progressive delivery",
    "canary releases",
    "GitOps feature flags",
    "OpenFeature",
    "Terraform feature flags",
    "sub-millisecond feature flags",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" data-scroll-behavior="smooth">
      <head />
      <body className="min-h-screen flex flex-col bg-[var(--bgColor-default)] text-[var(--fgColor-default)] font-sans antialiased">
        {/* Announcement Banner */}
        {DEFAULT_ANNOUNCEMENT.DISPLAY && (
          <AnnouncementBanner
            text={DEFAULT_ANNOUNCEMENT.TEXT}
            ctaLabel={DEFAULT_ANNOUNCEMENT.CTA_LABEL}
            ctaHref={DEFAULT_ANNOUNCEMENT.CTA_HREF}
            links={DEFAULT_ANNOUNCEMENT.LINKS}
          />
        )}

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
