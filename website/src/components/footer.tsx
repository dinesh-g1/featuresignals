import Link from "next/link";

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
  {
    title: "Community",
    links: [
      { label: "Issues", href: "https://github.com/dinesh-g1/featuresignals/issues" },
      { label: "Discussions", href: "https://github.com/dinesh-g1/featuresignals/discussions" },
      { label: "Contact", href: "mailto:support@featuresignals.com" },
    ],
  },
];

function isExternal(href: string) {
  return href.startsWith("http") || href.startsWith("mailto:");
}

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="grid grid-cols-2 gap-6 sm:gap-8 md:grid-cols-6">
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
