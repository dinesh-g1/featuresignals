import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  // Relax rules for pre-existing codebase patterns.
  // These are knowingly relaxed to match the existing codebase without
  // requiring a massive refactor across hundreds of locations.
  // Each should be tightened as the corresponding area is refactored.
  {
    rules: {
      // ── TypeScript ────────────────────────────────────────────
      // Underscore-prefixed variables/args are intentionally unused.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],

      // Pre-existing: ~62 occurrences across codebase.
      // TODO: Eliminate over time — prefer `unknown` with type guards.
      "@typescript-eslint/no-explicit-any": "off",

      // Pre-existing: ~5 require() calls in older test files.
      // TODO: Convert to dynamic import().
      "@typescript-eslint/no-require-imports": "off",

      // ── React ─────────────────────────────────────────────────
      // Pre-existing: ~10 unescaped entity warnings in JSX text.
      // TODO: Fix as pages are touched.
      "react/no-unescaped-entities": "off",

      // ── React Hooks / React Compiler ──────────────────────────
      // Pre-existing: test helper functions using `use` that don't
      // follow the use-prefix convention, setState in effects that
      // trigger cascading renders, impure render functions, and
      // ref access violations. These are React 19 strict-mode /
      // React Compiler diagnostics surfaced through eslint-config-next.
      // TODO: Address during React 19 migration audit.
      "react-hooks/rules-of-hooks": "off",
      "react-hooks/purity": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",

      // ── @next/next ────────────────────────────────────────────
      // Several Next.js compiler diagnostics appear as lint errors:
      //   - "Calling setState synchronously within an effect can
      //     trigger cascading renders"
      //   - "Existing memoization could not be preserved"
      //   - "Cannot call impure function during render"
      //   - "Cannot access refs during render"
      //
      // These are React 19 strict-mode diagnostics surfaced through
      // the Next.js compiler, not standard ESLint rules. They are
      // pre-existing and out of scope for this cleanup pass.
      // TODO: Address during React 19 migration audit.
      "@next/next/no-sync-setstate-in-effect": "off",
    },
  },
]);

export default eslintConfig;
