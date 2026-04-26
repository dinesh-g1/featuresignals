---
title: PR Workflow
description: How the AI Janitor generates and manages cleanup pull requests
sidebar_position: 5
---

# PR Workflow

Understanding how the AI Janitor generates pull requests helps you review them confidently.

## Branch Naming

Generated branches follow this pattern:

```
{prefix}remove-{flag-key}
```

**Example:** `janitor/remove-new-checkout-flow`

The prefix is configurable in Settings (default: `janitor/`).

## PR Structure

### Title

```
[AI Janitor] Remove stale flag: {Flag Name}
```

**Example:** `[AI Janitor] Remove stale flag: New Checkout Flow`

### Body

Every generated PR includes:

```markdown
## 🤖 AI Janitor — Automated Cleanup

This PR removes a stale feature flag that has been serving 100% "True" for 45 days.

### Flag Removed
- **Key:** `new-checkout-flow`
- **Name:** New Checkout Flow

### Analysis
- **LLM Provider:** DeepSeek (deepseek-chat)
- **Confidence:** 98.7%
- **Validation:** ✅ Passed
- **Tokens Used:** 1,247
- **Files Modified:** 3

### Changes
1. `src/checkout/handler.ts` — Removed flag condition, kept true branch
2. `src/checkout/payment.ts` — Removed dead code path
3. `src/checkout/tests/handler.test.ts` — Updated tests

### ⚠️ Manual Review Required
This PR was AI-generated. Please review carefully before merging.
```

### Basic Mode (No LLM)

When LLM analysis is unavailable or disabled by compliance policy, the PR includes:

```markdown
### ⚠️ IMPORTANT: Manual Review Required
This PR was generated using regex-based pattern matching, NOT AI-powered analysis.
The regex analyzer can identify flag references but CANNOT verify semantic equivalence.
```

## Commit Message

```
feat: remove stale flag {flag-key}

AI Janitor automated cleanup. Flag has been serving 100% true for {days} days.
```

## What Happens After Merge

When a PR is merged:

1. **PR status updates** — The Janitor detects the merge event (via webhook or poll)
2. **Flag marked as cleaned** — The flag is marked as `rolled_out` in FeatureSignals
3. **Stats updated** — The merged PR count increments on the dashboard
4. **Notifications** — Team members are notified (if enabled)

## Handling Merge Conflicts

If a generated PR has merge conflicts:

1. **Option A: Regenerate** — Click "Regenerate" on the stale flag row
2. **Option B: Manual fix** — Pull the branch, resolve conflicts locally, push
3. **Option C: Dismiss** — If the flag is no longer safe to remove, dismiss it

The Janitor checks for conflicts before creating PRs and will warn you if conflicts are expected.

## PR Statuses

| Status | Description |
|--------|-------------|
| `open` | PR is created and awaiting review |
| `merged` | PR has been merged, flag marked as cleaned |
| `failed` | PR generation failed (conflicts, LLM error, etc.) |
| `closed` | PR was closed without merging |