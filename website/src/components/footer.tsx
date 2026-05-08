import Link from "next/link";
import { PrismLotus } from "@/components/prism-lotus";

/**
 * Footer — Enterprise-grade, Tailscale/Sanity inspired
 *
 * Dark themed footer with organized columns, social links,
 * system status indicator, and legal information.
 */

const footerSections = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "Use Cases", href: "/use-cases" },
      { label: "Pricing", href: "/pricing" },
      { label: "Integrations", href: "/integrations" },
      { label: "Customer Stories", href: "/customers" },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    title: "Platform",
    links: [
      { label: "Feature Flags", href: "/features#feature-flags" },
      { label: "A/B Experiments", href: "/features#experiments" },
      { label: "AI Janitor", href: "/features#ai-janitor" },
      { label: "Migration Engine", href: "/features#migration" },
      { label: "Governance & RBAC", href: "/features#governance" },
      { label: "OpenFeature SDKs", href: "/integrations#sdks" },
    ],
  },
  {
    title: "Developers",
    links: [
      {
        label: "Documentation",
        href: "/docs",
      },
      {
        label: "API Reference",
        href: "/docs/api-reference/overview",
      },
      {
        label: "SDKs (8 Languages)",
        href: "/integrations#sdks",
      },
      {
        label: "Terraform Provider",
        href: "/integrations#iac",
      },
      {
        label: "OpenFeature",
        href: "/integrations#openfeature",
      },
      {
        label: "GitHub",
        href: "https://github.com/dinesh-g1/featuresignals",
        external: true,
      },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Partners", href: "/partners" },
      { label: "Contact Sales", href: "/contact" },
      {
        label: "System Status",
        href: "https://status.featuresignals.com",
        external: true,
      },
      {
        label: "Changelog",
        href: "https://github.com/dinesh-g1/featuresignals/releases",
        external: true,
      },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms & Conditions", href: "/terms-and-conditions" },
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Refund Policy", href: "/refund-policy" },
      { label: "Cancellation Policy", href: "/cancellation-policy" },
      { label: "Shipping Policy", href: "/shipping-policy" },
    ],
  },
];

const socialLinks = [
  {
    label: "GitHub",
    href: "https://github.com/dinesh-g1/featuresignals",
    icon: GitHubIcon,
  },
  {
    label: "Discord",
    href: "https://discord.gg/featuresignals",
    icon: DiscordIcon,
  },
  {
    label: "LinkedIn",
    href: "https://linkedin.com/company/featuresignals",
    icon: LinkedInIcon,
  },
  {
    label: "X (Twitter)",
    href: "https://x.com/featuresignals",
    icon: XIcon,
  },
];

/* ---- Social Icon Components ---- */

function GitHubIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
    </svg>
  );
}

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-gradient-mesh-dark border-t border-[var(--signal-border-default)]">
      <div
        className="absolute inset-0 bg-dots-dark pointer-events-none"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-7xl px-6 py-16 sm:py-24">
        {/* Top section: Brand + Links Grid */}
        <div className="flex flex-col lg:flex-row justify-between items-start gap-10 mb-12">
          {/* Brand column */}
          <div className="max-w-xs">
            <div className="flex items-center space-x-2 mb-4">
              <PrismLotus size="sm" variant="icon" colorScheme="white" />
              <span className="font-bold tracking-tight text-white text-lg">
                FeatureSignals
              </span>
            </div>
            <p
              className="text-sm leading-relaxed mb-6"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              The control plane for software delivery. Sub-millisecond feature
              flags, AI-powered stale flag detection, and OpenFeature-native
              SDKs — open source, self-hosted or cloud.
            </p>
            {/* Social links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white hover:scale-110 transition-all duration-200"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                  aria-label={link.label}
                >
                  <link.icon />
                </a>
              ))}
            </div>
          </div>

          {/* Links grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-10 flex-1">
            {footerSections.map((section) => (
              <div key={section.title}>
                <h3
                  className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-4"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                >
                  {section.title}
                </h3>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      {link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm hover:text-white/90 transition-colors"
                          style={{ color: "rgba(255,255,255,0.55)" }}
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-sm hover:text-white/90 transition-colors"
                          style={{ color: "rgba(255,255,255,0.55)" }}
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Status bar */}
        <div
          className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4"
          style={{
            borderColor: "var(--fs-bg-inverse-border)",
            borderTopWidth: "1px",
          }}
        >
          <div className="flex items-center space-x-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <span
              className="font-mono text-sm font-medium"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              All Systems Operational
            </span>
          </div>

          <div className="flex gap-6 text-sm">
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium border border-[var(--fs-bg-inverse-border)]"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              SOC 2 Type II
            </span>
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium border border-[var(--fs-bg-inverse-border)]"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              OpenFeature Native
            </span>
            <a
              href="https://status.featuresignals.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium border border-[var(--fs-bg-inverse-border)] hover:text-white/90 transition-colors"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              Uptime 99.95%
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-6 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs"
          style={{
            borderColor: "var(--fs-bg-inverse-border)",
            borderTopWidth: "1px",
            color: "rgba(255,255,255,0.25)",
          }}
        >
          <p>
            &copy; {currentYear} Vivekananda Technology Labs, trading as
            FeatureSignals. Apache-2.0 License.
          </p>
          <p>
            Plot no 308, L5-Block, LIG, Chitrapuri Colony, Manikonda, Hyderabad,
            Telangana - 500089, India
          </p>
        </div>
      </div>
    </footer>
  );
}
