import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
  async rewrites() {
    const apiUrl =
      process.env.NEXT_PUBLIC_OPS_API_URL || "http://localhost:8080/api/v1/ops";
    // Extract just the origin + prefix from the API URL
    // e.g., http://localhost:8080/api/v1/ops -> http://localhost:8080
    const url = new URL(apiUrl);
    const baseOrigin = url.origin;
    const apiPrefix = url.pathname; // e.g., /api/v1/ops

    return [
      {
        source: "/api/v1/ops/:path*",
        destination: `${baseOrigin}${apiPrefix}/:path*`,
      },
    ];
  },
};

export default nextConfig;
