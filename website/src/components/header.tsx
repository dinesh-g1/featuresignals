"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useCallback, useRef, useEffect } from "react";
import { Menu, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { PrismLotus } from "@/components/prism-lotus";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface NavLink {
  label: string;
  href: string;
  description?: string;
}

interface DropdownColumn {
  title: string;
  items: NavLink[];
}

/* ------------------------------------------------------------------ */
/*  Navigation Data                                                   */
/* ------------------------------------------------------------------ */

const platformColumns: DropdownColumn[] = [
  {
    title: "Product",
    items: [
      {
        label: "Feature Flags",
        href: "/features#feature-flags",
        description: "Targeted rollouts & kill switches",
      },
      {
        label: "A/B Experiments",
        href: "/features#experiments",
        description: "Data-driven product decisions",
      },
      {
        label: "AI Janitor",
        href: "/features#ai-janitor",
        description: "Automated stale flag cleanup",
      },
      {
        label: "Migration Engine",
        href: "/features#migration",
        description: "Import from any provider",
      },
      {
        label: "Governance & RBAC",
        href: "/features#governance",
        description: "Enterprise access control",
      },
      {
        label: "Integrations",
        href: "/integrations",
        description: "Connect your stack",
      },
    ],
  },
  {
    title: "Solutions",
    items: [
      {
        label: "Progressive Delivery",
        href: "/use-cases#progressive-delivery",
      },
      {
        label: "Kill Switches",
        href: "/use-cases#kill-switch",
      },
      {
        label: "Canary Releases",
        href: "/use-cases#canary-releases",
      },
      {
        label: "GitOps",
        href: "/use-cases#gitops",
      },
      {
        label: "Enterprise SSO",
        href: "/features#governance",
      },
      {
        label: "Self-Hosting",
        href: "/docs/deployment/self-hosting",
      },
    ],
  },
];

const docsItems: NavLink[] = [
  { label: "Documentation", href: "/docs" },
  { label: "Quickstart", href: "/docs/getting-started/quickstart" },
  { label: "API Reference", href: "/docs/api-reference/overview" },
  { label: "SDKs", href: "/docs/sdks/overview" },
  { label: "Terraform Provider", href: "/integrations#iac" },
  { label: "OpenFeature", href: "/integrations#openfeature" },
];

/* ------------------------------------------------------------------ */
/*  PlusMinus Icon — open/close indicator                             */
/* ------------------------------------------------------------------ */

function PlusMinusIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      {/* horizontal line — always visible */}
      <path
        d="M2.91675 7H11.0834"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      {/* vertical line — animates to form + / − */}
      <motion.path
        d="M7 2.9165V11.0832"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        animate={{ scaleY: open ? 0 : 1, opacity: open ? 0 : 1 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        style={{ transformOrigin: "center" }}
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Simple Dropdown                                                   */
/* ------------------------------------------------------------------ */

function SimpleDropdown({
  label,
  items,
  open,
  setOpen,
  active,
  href,
}: {
  label: string;
  items: NavLink[];
  open: boolean;
  setOpen: (v: boolean) => void;
  active: boolean;
  href?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [focusIndex, setFocusIndex] = useState(-1);

  const handleEnter = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpen(true);
  };

  const handleLeave = () => {
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      setFocusIndex(-1);
    }, 400);
  };

  // Keyboard: arrow keys navigate, enter/space select, escape closes
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusIndex((prev) => Math.min(prev + 1, items.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Home":
        e.preventDefault();
        setFocusIndex(0);
        break;
      case "End":
        e.preventDefault();
        setFocusIndex(items.length - 1);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setFocusIndex(-1);
        break;
    }
  };

  // Focus the item at focusIndex
  useEffect(() => {
    if (open && focusIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll<HTMLAnchorElement>("a");
      items[focusIndex]?.focus();
    }
  }, [open, focusIndex]);

  const labelClasses = cn(
    "flex items-center gap-1 rounded-md h-10 px-3 text-sm font-medium transition-colors",
    open || active
      ? "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-primary)]"
      : "text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-secondary)]",
  );

  return (
    <div
      className="relative"
      ref={containerRef}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onKeyDown={handleKeyDown}
    >
      {href ? (
        <Link href={href} className={labelClasses}>
          {label}
          <PlusMinusIcon open={open} />
        </Link>
      ) : (
        <button
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-haspopup="true"
          className={labelClasses}
        >
          {label}
          <PlusMinusIcon open={open} />
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-0 top-full mt-1 w-56 rounded-xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] shadow-[var(--signal-shadow-lg)] py-2 z-50"
            role="menu"
          >
            <ul ref={listRef} className="flex flex-col" role="none">
              {items.map((item, i) => (
                <li key={item.label} role="none">
                  <Link
                    href={item.href}
                    onClick={() => {
                      setOpen(false);
                      setFocusIndex(-1);
                    }}
                    role="menuitem"
                    tabIndex={i === focusIndex ? 0 : -1}
                    className="block rounded-md px-3 py-2 text-sm font-medium text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-secondary)] transition-colors focus-visible:outline-none focus-visible:bg-[var(--signal-bg-secondary)]"
                  >
                    {item.label}
                    {item.description && (
                      <span className="block text-xs text-[var(--signal-fg-secondary)] font-normal mt-0.5">
                        {item.description}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Platform Mega Dropdown                                            */
/* ------------------------------------------------------------------ */

function PlatformDropdown({
  open,
  setOpen,
  active,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  active: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpen(true);
  };

  const handleLeave = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 400);
  };

  // Collect all items for keyboard navigation
  const allItems = platformColumns.flatMap((col) => col.items);

  return (
    <div
      className="relative"
      ref={containerRef}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(
          "flex items-center gap-1 rounded-md h-10 px-3 text-sm font-medium transition-colors",
          open || active
            ? "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-primary)]"
            : "text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-secondary)]",
        )}
      >
        Platform
        <PlusMinusIcon open={open} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-1/2 top-full mt-2 -translate-x-1/2 z-50"
            role="menu"
          >
            <div className="w-[600px] overflow-hidden rounded-2xl border border-[var(--signal-border-default)] shadow-[var(--signal-shadow-lg)]">
              {/* Main grid — 2 columns */}
              <div className="grid grid-cols-2 gap-6 border-b border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] p-8">
                {platformColumns.map((col) => (
                  <div key={col.title} className="flex flex-col gap-4">
                    {/* Column header */}
                    <div className="flex items-center gap-2.5 px-3">
                      <p className="font-medium whitespace-nowrap text-[13px] uppercase tracking-[0.6px] text-[var(--signal-fg-secondary)]">
                        {col.title}
                      </p>
                      <div className="h-px w-full bg-[var(--signal-border-default)]" />
                    </div>
                    <ul className="flex flex-col gap-0.5" role="none">
                      {col.items.map((item) => (
                        <li key={item.label} role="none">
                          <Link
                            href={item.href}
                            onClick={() => setOpen(false)}
                            role="menuitem"
                            className="block rounded-md px-3 py-2.5 text-sm font-medium text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-secondary)] transition-colors focus-visible:outline-none focus-visible:bg-[var(--signal-bg-secondary)]"
                          >
                            <span className="block">{item.label}</span>
                            {item.description && (
                              <span className="block text-xs text-[var(--signal-fg-secondary)] font-normal mt-0.5">
                                {item.description}
                              </span>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Bottom promo */}
              <div className="bg-[var(--signal-bg-secondary)] p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-[13px] uppercase tracking-[0.6px] text-[var(--signal-fg-secondary)]">
                      New: AI Janitor v2
                    </p>
                    <p className="text-sm text-[var(--signal-fg-secondary)] leading-snug mt-0.5">
                      Smarter stale flag detection, automated cleanup PRs,
                      cross-repo visibility.
                    </p>
                  </div>
                  <Link
                    href="/features#ai-janitor"
                    onClick={() => setOpen(false)}
                    className="inline-flex shrink-0 items-center justify-center rounded-md px-4 h-10 text-sm font-medium bg-[var(--signal-bg-inverse)] text-[var(--signal-fg-on-emphasis)] border border-transparent shadow-[var(--signal-shadow-sm)] hover:shadow-[var(--signal-shadow-md)] transition-shadow"
                  >
                    Learn more
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Nav Link (direct, no dropdown)                                    */
/* ------------------------------------------------------------------ */

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-1 rounded-md h-10 px-3 text-sm font-medium transition-colors",
        active
          ? "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-primary)]"
          : "text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-secondary)]",
      )}
    >
      {label}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile Nav Link                                                   */
/* ------------------------------------------------------------------ */

function MobileNavLink({
  href,
  label,
  onClick,
  active,
  className,
}: {
  href: string;
  label: string;
  onClick: () => void;
  active?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "block w-full rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-primary)]"
          : "text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-secondary)]",
        className,
      )}
    >
      {label}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile Accordion Section                                          */
/* ------------------------------------------------------------------ */

function MobileAccordion({
  title,
  items,
  closeMobile,
  active,
  href,
}: {
  title: string;
  items: NavLink[];
  closeMobile: () => void;
  active?: boolean;
  href?: string;
}) {
  const [open, setOpen] = useState(false);

  const accordionLabelClasses = cn(
    "flex items-center justify-between w-full rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
    open || active
      ? "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-primary)]"
      : "text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-secondary)]",
  );

  return (
    <div>
      {href ? (
        <div className="flex items-center gap-0">
          <Link
            href={href}
            onClick={closeMobile}
            className={cn(accordionLabelClasses, "flex-1")}
          >
            {title}
          </Link>
          <button
            onClick={() => setOpen(!open)}
            className={cn(
              "shrink-0 rounded-md px-2 py-2.5 text-sm font-medium transition-colors",
              open || active
                ? "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-primary)]"
                : "text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-secondary)]",
            )}
            aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
          >
            <PlusMinusIcon open={open} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setOpen(!open)}
          className={accordionLabelClasses}
        >
          {title}
          <PlusMinusIcon open={open} />
        </button>
      )}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="ml-4 mt-1 mb-2 flex flex-col gap-0.5 border-l border-[var(--signal-border-default)] pl-3">
              {items.map((item) => (
                <MobileNavLink
                  key={item.label}
                  href={item.href}
                  label={item.label}
                  onClick={closeMobile}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ================================================================== */
/*  Header                                                            */
/* ================================================================== */

export function Header() {
  const pathname = usePathname();
  const [platformOpen, setPlatformOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  // Close all dropdowns on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setPlatformOpen(false);
        setDocsOpen(false);
        setMobileOpen(false);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  // Determine active states based on current path
  const isPlatformActive =
    pathname?.startsWith("/features") ||
    pathname?.startsWith("/use-cases") ||
    pathname?.startsWith("/integrations");
  const isPricingActive = pathname === "/pricing";
  const isDocsActive = pathname?.startsWith("/docs");
  const isBlogActive = pathname?.startsWith("/blog");

  return (
    <header className="sticky top-0 z-40 glass-card !rounded-none !border-0 !border-b !border-[var(--signal-border-subtle)]">
      {/* Announcement Banner slot — rendered by parent layout */}
      <div id="announcement-banner-slot" />

      <div className="mx-auto w-full max-w-[1360px] px-6 md:max-w-[1440px] md:px-16 h-[56px] flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center shrink-0"
          aria-label="FeatureSignals Home"
        >
          <PrismLotus size="md" variant="full" colorScheme="default" />
        </Link>

        {/* Desktop Nav */}
        <nav
          className="hidden lg:flex items-center gap-1"
          aria-label="Main navigation"
        >
          <PlatformDropdown
            open={platformOpen}
            setOpen={setPlatformOpen}
            active={isPlatformActive}
          />

          <SimpleDropdown
            label="Docs"
            items={docsItems}
            open={docsOpen}
            setOpen={setDocsOpen}
            active={isDocsActive}
            href="/docs"
          />

          <NavLink href="/pricing" label="Pricing" active={isPricingActive} />

          <NavLink href="/blog" label="Blog" active={isBlogActive} />
        </nav>

        {/* Right CTAs */}
        <nav className="flex items-center gap-1 font-medium">
          <Link
            href="https://app.featuresignals.com/login"
            className="h-10 px-5 text-sm font-semibold rounded-lg text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-secondary)] transition-colors whitespace-nowrap hidden sm:inline-flex items-center"
          >
            Sign In
          </Link>
          <Link
            href="https://app.featuresignals.com/register"
            className="h-10 px-5 text-sm font-semibold rounded-lg bg-[var(--signal-bg-success-emphasis)] text-white hover:bg-[#046c44] transition-colors shadow-[var(--signal-shadow-sm)] whitespace-nowrap inline-flex items-center"
          >
            Start Free
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 -mr-2 rounded-md text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-secondary)] transition-colors"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
        </nav>
      </div>

      {/* Mobile Drawer */}
      <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
          <Dialog.Content
            aria-describedby="mobile-menu-description"
            className="fixed right-0 top-0 z-50 h-full w-80 max-w-[calc(100vw-2rem)] bg-[var(--signal-bg-primary)] shadow-[var(--signal-shadow-xl)] p-6 overflow-y-auto"
          >
            <Dialog.Title className="sr-only">Navigation Menu</Dialog.Title>
            <Dialog.Description
              id="mobile-menu-description"
              className="sr-only"
            >
              Site navigation links for mobile devices.
            </Dialog.Description>

            <div className="flex items-center justify-between mb-6">
              <Link
                href="/"
                onClick={closeMobile}
                className="flex items-center"
                aria-label="FeatureSignals Home"
              >
                <PrismLotus size="sm" variant="icon" colorScheme="default" />
              </Link>
              <Dialog.Close asChild>
                <button
                  className="p-2 rounded-md hover:bg-[var(--signal-bg-secondary)] transition-colors"
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </Dialog.Close>
            </div>

            <nav className="space-y-1">
              <MobileAccordion
                title="Platform"
                items={platformColumns.flatMap((c) => c.items)}
                closeMobile={closeMobile}
                active={isPlatformActive}
              />

              <MobileAccordion
                title="Docs"
                items={docsItems}
                closeMobile={closeMobile}
                active={isDocsActive}
                href="/docs"
              />

              <MobileNavLink
                href="/pricing"
                label="Pricing"
                onClick={closeMobile}
                active={isPricingActive}
              />

              <MobileNavLink
                href="/blog"
                label="Blog"
                onClick={closeMobile}
                active={isBlogActive}
              />

              <hr className="my-3 border-[var(--signal-border-default)]" />

              <Link
                href="https://app.featuresignals.com/login"
                onClick={closeMobile}
                className="h-10 px-5 text-sm font-semibold rounded-lg text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-secondary)] transition-colors whitespace-nowrap inline-flex items-center w-full justify-center"
              >
                Sign In
              </Link>

              <Link
                href="https://app.featuresignals.com/register"
                onClick={closeMobile}
                className="h-10 px-5 text-sm font-semibold rounded-lg bg-[var(--signal-bg-success-emphasis)] text-white hover:bg-[#046c44] transition-colors shadow-[var(--signal-shadow-sm)] whitespace-nowrap inline-flex items-center w-full justify-center mt-2"
              >
                Start Free
              </Link>
            </nav>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </header>
  );
}
