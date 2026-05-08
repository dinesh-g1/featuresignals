# Performance Optimization Plan — FeatureSignals Dashboard

> **Target:** Lighthouse 95+ on all pages (Performance, Accessibility,
> Best Practices, SEO)
> **Baseline:** To be measured (run Lighthouse on production build)
> **Owner:** Engineering
> **Last Updated:** YYYY-MM-DD

---

## 1. Current Baseline

*Run Lighthouse on the production build and record results below.*

| Page | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| `/login` | — | — | — | — |
| `/dashboard` | — | — | — | — |
| `/projects` | — | — | — | — |
| `/projects/[id]/flags` | — | — | — | — |
| `/projects/[id]/flags/[key]` | — | — | — | — |
| `/projects/[id]/segments` | — | — | — | — |
| `/settings` | — | — | — | — |
| `/api-keys` | — | — | — | — |
| `/team` | — | — | — | — |

**Command to measure:**
```bash
npx lighthouse http://localhost:3000/dashboard --view --preset=desktop
```

---

## 2. Target Budgets

| Metric | Desktop Target | Mobile Target | Baseline |
|---|---|---|---|
| **Performance** | ≥ 95 | ≥ 90 | — |
| **First Contentful Paint (FCP)** | < 1.0s | < 1.8s | — |
| **Largest Contentful Paint (LCP)** | < 1.5s | < 2.5s | — |
| **Total Blocking Time (TBT)** | < 100ms | < 200ms | — |
| **Cumulative Layout Shift (CLS)** | < 0.05 | < 0.1 | — |
| **Speed Index** | < 1.5s | < 2.5s | — |
| **Time to Interactive (TTI)** | < 2.0s | < 3.5s | — |
| **Total JavaScript size** | < 350 KB | < 350 KB | — |
| **Total CSS size** | < 50 KB | < 50 KB | — |
| **Total images size** | < 500 KB | < 500 KB | — |
| **HTTP requests** | < 30 | < 30 | — |

---

## 3. Optimization Categories

### 3.1 JavaScript Optimization

| Action | Impact | Effort | Priority | Status |
|---|---|---|---|---|
| **Run `@next/bundle-analyzer`** to identify large chunks | 🔍 Diagnostic | Low | P0 | ☐ |
| **Dynamic import for heavy pages** (flags detail, settings) | 🟢 High | Low | P0 | ☐ |
| **Tree-shake unused dependencies** | 🟢 High | Low | P0 | ☐ |
| **Replace large utility libraries with smaller alternatives** | 🟡 Medium | Medium | P1 | ☐ |
| **Lazy-load client components** (`dynamic(() => import(...))`) | 🟢 High | Low | P0 | ☐ |
| **Code-split by route** (Next.js App Router does this automatically — verify) | 🟢 High | Low | P0 | ☐ |
| **Remove unused polyfills** | 🟡 Medium | Low | P2 | ☐ |
| **Optimize React re-renders** (React.memo, useMemo, useCallback) | 🟡 Medium | Medium | P1 | ☐ |

#### Bundle Size Check

```bash
ANALYZE=true npm run build
```

This opens an interactive visualization of bundle composition. Target:
- No single chunk > 200 KB (uncompressed)
- No duplicate dependencies across chunks
- `node_modules` should not leak into route chunks unnecessarily

### 3.2 CSS Optimization

| Action | Impact | Effort | Priority | Status |
|---|---|---|---|---|
| **Remove unused Tailwind CSS** (Tailwind v4 does this automatically via JIT) | 🟢 High | Low | P0 | ✅ (Tailwind v4) |
| **Extract critical CSS** | 🟢 High | Medium | P1 | ☐ |
| **Minimize `globals.css`** | 🟡 Medium | Low | P1 | ☐ |
| **Audit for layout shift** (CLS) | 🟢 High | Low | P0 | ☐ |
| **Ensure font-display: swap on all font faces** | 🟢 High | Low | P0 | ☐ |
| **Use CSS containment where appropriate** | 🟡 Medium | Low | P2 | ☐ |

#### CLS Audit Checklist

- [ ] All `<img>` tags have explicit `width` and `height`
- [ ] Ads/embeds have reserved space
- [ ] Dynamic content inserts below the fold or has skeleton placeholders
- [ ] Web fonts use `font-display: swap` with fallback font matching
- [ ] No layout shift on route transitions

### 3.3 Image Optimization

