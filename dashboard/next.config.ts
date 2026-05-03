import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
