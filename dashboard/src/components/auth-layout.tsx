"use client";

import type { ReactNode } from "react";
import { PrismLotusIcon } from "@/components/prism-lotus";
import {
  ShieldCheckIcon,
  KeyIcon,
  UsersIcon,
  CheckCircleFillIcon,
} from "@/components/icons/nav-icons";

/**
 * AuthLayout — centered card on a subtle gradient background.
 *
 * Design principles (Don Norman, DOET / Emotional Design):
 * - Visceral: Generous whitespace, refined typography, subtle gradient.
 * - Behavioral: The form is the undisputed hero. Zero competing elements.
 * - Reflective: Premium materials — proper lucide icons, Signal UI tokens.
 */

interface AuthLayoutProps {
  children: ReactNode;
  /** Optional testimonial to show below the card on desktop */
  testimonial?: ReactNode;
}

export function AuthLayout({ children, testimonial }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--signal-bg-secondary)] px-4 py-12 sm:px-6 lg:px-8">
      {/* Subtle radial glow for depth */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(9,105,218,0.06), transparent)",
        }}
      />

      <div className="relative z-10 w-full max-w-lg space-y-8">
        {/* Logo + brand — horizontal, tight gap */}
        <div className="flex items-center justify-center gap-2.5">
          <PrismLotusIcon size={32} colorScheme="default" />
          <h1 className="text-xl font-bold tracking-tight text-[var(--signal-fg-primary)]">
            Feature<span className="text-[var(--signal-fg-accent)]">Signals</span>
          </h1>
        </div>

        {/* Card — clean white surface with breathing room */}
        <div className="rounded-2xl bg-[var(--signal-bg-primary)] px-6 py-8 shadow-sm ring-1 ring-[var(--signal-border-default)] sm:px-10 sm:py-10">
          {children}
        </div>

        {/* Trust signals below the card */}
        {testimonial ? (
          <div className="text-center">{testimonial}</div>
        ) : (
          <div className="space-y-4">
            <p className="text-center text-xs text-[var(--signal-fg-tertiary)]">
              Trusted by engineering teams worldwide
            </p>
            <div className="flex items-center justify-center gap-5">
              {[
                { label: "TLS 1.3", Icon: ShieldCheckIcon },
                { label: "RBAC", Icon: UsersIcon },
                { label: "SSO", Icon: KeyIcon },
                { label: "SOC 2", Icon: CheckCircleFillIcon },
              ].map(({ label, Icon }) => (
                <div
                  key={label}
                  className="flex items-center gap-1.5 text-xs text-[var(--signal-fg-tertiary)]"
                >
                  <Icon className="h-3.5 w-3.5 text-[var(--signal-fg-accent)]" />
                  {label}
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-[var(--signal-fg-tertiary)]">
              &copy; {new Date().getFullYear()} FeatureSignals. All rights reserved.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
