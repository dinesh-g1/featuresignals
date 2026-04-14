import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { HydrateAuth } from "@/components/hydrate-auth";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FeatureSignals Ops Portal",
  description:
    "Internal operations portal for FeatureSignals infrastructure management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} min-h-full bg-gray-950 text-white`}>
        <HydrateAuth />
        {children}
      </body>
    </html>
  );
}
