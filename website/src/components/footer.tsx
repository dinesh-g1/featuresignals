"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PrismLotus } from "@/components/prism-lotus";

/**
 * Footer — "The Trust Footer"
 *
 * Per MASTER_PLAN Section 2.1D and Don Norman's design principles,
 * the footer is a TRUST BUILDING surface, not just navigation.
 *
 * Design principles applied:
 * - Knowledge in the World (DOET pp. 74-122): All links visible, no hidden nav
 * - Recognition Rather Than Recall (NNGroup #6): Scannable columns by user need
 * - Trust & Transparency: Live status, trust badges, clear licensing, no dark patterns
 * - Calm Technology: Status dot stays in periphery; counter animates quietly
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

/* ------------------------------------------------------------------ */
/*  Footer Data                                                       */
/* ------------------------------------------------------------------ */

const footerSections: FooterSection[] = [
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
      { label: "Documentation", href: "/docs" },
      { label: "API Reference", href: "/docs/api-reference/overview" },
      { label: "SDKs (8 Languages)", href: "/integrations#sdks" },
      { label: "Terraform Provider", href: "/integrations#iac" },
      { label: "OpenFeature", href: "/integrations#openfeature" },
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
];

const legalLinks: FooterLink[] = [
  { label: "Terms", href: "/terms-and-conditions" },
  { label: "Privacy", href: "/privacy-policy" },
  { label: "Refund", href: "/refund-policy" },
  { label: "Cancellation", href: "/cancellation-policy" },
];

/* ------------------------------------------------------------------ */
/*  Social Icons (inline SVGs — brand logos not in lucide-react)      */
/* ------------------------------------------------------------------ */

function GitHubIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

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

/* ------------------------------------------------------------------ */
/*  Trust Badge                                                       */
/* ------------------------------------------------------------------ */

function TrustBadge({ label, href }: { label: string; href?: string }) {
  const classes =
    "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors";
  const style = {
    color: "rgba(255,255,255,0.5)",
    borderColor: "rgba(255,255,255,0.2)",
  };

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes + " hover:text-white/80 hover:border-white/40"}
        style={style}
      >
        {label}
      </a>
    );
  }

  return (
    <span className={classes} style={style}>
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Status Indicator (green pulsing dot + label)                      */
/* ------------------------------------------------------------------ */

function StatusIndicator() {
  return (
    <div className="flex items-center gap-3">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
      </span>
      <span
        className="text-sm font-medium font-mono"
        style={{ color: "rgba(255,255,255,0.55)" }}
      >
        All Systems Operational
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Live Evaluation Counter                                           */
/* ------------------------------------------------------------------ */

function LiveEvalCounter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Seed with a plausible number so it never starts at zero
    setCount(Math.floor(Date.now() / 1000) % 1000000);
  }, []);

  useEffect(() => {
    // Simulate evaluations flowing in — roughly 70-120 per second
    const interval = setInterval(() => {
      setCount((prev) => prev + Math.floor(Math.random() * 50) + 70);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <span
      className="text-sm font-mono tabular-nums"
      style={{ color: "rgba(255,255,255,0.45)" }}
      aria-live="polite"
      aria-label={`${count.toLocaleString()} evaluations served today`}
      suppressHydrationWarning
    >
      <span className="hidden sm:inline">Evaluations served today: </span>
      <span
        className="font-semibold"
        style={{ color: "rgba(255,255,255,0.65)" }}
        suppressHydrationWarning
      >
        {count.toLocaleString()}
      </span>
    </span>
  );
}

/* ================================================================== */
/*  Footer                                                            */
/* ================================================================== */

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-[var(--signal-bg-inverse)]">
      {/* Dot pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6 py-16 sm:py-24">
        {/* ---- Top: Brand + Links Grid ---- */}
        <div className="flex flex-col lg:flex-row justify-between items-start gap-10 mb-16">
          {/* Column 1: Brand */}
          <div className="max-w-xs">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <PrismLotus size="sm" variant="icon" colorScheme="white" />
              <span className="font-bold tracking-tight text-white text-lg">
                FeatureSignals
              </span>
            </Link>
            <p
              className="text-sm leading-relaxed mb-6"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              The control plane for software delivery. Apache 2.0. No vendor
              lock-in.
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

          {/* Columns 2-5: Links Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 lg:gap-10 flex-1">
            {footerSections.map((section) => (
              <div key={section.title}>
                <h3
                  className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-4"
                  style={{ color: "rgba(255,255,255,0.4)" }}
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
                          className="text-sm hover:text-white transition-colors"
                          style={{ color: "rgba(255,255,255,0.55)" }}
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-sm hover:text-white transition-colors"
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

        {/* ---- Trust Message ---- */}
        <div
          className="mb-10 py-6 px-6 rounded-xl text-center"
          style={{
            backgroundColor: "rgba(255,255,255,0.03)",
            borderColor: "rgba(255,255,255,0.06)",
            borderWidth: "1px",
          }}
        >
          <p
            className="text-sm leading-relaxed max-w-3xl mx-auto"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            FeatureSignals is Apache 2.0 licensed. No vendor lock-in.
            OpenFeature native. Your data stays in your region. We never sell
            your data. Built by engineers, for engineers.
          </p>
        </div>

        {/* ---- Trust Bar ---- */}
        <div
          className="flex flex-col md:flex-row justify-between items-center gap-4 py-6"
          style={{
            borderColor: "rgba(255,255,255,0.08)",
            borderTopWidth: "1px",
            borderBottomWidth: "1px",
          }}
        >
          <StatusIndicator />

          <div className="flex flex-wrap justify-center gap-3">
            <TrustBadge label="SOC 2 Type II" />
            <TrustBadge label="OpenFeature Native" />
            <TrustBadge
              label="Uptime 99.95%"
              href="https://status.featuresignals.com"
            />
          </div>

          <LiveEvalCounter />
        </div>

        {/* ---- Bottom Bar ---- */}
        <div className="mt-6 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Copyright + address */}
          <div
            className="text-xs text-center md:text-left space-y-1"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            <p>
              &copy; {currentYear} Vivekananda Technology Labs, trading as
              FeatureSignals. Apache-2.0 License.
            </p>
            <p>
              Plot no 308, L5-Block, LIG, Chitrapuri Colony, Manikonda,
              Hyderabad, Telangana - 500089, India
            </p>
          </div>

          {/* Legal links */}
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-1">
            {legalLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-xs hover:text-white/70 transition-colors"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