| Action | Impact | Effort | Priority | Status |
|---|---|---|---|---|
| **Use Next.js `<Image>` component everywhere** | 🟢 High | Low | P0 | ☐ |
| **Set explicit width/height on all images** | 🟢 High | Low | P0 | ☐ |
| **Convert PNG/JPG to WebP or AVIF** | 🟢 High | Low | P0 | ☐ |
| **Lazy-load below-fold images** | 🟢 High | Low | P0 | ✅ (Next.js Image default) |
| **Add responsive image sizes** (`sizes` prop) | 🟡 Medium | Low | P1 | ☐ |
| **Add blur placeholder for dynamic images** | 🟡 Medium | Medium | P2 | ☐ |
| **Audit for excessively large images** (> 500 KB) | 🟡 Medium | Low | P1 | ☐ |

### 3.4 Font Optimization

| Action | Impact | Effort | Priority | Status |
|---|---|---|---|---|
| **Use `next/font` for all fonts** | 🟢 High | Low | P0 | ☐ |
| **Self-host fonts** (no Google Fonts CDN) | 🟢 High | Low | P0 | ☐ |
| **Subset fonts to required characters** | 🟡 Medium | Medium | P2 | ☐ |
| **Set `font-display: swap`** | 🟢 High | Low | P0 | ☐ |
| **Preload critical fonts** | 🟡 Medium | Low | P1 | ☐ |

### 3.5 Caching Strategy

| Action | Impact | Effort | Priority | Status |
|---|---|---|---|---|
| **Set `Cache-Control` headers for static assets** | 🟢 High | Low | P0 | ☐ |
| **Use Next.js ISR for semi-static pages** | 🟡 Medium | Medium | P1 | ☐ |
| **Set `stale-while-revalidate` for API responses** | 🟡 Medium | Medium | P1 | ☐ |
| **Configure CDN caching** (Cloudflare/Fastly) | 🟢 High | Low | P0 | ☐ |
| **Use `next/cache` for data fetching** | 🟡 Medium | Medium | P1 | ☐ |
| **Immutable cache for hashed assets** | 🟢 High | Low | P0 | ✅ (Next.js default) |

### 3.6 Server & Network

| Action | Impact | Effort | Priority | Status |
|---|---|---|---|---|
| **Enable gzip/brotli compression** | 🟢 High | Low | P0 | ☐ |
| **Enable HTTP/2** | 🟢 High | Low | P0 | ☐ |
| **Add security headers** (CSP, HSTS, X-Frame-Options) | 🟢 High | Low | P0 | ☐ |
| **Reduce server response time** (TTFB < 200ms) | 🟢 High | Medium | P1 | ☐ |
| **Use CDN for static assets** | 🟢 High | Low | P0 | ☐ |
| **Enable keep-alive connections** | 🟡 Medium | Low | P2 | ☐ |
| **Preconnect to API origin** | 🟡 Medium | Low | P1 | ☐ |
| **DNS prefetch for external domains** | 🟡 Medium | Low | P2 | ☐ |

---

## 4. Priority Matrix

### P0 — Do First (High Impact, Low Effort)

1. Enable gzip/brotli compression in `next.config.ts`
2. Add security headers
3. Use `next/image` for all images (with width/height)
4. Run bundle analyzer, identify and fix large chunks
5. Dynamic import heavy page components
6. Audit and fix CLS issues
7. Set `Cache-Control` headers
8. Self-host fonts via `next/font`

### P1 — Do Next (Medium-High Impact, Medium Effort)

9. Extract critical CSS
10. Optimize React re-renders
11. Add responsive image sizes
12. Configure ISR for semi-static pages
13. API response caching with `stale-while-revalidate`
14. Preconnect to API origin

### P2 — Polish (Medium-Low Impact, Medium-High Effort)

15. Subset fonts
16. CSS containment
17. Remove unused polyfills
18. DNS prefetch optimization

---

## 5. Measurement Cadence

| Event | What to Measure |
|---|---|
| **Every PR** | Lighthouse CI on changed pages |
| **Weekly** | Full Lighthouse run on all pages |
| **Before release** | Full Lighthouse + Web Vitals field data check |
| **Post-release** | Monitor CrUX data (Chrome User Experience Report) |

---

## 6. Tools

| Tool | Purpose |
|---|---|
| **Lighthouse CI** | Automated performance testing in CI |
| **`@next/bundle-analyzer`** | JavaScript bundle size analysis |
| **Chrome DevTools Performance tab** | Runtime performance profiling |
| **Web Vitals library** | Real-user metric collection (`web-vitals` npm package) |
| **`lighthouse-parade`** | Batch Lighthouse runs across multiple URLs |
| **PageSpeed Insights API** | Field + lab data from Google |
| **`size-limit`** | Enforce bundle size budgets in CI |
