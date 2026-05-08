import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  // Note: gzip/brotli compression is handled by the deployment platform
  // (Nginx, Cloudflare, Vercel, etc.) — not configured here.

  // ---------------------------------------------------------------------------
  // Image optimization — automatic WebP/AVIF, lazy loading, responsive sizing
  // ---------------------------------------------------------------------------
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1440, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },

  // ---------------------------------------------------------------------------
  // Security headers applied to all responses
  // ---------------------------------------------------------------------------
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent MIME type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Prevent clickjacking
          { key: "X-Frame-Options", value: "DENY" },
          // Enable XSS filter in older browsers
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // Referrer policy: send only origin on cross-origin
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Permissions policy: restrict browser features
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
      // Long cache for static assets with content hash
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Font caching
      {
        source: "/_next/static/media/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Image caching
      {
        source: "/_next/image(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  // ---------------------------------------------------------------------------
  // Redirects (existing)
  // ---------------------------------------------------------------------------
  async redirects() {
    return [
      // Old settings sub-routes → new top-level routes
      {
        source: "/settings/api-keys",
        destination: "/api-keys",
        permanent: true,
      },
      {
        source: "/settings/api-keys/:path*",
        destination: "/api-keys/:path*",
        permanent: true,
      },
      {
        source: "/settings/webhooks",
        destination: "/webhooks",
        permanent: true,
      },
      {
        source: "/settings/webhooks/:path*",
        destination: "/webhooks/:path*",
        permanent: true,
      },
      {
        source: "/settings/team",
        destination: "/team",
        permanent: true,
      },
      {
        source: "/settings/team/:path*",
        destination: "/team/:path*",
        permanent: true,
      },
      // Renamed routes
      {
        source: "/audit",
        destination: "/activity",
        permanent: true,
      },
      {
        source: "/audit/:path*",
        destination: "/activity/:path*",
        permanent: true,
      },
      {
        source: "/usage-insights",
        destination: "/usage",
        permanent: true,
      },
      {
        source: "/usage-insights/:path*",
        destination: "/usage/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
