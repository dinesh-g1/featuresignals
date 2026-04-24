import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  // Explicitly set the turbopack root to prevent Next.js 16
  // from incorrectly detecting the monorepo root when multiple
  // lockfiles exist at the project root.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
