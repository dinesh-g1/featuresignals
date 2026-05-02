"use client";

import type { ReactNode } from "react";

/**
 * Shared layout for all auth pages (register, login, forgot-password, reset-password).
 *
 * Desktop: split layout — left panel (brand/value) + right panel (form).
 * Mobile:  single column — just the form, centered.
 *
 * The left panel content varies by page:
 *   - Register: value propositions (why sign up)
 *   - Login:    welcome back / brand
 *   - Forgot/Reset: utility-focused, no left panel content needed
 */

export function AuthLayout({
  left,
  children,
}: {
  left: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[var(--bgColor-default)]">
      {/* Left panel (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2">{left}</div>

      {/* Right panel */}
      <div className="flex w-full lg:w-1/2 items-center justify-center px-8 py-10 sm:px-12 lg:px-16 xl:px-20">
        {children}
      </div>
    </div>
  );
}
