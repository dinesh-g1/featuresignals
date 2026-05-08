# FeatureSignals Dashboard — End-to-End Tests

> **Phase F.1:** Signup → First Flag → First Evaluation  
> **Framework:** Playwright  
> **Browsers:** Chromium, Firefox, WebKit

---

## Quick Start

```bash
# Install Playwright and browsers (first time only)
npx playwright install --with-deps

# Run all E2E tests
npm run test:e2e

# Run with Playwright UI (debug mode)
npm run test:e2e:ui

# Run in headed mode (visible browser)
npm run test:e2e:headed

# Run a specific spec file
npx playwright test e2e/specs/onboarding.spec.ts

# Run a specific test by name
npx playwright test -g "User can create a segment"
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `E2E_BASE_URL` | `http://localhost:3000` | Base URL of the dashboard app under test |

For CI or testing against staging/production:

```bash
E2E_BASE_URL=https://staging.featuresignals.dev npm run test:e2e
```

---

## Test Structure

```
e2e/
├── README.md                          # This file
├── fixtures/
│   └── auth.fixture.ts                # Auth helpers: login, signup, OTP, token injection
├── specs/
│   ├── onboarding.spec.ts             # Golden Path: signup → flag → evaluation
│   └── critical-paths.spec.ts         # Segments, environments, flag lifecycle, settings
├── utils/
│   └── test-helpers.ts                # Shared utilities: toasts, forms, navigation, dialogs
├── pages/                             # Page Object Models (existing)
│   ├── auth.page.ts
│   ├── dashboard.page.ts
│   ├── flags.page.ts
│   └── segments.page.ts
├── auth.spec.ts                       # Authentication tests (existing)
├── dashboard.spec.ts                  # Dashboard tests (existing)
├── flags.spec.ts                      # Flag management tests (existing)
├── segments.spec.ts                   # Segment management tests (existing)
└── fixtures.ts                        # Base Playwright fixtures (existing)
```

---

## Test Conventions

### Selector Strategy

All tests use `data-testid` attributes for element selection. This is configured in `playwright.config.ts`:

```ts
// playwright.config.ts
use: {
  testIdAttribute: 'data-testid',
}
```

Use `page.getByTestId('my-element')` to select elements.

### Required data-testid Attributes

To make these tests work against the real app, the following `data-testid` attributes should be present in the UI components:

**Authentication:**
- `email-input`, `password-input`, `login-button`, `login-error-message`
- `forgot-password-link`, `signup-link`, `session-expired-banner`
- `register-name-input`, `register-email-input`, `register-password-input`
- `register-org-name-input`, `register-region-select`, `register-submit-button`
- `otp-input-container`, `otp-slot-0` through `otp-slot-5`, `otp-verify-button`
- `user-menu-trigger`, `logout-button`

**Navigation & Layout:**
- `context-bar`, `env-color-bar`, `environment-select`
- `tab-targeting`, `tab-test`, `tab-history`, `tab-team`

**Flags:**
- `create-flag-button`, `create-flag-dialog`, `create-flag-submit`, `create-flag-cancel`
- `flag-name-input`, `flag-key-input`, `flag-description-input`, `flag-type-select`
- `flag-search-input`, `flag-filter-dropdown`, `flag-toggle`
- `flag-row-{key}`, `flag-status-indicator`, `flag-status-killed`
- `flag-actions-menu`, `archive-flag-action`, `kill-switch-button`
- `flags-table`

**Targeting & Rules:**
- `add-rule-button`, `rule-attribute-select`, `rule-operator-select`, `rule-value-input`
- `rule-type-select`, `rule-segment-select`, `match-type-select`
- `save-rules-button`, `targeting-rule-item`
- `percentage-rollout-slider`, `percentage-rollout-input`, `save-rollout-button`

**Evaluation:**
- `evaluation-form`, `eval-target-key`, `eval-attribute-*`
- `eval-submit-button`, `eval-result-value`, `eval-result-reason`

**Segments:**
- `create-segment-button`, `create-segment-dialog`, `create-segment-submit`
- `segment-name-input`, `segment-description-input`
- `segment-row-{key}`, `segment-rule`, `segments-table`
- `delete-segment-button`

