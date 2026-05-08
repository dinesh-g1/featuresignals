"use client";

import Link from "next/link";
import { useState, useCallback, useRef, useEffect } from "react";
import { ThreeBarsIcon, X } from "lucide-react";
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
    title: "Platform",
    items: [
      { label: "Feature Flags", href: "/features#feature-flags" },
      { label: "A/B Experiments", href: "/features#experiments" },
      { label: "AI Janitor", href: "/features#ai-janitor" },
      { label: "Migration Engine", href: "/features#migration" },
      { label: "Governance", href: "/features#governance" },
      { label: "Integrations", href: "/integrations" },
      { label: "Docs", href: "/docs" },
      { label: "Quickstart", href: "/docs/getting-started/quickstart" },
    ],
  },
  {
    title: "Solutions",
    items: [
      {
        label: "Progressive Delivery",
        href: "/use-cases#progressive-delivery",
      },
      { label: "Kill Switches", href: "/use-cases#kill-switch" },
      { label: "Canary Releases", href: "/use-cases#canary-releases" },
      { label: "GitOps", href: "/use-cases#gitops" },
      { label: "Enterprise SSO", href: "/features#governance" },
      { label: "Compliance", href: "/features#compliance" },
      { label: "Self-Hosting", href: "/docs/deployment/self-hosting" },
    ],
  },
];

const customersItems: NavLink[] = [
  { label: "Customer Stories", href: "/customers" },
  { label: "Case Studies", href: "/customers" },
  { label: "Wall of Love", href: "/customers" },
];

const partnersItems: NavLink[] = [
  { label: "Technology Partners", href: "/partners" },
  { label: "Integration Partners", href: "/integrations" },
  { label: "Become a Partner", href: "/partners" },
];

/* ------------------------------------------------------------------ */
/*  PlusMinus Icon — Tailscale's open/close indicator                 */
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
      {/* vertical line — animates to form + / - */}
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
/*  Simple Dropdown — used for Customers & Partners                   */
/* ------------------------------------------------------------------ */

