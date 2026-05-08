/**
 * axe-core Configuration for FeatureSignals Dashboard
 *
 * This configuration is used by @axe-core/react to run accessibility checks
 * during development. It only activates in development mode.
 *
 * Usage: Import in root layout to enable dev-time accessibility warnings.
 *
 * @see https://github.com/dequelabs/axe-core-npm/tree/develop/packages/react
 */

import type { RunOptions } from "axe-core";

/**
 * Full axe-core run options (for programmatic use with axe.run()).
 * Only runs WCAG 2.0 A/AA and 2.1 A/AA rules.
 */
export const axeRunOptions: RunOptions = {
  runOnly: {
    type: "tag",
    values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
  },
  rules: {
    "color-contrast": { enabled: true },
    "landmark-one-main": { enabled: true },
    region: { enabled: true },
  },
};

/**
 * Configuration compatible with @axe-core/react's ReactSpec interface.
 *
 * Note: @axe-core/react overrides the `runOnly` type to only accept `string[]`
 * (not the full RunOnly object), and `rules` MUST be an array of `Rule` objects
 * (not a dictionary). This matches the `ReactSpec` interface from the package.
 */
export const axeConfig = {
  runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
  rules: [
    { id: "color-contrast", enabled: true },
    { id: "landmark-one-main", enabled: true },
    { id: "region", enabled: true },
  ],
};

/**
 * Check whether axe should be enabled.
 * Only enable in development and when the browser supports it.
 */
export function shouldEnableAxe(): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  if (typeof window === "undefined") return false;

  // Check for URL param to toggle axe on/off
  const params = new URLSearchParams(window.location.search);
  if (params.get("axe") === "off") return false;

  return true;
}

/**
 * Delay in milliseconds before axe runs after a route change.
 * This allows the DOM to stabilize after React hydration.
 */
export const AXE_DELAY_MS = 1000;
