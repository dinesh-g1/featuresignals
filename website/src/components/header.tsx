"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import {
  ChevronDownIcon,
  LinkExternalIcon,
  ThreeBarsIcon,
  XIcon,
  RocketIcon,
  BeakerIcon,
  LightBulbIcon,
  ShieldCheckIcon,
  GitBranchIcon,
  PackageIcon,
  CloudIcon,
} from "@primer/octicons-react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Enterprise Platform Header
 *
 *   [Logo]  [Platform ▾]  [Pricing]  [Docs ↗]     [Sign In]  [Start Free]
 *
 * Platform dropdown is grouped into capability areas with generous spacing.
 * Each item leads with the outcome, not the feature name.
 */

const platformGroups = [
  {
    label: "Ship",
    items: [
      {
        label: "Release Management",
        desc: "Sub-millisecond feature flags with percentage rollouts and kill switches",
        href: "/create",
        icon: RocketIcon,
      },
      {
        label: "A/B Experiments",
        desc: "Weighted variants with impression tracking. Built in, not an add-on.",
        href: "/create",
        icon: BeakerIcon,
      },
    ],
  },
  {
    label: "Automate",
    items: [
      {
        label: "AI Janitor",
        desc: "Find and remove stale flags across your codebase — automatically",
        href: "/cleanup",
        icon: LightBulbIcon,
      },
      {
        label: "Migration Engine",
        desc: "Import from LaunchDarkly, ConfigCat, Flagsmith, or Unleash in minutes",
        href: "/migrate",
        icon: GitBranchIcon,
      },
    ],
  },
  {
    label: "Trust",
    items: [
      {
        label: "Governance",
        desc: "RBAC, audit logs, approvals, SSO. Enterprise security, built in.",
        href: "/create",
        icon: ShieldCheckIcon,
      },
      {
        label: "Integrations",
        desc: "8 SDKs, Terraform, OpenFeature, webhooks. Works with your stack.",
        href: "/create",
        icon: PackageIcon,
      },
    ],
  },
];

