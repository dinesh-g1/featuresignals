# Performance — Quick Reference

> **Target:** Lighthouse 95+ on all dashboard pages.
> **Framework:** Next.js 16 with React 19.

---

## Cheat Sheet

### Images

```tsx
// ✅ DO: Next.js Image with explicit dimensions
import Image from "next/image";
<Image src="/hero.png" alt="Dashboard" width={800} height={400} priority />

// ✅ DO: Responsive image
<Image src="/avatar.png" alt="User" width={48} height={48} sizes="48px" />

// ❌ DON'T: Plain <img> tag
<img src="/hero.png" alt="Dashboard" />

// ❌ DON'T: Image without dimensions
<Image src="/hero.png" alt="Dashboard" />
```

Import local images for automatic width/height detection:
```tsx
import hero from "@/public/hero.png";
<Image src={hero} alt="Dashboard" /> // width/height auto-detected
```

### Fonts

```tsx
// ✅ DO: next/font with self-hosting
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"], display: "swap" });

// ❌ DON'T: Google Fonts <link> in <head>
```

### Dynamic Imports

```tsx
// ✅ DO: Lazy-load heavy client components
import dynamic from "next/dynamic";
const FlagEditor = dynamic(() => import("@/components/flag-editor"), {
  loading: () => <Skeleton />,
});
```

### Data Fetching

```tsx
// ✅ DO: Cache data fetches
import { cache } from "react";
const getFlags = cache(async (projectId: string) => {
  // ...
});

// ✅ DO: Set revalidation on the fetch
fetch("/api/flags", { next: { revalidate: 60 } });
```

### CSS

```tsx
// ✅ DO: Use Tailwind utility classes
<div className="flex items-center gap-2 p-4">

// ❌ DON'T: Inline styles
<div style={{ display: "flex", padding: "16px" }}>

// ❌ DON'T: Hardcoded color values in components
<div className="text-[#1a73e8]">
```

---

## Before You Commit

- [ ] `npm run build` succeeds without errors
- [ ] No new `<img>` tags without explicit width/height
- [ ] No Google Fonts `<link>` elements — use `next/font`
- [ ] No `style={{}}` in JSX — use Tailwind classes
- [ ] Heavy client components use `dynamic()` import
- [ ] New dependencies reviewed for size impact

---

## Measuring

```bash
# Local Lighthouse
npx lighthouse http://localhost:3000/dashboard --view

# Bundle analysis
ANALYZE=true npm run build

# Production build test
npm run build && npm run start
# Then run Lighthouse against localhost:3000

# Visual regression (catches unintended layout changes)
npm run test:visual
```

## Links

- [Optimization Plan](./optimization-plan.md) — Full strategy with priority matrix
- [Bundle Analysis](./bundle-analysis.md) — How to analyze and fix large bundles
- [Lighthouse Config](./lighthouse-config.js) — CI assertions and budgets
