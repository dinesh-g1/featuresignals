# Visual Regression Testing

Visual regression tests capture screenshots of key pages and compare them
against approved baselines to detect unintended visual changes.

## Prerequisites

- A running development server (the test runner starts one automatically).
- Test user credentials configured via environment variables (or defaults
  in `e2e/fixtures.ts`).

## Running Visual Tests

```bash
# Run visual regression tests (uses existing snapshots as baseline)
npm run test:visual

# Run in headed mode (see what the browser does)
npx playwright test --config=e2e/visual/visual.config.ts --headed

# Run a single test file
npx playwright test --config=e2e/visual/visual.config.ts screenshots.spec.ts

# Run with UI mode
npx playwright test --config=e2e/visual/visual.config.ts --ui
```

## Updating Baselines

When you intentionally change the UI, update the snapshot baselines:

```bash
# Update all visual snapshots
npm run test:visual:update

# Or update a specific test's snapshots
npx playwright test --config=e2e/visual/visual.config.ts --update-snapshots screenshots.spec.ts
```

Always review updated snapshots before committing. Use `git diff` on the
`__snapshots__/` directory to see what changed.

## CI Integration

In CI, visual tests run against a fresh build and compare against committed
snapshots. Any difference causes a test failure.

```yaml
# Example GitHub Actions step
- name: Run visual regression tests
  run: npm run test:visual
  env:
    BASE_URL: http://localhost:3000
```

### CI Best Practices

1. **Use a single worker** — Visual tests run sequentially (`workers: 1`)
   to ensure deterministic screenshots.
2. **Use consistent OS** — Screenshots differ between macOS, Linux, and
   Windows due to font rendering. Run visual tests on Linux in CI to match
   the deployment environment.
3. **Docker for consistency** — Use a Docker container with consistent
   fonts and rendering for the most reliable results.
4. **Review diffs on failure** — CI uploads the HTML report with side-by-side
   diffs so you can inspect failures.

## Snapshot Directory Structure

```
e2e/visual/__snapshots__/
  screenshots.spec.ts-snapshots/
    Visual-Regression---Dashboard-Home_dashboard-home-page-(logged-in)_chromium.png
    Visual-Regression---Flags_flag-listing-page_chromium.png
    ...
```

## Tolerance Configuration

The default tolerance is configured in `visual.config.ts`:

```ts
toHaveScreenshot: {
  maxDiffPixelRatio: 0.02,  // 2% of pixels can differ
  threshold: 0.1,            // Per-pixel threshold (0 = exact)
}
```

- **`maxDiffPixelRatio`** — Fraction of total pixels allowed to differ.
  Increase for pages with dynamic content (timestamps, random data).
- **`threshold`** — How different a single pixel must be to count as
  different. Higher values tolerate more anti-aliasing differences.

## Tips

- Pages with timestamps, random IDs, or dynamic data should mask those
  elements or use `maxDiffPixelRatio` appropriate to the page.
- Run visual tests last in CI — after unit and integration tests pass.
- Always run `test:visual:update` after intentional UI changes and commit
  the updated snapshots.
- If a test is consistently flaky, consider masking dynamic regions with
  `page.evaluate()` or adjusting the tolerance for that specific test.
