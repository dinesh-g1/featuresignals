"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import {
  ChevronDownIcon,
  LinkExternalIcon,
  ThreeBarsIcon,
  XIcon,
  CheckCircleFillIcon,
  ArrowRightIcon,
} from "@primer/octicons-react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Minimal header — just what a visitor needs.
 *
 *   FeatureSignals logo    [Try Demo ▾]  [Pricing]  [Docs →]    [Sign In]  [Start Free]
 *
 * "Try Demo" dropdown links to homepage sections.
 * "Pricing" scrolls to #pricing on the homepage.
 * "Docs" links out to docs.featuresignals.com.
 * No mega-menus, no complexity.
 */

const demoLinks = [
  {
    label: "Cost Calculator",
    href: "/#hero",
    description: "See how much you'd save",
  },
  {
    label: "Live Evaluation",
    href: "/#live-demo",
    description: "Sub-millisecond flag eval in your browser",
  },
  {
    label: "Migration Preview",
    href: "/#migration",
    description: "See your flags migrate in real time",
  },
  {
    label: "AI Janitor",
    href: "/#ai-janitor",
    description: "Stale flag detection simulator",
  },
];

export function Header() {
  const [demoOpen, setDemoOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <>
      <header
        className="fixed top-0 inset-x-0 z-50 border-b border-[var(--borderColor-default)] bg-[var(--bgColor-default)]/90 backdrop-blur-md"
        style={{
          boxShadow: "0 1px 1px 0 #1f23280a, 0 1px 2px 0 #1f232808",
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center space-x-2 group shrink-0"
            aria-label="FeatureSignals Home"
          >
            <CheckCircleFillIcon
              size={24}
              fill="#0969da"
              className="transition-transform group-hover:scale-110"
            />
            <span className="font-bold tracking-tight text-[var(--fgColor-default)] text-lg">
              FeatureSignals
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Main">
            {/* Try Demo dropdown */}
            <div className="relative">
              <button
                onClick={() => setDemoOpen(!demoOpen)}
                onBlur={(e) => {
                  // Delay to allow click on dropdown items
                  setTimeout(() => setDemoOpen(false), 150);
                }}
                className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-[var(--fgColor-muted)] transition-colors duration-150 hover:bg-[var(--bgColor-inset)] hover:text-[var(--fgColor-default)]"
                aria-expanded={demoOpen}
              >
                Try Demo
                <ChevronDownIcon
                  size={14}
                  className={cn(
                    "text-[var(--fgColor-subtle)] transition-transform duration-200",
                    demoOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>

              <AnimatePresence>
                {demoOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute left-0 top-full mt-1.5 w-64 rounded-xl border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] py-1.5"
                    style={{
                      boxShadow: "var(--shadow-floating-medium)",
                    }}
                  >
                    {demoLinks.map((link) => (
                      <a
                        key={link.label}
                        href={link.href}
                        onClick={() => setDemoOpen(false)}
                        className="flex items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-[var(--bgColor-inset)]"
                      >
                        <div>
                          <div className="font-medium text-[var(--fgColor-default)]">
                            {link.label}
                          </div>
                          <div className="text-xs text-[var(--fgColor-muted)] mt-0.5">
                            {link.description}
                          </div>
                        </div>
                        <ArrowRightIcon
                          size={14}
                          className="text-[var(--fgColor-subtle)]"
                        />
                      </a>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Pricing */}
            <a
              href="/#pricing"
              className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--fgColor-muted)] transition-colors duration-150 hover:bg-[var(--bgColor-inset)] hover:text-[var(--fgColor-default)]"
            >
              Pricing
            </a>

            {/* Docs */}
            <a
              href="https://docs.featuresignals.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-[var(--fgColor-muted)] transition-colors duration-150 hover:bg-[var(--bgColor-inset)] hover:text-[var(--fgColor-default)]"
            >
              Docs
              <LinkExternalIcon
                size={12}
                className="text-[var(--fgColor-subtle)]"
              />
            </a>
          </nav>

          {/* CTA buttons */}
          <div className="hidden lg:flex items-center gap-3">
            <a
              href="https://app.featuresignals.com/login"
              className="text-sm font-semibold text-[var(--fgColor-muted)] hover:text-[var(--fgColor-default)] transition-colors"
            >
              Sign In
            </a>
            <a
              href="/signup"
              className="text-sm font-semibold text-white px-5 py-2 rounded-md transition-all"
              style={{
                backgroundColor: "#1f883d",
                boxShadow: "0 1px 0 0 #1f232826",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#1c8139")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "#1f883d")
              }
            >
              Start Free
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="flex items-center justify-center rounded-lg p-2 text-[var(--fgColor-muted)] transition-colors hover:bg-[var(--bgColor-inset)] hover:text-[var(--fgColor-default)] lg:hidden"
            aria-label="Open menu"
          >
            <ThreeBarsIcon size={24} />
          </button>
        </div>
      </header>

      {/* Mobile Navigation Dialog */}
      <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <AnimatePresence>
          {mobileOpen && (
            <Dialog.Portal forceMount>
              <Dialog.Overlay asChild>
                <motion.div
                  className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                />
              </Dialog.Overlay>
              <Dialog.Content asChild>
                <motion.div
                  className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-[var(--bgColor-default)]/95 backdrop-blur-lg shadow-2xl"
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="flex items-center justify-between border-b border-[var(--borderColor-default)] px-4 py-3">
                    <Link
                      href="/"
                      onClick={closeMobile}
                      className="flex items-center gap-2 text-lg font-bold tracking-tight text-[var(--fgColor-accent)]"
                    >
                      <CheckCircleFillIcon size={20} fill="#0969da" />
                      FeatureSignals
                    </Link>
                    <Dialog.Close asChild>
                      <button
                        className="rounded-lg p-2 text-[var(--fgColor-muted)] transition-colors hover:bg-[var(--bgColor-inset)] hover:text-[var(--fgColor-default)]"
                        aria-label="Close menu"
                      >
                        <XIcon size={20} />
                      </button>
                    </Dialog.Close>
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 py-6">
                    <div className="space-y-1">
                      <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--fgColor-subtle)]">
                        Try Demo
                      </p>
                      {demoLinks.map((link) => (
                        <a
                          key={link.label}
                          href={link.href}
                          onClick={closeMobile}
                          className="block rounded-lg px-3 py-3 text-base font-medium text-[var(--fgColor-default)] transition-colors hover:bg-[var(--bgColor-inset)]"
                        >
                          {link.label}
                          <span className="block text-sm text-[var(--fgColor-muted)] mt-0.5">
                            {link.description}
                          </span>
                        </a>
                      ))}

                      <hr className="my-4 border-[var(--borderColor-muted)]" />

                      <a
                        href="/#pricing"
                        onClick={closeMobile}
                        className="block rounded-lg px-3 py-3 text-base font-medium text-[var(--fgColor-default)] transition-colors hover:bg-[var(--bgColor-inset)]"
                      >
                        Pricing
                      </a>

                      <a
                        href="https://docs.featuresignals.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={closeMobile}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-3 text-base font-medium text-[var(--fgColor-default)] transition-colors hover:bg-[var(--bgColor-inset)]"
                      >
                        Docs
                        <LinkExternalIcon
                          size={14}
                          className="text-[var(--fgColor-subtle)]"
                        />
                      </a>
                    </div>
                  </div>

                  <div className="border-t border-[var(--borderColor-default)] px-4 py-4 space-y-3">
                    <a
                      href="https://app.featuresignals.com/login"
                      className="block rounded-lg border border-[var(--borderColor-default)] px-4 py-3 text-center text-sm font-medium text-[var(--fgColor-default)] transition-all hover:bg-[var(--bgColor-inset)]"
                    >
                      Sign In
                    </a>
                    <a
                      href="/signup"
                      className="block rounded-lg px-4 py-3 text-center text-sm font-medium text-white transition-all"
                      style={{
                        backgroundColor: "#1f883d",
                        boxShadow: "0 1px 0 0 #1f232826",
                      }}
                    >
                      Start Free
                    </a>
                  </div>
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>
    </>
  );
}