export function Header() {
  const [platformOpen, setPlatformOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--borderColor-default)] bg-white/95 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 font-bold text-lg text-[var(--fgColor-default)] shrink-0"
            aria-label="FeatureSignals Home"
          >
            <svg
              width="28" height="28" viewBox="0 0 28 28" fill="none"
              className="shrink-0" aria-hidden="true"
            >
              <rect width="28" height="28" rx="6" fill="var(--fgColor-accent)" />
              <text x="14" y="19" textAnchor="middle" fill="white"
                fontSize="14" fontWeight="bold" fontFamily="system-ui">FS</text>
            </svg>
            <span className="hidden sm:inline">FeatureSignals</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main">
            {/* Platform Dropdown */}
            <div className="relative">
              <button
                onClick={() => setPlatformOpen(!platformOpen)}
                onBlur={() => setTimeout(() => setPlatformOpen(false), 200)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  platformOpen
                    ? "text-[var(--fgColor-accent)] bg-[var(--bgColor-accent-muted)]"
                    : "text-[var(--fgColor-default)] hover:bg-[var(--bgColor-muted)]",
                )}
                aria-expanded={platformOpen}
              >
                Platform
                <ChevronDownIcon size={12} className={cn("transition-transform", platformOpen && "rotate-180")} />
              </button>

              <AnimatePresence>
                {platformOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-full mt-1.5 w-[520px] rounded-xl border border-[var(--borderColor-default)] bg-white shadow-xl py-4 z-50"
                  >
                    <div className="px-5 pb-3 mb-1 border-b border-[var(--borderColor-default)]">
                      <p className="text-xs font-semibold text-[var(--fgColor-muted)] uppercase tracking-wide">
                        Release Infrastructure Platform
                      </p>
                      <p className="text-xs text-[var(--fgColor-muted)] mt-0.5">
                        Everything you need to ship faster, with confidence.
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 px-2">
                      {platformGroups.map((group) => (
                        <div key={group.label} className="px-2 py-1 flex flex-col">
                          <p className="text-[10px] font-semibold text-[var(--fgColor-muted)] uppercase tracking-wider px-2 mb-1.5">
                            {group.label}
                          </p>
                          {group.items.map((item) => (
                            <Link
                              key={item.label}
                              href={item.href}
                              className="flex items-start gap-2.5 px-2 py-2.5 rounded-lg hover:bg-[var(--bgColor-muted)] transition-colors group"
                            >
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--bgColor-accent-muted)] mt-0.5">
                                <item.icon size={14} className="text-[var(--fgColor-accent)]" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-[var(--fgColor-default)] group-hover:text-[var(--fgColor-accent)] transition-colors">
                                  {item.label}
                                </p>
                                <p className="text-xs text-[var(--fgColor-muted)] mt-0.5 leading-snug">
                                  {item.desc}
                                </p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link href="/#pricing" className="px-3.5 py-2.5 rounded-lg text-sm font-medium text-[var(--fgColor-default)] hover:bg-[var(--bgColor-muted)] transition-colors">
              Pricing
            </Link>
            <a href="https://docs.featuresignals.com" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3.5 py-2.5 rounded-lg text-sm font-medium text-[var(--fgColor-default)] hover:bg-[var(--bgColor-muted)] transition-colors">
              Docs <LinkExternalIcon size={12} />
            </a>
          </nav>

          {/* Right */}
          <div className="flex items-center gap-2">
            <a href="https://app.featuresignals.com/login"
              className="hidden sm:inline-flex px-3.5 py-2.5 rounded-lg text-sm font-medium text-[var(--fgColor-default)] hover:bg-[var(--bgColor-muted)] transition-colors">
              Sign In
            </a>
            <a href="https://app.featuresignals.com/register"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-[var(--bgColor-success-emphasis)] hover:bg-[#1c8139] transition-colors shadow-sm">
              <CloudIcon size={14} /> <span className="hidden sm:inline">Start Free</span>
            </a>
            <button onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 -mr-2 rounded-lg text-[var(--fgColor-default)] hover:bg-[var(--bgColor-muted)]"
              aria-label="Open menu">
              <ThreeBarsIcon size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile */}
      <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed right-0 top-0 z-50 h-full w-80 bg-white shadow-2xl p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-lg font-bold text-[var(--fgColor-default)]">Menu</Dialog.Title>
              <button onClick={closeMobile} className="p-2 rounded-lg hover:bg-[var(--bgColor-muted)]" aria-label="Close">
                <XIcon size={20} />
              </button>
            </div>
            <nav className="space-y-4">
              {platformGroups.map((group) => (
                <div key={group.label}>
                  <p className="text-[10px] font-semibold text-[var(--fgColor-muted)] uppercase tracking-wider px-2 mb-2">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => (
                      <Link key={item.label} href={item.href} onClick={closeMobile}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--bgColor-muted)] transition-colors">
                        <item.icon size={16} className="text-[var(--fgColor-accent)]" />
                        <div>
                          <p className="text-sm font-medium text-[var(--fgColor-default)]">{item.label}</p>
                          <p className="text-xs text-[var(--fgColor-muted)]">{item.desc}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
              <hr className="border-[var(--borderColor-default)]" />
              <Link href="/#pricing" onClick={closeMobile}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--fgColor-default)] hover:bg-[var(--bgColor-muted)]">Pricing</Link>
              <a href="https://docs.featuresignals.com" target="_blank" rel="noopener noreferrer" onClick={closeMobile}
                className="flex items-center gap-1 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--fgColor-default)] hover:bg-[var(--bgColor-muted)]">
                Docs <LinkExternalIcon size={12} />
              </a>
              <hr className="border-[var(--borderColor-default)]" />
              <a href="https://app.featuresignals.com/login"
                className="block w-full px-3 py-2.5 rounded-lg text-sm font-medium text-center text-[var(--fgColor-default)] hover:bg-[var(--bgColor-muted)]">Sign In</a>
              <a href="https://app.featuresignals.com/register"
                className="block w-full mt-2 px-4 py-3 rounded-lg text-sm font-semibold text-center text-white bg-[var(--bgColor-success-emphasis)] hover:bg-[#1c8139]">Start Free</a>
            </nav>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </header>
  );
}