**Environments & API Keys:**
- `create-environment-button`, `create-environment-dialog`, `create-environment-submit`
- `environment-name-input`, `environment-color-{color}`
- `environment-row-{slug}`, `environment-option-{slug}`
- `create-api-key-button`, `create-api-key-dialog`, `create-api-key-submit`
- `api-key-name-input`, `api-key-type-select`
- `api-key-reveal-value`, `api-key-reveal-done`
- `api-key-row-{name}`, `revoke-api-key-button`, `key-status-revoked`

**Dialogs & Confirmation:**
- `confirm-delete-dialog`, `confirm-delete-button`
- `confirm-archive-dialog`, `confirm-archive-button`
- `confirm-revoke-dialog`, `confirm-revoke-button`
- `confirm-rollback-dialog`, `confirm-rollback-button`
- `promote-flag-dialog`, `promote-confirm-button`
- `invite-member-dialog`, `invite-submit-button`
- `production-safety-gate`, `kill-switch-confirm-button`

**Project Settings:**
- `project-name-input`, `save-project-settings-button`
- `members-table`, `invite-member-button`
- `invite-email-input`, `invite-role-select`

**Onboarding:**
- `onboarding-checklist`, `onboarding-step-org`, `onboarding-step-project`, `onboarding-step-flag`
- `onboarding-org-name-input`, `onboarding-project-name-input`, `onboarding-step-next`

**Dashboard:**
- `get-started-checklist`, `stat-cards`, `recent-activity`, `quick-actions`
- `empty-state-message`, `empty-state-cta`

**General:**
- `loading-skeleton`

### Mocking vs Real Backend

The tests use **Playwright route interception** (`page.route()`) to mock API responses. This allows tests to run without a real backend. Each spec contains `setupMock*` helper functions that simulate API responses.

To run against a real backend:
1. Remove or comment out the `page.route()` calls
2. Set `E2E_BASE_URL` to your running backend
3. Ensure the test user exists or use a real signup flow

### Test User Pattern

Use `makeTestUser()` from `fixtures/auth.fixture.ts` to generate unique test users for isolation:

```ts
import { makeTestUser } from "../fixtures/auth.fixture";
const user = makeTestUser("my-test"); // Unique email with timestamp
```

Or use `injectToken()` to skip login and inject a JWT directly:

```ts
import { injectToken } from "../fixtures/auth.fixture";
await injectToken(page, "my-jwt-token");
```

### Writing New Tests

1. **Use `data-testid` selectors** — never rely on CSS classes, text content, or DOM structure for selectors.
2. **Use web-first assertions** — `expect(locator).toBeVisible()` instead of `page.waitForSelector()`.
3. **Mock at the network boundary** — use `page.route()` to intercept API calls.
4. **Test user-visible behavior** — interact with elements as a user would.
5. **Handle loading, error, and empty states** — every component/page should handle all states.
6. **Clean up test data** — if using a real backend, ensure test data is cleaned.

### Parallel Execution

Tests are configured for parallel execution (`fullyParallel: true`). Each test must be independent. Do not depend on test execution order. Use unique test data (via `makeTestUser()`) to avoid collisions.

---

## Running Against Different Environments

### Local Development

```bash
# Start the dev server
npm run dev

# In another terminal:
npm run test:e2e
```

### CI (GitHub Actions)

```yaml
- name: Run E2E Tests
  run: npm run test:e2e
  env:
    E2E_BASE_URL: http://localhost:3000
```

### Staging

```bash
E2E_BASE_URL=https://staging.featuresignals.dev npm run test:e2e
```

### Production (smoke tests only)

```bash
E2E_BASE_URL=https://app.featuresignals.dev npx playwright test --grep "@smoke"
```

---

## Debugging

```bash
# Run with Playwright Inspector
npx playwright test --debug

# Run with trace viewer (opens after test)
npx playwright test --trace on

# View the last test report
npx playwright show-report
```

---

## Visual Regression (Coming in Phase F.2)

Visual regression tests will be added in `e2e/visual/` to compare screenshots across:
- All three browsers (chromium, firefox, webkit)
- Light and dark mode
- Mobile and desktop viewports
- Key pages: login, dashboard, flags list, flag detail, segments, settings

---

## Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright Test Assertions](https://playwright.dev/docs/test-assertions)
- [FeatureSignals CLAUDE.md](../CLAUDE.md) — Dashboard development standards
