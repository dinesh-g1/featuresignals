---
sidebar_position: 3
title: Implementation Patterns
---

# Implementation Patterns

How you integrate feature flags into your codebase matters as much as how you manage them in FeatureSignals. This guide covers proven patterns for structuring flag-guarded code, drawn from industry best practices outlined in Martin Fowler's [Feature Toggles](https://martinfowler.com/articles/feature-toggles.html) article.

## Toggle Point: Where to Branch

A **toggle point** is the place in your code where you check a flag and branch. Keep toggle points minimal and well-contained.

### Simple If/Else (Boolean Flags)

The most common pattern for release and ops toggles:

```javascript
if (await client.isEnabled("new-checkout", { key: userId })) {
  return renderNewCheckout(cart);
}
return renderLegacyCheckout(cart);
```

**When to use:** Simple on/off behavior, feature gating, kill switches.

### Strategy Pattern (Complex Branching)

For experiment toggles or permission toggles where the variation logic is complex, use a strategy pattern to avoid deeply nested conditionals:

```typescript
interface CheckoutStrategy {
  render(cart: Cart): JSX.Element;
  processPayment(order: Order): Promise<Receipt>;
}

class LegacyCheckout implements CheckoutStrategy { /* ... */ }
class NewCheckout implements CheckoutStrategy { /* ... */ }

function getCheckoutStrategy(client: FeatureSignals, userId: string): CheckoutStrategy {
  const variant = client.getStringVariation("checkout-experiment", "legacy", { key: userId });
  switch (variant) {
    case "new": return new NewCheckout();
    default: return new LegacyCheckout();
  }
}
```

**When to use:** Multiple variants, A/B experiments, complex feature differences that touch many functions.

### Toggle Router

For applications with many toggle points, centralize flag evaluation into a **toggle router** that is queried once per request and passed through your call stack:

```go
type ToggleRouter struct {
    flags map[string]interface{}
}

func NewToggleRouter(client *fs.Client, user fs.User) *ToggleRouter {
    ctx := client.BulkEvaluate(user)
    return &ToggleRouter{flags: ctx}
}

func (r *ToggleRouter) IsEnabled(key string) bool {
    v, ok := r.flags[key]
    if !ok { return false }
    b, _ := v.(bool)
    return b
}
```

**When to use:** Request-scoped evaluation where multiple flags are checked per request. Reduces SDK calls and ensures consistent evaluation within a single request.

## Toggle Configuration: Where Decisions Live

### Static vs. Dynamic Toggles

| Approach | Configuration Source | Refresh | Best For |
|----------|---------------------|---------|----------|
| **Static** | Config file, env var | Redeploy | Release toggles with simple on/off |
| **Dynamic** | FeatureSignals API | Real-time (SSE) | Experiment, ops, permission toggles |

FeatureSignals provides **dynamic** toggle configuration by default — all flags are evaluated against the latest server-side state. SDKs receive updates in real-time via Server-Sent Events, so you never need to redeploy to change a flag.

### Per-Request vs. Per-Session Decisions

Some flags should be evaluated once per session and remain consistent (e.g., UI experiments), while others should be re-evaluated on every request (e.g., ops toggles checking system load).

FeatureSignals handles this through **consistent hashing**: for the same user key, a flag always returns the same value (until the flag configuration changes). This gives you per-session consistency without extra work.

## Keeping Toggle Code Clean

### Minimize Toggle Points

Every toggle point is a branch in your code. More branches mean more complexity and more testing permutations. Aim to have **one toggle point per flag**, not scattered checks throughout the codebase.

```javascript
// Bad: flag checked in 5 places
function handleOrder(order) {
  if (isEnabled("new-checkout")) { /* ... */ }
  // ... 200 lines later ...
  if (isEnabled("new-checkout")) { /* ... */ }
}

// Good: single toggle point delegates to a strategy
function handleOrder(order) {
  const handler = getOrderHandler(); // checks flag once
  return handler.process(order);
}
```

### Remove Dead Toggles

Release toggles are temporary. Once the feature is fully rolled out:

1. Remove the flag check from code
2. Delete the flag from FeatureSignals
3. Remove the unused code path

Use the **stale flag scanner** CLI tool to detect flags referenced in code that are no longer active:

```bash
featuresignals scan --dir ./src --ci --api-key $FS_API_KEY
```

### Test Both Paths

Every toggle point creates two code paths. Test both:

```javascript
describe("checkout", () => {
  it("renders new checkout when flag is on", async () => {
    mockClient.setOverride("new-checkout", true);
    const result = await renderCheckout(cart);
    expect(result).toContainComponent(NewCheckout);
  });

  it("renders legacy checkout when flag is off", async () => {
    mockClient.setOverride("new-checkout", false);
    const result = await renderCheckout(cart);
    expect(result).toContainComponent(LegacyCheckout);
  });
});
```

## Avoiding Toggle Debt

Feature flags are powerful, but each active flag adds complexity. Here's how to keep toggle debt under control:

| Practice | How FeatureSignals Helps |
|----------|--------------------------|
| Set expiration dates | `expires_at` field auto-disables flags |
| Track staleness | Flag Health page with category-aware thresholds |
| Limit active flags | Usage Insights shows which flags are actually evaluated |
| Enforce cleanup | Stale flag scanner in CI/CD pipelines |
| Categorize flags | Toggle categories set expectations for lifespan |
| Use status tracking | `active` → `rolled_out` → `deprecated` → `archived` |

## Pattern Summary

| Pattern | Category | Complexity | When to Use |
|---------|----------|------------|-------------|
| Simple if/else | Release, Ops | Low | Single-point on/off |
| Strategy | Experiment, Permission | Medium | Multiple variants or complex logic |
| Toggle Router | Any | Medium | Many flags per request |
| Feature middleware | Ops | Low | HTTP-level gating |
