"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XIcon, LinkExternalIcon } from "@primer/octicons-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * AnnouncementBanner — Top-of-page promotional banner
 *
 * Follows Tailscale/Sanity pattern: a slim, dismissible banner
 * used for product launches, feature announcements, and time-sensitive
 * calls-to-action. After dismissal, stored in sessionStorage so it
 * reappears on next browser session (not permanent dismissal).
 *
 * Usage: Configure via environment variables or hardcode for major launches.
 *   ANNOUNCEMENT_TEXT — The main message text
 *   ANNOUNCEMENT_CTA_LABEL — The CTA button text
 *   ANNOUNCEMENT_CTA_HREF — The CTA link URL
 *   ANNOUNCEMENT_LINKS — Optional additional links (JSON array of {label, href})
 */

export interface AnnouncementLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface AnnouncementBannerProps {
  text: string;
  ctaLabel?: string;
  ctaHref?: string;
  links?: AnnouncementLink[];
  storageKey?: string;
  className?: string;
}

export function AnnouncementBanner({
  text,
  ctaLabel,
  ctaHref,
  links,
  storageKey = "fs-announcement-dismissed",
  className,
}: AnnouncementBannerProps) {
  // Check sessionStorage on mount; banner shows if not dismissed this session
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem(storageKey) === "true";
    }
    return false;
  });

  const dismiss = useCallback(() => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(storageKey, "true");
    }
  }, [storageKey]);

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className={cn(
            "relative overflow-hidden border-b border-[var(--signal-border-accent-muted)]",
            "bg-[var(--signal-bg-accent-muted)]",
            className,
          )}
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="flex items-center justify-between gap-4 min-h-[44px] py-2">
              {/* Message + CTA */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <p className="text-sm text-[var(--signal-fg-primary)] font-medium truncate">
                  {text}
                </p>
                {ctaLabel && ctaHref && (
                  <Link
                    href={ctaHref}
                    className="inline-flex items-center gap-1 shrink-0 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--signal-bg-accent-emphasis)] text-white hover:bg-[#0757ba] transition-colors"
                  >
                    {ctaLabel}
                    {ctaHref.startsWith("http") && (
                      <LinkExternalIcon size={11} />
                    )}
                  </Link>
                )}
              </div>

              {/* Right side links */}
              <div className="hidden sm:flex items-center gap-4 shrink-0">
                {links?.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[var(--signal-fg-accent)] hover:text-[#0757ba] transition-colors"
                  >
                    {link.label}
                    {link.external && <LinkExternalIcon size={10} />}
                  </Link>
                ))}
              </div>

              {/* Dismiss */}
              <button
                onClick={dismiss}
                className="shrink-0 p-1.5 -mr-1.5 rounded-md text-[var(--signal-fg-secondary)] hover:text-[var(--signal-fg-primary)] hover:bg-[var(--signal-bg-secondary)] transition-colors"
                aria-label="Dismiss banner"
              >
                <XIcon size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Default banner configuration for FeatureSignals.
 * Edit this object to change the live announcement.
 * Set DISPLAY = false to hide the banner entirely.
 */
export const DEFAULT_ANNOUNCEMENT = {
  DISPLAY: true,
  TEXT: "AI Janitor v2 is now available — detect and remove stale feature flags automatically.",
  CTA_LABEL: "Learn more",
  CTA_HREF: "/features#ai-janitor",
  LINKS: [
    { label: "Blog", href: "/blog" },
    { label: "Docs", href: "/docs", external: true },
    { label: "Contact Sales", href: "/contact?reason=sales" },
  ] as AnnouncementLink[],
};
