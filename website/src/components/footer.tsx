import Link from "next/link";
import { ComplianceBadges } from "./compliance-badges";

const footerSections = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Use Cases", href: "/use-cases" },
      { label: "Changelog", href: "/changelog" },
    ],
  },
  {
    title: "Get Started",
    links: [
      { label: "Start Free Trial", href: "https://app.featuresignals.com/register", highlight: true },
      { label: "Sign Up Free", href: "https://app.featuresignals.com/register" },
      { label: "Log in", href: "https://app.featuresignals.com/login" },
      { label: "Flag Engine", href: "https://app.featuresignals.com" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "Documentation", href: "https://docs.featuresignals.com" },
      { label: "API Playground", href: "https://docs.featuresignals.com/api-playground" },
      { label: "SDKs", href: "https://docs.featuresignals.com/sdks/overview" },
      { label: "GitHub", href: "https://github.com/dinesh-g1/featuresignals" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Quickstart Guide", href: "https://docs.featuresignals.com/getting-started/quickstart" },
      { label: "Tutorials", href: "https://docs.featuresignals.com/tutorials/feature-flag-checkout" },
      { label: "About", href: "/about" },
      { label: "Status", href: "/status" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Security & Compliance", href: "/security" },
      { label: "Terms & Conditions", href: "/terms-and-conditions" },
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Refund Policy", href: "/refund-policy" },
      { label: "Cancellation Policy", href: "/cancellation-policy" },
      { label: "Shipping Policy", href: "/shipping-policy" },
    ],
  },
];

function isExternal(href: string) {
  return href.startsWith("http") || href.startsWith("mailto:");
}

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

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        {/* Link columns + Brand column */}
        <div className="grid grid-cols-2 gap-6 sm:gap-8 lg:grid-cols-6">
          {/* Link sections — spans 5 columns on large screens */}
          <div className="col-span-2 grid grid-cols-2 gap-6 sm:gap-8 md:grid-cols-5 lg:col-span-4">
            {footerSections.map((section) => (
              <div key={section.title}>
                <h3 className="text-sm font-semibold text-slate-900">
                  {section.title}
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-500">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      {isExternal(link.href) ? (
                        <a
                          href={link.href}
                          className={
                            "highlight" in link && link.highlight
                              ? "font-medium text-indigo-600 transition-colors hover:text-indigo-700"
                              : "transition-colors hover:text-slate-900"
                          }
                          {...(link.href.startsWith("http")
                            ? { target: "_blank", rel: "noopener noreferrer" }
                            : {})}
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="transition-colors hover:text-slate-900"
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

          {/* Brand / Trust column — right side like SigNoz */}
          <div className="col-span-2 flex flex-col items-start gap-5 border-t border-slate-200 pt-6 lg:col-span-2 lg:items-end lg:border-t-0 lg:pt-0">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-bold tracking-tight text-indigo-600 transition-colors hover:text-indigo-700"
            >
              <img src="/favicon.svg" alt="" className="h-6 w-6" aria-hidden />
              FeatureSignals
            </Link>

            {/* Status indicator */}
            <Link
              href="/status"
              className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 transition-colors hover:text-emerald-700"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              All systems operational
            </Link>

            {/* Social links */}
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/dinesh-g1/featuresignals"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 transition-colors hover:text-slate-700"
                aria-label="GitHub"
              >
                <GitHubIcon />
              </a>
              <a
                href="https://linkedin.com/company/featuresignals"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 transition-colors hover:text-slate-700"
                aria-label="LinkedIn"
              >
                <LinkedInIcon />
              </a>
              <a
                href="https://x.com/featuresignals"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 transition-colors hover:text-slate-700"
                aria-label="X (Twitter)"
              >
                <XIcon />
              </a>
            </div>

            {/* Compliance badges */}
            <ComplianceBadges />
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 border-t border-slate-200 pt-8 text-center text-xs text-slate-400">
          <p>
            &copy; {new Date().getFullYear()} Vivekananda Technology Labs,
            trading as FeatureSignals. Apache-2.0 License.
          </p>
          <p className="mt-1">
            Flat no 308, L5-Block, LIG, Chitrapuri Colony, Manikonda,
            Hyderabad, Telangana - 500089, India
          </p>
        </div>
      </div>
    </footer>
  );
}
