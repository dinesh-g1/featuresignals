"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import { ChevronDown, ExternalLink, ArrowRight, Menu, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  platformItems,
  learnMoreItems,
  developerItems,
  type NavItem,
} from "@/data/nav-links";

const topLinks = [
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact Sales" },
];

function NavListItem({ item }: { item: NavItem }) {
  const Ico = item.icon;
  const Wrapper = item.external ? "a" : Link;
  const extra = item.external
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <NavigationMenu.Link asChild>
      <Wrapper
        href={item.href}
        {...(extra as Record<string, string>)}
        className="group relative flex items-start gap-3 rounded-lg p-3 transition-colors duration-150 hover:bg-stone-100"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent ring-1 ring-accent/20 transition-colors duration-150 group-hover:bg-accent/20">
          <Ico className="h-4 w-4" strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-stone-900">
              {item.title}
            </span>
            {item.badge && (
              <span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white">
                {item.badge}
              </span>
            )}
            {item.external && (
              <ExternalLink className="h-3 w-3 text-stone-400" />
            )}
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-stone-500">
            {item.description}
          </p>
        </div>
      </Wrapper>
    </NavigationMenu.Link>
  );
}

function AccordionSection({
  title,
  items,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-base font-medium text-stone-900 transition-colors hover:bg-stone-100"
      >
        {title}
        <ChevronDown
          className={cn(
            "h-4 w-4 text-stone-400 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-1 pb-2 pl-3">
              {items.map((item) => {
                const Ico = item.icon;
                const Tag = item.external ? "a" : Link;
                const extra = item.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {};
                return (
                  <Tag
                    key={item.title}
                    href={item.href}
                    {...(extra as Record<string, string>)}
                    onClick={onNavigate}
                    className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-stone-100"
                  >
                    <div className="flex items-center gap-3">
                      <Ico
                        className="h-4 w-4 shrink-0 text-accent"
                        strokeWidth={1.5}
                      />
                      <span className="text-sm font-medium text-stone-700">
                        {item.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {item.badge && (
                        <span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white">
                          {item.badge}
                        </span>
                      )}
                      {item.external && (
                        <ExternalLink className="h-3 w-3 text-stone-400" />
                      )}
                    </div>
                  </Tag>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const allProductItems = [...platformItems, ...learnMoreItems];

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50 border-b border-stone-200 bg-white/90 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 h-16">
          <Link href="/" className="flex items-center space-x-2 group">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 32 32"
              fill="none"
              className="h-6 w-6 text-accent transition-transform group-hover:scale-110"
            >
              <rect width="32" height="32" rx="7" fill="#0d9488" />
              <path
                d="M7 3
                   C7 3, 7 18, 7 29
                   C7 18, 23 8, 17 14
                   C13 18, 25 22, 25 29"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <circle cx="24.5" cy="26" r="1.8" fill="white" opacity="0.85" />
            </svg>
            <span className="font-bold tracking-tight text-stone-900 text-lg">
              FeatureSignals
            </span>
          </Link>

          {/* Desktop Navigation */}
          <NavigationMenu.Root className="hidden items-center lg:flex">
            <NavigationMenu.List className="flex items-center gap-1">
              {/* Product Mega Menu */}
              <NavigationMenu.Item>
                <NavigationMenu.Trigger className="group flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition-colors duration-150 hover:bg-stone-100 hover:text-stone-900 data-[state=open]:bg-stone-100 data-[state=open]:text-stone-900">
                  Product
                  <ChevronDown
                    className="h-3.5 w-3.5 text-stone-400 transition-transform duration-200 group-data-[state=open]:rotate-180"
                    aria-hidden
                  />
                </NavigationMenu.Trigger>
                <NavigationMenu.Content className="absolute left-0 top-0 w-[680px] data-[motion=from-end]:animate-enterFromRight data-[motion=from-start]:animate-enterFromLeft data-[motion=to-end]:animate-exitToRight data-[motion=to-start]:animate-exitToLeft">
                  <div className="grid grid-cols-[1fr_auto] divide-x divide-stone-100">
                    <div className="p-3">
                      <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                        Platform
                      </p>
                      <div className="space-y-0.5">
                        {platformItems.map((item) => (
                          <NavListItem key={item.title} item={item} />
                        ))}
                      </div>
                    </div>
                    <div className="w-[240px] p-3">
                      <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                        Learn More
                      </p>
                      <div className="space-y-0.5">
                        {learnMoreItems.map((item) => (
                          <NavListItem key={item.title} item={item} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-stone-100 px-6 py-2.5">
                    <Link
                      href="/features"
                      className="group flex items-center gap-1 text-xs font-medium text-accent transition-colors hover:text-accent-dark"
                    >
                      Core features
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                    <Link
                      href="/features/ai"
                      className="group flex items-center gap-1 text-xs font-medium text-accent transition-colors hover:text-accent-dark"
                    >
                      AI capabilities
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                    <Link
                      href="/changelog"
                      className="group flex items-center gap-1 text-xs font-medium text-accent transition-colors hover:text-accent-dark"
                    >
                      What&apos;s new
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </NavigationMenu.Content>
              </NavigationMenu.Item>

              {/* Developers Menu */}
              <NavigationMenu.Item>
                <NavigationMenu.Trigger className="group flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition-colors duration-150 hover:bg-stone-100 hover:text-stone-900 data-[state=open]:bg-stone-100 data-[state=open]:text-stone-900">
                  Developers
                  <ChevronDown
                    className="h-3.5 w-3.5 text-stone-400 transition-transform duration-200 group-data-[state=open]:rotate-180"
                    aria-hidden
                  />
                </NavigationMenu.Trigger>
                <NavigationMenu.Content className="absolute left-0 top-0 w-[380px] data-[motion=from-end]:animate-enterFromRight data-[motion=from-start]:animate-enterFromLeft data-[motion=to-end]:animate-exitToRight data-[motion=to-start]:animate-exitToLeft">
                  <div className="flex flex-col gap-1 p-3">
                    {developerItems.map((item) => (
                      <NavListItem key={item.title} item={item} />
                    ))}
                  </div>
                  <div className="border-t border-stone-100 px-6 py-2.5">
                    <a
                      href="https://docs.featuresignals.com/getting-started/quickstart"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-1 text-xs font-medium text-accent transition-colors hover:text-accent-dark"
                    >
                      Get started in 5 minutes
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </a>
                  </div>
                </NavigationMenu.Content>
              </NavigationMenu.Item>

              {topLinks.map((link) => (
                <NavigationMenu.Item key={link.href}>
                  <NavigationMenu.Link asChild>
                    <Link
                      href={link.href}
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
                        pathname === link.href || pathname === `${link.href}/`
                          ? "text-accent"
                          : "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
                      )}
                    >
                      {link.label}
                    </Link>
                  </NavigationMenu.Link>
                </NavigationMenu.Item>
              ))}

              <NavigationMenu.Indicator className="top-full z-10 flex h-2.5 items-end justify-center overflow-hidden transition-[width,transform_250ms_ease] data-[state=hidden]:animate-fadeOut data-[state=visible]:animate-fadeIn">
                <div className="relative top-[70%] h-2.5 w-2.5 rotate-45 rounded-tl-sm bg-white border border-stone-200" />
              </NavigationMenu.Indicator>
            </NavigationMenu.List>

            <div className="perspective-[2000px] absolute left-0 top-full flex w-full justify-center">
              <NavigationMenu.Viewport className="relative mt-2.5 h-[var(--radix-navigation-menu-viewport-height)] w-full origin-[top_center] overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg transition-[width,height] duration-300 ease-out sm:w-[var(--radix-navigation-menu-viewport-width)]" />
            </div>
          </NavigationMenu.Root>

          <div className="hidden items-center gap-4 lg:flex">
            <a
              href="https://app.featuresignals.com/login"
              className="text-sm font-semibold text-stone-600 hover:text-stone-900 transition-colors"
            >
              Sign In
            </a>
            <a
              href="https://app.featuresignals.com/register"
              className="text-sm font-semibold bg-accent hover:bg-accent-dark text-white px-5 py-2 rounded-md transition-all shadow-sm"
            >
              Start Free
            </a>
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="flex items-center justify-center rounded-lg p-2 text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
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
                  className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-white/95 backdrop-blur-lg shadow-2xl"
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
                    <Link
                      href="/"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2 text-lg font-bold tracking-tight text-accent"
                    >
                      <span className="text-accent text-xl">⚑</span>
                      FeatureSignals
                    </Link>
                    <Dialog.Close asChild>
                      <button
                        className="rounded-lg p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
                        aria-label="Close menu"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </Dialog.Close>
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 py-4">
                    <div className="space-y-1">
                      <AccordionSection
                        title="Product"
                        items={allProductItems}
                        onNavigate={() => setMobileOpen(false)}
                      />
                      <AccordionSection
                        title="Developers"
                        items={developerItems}
                        onNavigate={() => setMobileOpen(false)}
                      />
                      {topLinks.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "block rounded-lg px-3 py-3 text-base font-medium transition-colors",
                            pathname === link.href
                              ? "text-accent"
                              : "text-stone-900 hover:bg-stone-100",
                          )}
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-stone-100 px-4 py-4 space-y-3">
                    <a
                      href="https://app.featuresignals.com/login"
                      className="block rounded-lg border border-stone-300 px-4 py-3 text-center text-sm font-medium text-stone-700 transition-all hover:bg-stone-100"
                    >
                      Sign In
                    </a>
                    <a
                      href="https://app.featuresignals.com/register"
                      className="block rounded-lg bg-accent px-4 py-3 text-center text-sm font-medium text-white shadow-sm transition-all hover:bg-accent-dark"
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