function SimpleDropdown({
  label,
  items,
  open,
  setOpen,
}: {
  label: string;
  items: NavLink[];
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mouse enters container (button OR panel) → open + cancel close
  const handleEnter = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpen(true);
  };

  // Mouse leaves container → schedule close after 400ms
  const handleLeave = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 400);
  };

  return (
    <div
      className="relative"
      ref={containerRef}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
          open
            ? "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-primary)]"
            : "text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-secondary)]",
        )}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {label}
        <PlusMinusIcon open={open} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-0 top-full mt-1 w-56 rounded-xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] shadow-[var(--shadow-floating-large)] py-2 z-50"
          >
            <ul className="flex flex-col">
              {items.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-md px-3 py-2 text-sm font-medium text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-secondary)] transition-colors"
                  >
                    {item.label}
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
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mouse enters container (button OR panel) → open + cancel close
  const handleEnter = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpen(true);
  };

  // Mouse leaves container → schedule close after 400ms
  const handleLeave = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 400);
  };

  return (
    <div
      className="relative"
      ref={containerRef}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
          open
            ? "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-primary)]"
            : "text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-secondary)]",
        )}
        aria-expanded={open}
        aria-haspopup="true"
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
          >
            <div className="w-[560px] shadow-[var(--shadow-floating-large)] overflow-hidden rounded-2xl border border-[var(--signal-border-default)]">
              {/* Main grid — 2 columns */}
              <div className="shadow-[var(--signal-shadow-sm)] grid grid-cols-2 gap-6 border-b border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] p-8">
                {platformColumns.map((col) => (
                  <div key={col.title} className="flex flex-col gap-4">
                    {/* Column header: text + horizontal line */}
                    <div className="flex items-center gap-2.5 px-3">
                      <p className="font-medium whitespace-nowrap text-[14px] uppercase tracking-[0.6px] text-[var(--signal-fg-secondary)]">
                        {col.title}
                      </p>
                      <div className="h-px w-full bg-[var(--signal-border-default)]" />
                    </div>
                    <ul className="flex flex-col gap-1">
                      {col.items.map((item) => (
                        <li key={item.label}>
                          <Link
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className="block rounded-md px-3 py-2.5 text-sm font-medium text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-secondary)] transition-colors"
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Bottom promo bar */}
              <div className="bg-[var(--signal-bg-secondary)] p-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-[14px] uppercase tracking-[0.6px] text-[var(--signal-fg-secondary)]">
                      New: AI Janitor v2
                    </p>
                    <p className="text-sm text-[var(--signal-fg-secondary)] leading-snug mt-0.5">
                      Smarter detection, automated PRs, cross-repo cleanup.
                    </p>
                  </div>
                  <Link
                    href="/features#ai-janitor"
                    onClick={() => setOpen(false)}
                    className="inline-flex shrink-0 items-center justify-center rounded-md px-3 h-9 text-sm font-medium bg-[var(--signal-bg-inverse)] text-[var(--signal-fg-on-emphasis)] border border-transparent shadow-[var(--signal-shadow-sm)] hover:shadow-[var(--signal-shadow-md)] transition-shadow"
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
/*  Mobile Nav Link                                                   */
/* ------------------------------------------------------------------ */

function MobileNavLink({
  href,
  label,
  onClick,
  className,
}: {
  href: string;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "block w-full rounded-md px-3 py-2.5 text-sm font-medium text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-secondary)] transition-colors",
        className,
      )}
    >
      {label}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile Accordion Section                                           */
/* ------------------------------------------------------------------ */

function MobileAccordion({
  title,
  items,
  closeMobile,
}: {
  title: string;
  items: NavLink[];
  closeMobile: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full rounded-md px-3 py-2.5 text-sm font-medium text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-secondary)] transition-colors"
      >
        {title}
        <PlusMinusIcon open={open} />
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
  const [platformOpen, setPlatformOpen] = useState(false);
  const [customersOpen, setCustomersOpen] = useState(false);
  const [partnersOpen, setPartnersOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  // Close all dropdowns on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setPlatformOpen(false);
        setCustomersOpen(false);
        setPartnersOpen(false);
        setMobileOpen(false);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const closeAllDropdowns = useCallback(() => {
    setPlatformOpen(false);
    setCustomersOpen(false);
    setPartnersOpen(false);
  }, []);

  return (
    <header className="sticky top-0 z-40 glass-card !rounded-none !border-0 !border-b !border-[var(--fs-border-default)] !shadow-sm">
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
          <PlatformDropdown open={platformOpen} setOpen={setPlatformOpen} />

          <SimpleDropdown
            label="Customers"
            items={customersItems}
            open={customersOpen}
            setOpen={setCustomersOpen}
          />

          <SimpleDropdown
            label="Partners"
            items={partnersItems}
            open={partnersOpen}
            setOpen={setPartnersOpen}
          />

          <Link
            href="/pricing"
            className="flex items-center gap-1 rounded-md px-3 py-2.5 text-sm font-medium text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-secondary)] transition-colors"
          >
            Pricing
          </Link>
        </nav>

        {/* Right CTAs */}
        <nav className="flex items-center gap-1 font-medium">
          <Link
            href="https://app.featuresignals.com/login"
            className="btn-ghost !h-9 !text-sm hidden sm:inline-flex"
          >
            Sign In
          </Link>
          <Link
            href="https://app.featuresignals.com/register"
            className="btn-primary-success whitespace-nowrap !h-9 !px-4 !text-sm"
          >
            Start Free
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 -mr-2 rounded-md text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-secondary)] transition-colors"
            aria-label="Open menu"
          >
            <ThreeBarsIcon size={20} />
          </button>
        </nav>
      </div>

      {/* Mobile Drawer */}
      <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
          <Dialog.Content
            aria-describedby="mobile-menu-description"
            className="fixed right-0 top-0 z-50 h-full w-80 max-w-[calc(100vw-2rem)] bg-[var(--signal-bg-primary)] shadow-[var(--shadow-floating-xlarge)] p-6 overflow-y-auto"
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
              {/* Platform — accordion with columns */}
              <MobileAccordion
                title="Platform"
                items={platformColumns.flatMap((c) => c.items)}
                closeMobile={closeMobile}
              />

              <MobileAccordion
                title="Customers"
                items={customersItems}
                closeMobile={closeMobile}
              />

              <MobileAccordion
                title="Partners"
                items={partnersItems}
                closeMobile={closeMobile}
              />

              <MobileNavLink
                href="/pricing"
                label="Pricing"
                onClick={closeMobile}
              />

              <hr className="my-3 border-[var(--signal-border-default)]" />

              <MobileNavLink
                href="https://app.featuresignals.com/login"
                label="Sign In"
                onClick={closeMobile}
              />

              <Link
                href="https://app.featuresignals.com/register"
                onClick={closeMobile}
                className="btn-primary-success w-full mt-2"
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
