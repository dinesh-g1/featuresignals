"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  BookIcon,
  CreditCardIcon,
  HelpCircleIcon,
  ExternalLinkIcon,
  MailIcon,
  ArrowRightIcon,
} from "@/components/icons/nav-icons";
import { DOCS_URL, WEBSITE_URL } from "@/lib/external-urls";

interface SupportLink {
  label: string;
  href: string;
  external?: boolean;
}

interface SupportCategory {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  links: SupportLink[];
}

const supportCategories: SupportCategory[] = [
  {
    title: "Technical",
    description: "Documentation, API reference, and SDK guides.",
    icon: BookIcon,
    links: [
      { label: "Documentation", href: DOCS_URL, external: true },
      { label: "API Reference", href: `${DOCS_URL}/api`, external: true },
      { label: "SDKs", href: `${DOCS_URL}/sdks`, external: true },
    ],
  },
  {
    title: "Accounting",
    description: "Billing questions, invoices, and plan changes.",
    icon: CreditCardIcon,
    links: [
      { label: "Billing Settings", href: "/settings/billing" },
      { label: "View Invoices", href: "/settings/billing" },
    ],
  },
  {
    title: "Miscellaneous",
    description: "System status, community, and general inquiries.",
    icon: HelpCircleIcon,
    links: [
      { label: "System Status", href: "#" },
      {
        label: "Community",
        href: `${WEBSITE_URL}/community`,
        external: true,
      },
      {
        label: "Contact Us",
        href: "mailto:support@featuresignals.com",
      },
    ],
  },
];

export default function SupportPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-[var(--fgColor-default)]">
          Support
        </h1>
        <p className="mt-1 text-sm text-[var(--fgColor-muted)]">
          Find help, documentation, and ways to get in touch.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {supportCategories.map((cat) => {
          const Icon = cat.icon;
          return (
            <Card key={cat.title}>
              <CardContent className="p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bgColor-accent-muted)]">
                  <Icon className="h-5 w-5 text-[var(--fgColor-accent)]" />
                </div>
                <h3 className="text-sm font-semibold text-[var(--fgColor-default)]">
                  {cat.title}
                </h3>
                <p className="mt-1 text-xs text-[var(--fgColor-muted)]">
                  {cat.description}
                </p>
                <ul className="mt-3 space-y-1.5">
                  {cat.links.map((link) => (
                    <li key={link.label}>
                      {link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-[var(--fgColor-accent)] hover:underline"
                        >
                          {link.label}
                          <ExternalLinkIcon className="h-3 w-3" />
                        </a>
                      ) : link.href.startsWith("mailto:") ? (
                        <a
                          href={link.href}
                          className="inline-flex items-center gap-1 text-sm text-[var(--fgColor-accent)] hover:underline"
                        >
                          <MailIcon className="h-3 w-3" />
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="inline-flex items-center gap-1 text-sm text-[var(--fgColor-accent)] hover:underline"
                        >
                          {link.label}
                          <ArrowRightIcon className="h-3 w-3" />
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
