/**
 * axe-core Accessibility Initialization
 *
 * This module initializes @axe-core/react in development mode to provide
 * real-time accessibility violation warnings in the browser console.
 *
 * Usage: Import and call initAxe() once in the root layout component.
 * The function is a no-op in production and on the server.
 *
 * @see dashboard/accessibility/axe-config.ts for rule configuration
 * @see dashboard/accessibility/audit-plan.md for methodology
 */

import React from "react";
import ReactDOM from "react-dom";
import {
  axeConfig,
  shouldEnableAxe,
  AXE_DELAY_MS,
} from "../../accessibility/axe-config";

/**
 * Dynamically imports @axe-core/react and initializes it.
 * This is only called in development mode in the browser.
 */
export async function initAxe(): Promise<void> {
  if (!shouldEnableAxe()) return;

  try {
    const axeReact = await import("@axe-core/react");
    axeReact.default(React, ReactDOM, AXE_DELAY_MS, axeConfig);

    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log(
        "[a11y] axe-core initialized. Accessibility violations will be logged to the console.",
        "\n  Tip: Add ?axe=off to the URL to disable checks temporarily.",
      );
    }
  } catch {
    // axe-core is a devDependency — fail silently if not installed
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.warn(
        "[a11y] @axe-core/react not found. Run `npm install --save-dev @axe-core/react` to enable accessibility checks.",
      );
    }
  }
}

/**
 * React hook to initialize axe on component mount.
 * Place in the root layout (client component) to enable checks on every route.
 */
export function useAxe(): void {
  React.useEffect(() => {
    // Small delay to allow DOM to stabilize after hydration / route change
    const timer = setTimeout(() => {
      initAxe();
    }, AXE_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);
}
