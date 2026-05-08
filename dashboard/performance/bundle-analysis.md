# Bundle Analysis Guide — FeatureSignals Dashboard

This guide explains how to analyze and optimize the JavaScript and CSS
bundle size of the FeatureSignals dashboard.

---

## Quick Start

```bash
# Run bundle analysis
ANALYZE=true npm run build

# Or install as a dev dependency for persistent analysis
npm install --save-dev @next/bundle-analyzer
```

When `ANALYZE=true` is set, the Next.js build opens an interactive treemap
visualization of all bundles in your browser. Each box represents a module;
the size of the box corresponds to its size on disk (parsed, pre-gzip).

---

## Interpreting the Treemap

### What to Look For

1. **Large single modules** — Any box significantly larger than others.
   Hover to see the module name. Duplicated dependencies (e.g., two versions
   of `lodash`) are a common culprit.

2. **`node_modules` in route chunks** — If a heavy library appears in
   multiple route chunks instead of a shared chunk, it's being duplicated
   across pages. Investigate dynamic imports.

3. **Unexpected modules** — If you see `moment.js` (72 KB) or `lodash` (71 KB
   full), replace them. Use `date-fns` (tree-shakeable) instead of `moment`,
   and native methods instead of `lodash` where possible.

4. **Polyfills** — `core-js`, `regenerator-runtime`, etc. Next.js transpiles
   for modern browsers by default. If you see large polyfill bundles, check
   your `browserslist` config.

5. **CSS-in-JS runtime** — If using a CSS-in-JS library, check its runtime
   size. Emotion is ~7 KB, styled-components is ~14 KB. Tailwind v4 (used
   here) has zero runtime — only the generated CSS ships.

### Color Legend

| Color | Meaning |
|---|---|
| **Blue** | Your application code (`src/`) |
| **Green** | `node_modules` (third-party dependencies) |
| **Gray** | Next.js / React framework code |
| **Red** | Large modules (> 100 KB parsed) |

---

## Common Issues & Fixes

### Issue 1: A Library is in Every Route Chunk

**Symptom:** `react-markdown` (or similar) appears in 5 different route
chunks at 200 KB each.

**Fix:** Dynamic import with `next/dynamic`:

```tsx
// Before: statically imported (included in every page that uses it)
import ReactMarkdown from "react-markdown";

// After: dynamically imported (only loaded when needed)
import dynamic from "next/dynamic";

const ReactMarkdown = dynamic(() => import("react-markdown"), {
  loading: () => <MarkdownSkeleton />,
});
```

### Issue 2: Duplicate Dependency Versions

**Symptom:** Two versions of the same library appear (e.g., `lodash@4.17.21`
and `lodash@3.10.1`).

**Fix:** Check `package-lock.json` for duplicate versions. Use
`npm dedupe` or `npx npm-check-updates` to align versions.

```bash
# Check why a package is duplicated
npm ls lodash

# Deduplicate the lock file
npm dedupe
```

### Issue 3: Moment.js or Large Date Library

**Symptom:** `moment` (72 KB minified, not tree-shakeable) in the bundle.

**Fix:** Replace with tree-shakeable alternatives:
- `date-fns` — import only needed functions: `import { format } from 'date-fns'`
- `dayjs` — lightweight (2 KB) Moment-compatible API
- Native `Intl.DateTimeFormat` for simple formatting

### Issue 4: Icon Library Ships All Icons

**Symptom:** Entire `lucide-react` icon set (~800+ icons) in bundle.

**Fix:** Import only the icons you use (already done if importing from
`lucide-react` directly — it's tree-shakeable).

```tsx
// Good: tree-shakeable named import
import { Flag, Settings, Users } from "lucide-react";
```

### Issue 5: Client Component Imports Heavy Library

**Symptom:** A server component accidentally imports a client-side library.

**Fix:** Use `"use client"` boundaries carefully. Move heavy imports to
client components and dynamically import those components.

```tsx
// page.tsx (Server Component)
import dynamic from "next/dynamic";

const HeavyChart = dynamic(() => import("./heavy-chart"), {
  ssr: false, // Don't include in server bundle at all
});
```

---

## Size Budgets

Enforce with `size-limit` in CI:

```bash
npm install --save-dev @size-limit/preset-app
```

Add to `package.json`:

```json
{
  "size-limit": [
    {
      "path": ".next/static/chunks/*.js",
      "limit": "350 KB",
      "gzip": true
    },
    {
      "path": ".next/static/css/*.css",
      "limit": "50 KB",
      "gzip": true
    }
  ]
}
```

Run:
```bash
npx size-limit
```

---

## Next.js Built-in Optimizations (Already Active)

Next.js 16 (the version used here) automatically applies:

- ✅ **Route-based code splitting** — Each page gets its own JS chunk
- ✅ **Tree shaking** — Unused exports removed from production builds
- ✅ **Minification** — Terser for JS, cssnano for CSS
- ✅ **Static asset hashing** — Long-term caching for immutable assets
- ✅ **Image optimization** — via `next/image` with automatic WebP conversion
- ✅ **Font optimization** — via `next/font` with self-hosting
- ✅ **Compression** — gzip/brotli when deployed behind a compatible server

---

## Profiling Runtime Performance

For issues not visible in bundle size (e.g., slow renders, excessive
re-renders), use React DevTools Profiler:

1. Install React DevTools browser extension
2. Open DevTools → Profiler tab
3. Record an interaction (navigate, click, type)
4. Inspect flame graph for slow components
5. Look for components that re-render unexpectedly

Common causes:
- **Missing `key` prop** — causes full list re-render
- **Inline function props** — creates new references each render
- **Context consumer re-renders** — all consumers re-render when context
  value changes
- **State lifted too high** — state in parent causes all children to
  re-render

Fix with:
- `React.memo` for pure components
- `useMemo` for expensive computations
- `useCallback` for stable function references
- Split context into focused providers
