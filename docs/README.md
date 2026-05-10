# ⚠️ DEPRECATED — Old Docusaurus Documentation Site

> **Status:** ARCHIVED — May 2026
> **New location:** `featuresignals.com/docs/` (served from `website/src/app/docs/`)

This directory contains the **old Docusaurus-based documentation site** that was previously deployed to `docs.featuresignals.com`. The documentation content has been fully migrated into the main Next.js website at `website/src/app/docs/` and is now served from `https://featuresignals.com/docs/`.

## Why This Was Archived

- **Single surface:** All content now lives at `featuresignals.com/*` with shared header/footer/Signal UI design tokens.
- **No separate build:** Documentation is part of the main Next.js static export (`website/`), eliminating a separate Docusaurus build/deploy pipeline.
- **Better SEO:** Consolidated domain authority on `featuresignals.com`.
- **Redirects in place:** All old `docs.featuresignals.com/*` paths 301 redirect to `featuresignals.com/docs/*` equivalents (configured in `website/next.config.ts`).

## If You Need to Reference Old Content

The original Markdown source files are preserved in `docs/docs/` and can be referenced read-only. Do not modify them — all new documentation changes go into `website/src/app/docs/` instead.

## Cleanup

When ready to fully remove this directory:
1. Verify DNS for `docs.featuresignals.com` points to the new site or has a redirect
2. Confirm all CI/CD pipelines reference `website/` instead of `docs/`
3. Delete this directory and remove any remaining Docusaurus dependencies from `package.json` at the repo root
